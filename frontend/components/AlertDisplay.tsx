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

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Collapse,
  Button,
  Fade,
} from '@mui/material';
import {
  Shield,
  Psychology,
  SwapHoriz,
  Close,
  ExpandMore,
  ExpandLess,
  MenuBook,
  Build,
  Lightbulb,
  Assessment,
} from '@mui/icons-material';
import { Alert, Citation } from '../types/types';
import RationaleModal from './RationaleModal';
import CitationModal from './CitationModal';

interface AlertDisplayProps {
  alert: Alert;
  onDismiss: () => void;
  citations?: Citation[];
  isSelected?: boolean;
}

const AlertDisplay: React.FC<AlertDisplayProps> = ({ alert, onDismiss, citations = [], isSelected = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [rationaleModalOpen, setRationaleModalOpen] = useState(false);
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
    setCitationModalOpen(true);
  };

  // Use timing directly from backend (simplified!)
  const timing = alert.timing || 'info';

  // Color based on timing (handle both uppercase and lowercase)
  const getAlertColor = () => {
    const normalizedTiming = timing?.toLowerCase();
    switch (normalizedTiming) {
      case 'now':
        return '#dc2626'; // Red
      case 'pause':
        return '#d97706'; // Amber
      case 'info':
        return '#059669'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };

  // Single icon based on content type
  const getContentIcon = () => {
    // Safety takes precedence
    if (alert.category === 'safety') {
      return <Shield sx={{ fontSize: 24 }} />;
    }
    // Specific therapeutic techniques and interventions
    if (alert.category === 'technique') {
      return <Build sx={{ fontSize: 24 }} />;
    }
    // Pathway changes
    if (alert.category === 'pathway_change') {
      return <SwapHoriz sx={{ fontSize: 24 }} />;
    }
    // Engagement/motivation
    if (alert.category === 'engagement') {
      return <Lightbulb sx={{ fontSize: 24 }} />;
    }
    // Process observations
    if (alert.category === 'process') {
      return <Assessment sx={{ fontSize: 24 }} />;
    }
    // Default fallback (Psychology for unknown categories)
    return <Psychology sx={{ fontSize: 24 }} />;
  };

  const alertColor = getAlertColor();

  // Function to parse the message and create clickable citation links
  const renderMessageWithCitations = (text: string) => {
    // Regular expression to match citation patterns like [1], [2], [3, 6, 9]
    const citationPattern = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationPattern.exec(text)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Parse citation numbers
      const citationNumbers = match[1].split(',').map(num => parseInt(num.trim()));
      
      // Create clickable citation chip
      parts.push(
        <Chip
          key={`citation-${match.index}`}
          label={`[${match[1]}]`}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            // Find the citation with the first number (for now, just handle single citations)
            const citation = citations.find(c => citationNumbers.includes(c.citation_number));
            if (citation) {
              handleCitationClick(citation);
            }
          }}
          sx={{
            height: 20,
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
            mx: 0.5,
            verticalAlign: 'middle',
          }}
        />
      );

      lastIndex = citationPattern.lastIndex;
    }

    // Add remaining text after the last citation
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no citations found, return the original text
    if (parts.length === 0) {
      return text;
    }

    return <>{parts}</>;
  };

  return (
    <>
      <Fade in timeout={300}>
      <Paper
        elevation={timing === 'now' ? 4 : 2}
        sx={{
          border: 'none', // No borders as requested
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          background: isSelected ? `${alertColor}20` : (timing === 'now' 
            ? `linear-gradient(135deg, ${alertColor}08 0%, ${alertColor}04 100%)`
            : 'rgba(255, 255, 255, 0.9)'),
          animation: timing === 'now' ? 'urgentPulse 3s infinite' : 'none',
          '@keyframes urgentPulse': {
            '0%': { 
              boxShadow: `0 4px 20px -4px ${alertColor}40`,
            },
            '50%': { 
              boxShadow: `0 4px 30px -4px ${alertColor}60`,
            },
            '100%': { 
              boxShadow: `0 4px 20px -4px ${alertColor}40`,
            },
          },
        }}
      >
        {/* Alert Header */}
        <Box
          sx={{
            bgcolor: `${alertColor}10`,
            p: 2,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          {/* Single icon based on content type */}
          <Box sx={{ 
            color: alertColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: `${alertColor}10`,
          }}>
            {getContentIcon()}
          </Box>
          
          <Box sx={{ flex: 1 }}>
            {/* Title with timing indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: timing === 'now' ? '1.125rem' : '1rem',
                  color: timing === 'now' ? alertColor : 'text.primary',
                }}
              >
                {alert.title}
              </Typography>
              {timing === 'pause' && (
                <Chip
                  label="Next Pause"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: `${alertColor}15`,
                    color: alertColor,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            
            <Box
              component="span"
              sx={{
                fontSize: timing === 'now' ? '0.95rem' : '0.875rem',
                lineHeight: 1.6,
                display: 'block',
                color: timing === 'info' ? 'text.secondary' : 'text.primary',
              }}
            >
              {renderMessageWithCitations(alert.message)}
            </Box>

            {/* Evidence */}
            {alert.evidence && alert.evidence.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600,
                    color: alertColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Evidence:
                </Typography>
                {alert.evidence.map((ev, idx) => (
                  <Typography
                    key={idx}
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      pl: 2,
                      fontStyle: 'italic',
                      color: 'text.secondary',
                      borderLeft: `2px solid ${alertColor}30`,
                    }}
                  >
                    "{ev}"
                  </Typography>
                ))}
              </Box>
            )}

            {/* Recommendation */}
            {alert.recommendation && alert.recommendation.length > 0 && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: timing === 'now' ? `${alertColor}08` : 'background.paper',
                  borderRadius: 1,
                  borderLeft: `3px solid ${alertColor}`,
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 0.5,
                    color: alertColor,
                  }}
                >
                  {timing === 'now' ? '→ Actions Required:' : '→ Recommendations:'}
                </Typography>
                <Box component="ul" sx={{ margin: 0, paddingLeft: '1.5em' }}>
                  {alert.recommendation.map((item, index) => (
                    <Box component="li" key={index} sx={{ marginBottom: '0.25em' }}>
                      <Typography variant="body2">{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={onDismiss}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
            {alert.manual_reference && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ color: alertColor }}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
             <Button
              size="small"
              onClick={() => setRationaleModalOpen(true)}
              sx={{ mt: 1 }}
              >
              Details
            </Button>
          </Box>
        </Box>

        {/* Manual Reference (Expandable) */}
        {alert.manual_reference && (
          <Collapse in={expanded}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MenuBook fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Manual Reference
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {alert.manual_reference.source}
              </Typography>
              {alert.manual_reference.page && (
                <Typography variant="body2" color="text.secondary">
                  Page {alert.manual_reference.page}
                </Typography>
              )}
              {alert.manual_reference.section && (
                <Typography variant="body2" color="text.secondary">
                  Section: {alert.manual_reference.section}
                </Typography>
              )}
              <Button
                size="small"
                startIcon={<MenuBook />}
                sx={{ mt: 1 }}
                variant="outlined"
              >
                View in Manual
              </Button>
            </Box>
          </Collapse>
        )}
      </Paper>
    </Fade>

    {/* Citation Modal */}
    <CitationModal
      open={citationModalOpen}
      onClose={() => {
        setCitationModalOpen(false);
        setSelectedCitation(null);
      }}
      citation={selectedCitation}
    />
     <RationaleModal
        open={rationaleModalOpen}
        onClose={() => setRationaleModalOpen(false)}
        rationale={Array.isArray(alert.recommendation) ? alert.recommendation.join('\n\n') : alert.recommendation}
        immediateActions={alert.immediateActions}
        contraindications={alert.contraindications}
        citations={citations}
        onCitationClick={handleCitationClick}
      />
  </>
  );
};

export default AlertDisplay;
