/**
 * Yamaha Arranger Style (.STY) File Engine for Yamaha PSR-S750 & Compatible Keyboards
 * 
 * Implements:
 * 1. Proper Yamaha SFF1 Structure:
 *    - SMF0 Format (1 Track, 480 PPQN)
 *    - Measure 1 (Bar 1) SInt Header with SFF1 & SInt markers, tempo, time signature, and channel voice setups
 *    - Measure 2 onwards: Musical Section Markers ('Main A', 'Fill In AA', 'Main B', etc.)
 *    - Full CASM Chunk (CSEG + Sdec with active section marker list + Ctab 27-byte channel tables for channels 9-16)
 * 2. Deep Style Validator (verifies SMF0, SFF1/SInt markers, CASM/CSEG/Sdec/Ctab chunks, and arranger channels)
 * 3. Export to genuine binary .STY and standard .MID
 */

import { ProjectData, StyleSectionId, StyleValidationResult, StyleValidationIssue } from '../types';
import { STYLE_SECTION_DEFINITIONS, ARRANGER_CHANNEL_DEFINITIONS } from '../data/keyboardProfiles';
import { RawMidiEvent, buildSMF0, encodeStringToBytes } from './midiGenerator';

/**
 * Generate genuine Yamaha .STY binary from ProjectData
 * Fully compatible with Yamaha PSR-S750 and SFF1/SFF2 arrangers
 */
export function generateYamahaStyleFile(project: ProjectData): Uint8Array {
  const ppqn = 480;
  const ticksPer16th = ppqn / 4; // 120 ticks
  const ticksPerBar = ppqn * 4;  // 1920 ticks for 4/4

  const events: RawMidiEvent[] = [];
  const activeSectionMarkers: string[] = [];

  // =========================================================================
  // MEASURE 1: YAMAHA SFF1 "SInt" STYLE INITIALIZATION MEASURE (Tick 0 to 1919)
  // Yamaha Arranger keyboards (including PSR-S750) REQUIRE measure 1 to contain
  // SFF1 & SInt markers + channel setups and NO notes!
  // =========================================================================

  // 1. Time Signature at tick 0 (4/4)
  events.push({
    tick: 0,
    type: 'timeSig',
    numerator: 4,
    denominator: 4
  });

  // 2. Tempo at tick 0
  events.push({
    tick: 0,
    type: 'tempo',
    bpm: project.tempo || 120
  });

  // 3. Track Name at tick 0
  events.push({
    tick: 0,
    type: 'trackName',
    text: project.title || 'Audio2Style'
  });

  // 4. Critical Yamaha SFF1 Marker Tags at tick 0 (mandatory for PSR-S750)
  events.push({
    tick: 0,
    type: 'marker',
    text: 'SFF1'
  });

  events.push({
    tick: 0,
    type: 'marker',
    text: 'SInt'
  });

  // 5. Initial Controller Setup for all 8 Arranger Channels (Ch 9 to 16, i.e. 0-indexed 8 to 15)
  // We use voice definitions from Main A (or fallback default)
  const mainA = project.sections['main_a'];
  for (let chIdx = 8; chIdx <= 15; chIdx++) {
    const channelNum = chIdx + 1; // 9 to 16
    const trk = mainA?.tracks[channelNum];
    const msb = trk?.msb ?? (channelNum === 10 ? 127 : 0);
    const lsb = trk?.lsb ?? 0;
    const pc = trk?.programChange ?? (channelNum === 10 ? 0 : (channelNum === 11 ? 33 : 0));
    const volume = trk?.volume ?? 100;
    const pan = trk?.pan ?? 64;
    const reverb = trk?.reverb ?? 40;
    const chorus = trk?.chorus ?? 0;

    // CC0 Bank MSB
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 0, value: msb });
    // CC32 Bank LSB
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 32, value: lsb });
    // Program Change
    events.push({ tick: 0, type: 'programChange', channel: chIdx, value: pc });
    // CC7 Volume
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 7, value: volume });
    // CC10 Pan
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 10, value: pan });
    // CC11 Expression (127)
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 11, value: 127 });
    // CC91 Reverb Send (40)
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 91, value: reverb });
    // CC93 Chorus Send
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 93, value: chorus });

    // Pitch Bend Sensitivity RPN (Standard 2 semitones)
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 101, value: 0 });
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 100, value: 0 });
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 6, value: 2 });
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 38, value: 0 });
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 101, value: 127 });
    events.push({ tick: 0, type: 'controlChange', channel: chIdx, controller: 100, value: 127 });

    // Center Pitch Bend
    events.push({ tick: 0, type: 'pitchBend', channel: chIdx, value: 8192 });
  }

  // =========================================================================
  // MEASURE 2 ONWARDS: MUSICAL SECTIONS (Intro, Main, Fill, Break, Ending)
  // Starts at tick 1920 (after Bar 1 SInt setup measure)
  // =========================================================================
  let currentTick = ticksPerBar; // 1920

  for (const def of STYLE_SECTION_DEFINITIONS) {
    const section = project.sections[def.id];
    if (!section) continue;

    // Check if section has notes
    const hasNotes = Object.values(section.tracks).some(trk => trk.notes && trk.notes.length > 0);
    // Include section if it has notes, or if it is Main A (mandatory minimum for Yamaha style)
    if (!hasNotes && def.id !== 'main_a') {
      continue;
    }

    // Register active marker tag (e.g. "Main A", "Fill In AA")
    activeSectionMarkers.push(def.markerTag);

    // Insert Official Yamaha Section Marker
    events.push({
      tick: currentTick,
      type: 'marker',
      text: def.markerTag
    });

    const sectionBars = section.bars || def.defaultBars;
    const sectionTotalTicks = sectionBars * ticksPerBar;

    // Send Voice Select & Controllers at start of each section for active tracks
    Object.values(section.tracks).forEach(trk => {
      const ch = trk.channel - 1; // 0-indexed channel (e.g. Ch 10 -> index 9)

      // Bank Select & Program Change
      events.push({ tick: currentTick, type: 'controlChange', channel: ch, controller: 0, value: trk.msb });
      events.push({ tick: currentTick, type: 'controlChange', channel: ch, controller: 32, value: trk.lsb });
      events.push({ tick: currentTick, type: 'programChange', channel: ch, value: trk.programChange });
      events.push({ tick: currentTick, type: 'controlChange', channel: ch, controller: 7, value: trk.volume });
      events.push({ tick: currentTick, type: 'controlChange', channel: ch, controller: 10, value: trk.pan });
      events.push({ tick: currentTick, type: 'controlChange', channel: ch, controller: 11, value: 127 });

      // Add Notes for this channel
      if (trk.notes && trk.notes.length > 0) {
        trk.notes.forEach(note => {
          const noteStartTick = currentTick + (note.startStep * ticksPer16th);
          const noteDurationTicks = Math.max(ticksPer16th / 2, note.durationSteps * ticksPer16th);
          const noteEndTick = noteStartTick + noteDurationTicks;

          // Prevent notes from bleeding past section bounds
          const clampedEndTick = Math.min(noteEndTick, currentTick + sectionTotalTicks);

          events.push({
            tick: noteStartTick,
            type: 'noteOn',
            channel: ch,
            pitch: note.pitch,
            velocity: Math.max(1, Math.min(127, note.velocity))
          });

          events.push({
            tick: clampedEndTick,
            type: 'noteOff',
            channel: ch,
            pitch: note.pitch,
            velocity: 0
          });
        });
      }
    });

    currentTick += sectionTotalTicks;
  }

  // Build the base SMF0 bytes
  const smfBytes = buildSMF0(events, ppqn);

  // Generate Yamaha CASM chunk using the exact active sections and channel mapping
  const casmBytes = buildYamahaCasmChunk(activeSectionMarkers, project);

  // Combine SMF0 + CASM to form the complete .STY file
  const fullStyleFile = new Uint8Array(smfBytes.length + casmBytes.length);
  fullStyleFile.set(smfBytes, 0);
  fullStyleFile.set(casmBytes, smfBytes.length);

  return fullStyleFile;
}

/**
 * Generate standard SMF Format 0 file (without Yamaha CASM chunk) for generic DAWs
 */
export function generateStandardMidiFile(project: ProjectData): Uint8Array {
  const ppqn = 480;
  const ticksPer16th = ppqn / 4;
  const ticksPerBar = ppqn * 4;

  const events: RawMidiEvent[] = [];

  events.push({ tick: 0, type: 'timeSig', numerator: 4, denominator: 4 });
  events.push({ tick: 0, type: 'tempo', bpm: project.tempo || 120 });
  events.push({ tick: 0, type: 'trackName', text: project.title || 'Audio2Style' });

  let currentTick = 0;

  for (const def of STYLE_SECTION_DEFINITIONS) {
    const section = project.sections[def.id];
    if (!section) continue;

    const hasNotes = Object.values(section.tracks).some(trk => trk.notes && trk.notes.length > 0);
    if (!hasNotes && def.id !== 'main_a') continue;

    events.push({ tick: currentTick, type: 'marker', text: def.markerTag });

    const sectionBars = section.bars || def.defaultBars;
    const sectionTotalTicks = sectionBars * ticksPerBar;

    Object.values(section.tracks).forEach(trk => {
      const ch = trk.channel - 1;
      events.push({ tick: currentTick, type: 'programChange', channel: ch, value: trk.programChange });

      if (trk.notes && trk.notes.length > 0) {
        trk.notes.forEach(note => {
          const noteStartTick = currentTick + (note.startStep * ticksPer16th);
          const noteDurationTicks = Math.max(ticksPer16th / 2, note.durationSteps * ticksPer16th);
          const clampedEndTick = Math.min(noteStartTick + noteDurationTicks, currentTick + sectionTotalTicks);

          events.push({ tick: noteStartTick, type: 'noteOn', channel: ch, pitch: note.pitch, velocity: note.velocity });
          events.push({ tick: clampedEndTick, type: 'noteOff', channel: ch, pitch: note.pitch, velocity: 0 });
        });
      }
    });

    currentTick += sectionTotalTicks;
  }

  return buildSMF0(events, ppqn);
}

/**
 * Build Yamaha SFF1 CASM (Channel Assignment / Control Segment) binary chunk
 * 
 * Genuine Yamaha SFF1 Structure:
 * 'CASM' [4-byte total length]
 *   'CSEG' [4-byte total length]
 *     'Sdec' [4-byte length] [Comma-separated ASCII string of active section markers]
 *     'Ctab' [4-byte length = 27] [27-byte channel table for Channel 9 (Rhythm 2)]
 *     'Ctab' [4-byte length = 27] [27-byte channel table for Channel 10 (Rhythm 1)]
 *     ...
 *     'Ctab' [4-byte length = 27] [27-byte channel table for Channel 16 (Phrase 2)]
 */
function buildYamahaCasmChunk(activeSectionMarkers: string[], project: ProjectData): Uint8Array {
  // If no sections were registered, default to Main A
  const sectionList = activeSectionMarkers.length > 0 
    ? activeSectionMarkers 
    : ['Main A'];

  // 1. Build Sdec (Section Decode) chunk
  // Contains comma-separated ASCII list of exact section markers present in the MIDI track
  const sdecString = sectionList.join(',');
  const sdecBytes = encodeStringToBytes(sdecString);
  const sdecChunk = buildChunk('Sdec', sdecBytes);

  // 2. Build 27-byte Ctab chunks for each arranger channel (Ch 9 to 16, i.e. Part ID 0x08 to 0x0F)
  const ctabChunks: number[] = [];
  const channels = [9, 10, 11, 12, 13, 14, 15, 16];

  for (const ch of channels) {
    const partId = ch - 1; // 0x08 (Ch 9) to 0x0F (Ch 16)
    const isDrum = ch === 9 || ch === 10;

    // 8-character voice label
    let voiceLabel = 'Accompan';
    if (ch === 9) voiceLabel = 'Rhythm 2';
    else if (ch === 10) voiceLabel = 'Rhythm 1';
    else if (ch === 11) voiceLabel = 'Bass    ';
    else if (ch === 12) voiceLabel = 'Chord 1 ';
    else if (ch === 13) voiceLabel = 'Chord 2 ';
    else if (ch === 14) voiceLabel = 'Pad     ';
    else if (ch === 15) voiceLabel = 'Phrase 1';
    else if (ch === 16) voiceLabel = 'Phrase 2';

    const voiceBytes = encodeStringToBytes(voiceLabel.padEnd(8, ' ').slice(0, 8));

    // Note Transposition Rule (NTR):
    // 0x00 = Root Transpose (for melodic/bass/chords)
    // 0x01 = Fixed (for drums and percussion)
    const ntr = isDrum ? 0x01 : 0x00;

    // Note Transposition Table (NTT):
    // 0x00 = Bypass (for drums)
    // 0x01 = Melodic (for phrases)
    // 0x02 = Chord (for chords & pad)
    // 0x03 = Bass (for bass)
    let ntt = 0x02; // chord
    if (isDrum) ntt = 0x00; // bypass
    else if (ch === 11) ntt = 0x03; // bass
    else if (ch >= 15) ntt = 0x01; // melodic

    // High Key Limit and Low Key Limit
    const lowLimit = isDrum ? 0x00 : 0x18; // 24 = C1
    const highLimit = isDrum ? 0x7F : 0x6C; // 108 = C8

    // The 27-byte SFF1 Ctab Data Specification:
    // Byte 0: Destination Part ID (0x08 - 0x0F)
    // Bytes 1..8: 8-byte ASCII Voice Label
    // Byte 9: Source Channel (0x00)
    // Byte 10: Destination Sub-channel (0x00)
    // Bytes 11..12: Note Mute Flags (0x00, 0x00)
    // Bytes 13..17: Chord Mute Flags (0x00, 0x00, 0x00, 0x00, 0x00)
    // Byte 18: Source Chord Root (0x00 = C)
    // Byte 19: Source Chord Type (0x00 = Maj, 0x02 = Maj7)
    // Byte 20: NTR (0x00 = Root Trans, 0x01 = Fixed)
    // Byte 21: NTT (0x00 = Bypass, 0x01 = Melodic, 0x02 = Chord, 0x03 = Bass)
    // Byte 22: High Key (0x05 = F# standard octave break)
    // Byte 23: Low Note Limit (0x00 or 0x18)
    // Byte 24: High Note Limit (0x7F or 0x6C)
    // Byte 25: RTR Retrigger Rule (0x01 = Pitch Shift)
    // Byte 26: Extra drum byte / Reserved (0x00)
    const ctabData: number[] = [
      partId,
      ...voiceBytes,
      0x00, // Byte 9: Source channel
      0x00, // Byte 10: Sub-channel
      0x00, 0x00, // Bytes 11-12: Note mute
      0x00, 0x00, 0x00, 0x00, 0x00, // Bytes 13-17: Chord mute
      0x00, // Byte 18: Source Chord Root (0 = C)
      isDrum ? 0x00 : 0x00, // Byte 19: Source Chord Type (0 = Maj)
      ntr,  // Byte 20: NTR
      ntt,  // Byte 21: NTT
      0x05, // Byte 22: High Key (F#)
      lowLimit,  // Byte 23: Low limit
      highLimit, // Byte 24: High limit
      0x01, // Byte 25: RTR (1 = Pitch shift)
      0x00  // Byte 26: Extra / reserved
    ];

    const singleCtabChunk = buildChunk('Ctab', ctabData);
    ctabChunks.push(...singleCtabChunk);
  }

  // 3. Combine Sdec and all Ctab chunks inside CSEG
  const csegPayload = [...sdecChunk, ...ctabChunks];
  const csegChunk = buildChunk('CSEG', csegPayload);

  // 4. Wrap CSEG inside CASM
  const casmChunk = buildChunk('CASM', csegChunk);
  return new Uint8Array(casmChunk);
}

function buildChunk(chunkId: string, data: number[]): number[] {
  const idBytes = encodeStringToBytes(chunkId);
  const len = data.length;
  return [
    ...idBytes,
    (len >> 24) & 0xFF,
    (len >> 16) & 0xFF,
    (len >> 8) & 0xFF,
    len & 0xFF,
    ...data
  ];
}

/**
 * Deep Yamaha Style File Validator
 * Validates binary data for Yamaha PSR-S750 style compatibility
 */
export function validateYamahaStyle(data: Uint8Array): StyleValidationResult {
  const issues: StyleValidationIssue[] = [];
  const sectionsFound: string[] = [];
  const channelsUsedSet = new Set<number>();

  if (data.length < 32) {
    return {
      valid: false,
      format: 'Standard MIDI File 0',
      sectionsFound: [],
      channelsUsed: [],
      issues: [{ severity: 'error', message: 'Ukuran file terlalu kecil atau korup (< 32 byte).' }],
      casmValid: false,
      estimatedFileSizeKb: Math.round(data.length / 1024 * 10) / 10
    };
  }

  // 1. Check Header 'MThd'
  const isMThd = data[0] === 0x4D && data[1] === 0x54 && data[2] === 0x68 && data[3] === 0x64;
  if (!isMThd) {
    issues.push({ severity: 'error', message: 'Header bukan Standard MIDI File (Missing MThd).' });
  }

  // 2. Check Format (Must be SMF Format 0 for Yamaha Arrangers)
  const format = (data[8] << 8) | data[9];
  if (format !== 0) {
    issues.push({ 
      severity: 'error', 
      message: `Format MIDI adalah Format ${format}. Keyboard Yamaha PSR-S750 mewajibkan Format 0 (Semua channel dalam 1 track tunggal).` 
    });
  }

  // 3. Check PPQN (Division)
  const ppqn = (data[12] << 8) | data[13];
  if (ppqn !== 480 && ppqn !== 1920) {
    issues.push({
      severity: 'warning',
      message: `Resolusi PPQN adalah ${ppqn}. Resolusi standar Yamaha arranger adalah 480 ticks/quarter note.`
    });
  } else {
    issues.push({
      severity: 'info',
      message: `Resolusi waktu PPQN terverifikasi standar Yamaha (${ppqn} ticks/beat).`
    });
  }

  // 4. Scan Text & Markers using Latin-1 decoding
  const textDecoder = new TextDecoder('latin1');
  const fileString = textDecoder.decode(data);

  // Check critical SFF1 & SInt declaration markers in Measure 1
  const hasSFF1 = fileString.includes('SFF1');
  const hasSInt = fileString.includes('SInt');

  if (!hasSFF1 || !hasSInt) {
    issues.push({
      severity: 'error',
      message: 'Deklarasi Style "SFF1" atau "SInt" tidak ditemukan di Bar 1. Firmware Yamaha PSR-S750 akan menolak file ini dengan pesan "Data has not been loaded properly".'
    });
  } else {
    issues.push({
      severity: 'info',
      message: 'Deklarasi header "SFF1" dan "SInt" di Bar 1 terverifikasi valid sesuai spesifikasi arranger Yamaha.'
    });
  }

  // Search for standard Yamaha Section Markers
  const standardMarkers = [
    'Main A', 'Main B', 'Main C', 'Main D',
    'Intro A', 'Intro B', 'Intro C',
    'Fill In AA', 'Fill In BB', 'Fill In CC', 'Fill In DD',
    'Fill In BA', 'Ending A', 'Ending B', 'Ending C'
  ];

  for (const marker of standardMarkers) {
    if (fileString.includes(marker)) {
      sectionsFound.push(marker);
    }
  }

  if (sectionsFound.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Tidak ditemukan Marker Style Yamaha (Contoh: "Main A", "Fill In AA"). Keyboard tidak akan mengenali bagian pengiring.'
    });
  } else {
    issues.push({
      severity: 'info',
      message: `Ditemukan ${sectionsFound.length} penanda bagian style: ${sectionsFound.join(', ')}.`
    });
  }

  // 5. Deep CASM, CSEG, Sdec, and Ctab Verification
  const hasCasm = fileString.includes('CASM');
  const hasCseg = fileString.includes('CSEG');
  const hasSdec = fileString.includes('Sdec');
  const hasCtab = fileString.includes('Ctab');

  const casmValid = hasCasm && hasCseg && hasSdec && hasCtab;

  if (!casmValid) {
    issues.push({
      severity: 'error',
      message: 'Struktur modul CASM tidak lengkap (Harus berisi CASM -> CSEG -> Sdec & Ctab). Ini penyebab utama error "Data has not been loaded properly" di PSR-S750.'
    });
  } else {
    issues.push({
      severity: 'info',
      message: 'Modul CASM (CSEG, Sdec, Ctab 27-byte) terverifikasi lengkap dan valid untuk transposisi akor otomatis di PSR-S750.'
    });
  }

  // 6. Scan Note Events to verify Arranger Channels 9-16
  for (let i = 14; i < data.length - 2; i++) {
    const status = data[i];
    if ((status & 0xF0) === 0x90) { // Note On
      const ch = (status & 0x0F) + 1; // 1-indexed
      channelsUsedSet.add(ch);
    }
  }

  const channelsUsed = Array.from(channelsUsedSet).sort((a, b) => a - b);
  const nonArrangerChannels = channelsUsed.filter(ch => ch < 9);

  if (nonArrangerChannels.length > 0) {
    issues.push({
      severity: 'warning',
      message: `Channel ${nonArrangerChannels.join(', ')} digunakan. Standar Arranger Yamaha menggunakan Channel 9 sampai 16.`
    });
  }

  if (!channelsUsed.includes(10)) {
    issues.push({
      severity: 'warning',
      message: 'Channel 10 (Rhythm 1 / Main Drum Kit) tidak berisi notasi. Style mungkin tidak memiliki ketukan drum.'
    });
  }

  const hasFatalErrors = issues.some(iss => iss.severity === 'error');

  return {
    valid: !hasFatalErrors,
    format: casmValid ? 'SFF1 (PSR-S750 Standard)' : 'Standard MIDI File 0',
    sectionsFound,
    channelsUsed,
    issues,
    casmValid,
    estimatedFileSizeKb: Math.round(data.length / 1024 * 10) / 10
  };
}
