/**
 * Standard MIDI File (SMF) Parser
 * Reads binary .MID files (Format 0 and Format 1) into MidiNote[] and track data.
 */

import { MidiNote, MidiTrack } from '../types';

export interface ParsedMidiFile {
  format: number; // 0 or 1
  ppqn: number;
  tempo: number;
  timeSignature: string;
  markers: { tick: number; text: string }[];
  tracksByChannel: Record<number, MidiNote[]>;
  totalNotes: number;
}

export function parseMidiFile(data: Uint8Array): ParsedMidiFile {
  if (data.length < 14) {
    throw new Error('Data file terlalu kecil untuk format MIDI (kurang dari 14 byte).');
  }

  // Check header 'MThd'
  if (data[0] !== 0x4D || data[1] !== 0x54 || data[2] !== 0x68 || data[3] !== 0x64) {
    throw new Error('Header bukan Standard MIDI File yang valid (tidak ditemukan penanda MThd).');
  }

  const format = (data[8] << 8) | data[9];
  const numTracks = (data[10] << 8) | data[11];
  const ppqn = (data[12] << 8) | data[13];

  let tempo = 120;
  let timeSig = '4/4';
  const markers: { tick: number; text: string }[] = [];
  const tracksByChannel: Record<number, MidiNote[]> = {};

  // Initialize channels 1-16
  for (let c = 1; c <= 16; c++) {
    tracksByChannel[c] = [];
  }

  let offset = 14;

  for (let t = 0; t < numTracks && offset < data.length; t++) {
    // Search for 'MTrk'
    while (offset < data.length - 8) {
      if (data[offset] === 0x4D && data[offset + 1] === 0x54 && data[offset + 2] === 0x72 && data[offset + 3] === 0x6B) {
        break;
      }
      offset++;
    }

    if (offset >= data.length - 8) break;

    offset += 4; // Skip 'MTrk'
    const trackLen = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    offset += 4;

    const trackEnd = Math.min(offset + trackLen, data.length);
    let currentTick = 0;
    let runningStatus = 0;

    // Track active note-ons to calculate duration
    // Key: `${channel}_${pitch}` -> { tick, velocity }
    const activeNotes = new Map<string, { tick: number; velocity: number }>();

    while (offset < trackEnd) {
      // Read variable-length delta time
      let delta = 0;
      let b = 0;
      do {
        if (offset >= trackEnd) break;
        b = data[offset++];
        delta = (delta << 7) | (b & 0x7F);
      } while (b & 0x80);

      currentTick += delta;
      if (offset >= trackEnd) break;

      let status = data[offset];

      if (status >= 0x80) {
        offset++;
        runningStatus = status;
      } else {
        status = runningStatus;
      }

      const eventType = status & 0xF0;
      const channel = (status & 0x0F) + 1; // 1-indexed

      if (status === 0xFF) {
        // Meta Event
        const metaType = data[offset++];
        let metaLen = 0;
        let mb = 0;
        do {
          if (offset >= trackEnd) break;
          mb = data[offset++];
          metaLen = (metaLen << 7) | (mb & 0x7F);
        } while (mb & 0x80);

        if (metaType === 0x51 && metaLen === 3) {
          // Set Tempo
          const mpqn = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
          tempo = Math.round(60000000 / mpqn);
        } else if (metaType === 0x58 && metaLen >= 2) {
          // Time Signature
          const num = data[offset];
          const denPower = data[offset + 1];
          timeSig = `${num}/${Math.pow(2, denPower)}`;
        } else if (metaType === 0x06 || metaType === 0x01) {
          // Marker or Text
          const textBytes = data.slice(offset, offset + metaLen);
          const text = new TextDecoder('latin1').decode(textBytes);
          markers.push({ tick: currentTick, text });
        }

        offset += metaLen;
      } else if (status === 0xF0 || status === 0xF7) {
        // SysEx Event
        let sysLen = 0;
        let sb = 0;
        do {
          if (offset >= trackEnd) break;
          sb = data[offset++];
          sysLen = (sysLen << 7) | (sb & 0x7F);
        } while (sb & 0x80);
        offset += sysLen;
      } else if (eventType === 0x90) {
        // Note On
        const pitch = data[offset++];
        const velocity = data[offset++];
        const key = `${channel}_${pitch}`;

        if (velocity > 0) {
          activeNotes.set(key, { tick: currentTick, velocity });
        } else {
          // Velocity 0 is Note Off
          const start = activeNotes.get(key);
          if (start) {
            const ticksPer16th = Math.max(1, Math.round(ppqn / 4));
            const startStep = Math.round(start.tick / ticksPer16th);
            const durationSteps = Math.max(1, Math.round((currentTick - start.tick) / ticksPer16th));

            tracksByChannel[channel].push({
              id: `midi_${channel}_${pitch}_${start.tick}`,
              pitch,
              startStep,
              durationSteps,
              velocity: start.velocity,
              channel
            });
            activeNotes.delete(key);
          }
        }
      } else if (eventType === 0x80) {
        // Note Off
        const pitch = data[offset++];
        offset++; // Skip release velocity
        const key = `${channel}_${pitch}`;
        const start = activeNotes.get(key);
        if (start) {
          const ticksPer16th = Math.max(1, Math.round(ppqn / 4));
          const startStep = Math.round(start.tick / ticksPer16th);
          const durationSteps = Math.max(1, Math.round((currentTick - start.tick) / ticksPer16th));

          tracksByChannel[channel].push({
            id: `midi_${channel}_${pitch}_${start.tick}`,
            pitch,
            startStep,
            durationSteps,
            velocity: start.velocity,
            channel
          });
          activeNotes.delete(key);
        }
      } else if (eventType === 0xC0 || eventType === 0xD0) {
        // Program Change or Channel Aftertouch (1 data byte)
        offset++;
      } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
        // Poly Key Pressure, Control Change, Pitch Bend (2 data bytes)
        offset += 2;
      }
    }
  }

  let totalNotes = 0;
  Object.values(tracksByChannel).forEach(notes => {
    totalNotes += notes.length;
  });

  return {
    format,
    ppqn,
    tempo: tempo || 120,
    timeSignature: timeSig || '4/4',
    markers,
    tracksByChannel,
    totalNotes
  };
}
