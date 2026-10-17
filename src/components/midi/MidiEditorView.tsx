import React, { useState, useRef, useEffect } from 'react';
import { 
  Piano, Play, Pause, Square, Plus, Trash2, Edit3, 
  MousePointer, Eraser, Volume2, Save, Download, 
  RotateCcw, Sliders, CheckCircle2, ChevronDown, Sparkles,
  Upload, Activity, Info
} from 'lucide-react';
import { ProjectData, MidiNote, MidiTrack, StyleSectionId } from '../../types';
import { ARRANGER_CHANNEL_DEFINITIONS } from '../../data/keyboardProfiles';
import { globalSynth } from '../../utils/audioEngine';
import { buildSMF0, RawMidiEvent } from '../../utils/midiGenerator';
import { parseMidiFile } from '../../utils/midiParser';

interface MidiEditorViewProps {
  project: ProjectData;
  onUpdateProject: (updated: Partial<ProjectData>) => void;
}

type EditorTool = 'select' | 'draw' | 'erase';

export const MidiEditorView: React.FC<MidiEditorViewProps> = ({
  project,
  onUpdateProject,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<number>(10); // default Ch 10 Drum
  const [selectedSection, setSelectedSection] = useState<StyleSectionId>('main_a');
  const [activeTool, setActiveTool] = useState<EditorTool>('draw');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [gridSnap, setGridSnap] = useState<number>(1); // 1 = 16th, 2 = 8th, 4 = quarter
  const [defaultVelocity, setDefaultVelocity] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playStep, setPlayStep] = useState<number>(0);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const midiFileInputRef = useRef<HTMLInputElement>(null);
  const playTimerRef = useRef<any>(null);

  // Get current active section and track
  const currentSection = project.sections[selectedSection] || project.sections['main_a'];
  const currentTrack: MidiTrack = currentSection.tracks[selectedChannel] || {
    id: `trk_${selectedChannel}`,
    name: 'Track',
    channel: selectedChannel,
    voiceName: 'Default',
    msb: 0,
    lsb: 0,
    programChange: 0,
    volume: 100,
    pan: 64,
    reverb: 40,
    chorus: 0,
    notes: [],
    ntr: 'Root Transpose',
    ntt: 'Chord'
  };

  const selectedNote = currentTrack.notes.find(n => n.id === selectedNoteId) || null;
  const totalSteps = currentSection.bars * 16; // 16th note steps

  // Pitch range for piano roll
  const isDrumChannel = selectedChannel === 9 || selectedChannel === 10;
  const minPitch = isDrumChannel ? 35 : (selectedChannel === 11 ? 28 : 48);
  const maxPitch = isDrumChannel ? 65 : (selectedChannel === 11 ? 60 : 84);
  const numPitches = maxPitch - minPitch + 1;

  const rowHeight = 18;
  const stepWidth = 24;

  // Sound audition helper
  const auditionPitch = (pitch: number) => {
    globalSynth.playNote(pitch, defaultVelocity, selectedChannel, 0.4);
  };

  // Convert MIDI pitch to note name
  const getNoteName = (pitch: number): string => {
    if (isDrumChannel) {
      const drumMap: Record<number, string> = {
        35: 'Acoustic Bass Drum', 36: 'Bass Drum 1', 38: 'Acoustic Snare',
        40: 'Electric Snare', 42: 'Closed Hi-Hat', 44: 'Pedal Hi-Hat',
        46: 'Open Hi-Hat', 47: 'Low Mid Tom', 48: 'Hi Mid Tom',
        49: 'Crash Cymbal 1', 51: 'Ride Cymbal 1', 54: 'Tambourine',
        56: 'Cowbell', 60: 'Kendang Tak', 62: 'Kendang Tung', 64: 'Kendang Dut'
      };
      return drumMap[pitch] || `Drum (${pitch})`;
    }

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const name = noteNames[pitch % 12];
    return `${name}${octave}`;
  };

  // Draw Piano Roll canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = totalSteps * stepWidth;
    const height = numPitches * rowHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw horizontal row backgrounds
    for (let p = 0; p < numPitches; p++) {
      const currentP = maxPitch - p;
      const y = p * rowHeight;
      const isBlackKey = !isDrumChannel && [1, 3, 6, 8, 10].includes(currentP % 12);

      ctx.fillStyle = isBlackKey ? '#0f172a' : '#1e293b';
      ctx.fillRect(0, y, width, rowHeight);

      // Row separator
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(width, y + rowHeight);
      ctx.stroke();
    }

    // 2. Draw vertical step grid lines
    for (let s = 0; s <= totalSteps; s++) {
      const x = s * stepWidth;
      const isBarStart = s % 16 === 0;
      const isBeatStart = s % 4 === 0;

      ctx.strokeStyle = isBarStart ? '#64748b' : (isBeatStart ? '#475569' : '#1e293b');
      ctx.lineWidth = isBarStart ? 1.5 : (isBeatStart ? 1 : 0.5);

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Bar number label at top
      if (isBarStart && s < totalSteps) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`Bar ${(s / 16) + 1}`, x + 4, 12);
      }
    }

    // 3. Draw MIDI Notes
    const notes = currentTrack.notes || [];
    const channelDef = ARRANGER_CHANNEL_DEFINITIONS.find(d => d.channel === selectedChannel);
    const trackColor = channelDef ? channelDef.color : '#06b6d4';

    for (const note of notes) {
      if (note.pitch < minPitch || note.pitch > maxPitch) continue;

      const pIndex = maxPitch - note.pitch;
      const y = pIndex * rowHeight + 1;
      const x = note.startStep * stepWidth + 1;
      const w = Math.max(stepWidth - 2, note.durationSteps * stepWidth - 2);
      const h = rowHeight - 2;

      const isSelected = selectedNoteId === note.id;

      // Note body
      ctx.fillStyle = isSelected ? '#fbbf24' : trackColor;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 3);
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.stroke();

      // Note Pitch text inside block
      if (w > 20) {
        ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
        ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
        ctx.fillText(getNoteName(note.pitch), x + 4, y + 11);
      }
    }

    // 4. Draw Playhead if playing
    if (isPlaying) {
      const playheadX = playStep * stepWidth;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [currentTrack, selectedChannel, minPitch, maxPitch, totalSteps, isPlaying, playStep, selectedNoteId]);

  // Handle Canvas Click (Draw, Select, Erase)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const rawStep = Math.floor(clickX / stepWidth);
    const step = Math.floor(rawStep / gridSnap) * gridSnap;
    const pIndex = Math.floor(clickY / rowHeight);
    const pitch = maxPitch - pIndex;

    if (pitch < minPitch || pitch > maxPitch || step >= totalSteps) return;

    // Check if clicked an existing note
    const existingIndex = currentTrack.notes.findIndex(
      n => n.pitch === pitch && step >= n.startStep && step < (n.startStep + n.durationSteps)
    );

    if (activeTool === 'erase') {
      if (existingIndex >= 0) {
        deleteNoteAtIndex(existingIndex);
      }
      return;
    }

    if (existingIndex >= 0) {
      // Select existing note
      setSelectedNoteId(currentTrack.notes[existingIndex].id);
      auditionPitch(pitch);
      return;
    }

    // Add new note
    if (activeTool === 'draw' || activeTool === 'select') {
      const duration = gridSnap === 1 ? (isDrumChannel ? 1 : 2) : gridSnap;
      const newNote: MidiNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        pitch,
        startStep: step,
        durationSteps: duration,
        velocity: defaultVelocity,
        channel: selectedChannel
      };

      const updatedNotes = [...currentTrack.notes, newNote];
      updateTrackNotes(updatedNotes);
      setSelectedNoteId(newNote.id);
      auditionPitch(pitch);
    }
  };

  const deleteNoteAtIndex = (index: number) => {
    const updatedNotes = currentTrack.notes.filter((_, i) => i !== index);
    updateTrackNotes(updatedNotes);
    setSelectedNoteId(null);
  };

  const updateTrackNotes = (newNotes: MidiNote[]) => {
    const sections = { ...project.sections };
    const sec = { ...sections[selectedSection] };
    const tracks = { ...sec.tracks };
    tracks[selectedChannel] = {
      ...currentTrack,
      notes: newNotes
    };
    sec.tracks = tracks;
    sections[selectedSection] = sec;
    onUpdateProject({ sections });
  };

  // Modify currently selected note attributes
  const updateSelectedNote = (patch: Partial<MidiNote>) => {
    if (!selectedNoteId) return;
    const updated = currentTrack.notes.map(n => {
      if (n.id === selectedNoteId) {
        return { ...n, ...patch };
      }
      return n;
    });
    updateTrackNotes(updated);
  };

  // Playback Loop for Section
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    setIsPlaying(true);
    let step = 0;
    const bpm = project.tempo || 120;
    const stepDurationMs = (60000 / bpm) / 4; // 16th note in ms

    playTimerRef.current = setInterval(() => {
      setPlayStep(step);

      // Play notes starting at this step
      const notesToPlay = currentTrack.notes.filter(n => n.startStep === step);
      notesToPlay.forEach(n => {
        const durSec = (n.durationSteps * (60 / bpm)) / 4;
        globalSynth.playNote(n.pitch, n.velocity, selectedChannel, durSec);
      });

      step = (step + 1) % totalSteps;
    }, stepDurationMs);
  };

  const stopPlayback = () => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlaying(false);
    setPlayStep(0);
  };

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // Quick Action: Quantize Notes to 16th
  const quantizeNotes = () => {
    const updated = currentTrack.notes.map(n => ({
      ...n,
      startStep: Math.round(n.startStep),
      durationSteps: Math.max(1, Math.round(n.durationSteps))
    }));
    updateTrackNotes(updated);
  };

  // Quick Action: Clear Track Notes
  const clearTrack = () => {
    if (confirm(`Yakin ingin mengosongkan notasi pada ${currentTrack.name}?`)) {
      updateTrackNotes([]);
      setSelectedNoteId(null);
    }
  };

  // Import external .MID File into Piano Roll
  const handleImportMidiFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseMidiFile(new Uint8Array(buffer));

      const sections = { ...project.sections };
      const sec = { ...sections[selectedSection] };
      const tracks = { ...sec.tracks };

      // Check if file has notes on this channel, or populate all channels
      let importedCount = 0;
      if (parsed.tracksByChannel[selectedChannel] && parsed.tracksByChannel[selectedChannel].length > 0) {
        tracks[selectedChannel] = {
          ...tracks[selectedChannel],
          notes: parsed.tracksByChannel[selectedChannel]
        };
        importedCount = parsed.tracksByChannel[selectedChannel].length;
      } else {
        // Find channel with notes
        for (let ch = 1; ch <= 16; ch++) {
          if (parsed.tracksByChannel[ch] && parsed.tracksByChannel[ch].length > 0) {
            tracks[selectedChannel] = {
              ...tracks[selectedChannel],
              notes: parsed.tracksByChannel[ch]
            };
            importedCount = parsed.tracksByChannel[ch].length;
            break;
          }
        }
      }

      sec.tracks = tracks;
      sections[selectedSection] = sec;

      onUpdateProject({
        sections,
        tempo: parsed.tempo || project.tempo
      });

      setImportNotification(`Berhasil memuat ${importedCount} not dari "${file.name}"!`);
      setTimeout(() => setImportNotification(null), 4000);

    } catch (err: any) {
      alert('Gagal membaca file MIDI: ' + err.message);
    }
  };

  // Export Track as SMF0 MIDI File
  const handleExportTrackMidi = () => {
    const rawEvents: RawMidiEvent[] = currentTrack.notes.map(n => ({
      tick: n.startStep * 120,
      type: 'noteOn',
      channel: selectedChannel - 1,
      pitch: n.pitch,
      velocity: n.velocity
    }));
    currentTrack.notes.forEach(n => {
      rawEvents.push({
        tick: (n.startStep + n.durationSteps) * 120,
        type: 'noteOff',
        channel: selectedChannel - 1,
        pitch: n.pitch,
        velocity: 0
      });
    });

    const midiBytes = buildSMF0(rawEvents);
    const blob = new Blob([midiBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}_Ch${selectedChannel}_${currentTrack.name.replace(/\s+/g, '_')}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto flex flex-col h-[calc(100vh-64px)]">
      {/* Editor Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
        {/* Track & Section Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Section Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Bagian:</span>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value as StyleSectionId);
                setSelectedNoteId(null);
              }}
              className="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value="intro_1" className="bg-slate-900">Intro 1</option>
              <option value="main_a" className="bg-slate-900">Main A (Verse)</option>
              <option value="main_b" className="bg-slate-900">Main B</option>
              <option value="main_c" className="bg-slate-900">Main C (Chorus)</option>
              <option value="main_d" className="bg-slate-900">Main D</option>
              <option value="fill_a" className="bg-slate-900">Fill In A</option>
              <option value="break" className="bg-slate-900">Break</option>
              <option value="ending_1" className="bg-slate-900">Ending 1</option>
            </select>
          </div>

          {/* Arranger Channel Track Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(Number(e.target.value));
                setSelectedNoteId(null);
              }}
              className="bg-transparent text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer"
            >
              {ARRANGER_CHANNEL_DEFINITIONS.map(def => (
                <option key={def.channel} value={def.channel} className="bg-slate-900">
                  Ch {def.channel}: {def.label} ({def.defaultVoice})
                </option>
              ))}
            </select>
          </div>

          {/* Transport Preview */}
          <div className="flex items-center space-x-1 pl-1">
            <button
              onClick={togglePlay}
              className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                isPlaying 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={isPlaying ? 'Pause Loop' : 'Putar Preview Notasi'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={stopPlayback}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Stop Playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        {/* Tools (Select, Draw, Erase) */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTool('draw')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTool === 'draw' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Pensil: Tambah Notasi"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Gambar Not</span>
          </button>

          <button
            onClick={() => setActiveTool('select')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTool === 'select' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Kursor: Pilih & Edit Notasi"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Pilih</span>
          </button>

          <button
            onClick={() => setActiveTool('erase')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTool === 'erase' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Penghapus: Hapus Notasi"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        </div>

        {/* Grid Snap & Velocity & File Actions */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-500 font-mono">GRID:</span>
            <select
              value={gridSnap}
              onChange={(e) => setGridSnap(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="1">1/16</option>
              <option value="2">1/8</option>
              <option value="4">1/4</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-500 font-mono">VEL:</span>
            <input
              type="number"
              min="1"
              max="127"
              value={defaultVelocity}
              onChange={(e) => setDefaultVelocity(Math.min(127, Math.max(1, Number(e.target.value))))}
              className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-xs text-amber-400 focus:outline-none"
            />
          </div>

          {/* Import External MIDI */}
          <input
            type="file"
            ref={midiFileInputRef}
            onChange={handleImportMidiFile}
            accept=".mid,.midi"
            className="hidden"
          />
          <button
            onClick={() => midiFileInputRef.current?.click()}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-700 transition-colors cursor-pointer"
            title="Buka file MIDI (.mid) dari komputer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Impor .MID</span>
          </button>

          {/* Export Track MIDI */}
          <button
            onClick={handleExportTrackMidi}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-700 transition-colors cursor-pointer"
            title="Ekspor Track ini sebagai file .MID standar"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor .MID</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {importNotification && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl px-4 py-2 text-xs text-emerald-300 flex items-center space-x-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{importNotification}</span>
        </div>
      )}

      {/* Note Inspector Bar (When a note is clicked/selected) */}
      {selectedNote && (
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 shadow-md">
          <div className="flex items-center space-x-4">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Not Terpilih: <strong className="font-mono text-cyan-400">{getNoteName(selectedNote.pitch)}</strong>
            </span>

            {/* Pitch Adjuster */}
            <div className="flex items-center space-x-1 font-mono text-[11px]">
              <span className="text-slate-400">Pitch:</span>
              <button
                onClick={() => updateSelectedNote({ pitch: Math.max(0, selectedNote.pitch - 1) })}
                className="w-5 h-5 bg-slate-950 rounded border border-slate-800 hover:border-cyan-500 flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="text-white px-1">{selectedNote.pitch}</span>
              <button
                onClick={() => updateSelectedNote({ pitch: Math.min(127, selectedNote.pitch + 1) })}
                className="w-5 h-5 bg-slate-950 rounded border border-slate-800 hover:border-cyan-500 flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>

            {/* Start Step (Position) */}
            <div className="flex items-center space-x-1 font-mono text-[11px]">
              <span className="text-slate-400">Posisi:</span>
              <span className="text-amber-300">Step {selectedNote.startStep}</span>
              <button
                onClick={() => updateSelectedNote({ startStep: Math.max(0, selectedNote.startStep - 1) })}
                className="w-5 h-5 bg-slate-950 rounded border border-slate-800 hover:border-cyan-500 flex items-center justify-center"
              >
                ◀
              </button>
              <button
                onClick={() => updateSelectedNote({ startStep: Math.min(totalSteps - 1, selectedNote.startStep + 1) })}
                className="w-5 h-5 bg-slate-950 rounded border border-slate-800 hover:border-cyan-500 flex items-center justify-center"
              >
                ▶
              </button>
            </div>

            {/* Duration Adjuster */}
            <div className="flex items-center space-x-1 font-mono text-[11px]">
              <span className="text-slate-400">Durasi:</span>
              <button
                onClick={() => updateSelectedNote({ durationSteps: Math.max(1, selectedNote.durationSteps - 1) })}
                className="w-5 h-5 bg-slate-950 rounded border border-slate-800 hover:border-cyan-500 flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="text-emerald-400 px-1">{selectedNote.durationSteps} steps</span>
              <button
                onClick={() => updateSelectedNote({ durationSteps: Math.min(32, selectedNote.durationSteps + 1) })}
                className="w-5 h-5 bg-slate-950 rounded border border-slate-800 hover:border-cyan-500 flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>

            {/* Velocity Slider */}
            <div className="flex items-center space-x-1.5 font-mono text-[11px]">
              <span className="text-slate-400">Velocity:</span>
              <input
                type="range"
                min="1"
                max="127"
                value={selectedNote.velocity}
                onChange={(e) => updateSelectedNote({ velocity: Number(e.target.value) })}
                className="w-16 h-1 bg-slate-800 rounded accent-cyan-400"
              />
              <span className="text-cyan-300 w-7">{selectedNote.velocity}</span>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = currentTrack.notes.filter(n => n.id !== selectedNote.id);
              updateTrackNotes(updated);
              setSelectedNoteId(null);
            }}
            className="flex items-center space-x-1 text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/40 border border-red-900/50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Not</span>
          </button>
        </div>
      )}

      {/* Main Piano Roll Container */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex relative shadow-inner min-h-[380px]">
        {/* Left Side: Piano Keys (Interactive) */}
        <div className="w-36 bg-slate-900 border-r border-slate-800 shrink-0 select-none overflow-y-auto">
          {Array.from({ length: numPitches }).map((_, i) => {
            const pitch = maxPitch - i;
            const isBlackKey = !isDrumChannel && [1, 3, 6, 8, 10].includes(pitch % 12);
            const isC = !isDrumChannel && pitch % 12 === 0;

            return (
              <button
                key={pitch}
                onClick={() => auditionPitch(pitch)}
                style={{ height: `${rowHeight}px` }}
                className={`w-full flex items-center justify-between px-2 text-[10px] font-mono border-b border-slate-800/60 transition-colors text-left cursor-pointer ${
                  isBlackKey 
                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-400' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                } ${isC ? 'border-l-2 border-l-cyan-400 font-bold' : ''}`}
                title={`Klik untuk membunyikan ${getNoteName(pitch)}`}
              >
                <span className="truncate pr-1">{getNoteName(pitch)}</span>
                <span className="text-[9px] text-slate-600 font-normal">{pitch}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Scrollable Canvas Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto daw-piano-bg">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="block cursor-crosshair"
          />
        </div>
      </div>

      {/* Footer Info & Quick Fixes */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center space-x-3 text-slate-400">
          <span>Notasi Track: <strong className="text-white font-mono">{currentTrack.notes.length}</strong></span>
          <span>•</span>
          <span>Panjang Bagian: <strong className="text-white font-mono">{currentSection.bars} Bar ({totalSteps} Steps)</strong></span>
          <span>•</span>
          <span className="text-emerald-400 font-mono">NTR: {currentTrack.ntr} • NTT: {currentTrack.ntt}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={quantizeNotes}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            Kuantisasi Grid
          </button>
          <button
            onClick={clearTrack}
            className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 transition-colors cursor-pointer"
          >
            Kosongkan Track
          </button>
        </div>
      </div>
    </div>
  );
};
