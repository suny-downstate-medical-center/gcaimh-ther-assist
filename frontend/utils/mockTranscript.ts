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

// Test transcript data for Ther-Assist testing
// This simulates a complete therapy session with various scenarios to test analytical functions

export interface TestTranscriptEntry {
  text: string;
  timestamp: string;
  is_interim: false;
  speaker?: 'THERAPIST' | 'PATIENT';
}

export const testTranscriptData: TestTranscriptEntry[] = [
  // ========== PHASE 1: SESSION BEGINNING (0-10 minutes) ==========
  // TEST: Rapport building, agenda setting, initial assessment
  {
    text: "Good afternoon, Sarah. How are you feeling today?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "I've been having a really tough week. The anxiety has been pretty overwhelming.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "I'm sorry to hear you're struggling. Can you tell me more about what's been triggering your anxiety this week?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "It's mostly work situations. I had to give a presentation, and I kept thinking everyone was judging me. I could feel my heart racing, and I started sweating. I almost had to leave the room.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },

  // ========== PHASE 2: ANXIETY ESCALATION (10-20 minutes) ==========
  // TEST: Should trigger SUGGESTION alerts for grounding techniques
  {
    text: "Those physical symptoms you're describing - the racing heart, sweating - those are common manifestations of anxiety. Have you been using any of the coping strategies we discussed last session?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "I tried the breathing exercises, but I couldn't focus. My mind kept racing with negative thoughts. I felt like I was going to pass out. My chest was so tight I couldn't breathe properly.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "Even now, just talking about it, I can feel my heart starting to race again. I feel dizzy and disconnected.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },

  // ========== PHASE 3: COGNITIVE RESTRUCTURING (20-30 minutes) ==========
  // TEST: CBT technique detection, positive therapeutic moments
  {
    text: "Let's explore those thoughts. What specifically were you thinking during the presentation?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "That I was going to mess up, that people would think I'm incompetent, that I don't deserve to be there.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "Those sound like what we call automatic negative thoughts or cognitive distortions. Let's apply some cognitive restructuring here. What evidence do you have that people actually think you're incompetent?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Well... I guess I don't have any real evidence. My boss actually complimented my work last month.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "That's an important observation. So there's evidence that contradicts your negative thought. This is a good example of catastrophizing - assuming the worst will happen without evidence. How could you reframe that thought more realistically?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Maybe... that I'm prepared and I know my material, even if I feel nervous?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "Excellent reframing. Feeling nervous is normal and doesn't mean you're incompetent.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },

  // ========== PHASE 4: TREATMENT RESISTANCE (30-35 minutes) ==========
  // TEST: Pathway change indicators
  {
    text: "I understand what you're saying logically, but it doesn't help when I'm in the moment. The anxiety just takes over completely.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "It sounds like the cognitive work isn't translating to real situations for you.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Exactly. I can do all the thought challenging here, but when I'm actually in a social situation, it all goes out the window. Maybe this approach just isn't working for me.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "I hear your frustration. Sometimes we need to adjust our approach.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },

  // ========== PHASE 5: CRITICAL - DISSOCIATION (35-40 minutes) ==========
  // TEST: CRITICAL alert for dissociation
  {
    text: "Sometimes when the anxiety gets really bad, I feel like I'm watching myself from outside my body. Like I'm not really there.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "That sounds like dissociation. When did you last experience this?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Yesterday at work. I just... floated away. I don't remember much of the afternoon. My coworker said I was just staring blankly for a while. It's scary when I lose time like that.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "Let's pause for a moment. Can you feel your feet on the floor right now? Let's do some grounding together.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Yes, I can feel them. That helps a bit.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },

  // ========== PHASE 6: GROUNDING AND EXPOSURE (40-45 minutes) ==========
  // TEST: Grounding technique and exposure therapy detection
  {
    text: "Good. Now, can you name five things you can see in this room right now?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "The bookshelf, your diploma on the wall, the plant by the window, the blue chair, and the clock.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "Excellent. This 5-4-3-2-1 technique can help bring you back to the present moment when you feel dissociation starting.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Now, I'd like to introduce an exposure exercise we can work on together. Would you be comfortable practicing a brief presentation here, starting with just 30 seconds?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "That makes me nervous just thinking about it, but... I guess we could try.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "We'll start small and work our way up. This is called graduated exposure, and it's a key component of CBT for social anxiety. Remember, the goal isn't to eliminate anxiety completely, but to learn that you can tolerate it and that it will decrease over time.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },

  // ========== PHASE 7: CRITICAL - SELF-HARM (45-48 minutes) ==========
  // TEST: CRITICAL alert for self-harm risk
  {
    text: "Sometimes when everything gets too overwhelming, I have thoughts about... hurting myself. Just to make the anxiety stop.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "I'm really glad you felt safe enough to share that with me. Can you tell me more about these thoughts? Have you acted on them?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "I haven't done anything, but the thoughts are getting stronger. Yesterday I was looking at my knife set in the kitchen and... I had to leave the room.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "I appreciate your honesty, and I want to make sure you're safe. Let's create a safety plan together right now.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },

  // ========== PHASE 8: SESSION ENDING (48-50 minutes) ==========
  // TEST: Homework assignment, session closure
  {
    text: "Before we end today, let's review what we've covered and set some homework for next week.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Okay. I feel like we covered a lot today.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "For homework, I'd like you to practice the 5-4-3-2-1 grounding technique once a day, even when you're not anxious. Also, try to identify and write down three automatic negative thoughts each day, along with a more balanced alternative thought.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "I can do that. Should I also try the brief presentation practice we talked about?",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  },
  {
    text: "Let's start with the grounding and thought work first. We'll begin the exposure exercises together next session. Remember, you can call our crisis line if those difficult thoughts return.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'THERAPIST'
  },
  {
    text: "Thank you. I'll see you next week.",
    timestamp: new Date().toISOString(),
    is_interim: false,
    speaker: 'PATIENT'
  }
];
