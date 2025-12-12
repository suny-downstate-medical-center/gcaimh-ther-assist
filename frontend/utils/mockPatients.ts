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

import { Patient } from '../types/types';

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    age: 28,
    nextVisit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
    lastVisit: '2025-07-15',
    patientSince: '2023-10-20',
    focusTopics: 'Social Anxiety, Work Performance, Breathing Techniques',
    status: 'active',
    sessionHistory: [
      {
        id: '1-1',
        date: '2025-06-03',
        duration: 60,
        summary: 'Initial assessment revealed heightened anxiety around social situations and work presentations. Patient reported physical symptoms including racing heart and sweating when anticipating social events.'
      },
      {
        id: '1-2',
        date: '2025-06-17',
        duration: 50,
        summary: 'Introduced progressive muscle relaxation techniques and basic breathing exercises. Patient practiced identifying physical sensations that precede anxiety episodes.'
      },
      {
        id: '1-3',
        date: '2025-07-01',
        duration: 50,
        summary: 'Patient demonstrated improvement in using breathing techniques during mock social scenarios. We explored cognitive restructuring for catastrophic thinking patterns about social judgment.'
      },
      {
        id: '1-4',
        date: '2025-07-15',
        duration: 50,
        summary: 'Patient showed significant improvement in managing anxiety triggers through breathing exercises. We discussed upcoming social situations and practiced coping strategies for holiday gatherings.'
      }
    ],
    contactInfo: {
      phone: '(555) 123-4567',
      email: 'sarah.j@email.com'
    }
  },
  {
    id: '2',
    name: 'Michael Chen',
    age: 35,
    nextVisit: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    lastVisit: '2025-07-10',
    patientSince: '2023-06-15',
    focusTopics: 'PTSD, Nightmares, EMDR Therapy',
    status: 'active',
    sessionHistory: [
      {
        id: '2-1',
        date: '2025-05-15',
        duration: 60,
        summary: 'Patient reported increased nightmares and intrusive thoughts following anniversary of traumatic event. Established safety protocols and introduced basic grounding techniques including 5-4-3-2-1 sensory method.'
      },
      {
        id: '2-2',
        date: '2025-05-29',
        duration: 50,
        summary: 'Focused on psychoeducation about trauma responses and hypervigilance patterns. Patient practiced progressive muscle relaxation and discussed sleep hygiene strategies to address nightmare frequency.'
      },
      {
        id: '2-3',
        date: '2025-06-12',
        duration: 55,
        summary: 'Began preparation phase for EMDR therapy by establishing dual awareness and safe place visualization. Patient demonstrated good tolerance for bilateral stimulation during resource installation.'
      },
      {
        id: '2-4',
        date: '2025-06-26',
        duration: 60,
        summary: 'First EMDR processing session targeting peripheral trauma memory with successful completion of desensitization phase. Patient reported decreased emotional intensity when recalling the targeted memory.'
      },
      {
        id: '2-5',
        date: '2025-07-10',
        duration: 55,
        summary: 'Completed EMDR session focusing on recent trauma memory that has been causing nightmares. Patient reported feeling less activated when discussing the incident and plans to practice grounding techniques.'
      }
    ],
    contactInfo: {
      phone: '(555) 234-5678',
      email: 'mchen@email.com'
    }
  },
  {
    id: '3',
    name: 'Jane Doe',
    age: 42,
    nextVisit: new Date().toLocaleDateString(), // en-CA gives YYYY-MM-DD format in local timezone
    lastVisit: '2025-07-18',
    patientSince: '2022-02-08',
    focusTopics: 'PTSD, Depression, Behavioral Activation',
    status: 'active',
    sessionHistory: [
      {
        id: '3-1',
        date: '2025-05-20',
        duration: 50,
        summary: 'Patient reported persistent low mood and fatigue affecting work performance and social relationships. Discussed medication concerns and initiated mood tracking to identify patterns and triggers.'
      },
      {
        id: '3-2',
        date: '2025-06-03',
        duration: 50,
        summary: 'Reviewed mood tracking data revealing correlation between sleep quality and depressive episodes. Introduced behavioral activation techniques and established small, achievable daily goals to increase activity levels.'
      },
      {
        id: '3-3',
        date: '2025-06-17',
        duration: 45,
        summary: 'Patient showed slight improvement in activity engagement through behavioral activation exercises. Collaborated with psychiatrist to adjust medication dosage and explored cognitive patterns contributing to hopelessness.'
      },
      {
        id: '3-4',
        date: '2025-07-01',
        duration: 50,
        summary: 'Notable improvement in energy levels following medication adjustment and consistent exercise routine implementation. Patient successfully completed behavioral activation homework and reported increased social engagement.'
      },
      {
        id: '3-5',
        date: '2025-07-18',
        duration: 45,
        summary: 'Patient touched on the traumatic robbery incident but was unable to fully delve into the memory. She also discussed struggling with motivation and daily functioning since the incident. We are preparing an exposure plan for next session.'
      }
    ],
    contactInfo: {
      phone: '(555) 345-6789',
      email: 'j.doe@email.com'
    }
  },
  {
    id: '4',
    name: 'David Thompson',
    age: 31,
    nextVisit: null,
    lastVisit: '2025-06-22',
    patientSince: '2024-08-10',
    focusTopics: 'Social Phobia, CBT Techniques, Exposure Therapy',
    status: 'paused',
    sessionHistory: [
      {
        id: '4-1',
        date: '2025-05-11',
        duration: 50,
        summary: 'Patient reported severe social anxiety preventing attendance at work meetings and social gatherings. Established baseline social avoidance behaviors and discussed fear of negative evaluation by colleagues.'
      },
      {
        id: '4-2',
        date: '2025-05-25',
        duration: 45,
        summary: 'Introduced cognitive behavioral therapy techniques to identify and challenge social anxiety thought patterns. Patient practiced thought records to recognize catastrophic predictions about social interactions.'
      },
      {
        id: '4-3',
        date: '2025-06-08',
        duration: 50,
        summary: 'Began gradual exposure therapy with hierarchy of feared social situations starting with brief eye contact exercises. Patient successfully completed lower-level exposures and reported decreased anticipatory anxiety.'
      },
      {
        id: '4-4',
        date: '2025-06-22',
        duration: 45,
        summary: 'Patient requested a break from therapy to focus on work commitments but acknowledged progress made in group settings. Agreed to resume sessions after the holidays with continued homework assignments.'
      }
    ],
    contactInfo: {
      phone: '(555) 456-7890'
    }
  },
  {
    id: '5',
    name: 'Jessica Wong',
    age: 29,
    nextVisit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next month
    lastVisit: '2025-07-20',
    patientSince: '2024-04-05',
    focusTopics: 'Panic Disorder, Grounding Techniques, Work Stress',
    status: 'active',
    sessionHistory: [
      {
        id: '5-1',
        date: '2025-05-25',
        duration: 50,
        summary: 'Patient experienced three panic attacks in the past week triggered by crowded spaces and work deadlines. Reviewed panic attack cycle and discussed the connection between physical sensations and catastrophic thoughts.'
      },
      {
        id: '5-2',
        date: '2025-06-08',
        duration: 45,
        summary: 'Introduced panic attack early warning sign identification and practiced controlled breathing techniques. Patient learned to distinguish between anxiety symptoms and actual physical danger through psychoeducation about fight-or-flight response.'
      },
      {
        id: '5-3',
        date: '2025-06-22',
        duration: 50,
        summary: 'Patient successfully interrupted a panic attack using breathing techniques learned in previous session. Practiced 5-4-3-2-1 grounding exercise and discussed cognitive strategies for managing anticipatory anxiety about future attacks.'
      },
      {
        id: '5-4',
        date: '2025-07-06',
        duration: 45,
        summary: 'Significant improvement noted in panic attack frequency and intensity over past two weeks. Patient demonstrated mastery of grounding techniques and reported increased confidence in managing symptoms independently.'
      },
      {
        id: '5-5',
        date: '2025-07-20',
        duration: 50,
        summary: 'Excellent progress in recognizing early warning signs of panic attacks before they escalate. Patient successfully used the 5-4-3-2-1 grounding technique during a recent episode at work.'
      }
    ],
    contactInfo: {
      phone: '(555) 567-8901',
      email: 'jwong@email.com'
    }
  },
  {
    id: '6',
    name: 'Robert Martinez',
    age: 38,
    nextVisit: null,
    lastVisit: '2025-07-12',
    patientSince: '2022-12-18',
    focusTopics: 'OCD, Checking Rituals, Exposure Therapy',
    status: 'active',
    sessionHistory: [
      {
        id: '6-1',
        date: '2025-05-17',
        duration: 60,
        summary: 'Patient reported spending 4-5 hours daily on checking rituals related to door locks and appliances before leaving home. Established hierarchy of exposure exercises starting with least anxiety-provoking scenarios.'
      },
      {
        id: '6-2',
        date: '2025-05-31',
        duration: 50,
        summary: 'Introduced response prevention techniques and completed first in-session exposure exercise involving checking door lock only once. Patient experienced moderate anxiety but successfully resisted performing additional checks.'
      },
      {
        id: '6-3',
        date: '2025-06-14',
        duration: 55,
        summary: 'Patient demonstrated progress with homework exposures, successfully reducing checking behavior from 15 times to 5 times when leaving house. Discussed intrusive thoughts about responsibility and introduced cognitive defusion techniques.'
      },
      {
        id: '6-4',
        date: '2025-06-28',
        duration: 50,
        summary: 'Significant improvement noted in exposure tolerance with successful completion of leaving home after checking locks only twice. Patient reported decreased urge intensity and increased confidence in managing OCD symptoms.'
      },
      {
        id: '6-5',
        date: '2025-07-12',
        duration: 45,
        summary: 'Patient completed another successful exposure exercise without performing compulsive checking behaviors. We reviewed his progress chart and planned more challenging exposures for the next session.'
      }
    ],
    contactInfo: {
      phone: '(555) 678-9012',
      email: 'rmartinez@email.com'
    }
  }
];
