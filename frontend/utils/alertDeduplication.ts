// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Alert } from '../types/types';

/**
 * Utility functions for alert deduplication - prevents similar alerts from being added
 */

interface DeduplicationConfig {
  titleSimilarityThreshold: number; // 0-1, how similar titles need to be
  messageSimilarityThreshold: number; // 0-1, how similar messages need to be
  timeWindowMinutes: number; // Time window for preventing duplicates
  maxAlertsPerCategory: number; // Max alerts per category in time window
  categoryThrottleMinutes: number; // Minutes to throttle same category
}

const DEFAULT_CONFIG: DeduplicationConfig = {
  titleSimilarityThreshold: 0.7,
  messageSimilarityThreshold: 0.7,
  timeWindowMinutes: 5,
  maxAlertsPerCategory: 3,
  categoryThrottleMinutes: 1,
};

/**
 * Calculate similarity between two strings using Jaccard similarity
 * (intersection over union of word sets)
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Normalize text: lowercase, remove punctuation, split into words
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Remove short words
  
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  
  // Calculate intersection and union
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  // Jaccard similarity = |intersection| / |union|
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Extract key phrases/themes from alert text for semantic comparison
 */
function extractKeyPhrases(text: string): Set<string> {
  const normalizedText = text.toLowerCase();
  
  // Common therapy/clinical phrases that indicate similar content
  const keyPhrases = new Set<string>();
  
  // Safety-related phrases
  if (normalizedText.includes('safety') || normalizedText.includes('risk') || 
      normalizedText.includes('harm') || normalizedText.includes('suicide') ||
      normalizedText.includes('self-harm')) {
    keyPhrases.add('safety_concern');
  }
  
  // Technique-related phrases
  if (normalizedText.includes('technique') || normalizedText.includes('intervention') ||
      normalizedText.includes('skill') || normalizedText.includes('exercise')) {
    keyPhrases.add('technique_suggestion');
  }
  
  // Rapport/alliance phrases
  if (normalizedText.includes('rapport') || normalizedText.includes('alliance') ||
      normalizedText.includes('relationship') || normalizedText.includes('trust')) {
    keyPhrases.add('therapeutic_relationship');
  }
  
  // Emotional state phrases
  if (normalizedText.includes('anxiety') || normalizedText.includes('anxious')) {
    keyPhrases.add('anxiety_related');
  }
  if (normalizedText.includes('depression') || normalizedText.includes('depressed')) {
    keyPhrases.add('depression_related');
  }
  if (normalizedText.includes('emotion') || normalizedText.includes('feeling')) {
    keyPhrases.add('emotional_state');
  }
  
  // Pathway/approach phrases
  if (normalizedText.includes('approach') || normalizedText.includes('pathway') ||
      normalizedText.includes('treatment') || normalizedText.includes('therapy')) {
    keyPhrases.add('treatment_approach');
  }
  
  return keyPhrases;
}

/**
 * Check if a new alert should be blocked due to similarity with existing alerts
 */
export function shouldBlockAlert(
  newAlert: Alert,
  existingAlerts: Alert[],
  config: DeduplicationConfig = DEFAULT_CONFIG
): { shouldBlock: boolean; reason?: string; similarAlert?: Alert } {
  const now = new Date();
  const timeWindow = new Date(now.getTime() - config.timeWindowMinutes * 60 * 1000);
  
  // Filter alerts within time window
  const recentAlerts = existingAlerts.filter(alert => {
    const alertTime = alert.timestamp ? new Date(alert.timestamp) : new Date(0);
    return alertTime > timeWindow;
  });
  
  // 0. HARD CHECK: No alerts within the last 7 seconds (regardless of content/category)
  const sevenSecondsAgo = new Date(now.getTime() - 7 * 1000);
  const veryRecentAlert = existingAlerts.find(alert => {
    const alertTime = alert.timestamp ? new Date(alert.timestamp) : new Date(0);
    return alertTime > sevenSecondsAgo;
  });
  
  if (veryRecentAlert) {
    const timeSinceLastAlert = now.getTime() - new Date(veryRecentAlert.timestamp || 0).getTime();
    return {
      shouldBlock: true,
      reason: `Hard 7-second block (last alert ${(timeSinceLastAlert / 1000).toFixed(1)}s ago)`,
      similarAlert: veryRecentAlert
    };
  }
  
  // 1. Exact title match
  const exactTitleMatch = recentAlerts.find(alert => alert.title === newAlert.title);
  if (exactTitleMatch) {
    return { 
      shouldBlock: true, 
      reason: 'Exact title match',
      similarAlert: exactTitleMatch
    };
  }
  
  // 2. High similarity in title or message
  for (const existingAlert of recentAlerts) {
    const titleSimilarity = calculateSimilarity(newAlert.title, existingAlert.title);
    const messageSimilarity = calculateSimilarity(
      newAlert.message || '', 
      existingAlert.message || ''
    );
    
    if (titleSimilarity >= config.titleSimilarityThreshold) {
      return {
        shouldBlock: true,
        reason: `High title similarity (${(titleSimilarity * 100).toFixed(1)}%)`,
        similarAlert: existingAlert
      };
    }
    
    if (messageSimilarity >= config.messageSimilarityThreshold) {
      return {
        shouldBlock: true,
        reason: `High message similarity (${(messageSimilarity * 100).toFixed(1)}%)`,
        similarAlert: existingAlert
      };
    }
  }
  
  // 3. Semantic key phrase overlap
  const newAlertPhrases = extractKeyPhrases(newAlert.title + ' ' + (newAlert.message || ''));
  for (const existingAlert of recentAlerts) {
    const existingPhrases = extractKeyPhrases(
      existingAlert.title + ' ' + (existingAlert.message || '')
    );
    
    // Check for significant phrase overlap
    const overlapCount = [...newAlertPhrases].filter(phrase => existingPhrases.has(phrase)).length;
    const totalPhrases = Math.max(newAlertPhrases.size, existingPhrases.size);
    
    if (totalPhrases > 0 && overlapCount / totalPhrases >= 0.7) {
      return {
        shouldBlock: true,
        reason: `High semantic similarity (${overlapCount}/${totalPhrases} key phrases match)`,
        similarAlert: existingAlert
      };
    }
  }
  
  // 4. Category throttling - but allow critical safety alerts through
  if (newAlert.timing !== 'now' || newAlert.category !== 'safety') {
    const categoryThrottleWindow = new Date(now.getTime() - config.categoryThrottleMinutes * 60 * 1000);
    const recentCategoryAlerts = recentAlerts.filter(alert => 
      alert.category === newAlert.category &&
      (alert.timestamp ? new Date(alert.timestamp) : new Date(0)) > categoryThrottleWindow
    );
    
    if (recentCategoryAlerts.length >= config.maxAlertsPerCategory) {
      return {
        shouldBlock: true,
        reason: `Category throttling (${recentCategoryAlerts.length} recent ${newAlert.category} alerts)`,
        similarAlert: recentCategoryAlerts[0]
      };
    }
  }
  
  return { shouldBlock: false };
}

/**
 * Process a new alert and return whether it should be added to the alerts list
 */
export function processNewAlert(
  newAlert: Alert,
  existingAlerts: Alert[],
  options: {
    config?: DeduplicationConfig;
    debugMode?: boolean;
  } = {}
): { 
  shouldAdd: boolean; 
  blockReason?: string;
  similarAlert?: Alert;
  debugInfo?: any 
} {
  const { config = DEFAULT_CONFIG, debugMode = false } = options;
  
  const blockResult = shouldBlockAlert(newAlert, existingAlerts, config);
  
  const debugInfo = debugMode ? {
    blockCheck: blockResult,
    newAlert: {
      title: newAlert.title,
      category: newAlert.category,
      timing: newAlert.timing,
    },
    alertCounts: {
      total: existingAlerts.length,
      safety: existingAlerts.filter(a => a.category === 'safety').length,
      technique: existingAlerts.filter(a => a.category === 'technique').length,
      pathway_change: existingAlerts.filter(a => a.category === 'pathway_change').length,
    }
  } : undefined;
  
  if (blockResult.shouldBlock) {
    return {
      shouldAdd: false,
      blockReason: blockResult.reason,
      similarAlert: blockResult.similarAlert,
      debugInfo: debugMode ? { 
        ...debugInfo, 
        action: 'blocked', 
        reason: blockResult.reason,
        similarAlertTitle: blockResult.similarAlert?.title 
      } : undefined
    };
  }
  
  return {
    shouldAdd: true,
    blockReason: undefined,
    similarAlert: undefined,
    debugInfo: debugMode ? { ...debugInfo, action: 'added', reason: 'No duplicates found' } : undefined
  };
}

/**
 * Clean up old alerts that are outside the deduplication time window
 * This helps keep the alerts list manageable
 */
export function cleanupOldAlerts(
  alerts: Alert[],
  maxAge: number = 10 // minutes
): Alert[] {
  const cutoff = new Date(Date.now() - maxAge * 60 * 1000);
  
  return alerts.filter(alert => {
    const alertTime = alert.timestamp ? new Date(alert.timestamp) : new Date(0);
    return alertTime > cutoff;
  });
}
