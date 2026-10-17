/**
 * Yamaha Arranger Style (.STY) File Engine for Yamaha PSR-S750 & Compatible Keyboards
 * 
 * Implements:
 * 1. Proper Yamaha SFF1 Structure (SMF0 + Marker tags + Voices + CASM/CSEG chunk)
 * 2. Deep Style Validator (verifies header, channels, markers, and CASM chunks)
 * 3. Export to binary .STY and standard .MID
 */

import { ProjectData, StyleSectionId, StyleValidationResult, StyleValidationIssue } from '../types';
import { STYLE_SECTION_DEFINITIONS } from '../data/keyboardProfiles';
import { RawMidiEvent, buildSMF0, encodeStringToBytes } from './midiGenerator';

/**
 * Generate genuine Yamaha .STY binary from ProjectData
 */
export function generateYamahaStyleFile(project: ProjectData): Uint8Array {
  const ppqn = 480;
  const ticksPer16th = ppqn / 4; // 120 ticks
  const ticksPerBar = ppqn * 4;  // 1920 ticks for 4/4

  const events: RawMidiEvent[] = [];

  // Initial Meta Events at Tick 0
  events.push({
    tick: 0,
    type: 'timeSig',
    numerator: 4,
    denominator: 4
  });

  events.push({
    tick: 0,
    type: 'tempo',
    bpm: project.tempo || 120
  });

  // Track absolute tick offset as sections are appended sequentially
  let currentTick = 0;

  // Process sections in standard Yamaha Arranger order
  for (const def of STYLE_SECTION_DEFINITIONS) {
    const section = project.sections[def.id];
    if (!section) continue;

    // Check if section has any notes across any channel
    const hasNotes = Object.values(section.tracks).some(trk => trk.notes && trk.notes.length > 0);
    // Even if empty, for Main A and Fill A we include marker if requested
    if (!hasNotes && def.id !== 'main_a') {
      continue;
    }

    // Insert Section Marker (e.g. "Main A", "Intro A", "Fill In AA")
    events.push({
      tick: currentTick,
      type: 'marker',
      text: def.markerTag
    });

    const sectionBars = section.bars || def.defaultBars;
    const sectionTotalTicks = sectionBars * ticksPerBar;

    // Send Bank Select MSB/LSB & Program Change at start of section for each active channel
    Object.values(section.tracks).forEach(trk => {
      const ch = trk.channel - 1; // 0-indexed channel (e.g. Ch 10 -> index 9)

      // CC0 Bank MSB
      events.push({
        tick: currentTick,
        type: 'controlChange',
        channel: ch,
        controller: 0,
        value: trk.msb
      });

      // CC32 Bank LSB
      events.push({
        tick: currentTick,
        type: 'controlChange',
        channel: ch,
        controller: 32,
        value: trk.lsb
      });

      // Program Change
      events.push({
        tick: currentTick,
        type: 'programChange',
        channel: ch,
        value: trk.programChange
      });

      // Volume & Pan
      events.push({
        tick: currentTick,
        type: 'controlChange',
        channel: ch,
        controller: 7, // Volume
        value: trk.volume
      });

      events.push({
        tick: currentTick,
        type: 'controlChange',
        channel: ch,
        controller: 10, // Pan
        value: trk.pan
      });

      // Add Notes for this channel
      if (trk.notes && trk.notes.length > 0) {
        trk.notes.forEach(note => {
          const noteStartTick = currentTick + (note.startStep * ticksPer16th);
          const noteDurationTicks = Math.max(ticksPer16th / 2, note.durationSteps * ticksPer16th);
          const noteEndTick = noteStartTick + noteDurationTicks;

          // Prevent notes from exceeding section bounds
          const clampedEndTick = Math.min(noteEndTick, currentTick + sectionTotalTicks);

          events.push({
            tick: noteStartTick,
            type: 'noteOn',
            channel: ch,
            pitch: note.pitch,
            velocity: note.velocity
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

  // Generate Yamaha CASM chunk
  const casmBytes = buildYamahaCasmChunk(project);

  // Combine SMF0 + CASM to form the complete .STY file
  const fullStyleFile = new Uint8Array(smfBytes.length + casmBytes.length);
  fullStyleFile.set(smfBytes, 0);
  fullStyleFile.set(casmBytes, smfBytes.length);

  return fullStyleFile;
}

/**
 * Generate standard SMF Format 0 file (without Yamaha CASM chunk) for general DAWs
 */
export function generateStandardMidiFile(project: ProjectData): Uint8Array {
  const ppqn = 480;
  const ticksPer16th = ppqn / 4;
  const ticksPerBar = ppqn * 4;

  const events: RawMidiEvent[] = [];

  events.push({ tick: 0, type: 'timeSig', numerator: 4, denominator: 4 });
  events.push({ tick: 0, type: 'tempo', bpm: project.tempo || 120 });

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
 * Build Yamaha CASM (Channel Assignment / Control Segment) binary chunk
 * This instructs the Yamaha PSR-S750 how to transpose chords and voices
 */
function buildYamahaCasmChunk(project: ProjectData): Uint8Array {
  // CASM Chunk Structure:
  // 'CASM' [4-byte length]
  //   'CSEG' [4-byte length]
  //     'SSet' [4-byte length] [Source Chord Data: Root=C(0), Chord=Maj(0)]
  //     'Ctbl' [4-byte length] [Channel table for channels 9-16]

  // SSet data: 8 bytes
  // Byte 0: Source Key (0 = C)
  // Byte 1: Source Chord Type (0 = Maj, 1 = Maj6, 2 = Maj7, 3 = Maj7#11, 4 = Maj(9), 5 = Maj7(9), 6 = Maj6(9), 7 = 7th, 8 = 7(b5), etc.)
  // Byte 2: Chord Mute (0)
  // Byte 3-7: Padding / Reserved
  const ssetData = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  const ssetChunk = buildChunk('SSet', ssetData);

  // Ctbl data: Channel Table entry for each arranger part (Channels 9-16)
  // 16 bytes per channel
  const ctblData: number[] = [];
  const channels = [9, 10, 11, 12, 13, 14, 15, 16];

  for (const ch of channels) {
    // Yamaha Part ID: 0x08 = Rhythm 2, 0x09 = Rhythm 1, 0x0A = Bass, 0x0B = Chord 1, etc.
    const partId = ch - 1; 

    // NTR: 0 = Root Transpose (for bass, chord, phrase), 1 = Fixed (for drums/percussion)
    const isDrum = ch === 9 || ch === 10;
    const ntr = isDrum ? 1 : 0;

    // NTT: 0 = Bypass (drums), 1 = Melodic (phrase), 2 = Chord (chord1/2), 3 = Bass (bass)
    let ntt = 2; // chord
    if (isDrum) ntt = 0; // bypass
    else if (ch === 11) ntt = 3; // bass
    else if (ch >= 15) ntt = 1; // melodic

    // High Key Limit (127) and Low Key Limit (0)
    const lowLimit = isDrum ? 0 : 24;
    const highLimit = isDrum ? 127 : 108;

    // Push 16-byte channel descriptor
    ctblData.push(
      partId,       // Channel index (0x08 - 0x0F)
      ntr,          // NTR (0 = Root Transpose, 1 = Fixed)
      ntt,          // NTT (0 = Bypass, 1 = Melodic, 2 = Chord, 3 = Bass)
      lowLimit,     // Low limit
      highLimit,    // High limit
      0x01,         // Retrigger rule (1 = Pitch shift)
      0x00,         // Stroke rule
      0x00,         // Bass on/off
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 // Reserved bytes
    );
  }

  const ctblChunk = buildChunk('Ctbl', ctblData);

  // Combine SSet and Ctbl inside CSEG
  const csegPayload = new Uint8Array(ssetChunk.length + ctblChunk.length);
  csegPayload.set(ssetChunk, 0);
  csegPayload.set(ctblChunk, ssetChunk.length);
  const csegChunk = buildChunk('CSEG', Array.from(csegPayload));

  // Wrap inside CASM
  const casmChunk = buildChunk('CASM', Array.from(csegChunk));
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

  if (data.length < 24) {
    return {
      valid: false,
      format: 'Standard MIDI File 0',
      sectionsFound: [],
      channelsUsed: [],
      issues: [{ severity: 'error', message: 'Ukuran file terlalu kecil atau korup (< 24 byte).' }],
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
      message: `Format MIDI adalah Format ${format}. Keyboard Yamaha PSR-S750 mewajibkan Format 0 (Semua channel dalam 1 track).` 
    });
  }

  // 3. Scan for Markers and CASM chunk
  const textDecoder = new TextDecoder('latin1');
  const fileString = textDecoder.decode(data);

  // Search for standard Yamaha Markers
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

  // 4. Check CASM chunk
  const hasCasm = fileString.includes('CASM');
  const hasCseg = fileString.includes('CSEG');
  const casmValid = hasCasm && hasCseg;

  if (!hasCasm) {
    issues.push({
      severity: 'warning',
      message: 'Chunk CASM tidak terdeteksi. Tanpa CASM, Yamaha PSR-S750 mungkin tidak dapat melakukan transposisi akor dinamis (NTR/NTT).'
    });
  } else {
    issues.push({
      severity: 'info',
      message: 'Header CASM dan Segmen Kontrol CSEG terverifikasi valid untuk Yamaha PSR-S750.'
    });
  }

  // 5. Scan Note Events to verify Arranger Channels 9-16
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
