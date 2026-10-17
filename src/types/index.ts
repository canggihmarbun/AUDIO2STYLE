export type NavTab = 
  | 'dashboard'
  | 'audio_converter'
  | 'chord_analyzer'
  | 'midi_editor'
  | 'style_creator'
  | 'compatibility'
  | 'export_manager'
  | 'web_midi'
  | 'project_library'
  | 'settings';

export interface AudioMetadata {
  name: string;
  size: number;
  type: string;
  duration: number; // in seconds
  sampleRate: number;
  channels: number;
  detectedBpm: number;
  detectedKey: string;
  detectedTimeSignature: string;
  peaks?: number[];
}

export type StemType = 'drum' | 'bass' | 'chord' | 'melody';

export interface StemTrack {
  id: StemType;
  name: string;
  color: string;
  icon: string;
  volume: number; // 0 to 1
  muted: boolean;
  solo: boolean;
  pan: number; // -1 to 1
  channel: number; // Arranger target channel (e.g. 10 for drums, 11 for bass)
  notesCount: number;
}

export interface MidiNote {
  id: string;
  pitch: number; // 0 - 127 (MIDI pitch, 60 = Middle C)
  startStep: number; // 16th note steps (0, 1, 2, ...)
  durationSteps: number; // length in 16th note steps (e.g. 1 = 16th note, 4 = quarter note)
  velocity: number; // 1 - 127
  channel: number; // 1 - 16
}

export interface MidiTrack {
  id: string;
  name: string;
  channel: number; // 9 = Sub-Rhythm, 10 = Rhythm 1 (Drums), 11 = Bass, 12 = Chord 1, 13 = Chord 2, 14 = Pad, 15 = Phrase 1, 16 = Phrase 2
  voiceName: string;
  msb: number;
  lsb: number;
  programChange: number;
  volume: number;
  pan: number;
  reverb: number;
  chorus: number;
  notes: MidiNote[];
  ntr: 'Root Transpose' | 'Fixed';
  ntt: 'Chord' | 'Melodic' | 'Bass' | 'Bypass' | 'Harmonic';
}

export type StyleSectionId = 
  | 'intro_1' | 'intro_2' | 'intro_3'
  | 'main_a' | 'main_b' | 'main_c' | 'main_d'
  | 'fill_a' | 'fill_b' | 'fill_c' | 'fill_d'
  | 'break'
  | 'ending_1' | 'ending_2' | 'ending_3';

export interface StyleSection {
  id: StyleSectionId;
  name: string;
  shortLabel: string;
  group: 'intro' | 'main' | 'fill' | 'break' | 'ending';
  bars: number; // 1 - 32
  tracks: Record<number, MidiTrack>; // key is MIDI channel 9-16
}

export interface ChordEvent {
  bar: number;
  beat: number;
  chord: string; // e.g. "C", "Am", "G7", "F#m7b5"
  root: string; // "C", "D", "E", etc.
  type: string; // "maj", "min", "7", "m7", etc.
  confidence: number; // 0 - 1
}

export interface KeyboardProfile {
  id: string;
  name: string;
  manufacturer: 'Yamaha' | 'Korg' | 'Roland' | 'Ketron' | 'Casio';
  series: string;
  supportedFormats: string[]; // e.g. ["SFF1", "SFF2 (GE)"]
  polyphony: number;
  drumKits: { name: string; msb: number; lsb: number; pc: number }[];
  bassVoices: { name: string; msb: number; lsb: number; pc: number; isMegaVoice?: boolean }[];
  chordVoices: { name: string; msb: number; lsb: number; pc: number; isMegaVoice?: boolean }[];
  leadVoices: { name: string; msb: number; lsb: number; pc: number; isSweetVoice?: boolean }[];
  casmSupported: boolean;
  otsSupported: boolean;
  recommendedSff: 'SFF1' | 'SFF2';
}

export interface ProjectData {
  id: string;
  title: string;
  artist: string;
  genre: string;
  tempo: number;
  timeSignature: string; // "4/4", "3/4", "6/8"
  sourceAudio?: {
    name: string;
    size: number;
    duration: number;
  };
  targetKeyboardId: string; // e.g. "yamaha_psr_s750"
  targetSff: 'SFF1' | 'SFF2';
  chords: ChordEvent[];
  sections: Record<StyleSectionId, StyleSection>;
  activeSectionId: StyleSectionId;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface StyleValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  section?: string;
  channel?: number;
}

export interface StyleValidationResult {
  valid: boolean;
  format: 'SFF1 (PSR-S750 Standard)' | 'SFF2 (Guitar Edition)' | 'Standard MIDI File 0';
  sectionsFound: string[];
  channelsUsed: number[];
  issues: StyleValidationIssue[];
  casmValid: boolean;
  estimatedFileSizeKb: number;
}

export type ConversionEngineType = 'browser_dsp' | 'python_bridge';

export interface AudioConversionResult {
  success: boolean;
  engineUsed: ConversionEngineType;
  engineName: string;
  detectedBpm: number;
  detectedKey: string;
  keyConfidence: number;
  chords: ChordEvent[];
  tracksNotes: {
    drum: MidiNote[];
    bass: MidiNote[];
    chord: MidiNote[];
    melody: MidiNote[];
  };
  stats: {
    totalNotes: number;
    drumCount: number;
    bassCount: number;
    chordCount: number;
    melodyCount: number;
    avgVelocity: number;
    barsExtracted: number;
  };
  error?: string;
}
