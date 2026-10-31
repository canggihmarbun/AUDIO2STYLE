/**
 * Standard MIDI File (SMF) Binary Encoder (Format 0 & Format 1)
 */

import { MidiNote } from '../types';

export interface RawMidiEvent {
  tick: number; // absolute tick
  type: 'noteOn' | 'noteOff' | 'marker' | 'trackName' | 'tempo' | 'timeSig' | 'programChange' | 'controlChange' | 'pitchBend' | 'sysEx';
  channel?: number; // 0-15 (0-indexed)
  pitch?: number;
  velocity?: number;
  text?: string;
  bpm?: number;
  numerator?: number;
  denominator?: number;
  controller?: number;
  value?: number;
  data?: number[];
}

export function writeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let buffer = value & 0x7F;
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= 0x80;
    buffer += (value & 0x7F);
  }
  while (true) {
    bytes.push(buffer & 0xFF);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return bytes;
}

export function encodeStringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xFF);
  }
  return bytes;
}

export function buildSMF0(events: RawMidiEvent[], ppqn: number = 480): Uint8Array {
  // Sort events by absolute tick
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    // Put meta events before note events at same tick with strict Yamaha SFF1 ordering
    const priority = (ev: RawMidiEvent) => {
      if (ev.type === 'sysEx') return -1;
      if (ev.type === 'timeSig') return 0;
      if (ev.type === 'tempo') return 1;
      if (ev.type === 'trackName') return 2;
      if (ev.type === 'marker') {
        if (ev.text === 'SFF1') return 3;
        if (ev.text === 'SInt') return 4;
        return 5;
      }
      if (ev.type === 'controlChange') return 6;
      if (ev.type === 'programChange') return 7;
      if (ev.type === 'pitchBend') return 8;
      if (ev.type === 'noteOff') return 9;
      return 10;
    };
    return priority(a) - priority(b);
  });

  const trackData: number[] = [];
  let lastTick = 0;

  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;
    trackData.push(...writeVLQ(delta));

    switch (ev.type) {
      case 'tempo': {
        const bpm = ev.bpm || 120;
        const mpqn = Math.round(60000000 / bpm);
        trackData.push(0xFF, 0x51, 0x03);
        trackData.push((mpqn >> 16) & 0xFF);
        trackData.push((mpqn >> 8) & 0xFF);
        trackData.push(mpqn & 0xFF);
        break;
      }
      case 'timeSig': {
        const num = ev.numerator || 4;
        const den = ev.denominator || 4;
        const denPower = Math.round(Math.log2(den));
        trackData.push(0xFF, 0x58, 0x04, num, denPower, 24, 8);
        break;
      }
      case 'trackName': {
        const textBytes = encodeStringToBytes(ev.text || '');
        trackData.push(0xFF, 0x03);
        trackData.push(...writeVLQ(textBytes.length));
        trackData.push(...textBytes);
        break;
      }
      case 'marker': {
        const textBytes = encodeStringToBytes(ev.text || '');
        trackData.push(0xFF, 0x06);
        trackData.push(...writeVLQ(textBytes.length));
        trackData.push(...textBytes);
        break;
      }
      case 'controlChange': {
        const ch = (ev.channel || 0) & 0x0F;
        trackData.push(0xB0 | ch, (ev.controller || 0) & 0x7F, (ev.value || 0) & 0x7F);
        break;
      }
      case 'programChange': {
        const ch = (ev.channel || 0) & 0x0F;
        trackData.push(0xC0 | ch, (ev.value || 0) & 0x7F);
        break;
      }
      case 'pitchBend': {
        const ch = (ev.channel || 0) & 0x0F;
        const val = Math.max(0, Math.min(16383, ev.value ?? 8192));
        trackData.push(0xE0 | ch, val & 0x7F, (val >> 7) & 0x7F);
        break;
      }
      case 'noteOn': {
        const ch = (ev.channel || 0) & 0x0F;
        trackData.push(0x90 | ch, (ev.pitch || 60) & 0x7F, (ev.velocity || 64) & 0x7F);
        break;
      }
      case 'noteOff': {
        const ch = (ev.channel || 0) & 0x0F;
        trackData.push(0x80 | ch, (ev.pitch || 60) & 0x7F, 0x00);
        break;
      }
      case 'sysEx': {
        const dataBytes = ev.data || [];
        trackData.push(0xF0);
        trackData.push(...writeVLQ(dataBytes.length));
        trackData.push(...dataBytes);
        break;
      }
    }
  }

  // End of Track meta event (delta = 0)
  trackData.push(...writeVLQ(0));
  trackData.push(0xFF, 0x2F, 0x00);

  // Construct SMF Format 0 file
  const header = [
    0x4D, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // length 6
    0x00, 0x00,             // format 0
    0x00, 0x01,             // 1 track
    (ppqn >> 8) & 0xFF, ppqn & 0xFF // PPQN
  ];

  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B, // 'MTrk'
    (trackData.length >> 24) & 0xFF,
    (trackData.length >> 16) & 0xFF,
    (trackData.length >> 8) & 0xFF,
    trackData.length & 0xFF
  ];

  const result = new Uint8Array(header.length + trackHeader.length + trackData.length);
  result.set(header, 0);
  result.set(trackHeader, header.length);
  result.set(trackData, header.length + trackHeader.length);

  return result;
}

/**
 * Build standard SMF Format 0 file for a single instrument or stem track
 */
export function buildMidiFromTrackNotes(
  notes: MidiNote[],
  tempo: number = 120,
  trackName: string = 'Stem Track',
  channel: number = 0,
  programChange: number = 0
): Uint8Array {
  const ppqn = 480;
  const ticksPer16th = ppqn / 4;
  const events: RawMidiEvent[] = [];

  // General MIDI System On
  events.push({
    tick: 0,
    type: 'sysEx',
    data: [0x7E, 0x7F, 0x09, 0x01, 0xF7]
  });

  events.push({ tick: 0, type: 'timeSig', numerator: 4, denominator: 4 });
  events.push({ tick: 0, type: 'tempo', bpm: Math.max(40, Math.min(260, tempo)) });
  events.push({ tick: 0, type: 'trackName', text: trackName });
  events.push({ tick: 0, type: 'programChange', channel, value: programChange });

  // CC7 Volume and CC10 Pan
  events.push({ tick: 0, type: 'controlChange', channel, controller: 7, value: 100 });
  events.push({ tick: 0, type: 'controlChange', channel, controller: 10, value: 64 });

  if (notes && notes.length > 0) {
    notes.forEach(note => {
      const startTick = Math.max(0, note.startStep * ticksPer16th);
      const durTicks = Math.max(ticksPer16th / 2, note.durationSteps * ticksPer16th);
      const endTick = startTick + durTicks;

      events.push({
        tick: startTick,
        type: 'noteOn',
        channel,
        pitch: Math.max(0, Math.min(127, note.pitch)),
        velocity: Math.max(1, Math.min(127, note.velocity))
      });

      events.push({
        tick: endTick,
        type: 'noteOff',
        channel,
        pitch: Math.max(0, Math.min(127, note.pitch)),
        velocity: 0
      });
    });
  }

  return buildSMF0(events, ppqn);
}

