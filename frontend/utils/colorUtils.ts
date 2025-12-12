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

type Status = 'strong' | 'effective' | 'moderate' | 'struggling' | 'weak' | 'ineffective' | 'calm' | 'anxious' | 'distressed' | 'dissociated' | 'engaged' | 'unknown' | 'listening';

export const getStatusColor = (status: Status): string => {
  switch (status) {
    case 'strong':
    case 'effective':
    case 'calm':
    case 'engaged':
      return 'success.main';
    case 'moderate':
    case 'struggling':
    case 'anxious':
    case 'distressed':
    case 'dissociated':
      return 'warning.main';
    case 'weak':
    case 'ineffective':
      return 'error.main';
    case 'listening':
      return 'text.secondary';
    default:
      return 'text.secondary';
  }
};
