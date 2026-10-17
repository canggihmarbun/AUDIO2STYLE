import { ProjectData, StyleSectionId, MidiTrack, MidiNote, StyleSection } from '../types';
import { ARRANGER_CHANNEL_DEFINITIONS, STYLE_SECTION_DEFINITIONS } from './keyboardProfiles';

function createEmptyTracks(): Record<number, MidiTrack> {
  const tracks: Record<number, MidiTrack> = {};
  ARRANGER_CHANNEL_DEFINITIONS.forEach(def => {
    tracks[def.channel] = {
      id: `trk_${def.channel}`,
      name: def.label,
      channel: def.channel,
      voiceName: def.defaultVoice,
      msb: def.channel === 10 ? 127 : 0,
      lsb: 0,
      programChange: def.channel === 10 ? 0 : (def.channel === 11 ? 33 : 0),
      volume: 100,
      pan: 64,
      reverb: 40,
      chorus: def.channel === 14 ? 30 : 0,
      notes: [],
      ntr: def.ntr as any,
      ntt: def.ntt as any
    };
  });
  return tracks;
}

function createBaseSections(): Record<StyleSectionId, StyleSection> {
  const sections: Record<string, StyleSection> = {};
  STYLE_SECTION_DEFINITIONS.forEach(def => {
    sections[def.id] = {
      id: def.id,
      name: def.name,
      shortLabel: def.shortLabel,
      group: def.group,
      bars: def.defaultBars,
      tracks: createEmptyTracks()
    };
  });
  return sections as Record<StyleSectionId, StyleSection>;
}

// Generate realistic Pop Ballad 4/4 notes (C Major source chord)
function populatePopBalladNotes(sections: Record<StyleSectionId, StyleSection>) {
  // Main A: 2 bars = 32 steps (16th notes)
  const mainATracks = sections['main_a'].tracks;

  // Drum (Ch 10): Kick on 1 and 3, Snare on 2 and 4, Closed Hi-hat on 8th notes
  // MIDI: 36 = Kick, 38 = Snare (Acoustic), 42 = Closed HH
  const drumNotes: MidiNote[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const offset = bar * 16;
    // Kick on 1, 3 (steps 0, 8, and ghost on 10)
    drumNotes.push({ id: `kick_${offset}_0`, pitch: 36, startStep: offset + 0, durationSteps: 2, velocity: 105, channel: 10 });
    drumNotes.push({ id: `kick_${offset}_8`, pitch: 36, startStep: offset + 8, durationSteps: 2, velocity: 95, channel: 10 });
    drumNotes.push({ id: `kick_${offset}_10`, pitch: 36, startStep: offset + 10, durationSteps: 2, velocity: 80, channel: 10 });
    // Snare on 2, 4 (steps 4, 12)
    drumNotes.push({ id: `snare_${offset}_4`, pitch: 38, startStep: offset + 4, durationSteps: 2, velocity: 110, channel: 10 });
    drumNotes.push({ id: `snare_${offset}_12`, pitch: 38, startStep: offset + 12, durationSteps: 2, velocity: 110, channel: 10 });
    // Hi-hat on 8ths: 0, 2, 4, 6, 8, 10, 12, 14
    for (let s = 0; s < 16; s += 2) {
      drumNotes.push({ id: `hh_${offset}_${s}`, pitch: 42, startStep: offset + s, durationSteps: 1, velocity: s % 4 === 0 ? 90 : 75, channel: 10 });
    }
  }
  mainATracks[10].notes = drumNotes;

  // Bass (Ch 11): C root notes, walking 8th rhythm (C1 = 36 or C2 = 48)
  const bassNotes: MidiNote[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const offset = bar * 16;
    bassNotes.push({ id: `b_${offset}_0`, pitch: 36, startStep: offset + 0, durationSteps: 3, velocity: 100, channel: 11 }); // C
    bassNotes.push({ id: `b_${offset}_4`, pitch: 36, startStep: offset + 4, durationSteps: 3, velocity: 95, channel: 11 });
    bassNotes.push({ id: `b_${offset}_8`, pitch: 36, startStep: offset + 8, durationSteps: 2, velocity: 100, channel: 11 });
    bassNotes.push({ id: `b_${offset}_12`, pitch: 43, startStep: offset + 12, durationSteps: 2, velocity: 90, channel: 11 }); // G
    bassNotes.push({ id: `b_${offset}_14`, pitch: 47, startStep: offset + 14, durationSteps: 2, velocity: 85, channel: 11 }); // B
  }
  mainATracks[11].notes = bassNotes;

  // Chord 1 (Ch 12): Piano arpeggio (C Major: C4=60, E4=64, G4=67, C5=72)
  const chord1Notes: MidiNote[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const offset = bar * 16;
    // Arpeggio pattern
    chord1Notes.push({ id: `c1_${offset}_0`, pitch: 60, startStep: offset + 0, durationSteps: 4, velocity: 88, channel: 12 });
    chord1Notes.push({ id: `c1_${offset}_2`, pitch: 64, startStep: offset + 2, durationSteps: 4, velocity: 82, channel: 12 });
    chord1Notes.push({ id: `c1_${offset}_4`, pitch: 67, startStep: offset + 4, durationSteps: 4, velocity: 85, channel: 12 });
    chord1Notes.push({ id: `c1_${offset}_6`, pitch: 72, startStep: offset + 6, durationSteps: 4, velocity: 90, channel: 12 });
    chord1Notes.push({ id: `c1_${offset}_8`, pitch: 67, startStep: offset + 8, durationSteps: 4, velocity: 80, channel: 12 });
    chord1Notes.push({ id: `c1_${offset}_10`, pitch: 64, startStep: offset + 10, durationSteps: 4, velocity: 78, channel: 12 });
    chord1Notes.push({ id: `c1_${offset}_12`, pitch: 67, startStep: offset + 12, durationSteps: 4, velocity: 85, channel: 12 });
    chord1Notes.push({ id: `c1_${offset}_14`, pitch: 60, startStep: offset + 14, durationSteps: 2, velocity: 75, channel: 12 });
  }
  mainATracks[12].notes = chord1Notes;

  // Pad (Ch 14): Warm strings sustained C Major triad (C4, E4, G4)
  const padNotes: MidiNote[] = [
    { id: 'pad_0_c', pitch: 60, startStep: 0, durationSteps: 32, velocity: 70, channel: 14 },
    { id: 'pad_0_e', pitch: 64, startStep: 0, durationSteps: 32, velocity: 68, channel: 14 },
    { id: 'pad_0_g', pitch: 67, startStep: 0, durationSteps: 32, velocity: 72, channel: 14 },
  ];
  mainATracks[14].notes = padNotes;

  // Fill In A: Drum roll with crash on beat 1 of next bar
  const fillATracks = sections['fill_a'].tracks;
  const fillDrums: MidiNote[] = [];
  fillDrums.push({ id: 'fd_0', pitch: 36, startStep: 0, durationSteps: 2, velocity: 100, channel: 10 });
  fillDrums.push({ id: 'fd_4', pitch: 38, startStep: 4, durationSteps: 2, velocity: 100, channel: 10 });
  // Tom fills on steps 8, 10, 12, 14 (Toms 48, 47, 45, 43)
  fillDrums.push({ id: 'fd_8', pitch: 48, startStep: 8, durationSteps: 1, velocity: 95, channel: 10 });
  fillDrums.push({ id: 'fd_9', pitch: 48, startStep: 9, durationSteps: 1, velocity: 95, channel: 10 });
  fillDrums.push({ id: 'fd_10', pitch: 47, startStep: 10, durationSteps: 1, velocity: 100, channel: 10 });
  fillDrums.push({ id: 'fd_11', pitch: 47, startStep: 11, durationSteps: 1, velocity: 100, channel: 10 });
  fillDrums.push({ id: 'fd_12', pitch: 45, startStep: 12, durationSteps: 1, velocity: 105, channel: 10 });
  fillDrums.push({ id: 'fd_13', pitch: 45, startStep: 13, durationSteps: 1, velocity: 105, channel: 10 });
  fillDrums.push({ id: 'fd_14', pitch: 38, startStep: 14, durationSteps: 1, velocity: 115, channel: 10 });
  fillDrums.push({ id: 'fd_15', pitch: 38, startStep: 15, durationSteps: 1, velocity: 120, channel: 10 });
  fillATracks[10].notes = fillDrums;

  // Main B: More intense rhythm
  const mainBTracks = sections['main_b'].tracks;
  mainBTracks[10].notes = [
    ...drumNotes,
    // Add open hi-hat on upbeat
    { id: 'ohh_2', pitch: 46, startStep: 2, durationSteps: 2, velocity: 90, channel: 10 },
    { id: 'ohh_10', pitch: 46, startStep: 10, durationSteps: 2, velocity: 90, channel: 10 },
    { id: 'ohh_18', pitch: 46, startStep: 18, durationSteps: 2, velocity: 90, channel: 10 },
    { id: 'ohh_26', pitch: 46, startStep: 26, durationSteps: 2, velocity: 90, channel: 10 },
  ];
  mainBTracks[11].notes = bassNotes;
  mainBTracks[12].notes = chord1Notes;
  mainBTracks[14].notes = padNotes;
}

// Generate realistic Dangdut Koplo S750 notes
function populateDangdutKoploNotes(sections: Record<StyleSectionId, StyleSection>) {
  const mainATracks = sections['main_a'].tracks;
  // Sub-Rhythm Ch 9: Kendang Dangdut Tabla (Tung, Tak, Dhot)
  // Mapping on Yamaha: 60 = Tak, 62 = Tung, 64 = Dhot/Dut
  const kendangNotes: MidiNote[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * 16;
    // Classic Koplo / Dangdut syncopation
    kendangNotes.push({ id: `kd_${o}_0`, pitch: 64, startStep: o + 0, durationSteps: 2, velocity: 110, channel: 9 }); // Dut
    kendangNotes.push({ id: `kd_${o}_3`, pitch: 60, startStep: o + 3, durationSteps: 1, velocity: 95, channel: 9 }); // Tak
    kendangNotes.push({ id: `kd_${o}_6`, pitch: 62, startStep: o + 6, durationSteps: 1, velocity: 90, channel: 9 }); // Tung
    kendangNotes.push({ id: `kd_${o}_8`, pitch: 64, startStep: o + 8, durationSteps: 2, velocity: 105, channel: 9 }); // Dut
    kendangNotes.push({ id: `kd_${o}_11`, pitch: 60, startStep: o + 11, durationSteps: 1, velocity: 95, channel: 9 }); // Tak
    kendangNotes.push({ id: `kd_${o}_12`, pitch: 60, startStep: o + 12, durationSteps: 1, velocity: 100, channel: 9 }); // Tak
    kendangNotes.push({ id: `kd_${o}_14`, pitch: 62, startStep: o + 14, durationSteps: 1, velocity: 92, channel: 9 }); // Tung
  }
  mainATracks[9].notes = kendangNotes;

  // Rhythm 1 Ch 10: Drum kit (Tambourine, Hi-hat, Kick accent)
  const drumNotes: MidiNote[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * 16;
    drumNotes.push({ id: `dk_${o}_0`, pitch: 36, startStep: o + 0, durationSteps: 2, velocity: 100, channel: 10 });
    drumNotes.push({ id: `dk_${o}_8`, pitch: 36, startStep: o + 8, durationSteps: 2, velocity: 100, channel: 10 });
    // Tambourine / Shaker on 16ths
    for (let s = 0; s < 16; s++) {
      drumNotes.push({ id: `sh_${o}_${s}`, pitch: 54, startStep: o + s, durationSteps: 1, velocity: s % 2 === 0 ? 80 : 65, channel: 10 });
    }
  }
  mainATracks[10].notes = drumNotes;

  // Bass Ch 11: Bouncy Dangdut Bass
  const bassNotes: MidiNote[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * 16;
    bassNotes.push({ id: `db_${o}_0`, pitch: 36, startStep: o + 0, durationSteps: 2, velocity: 110, channel: 11 }); // C
    bassNotes.push({ id: `db_${o}_4`, pitch: 48, startStep: o + 4, durationSteps: 2, velocity: 90, channel: 11 }); // C high
    bassNotes.push({ id: `db_${o}_8`, pitch: 43, startStep: o + 8, durationSteps: 2, velocity: 105, channel: 11 }); // G
    bassNotes.push({ id: `db_${o}_12`, pitch: 48, startStep: o + 12, durationSteps: 2, velocity: 95, channel: 11 }); // C high
  }
  mainATracks[11].notes = bassNotes;

  // Chord 1 Ch 12: Staccato Guitar / Piano Chop (Reggae/Dangdut style off-beats)
  const chordNotes: MidiNote[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const o = bar * 16;
    // Offbeats on 2, 6, 10, 14
    [2, 6, 10, 14].forEach(step => {
      chordNotes.push({ id: `dch_${o}_${step}_1`, pitch: 60, startStep: o + step, durationSteps: 1, velocity: 90, channel: 12 });
      chordNotes.push({ id: `dch_${o}_${step}_2`, pitch: 64, startStep: o + step, durationSteps: 1, velocity: 88, channel: 12 });
      chordNotes.push({ id: `dch_${o}_${step}_3`, pitch: 67, startStep: o + step, durationSteps: 1, velocity: 92, channel: 12 });
    });
  }
  mainATracks[12].notes = chordNotes;

  // Phrase 1 Ch 15: Suling / Flute riff
  const fluteNotes: MidiNote[] = [
    { id: 'fl_0', pitch: 72, startStep: 0, durationSteps: 3, velocity: 95, channel: 15 },
    { id: 'fl_4', pitch: 74, startStep: 4, durationSteps: 2, velocity: 90, channel: 15 },
    { id: 'fl_6', pitch: 76, startStep: 6, durationSteps: 4, velocity: 100, channel: 15 },
    { id: 'fl_12', pitch: 74, startStep: 12, durationSteps: 2, velocity: 85, channel: 15 },
    { id: 'fl_14', pitch: 72, startStep: 14, durationSteps: 2, velocity: 80, channel: 15 },
  ];
  mainATracks[15].notes = fluteNotes;
}

export function createDefaultProject(templateId?: string): ProjectData {
  const sections = createBaseSections();

  if (templateId === 'dangdut_koplo') {
    populateDangdutKoploNotes(sections);
    return {
      id: 'proj_dangdut_s750',
      title: 'Dangdut Koplo Nusantara S750',
      artist: 'Yamaha PSR-S750 Master',
      genre: 'Dangdut Koplo',
      tempo: 135,
      timeSignature: '4/4',
      targetKeyboardId: 'yamaha_psr_s750',
      targetSff: 'SFF1',
      chords: [
        { bar: 1, beat: 1, chord: 'C', root: 'C', type: 'maj', confidence: 0.98 },
        { bar: 2, beat: 1, chord: 'Am', root: 'A', type: 'min', confidence: 0.94 },
        { bar: 3, beat: 1, chord: 'Dm', root: 'D', type: 'min', confidence: 0.92 },
        { bar: 4, beat: 1, chord: 'G7', root: 'G', type: '7', confidence: 0.96 },
      ],
      sections,
      activeSectionId: 'main_a',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Style Dangdut Koplo dioptimalkan untuk aransemen live keyboard Yamaha PSR-S750. Kendang di Ch 9, drum di Ch 10, bass di Ch 11.'
    };
  }

  // Default: Pop Ballad Indo
  populatePopBalladNotes(sections);
  return {
    id: 'proj_pop_ballad_s750',
    title: 'Pop Ballad Indonesia S750',
    artist: 'Audio2Style Pro Studio',
    genre: 'Pop Ballad',
    tempo: 72,
    timeSignature: '4/4',
    targetKeyboardId: 'yamaha_psr_s750',
    targetSff: 'SFF1',
    chords: [
      { bar: 1, beat: 1, chord: 'C', root: 'C', type: 'maj', confidence: 0.99 },
      { bar: 2, beat: 1, chord: 'G/B', root: 'G', type: 'maj', confidence: 0.91 },
      { bar: 3, beat: 1, chord: 'Am', root: 'A', type: 'min', confidence: 0.95 },
      { bar: 4, beat: 1, chord: 'F', root: 'F', type: 'maj', confidence: 0.93 },
    ],
    sections,
    activeSectionId: 'main_a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Template Pop Ballad dengan arpeggio piano jernih dan string pad hangat, diuji kompatibel pada Yamaha PSR-S750 dan seri PSR-S/SX.'
  };
}

export const TEMPLATE_PROJECTS = [
  {
    id: 'pop_ballad',
    title: 'Pop Ballad Indonesia (SFF1)',
    genre: 'Pop Ballad',
    tempo: 72,
    target: 'Yamaha PSR-S750',
    description: 'Arpeggio grand piano, string pad hangat, drum halus, dan bass bulat. Cocok untuk lagu pop emosional.',
    bars: 2
  },
  {
    id: 'dangdut_koplo',
    title: 'Dangdut Koplo Modern (SFF1)',
    genre: 'Dangdut Koplo',
    tempo: 135,
    target: 'Yamaha PSR-S750',
    description: 'Kendang tabla dinamis pada Ch 9, suling bambu Sweet! di Ch 15, staccato gitar rhythm, bass gesit.',
    bars: 2
  },
  {
    id: 'pop_rock',
    title: 'Pop Rock 8-Beat Solid',
    genre: 'Pop Rock',
    tempo: 120,
    target: 'Yamaha PSR-S750',
    description: 'Drive gitar ritmik, power rock snare & kick, pick electric bass, dan synth hook dinamis.',
    bars: 4
  },
  {
    id: 'worship_slow',
    title: 'Slow Worship 6/8 Anthem',
    genre: 'Worship / Slow Rock',
    tempo: 68,
    target: 'Yamaha PSR-S750',
    description: 'Ketukan 6/8 dengan piano akustik dinamis, pad megah, cymbal swell, dan bass mantap.',
    bars: 2
  },
  {
    id: 'campursari_jawa',
    title: 'Campursari Langgam Jawa',
    genre: 'Traditional / Campursari',
    tempo: 105,
    target: 'Yamaha PSR-S750',
    description: 'Gamelan/saron aksen, kendang ketipung, akustik bas, dan string gamelan khas Jawa.',
    bars: 4
  }
];
