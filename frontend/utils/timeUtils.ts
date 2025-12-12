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

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [];
  
  if (hours > 0) {
    parts.push(hours.toString().padStart(2, '0'));
  }
  
  parts.push(minutes.toString().padStart(2, '0'));
  parts.push(remainingSeconds.toString().padStart(2, '0'));

  return parts.join(':');
};

export const formatTimestamp = (timestamp: string): string => {
  // Handle HH:MM:SS format (session time) by creating a valid date
  if (timestamp && /^\d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    // It's already in HH:MM:SS format, return as-is
    return timestamp;
  }
  
  // Try to parse as a regular timestamp
  const date = new Date(timestamp);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return '--:--:--';
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return `${diffSecs} seconds ago`;
  } else if (diffSecs < 3600) {
    const mins = Math.floor(diffSecs / 60);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  } else {
    const hours = Math.floor(diffSecs / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
};
