import { KeyboardProfile } from '../types';

export const KEYBOARD_PROFILES: KeyboardProfile[] = [
  {
    id: 'yamaha_psr_s750',
    name: 'Yamaha PSR-S750 (Target Utama)',
    manufacturer: 'Yamaha',
    series: 'PSR-S Series Arranger Workstation',
    supportedFormats: ['SFF1', 'SFF2 (GE)'],
    polyphony: 128,
    casmSupported: true,
    otsSupported: true,
    recommendedSff: 'SFF1',
    drumKits: [
      { name: 'Standard Kit 1', msb: 127, lsb: 0, pc: 0 },
      { name: 'Standard Kit 2', msb: 127, lsb: 0, pc: 1 },
      { name: 'Room Kit', msb: 127, lsb: 0, pc: 8 },
      { name: 'Rock Kit', msb: 127, lsb: 0, pc: 16 },
      { name: 'Electro Kit', msb: 127, lsb: 0, pc: 24 },
      { name: 'Analog Kit', msb: 127, lsb: 0, pc: 25 },
      { name: 'Dance Kit', msb: 127, lsb: 0, pc: 27 },
      { name: 'Jazz Kit', msb: 127, lsb: 0, pc: 32 },
      { name: 'Brush Kit', msb: 127, lsb: 0, pc: 40 },
      { name: 'Arabic / Percussion Kit', msb: 126, lsb: 0, pc: 35 },
      { name: 'Dangdut Kendang / Indonesian Kit', msb: 127, lsb: 0, pc: 48 }
    ],
    bassVoices: [
      { name: 'Acoustic Bass', msb: 0, lsb: 112, pc: 32 },
      { name: 'Finger Bass', msb: 0, lsb: 112, pc: 33 },
      { name: 'Pick Bass', msb: 0, lsb: 112, pc: 34 },
      { name: 'Fretless Bass', msb: 0, lsb: 112, pc: 35 },
      { name: 'Slap Bass', msb: 0, lsb: 112, pc: 36 },
      { name: 'Synth Bass 1', msb: 0, lsb: 112, pc: 38 },
      { name: 'Mega Steel Bass (Yamaha)', msb: 8, lsb: 0, pc: 33, isMegaVoice: true },
      { name: 'Mega Slap Bass (Yamaha)', msb: 8, lsb: 0, pc: 36, isMegaVoice: true }
    ],
    chordVoices: [
      { name: 'Live! Concert Grand', msb: 0, lsb: 115, pc: 0 },
      { name: 'Suitcase Clean EP', msb: 0, lsb: 114, pc: 4 },
      { name: 'Cool! Rotor Organ', msb: 0, lsb: 114, pc: 16 },
      { name: 'Mega Steel String Guitar', msb: 8, lsb: 0, pc: 25, isMegaVoice: true },
      { name: 'Mega Clean Guitar', msb: 8, lsb: 0, pc: 27, isMegaVoice: true },
      { name: 'Live! Strings Ensemble', msb: 0, lsb: 114, pc: 48 },
      { name: 'Nylon Guitar Campur', msb: 0, lsb: 112, pc: 24 }
    ],
    leadVoices: [
      { name: 'Sweet! Soprano Sax', msb: 0, lsb: 115, pc: 64, isSweetVoice: true },
      { name: 'Sweet! Tenor Sax', msb: 0, lsb: 114, pc: 66, isSweetVoice: true },
      { name: 'Sweet! Trumpet', msb: 0, lsb: 115, pc: 56, isSweetVoice: true },
      { name: 'Cool! Jazz Guitar', msb: 0, lsb: 114, pc: 26 },
      { name: 'Sweet! Pan Flute', msb: 0, lsb: 114, pc: 75, isSweetVoice: true },
      { name: 'Distortion Rock Solo', msb: 0, lsb: 112, pc: 30 }
    ]
  },
  {
    id: 'yamaha_psr_sx900',
    name: 'Yamaha PSR-SX900 / SX700',
    manufacturer: 'Yamaha',
    series: 'PSR-SX Digital Workstation',
    supportedFormats: ['SFF1', 'SFF2 (GE)'],
    polyphony: 128,
    casmSupported: true,
    otsSupported: true,
    recommendedSff: 'SFF2',
    drumKits: [
      { name: 'Revo! Drum Real Kit', msb: 127, lsb: 0, pc: 0 },
      { name: 'Standard Kit 1', msb: 127, lsb: 0, pc: 0 },
      { name: 'Electronic Dance Kit', msb: 127, lsb: 0, pc: 24 }
    ],
    bassVoices: [
      { name: 'Super Articulation! Finger Bass', msb: 0, lsb: 118, pc: 33 },
      { name: 'Finger Bass', msb: 0, lsb: 112, pc: 33 }
    ],
    chordVoices: [
      { name: 'CFX Concert Grand', msb: 0, lsb: 122, pc: 0 },
      { name: 'Live! Strings', msb: 0, lsb: 114, pc: 48 }
    ],
    leadVoices: [
      { name: 'S.Art! Saxophone', msb: 0, lsb: 119, pc: 64 },
      { name: 'Sweet! Flute', msb: 0, lsb: 114, pc: 73 }
    ]
  },
  {
    id: 'korg_pa600',
    name: 'Korg Pa600 / Pa700 / Pa4X',
    manufacturer: 'Korg',
    series: 'Professional Arranger (Pa Series)',
    supportedFormats: ['KORG SET (.STY / .PCG)', 'Standard MIDI File'],
    polyphony: 128,
    casmSupported: false,
    otsSupported: false,
    recommendedSff: 'SFF1',
    drumKits: [
      { name: 'Standard Pa Kit', msb: 62, lsb: 0, pc: 0 },
      { name: 'Pop Kit Pa', msb: 62, lsb: 0, pc: 8 }
    ],
    bassVoices: [
      { name: 'RX Bass Finger', msb: 121, lsb: 3, pc: 33 },
      { name: 'Acoustic Upright', msb: 121, lsb: 2, pc: 32 }
    ],
    chordVoices: [
      { name: 'Grand Piano RX', msb: 121, lsb: 4, pc: 0 },
      { name: 'Guitar Strum RX', msb: 121, lsb: 5, pc: 25 }
    ],
    leadVoices: [
      { name: 'Pa Sweet Sax', msb: 121, lsb: 2, pc: 66 },
      { name: 'Lead Synth Dance', msb: 121, lsb: 1, pc: 80 }
    ]
  },
  {
    id: 'roland_ea7',
    name: 'Roland E-A7 / BK-5',
    manufacturer: 'Roland',
    series: 'Expandable Arranger (E-A / BK)',
    supportedFormats: ['Roland STL (.STL)', 'SMF0/1'],
    polyphony: 128,
    casmSupported: false,
    otsSupported: false,
    recommendedSff: 'SFF1',
    drumKits: [
      { name: 'Standard 1 Roland', msb: 127, lsb: 0, pc: 0 },
      { name: 'Ethnic / Asian Kit', msb: 127, lsb: 0, pc: 54 }
    ],
    bassVoices: [
      { name: 'Finger Bass Roland', msb: 0, lsb: 0, pc: 33 }
    ],
    chordVoices: [
      { name: 'Concert Piano Roland', msb: 0, lsb: 0, pc: 0 }
    ],
    leadVoices: [
      { name: 'Saxophone Roland', msb: 0, lsb: 0, pc: 65 }
    ]
  },
  {
    id: 'ketron_sd7',
    name: 'Ketron SD7 / Audya',
    manufacturer: 'Ketron',
    series: 'Ketron Live Arranger',
    supportedFormats: ['Ketron KST (.PAT)', 'SMF0'],
    polyphony: 128,
    casmSupported: false,
    otsSupported: false,
    recommendedSff: 'SFF1',
    drumKits: [
      { name: 'Ketron Live Drums', msb: 0, lsb: 0, pc: 0 }
    ],
    bassVoices: [
      { name: 'Live Bass', msb: 0, lsb: 0, pc: 33 }
    ],
    chordVoices: [
      { name: 'Acoustic Piano', msb: 0, lsb: 0, pc: 0 }
    ],
    leadVoices: [
      { name: 'Solo Horn', msb: 0, lsb: 0, pc: 56 }
    ]
  }
];

export const ARRANGER_CHANNEL_DEFINITIONS = [
  { channel: 9, key: 'rhythm2', label: 'Rhythm 2 (Percussion)', defaultVoice: 'Arabic / Percussion Kit', color: '#f59e0b', ntt: 'Bypass', ntr: 'Fixed' },
  { channel: 10, key: 'rhythm1', label: 'Rhythm 1 (Drums)', defaultVoice: 'Standard Kit 1', color: '#ef4444', ntt: 'Bypass', ntr: 'Fixed' },
  { channel: 11, key: 'bass', label: 'Bass', defaultVoice: 'Finger Bass', color: '#10b981', ntt: 'Bass', ntr: 'Root Transpose' },
  { channel: 12, key: 'chord1', label: 'Chord 1', defaultVoice: 'Live! Concert Grand', color: '#06b6d4', ntt: 'Chord', ntr: 'Root Transpose' },
  { channel: 13, key: 'chord2', label: 'Chord 2', defaultVoice: 'Mega Steel String Guitar', color: '#3b82f6', ntt: 'Chord', ntr: 'Root Transpose' },
  { channel: 14, key: 'pad', label: 'Pad', defaultVoice: 'Live! Strings Ensemble', color: '#8b5cf6', ntt: 'Chord', ntr: 'Root Transpose' },
  { channel: 15, key: 'phrase1', label: 'Phrase 1', defaultVoice: 'Sweet! Soprano Sax', color: '#ec4899', ntt: 'Melodic', ntr: 'Root Transpose' },
  { channel: 16, key: 'phrase2', label: 'Phrase 2', defaultVoice: 'Distortion Rock Solo', color: '#f97316', ntt: 'Melodic', ntr: 'Root Transpose' },
];

export const STYLE_SECTION_DEFINITIONS: {
  id: import('../types').StyleSectionId;
  name: string;
  shortLabel: string;
  group: 'intro' | 'main' | 'fill' | 'break' | 'ending';
  defaultBars: number;
  markerTag: string; // Official Yamaha marker text (e.g. "Main A", "Intro A")
}[] = [
  { id: 'intro_1', name: 'Intro 1 (Basic Short)', shortLabel: 'IN 1', group: 'intro', defaultBars: 2, markerTag: 'Intro A' },
  { id: 'intro_2', name: 'Intro 2 (Standard Melody)', shortLabel: 'IN 2', group: 'intro', defaultBars: 4, markerTag: 'Intro B' },
  { id: 'intro_3', name: 'Intro 3 (Full Orchestration)', shortLabel: 'IN 3', group: 'intro', defaultBars: 8, markerTag: 'Intro C' },
  
  { id: 'main_a', name: 'Main A (Soft / Verse)', shortLabel: 'MAIN A', group: 'main', defaultBars: 2, markerTag: 'Main A' },
  { id: 'main_b', name: 'Main B (Moderate / Verse 2)', shortLabel: 'MAIN B', group: 'main', defaultBars: 2, markerTag: 'Main B' },
  { id: 'main_c', name: 'Main C (Dynamic / Chorus)', shortLabel: 'MAIN C', group: 'main', defaultBars: 4, markerTag: 'Main C' },
  { id: 'main_d', name: 'Main D (Climax / Solo)', shortLabel: 'MAIN D', group: 'main', defaultBars: 4, markerTag: 'Main D' },
  
  { id: 'fill_a', name: 'Fill In A', shortLabel: 'FILL A', group: 'fill', defaultBars: 1, markerTag: 'Fill In AA' },
  { id: 'fill_b', name: 'Fill In B', shortLabel: 'FILL B', group: 'fill', defaultBars: 1, markerTag: 'Fill In BB' },
  { id: 'fill_c', name: 'Fill In C', shortLabel: 'FILL C', group: 'fill', defaultBars: 1, markerTag: 'Fill In CC' },
  { id: 'fill_d', name: 'Fill In D', shortLabel: 'FILL D', group: 'fill', defaultBars: 1, markerTag: 'Fill In DD' },
  
  { id: 'break', name: 'Break (Arranger Accent)', shortLabel: 'BREAK', group: 'break', defaultBars: 1, markerTag: 'Fill In BA' },
  
  { id: 'ending_1', name: 'Ending 1 (Short Outro)', shortLabel: 'END 1', group: 'ending', defaultBars: 2, markerTag: 'Ending A' },
  { id: 'ending_2', name: 'Ending 2 (Standard Melodic)', shortLabel: 'END 2', group: 'ending', defaultBars: 4, markerTag: 'Ending B' },
  { id: 'ending_3', name: 'Ending 3 (Grand Finale)', shortLabel: 'END 3', group: 'ending', defaultBars: 6, markerTag: 'Ending C' },
];
