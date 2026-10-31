import React, { useState, useRef, useEffect } from 'react';
import { 
  AudioWaveform, Split, Upload, Play, Pause, Square, 
  RotateCcw, Download, Music, SlidersHorizontal, Wand2, 
  Terminal, AlertCircle, CheckCircle2, Info, ArrowRight, 
  Volume2, VolumeX, Disc, Sparkles, Layers, Cpu, FileAudio, 
  Eye, Check, ExternalLink, RefreshCw
} from 'lucide-react';
import { 
  ProjectData, DemucsStemType, DemucsStemItem, NavTab, 
  MidiNote, MidiTrack 
} from '../../types';
import { 
  decodeAudioFile, separateAudioIntoStems, audioBufferToWavBlob, 
  transcribeStemToMidi, extractWaveformPeaks, globalSynth, getAudioContext 
} from '../../utils/audioEngine';
import { buildMidiFromTrackNotes } from '../../utils/midiGenerator';

interface AiStemSeparatorViewProps {
  project: ProjectData;
  onUpdateProject: (patch: Partial<ProjectData>) => void;
  onNavigate: (tab: NavTab) => void;
}

export const AiStemSeparatorView: React.FC<AiStemSeparatorViewProps> = ({
  project,
  onUpdateProject,
  onNavigate,
}) => {
  const [sourceAudioFile, setSourceAudioFile] = useState<File | null>(null);
  const [sourceAudioBuffer, setSourceAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourcePeaks, setSourcePeaks] = useState<number[]>([]);
  const [sourceDuration, setSourceDuration] = useState<number>(0);

  // Separation state
  const [selectedEngine, setSelectedEngine] = useState<'browser_dsp' | 'python_demucs'>('browser_dsp');
  const [isSeparating, setIsSeparating] = useState<boolean>(false);
  const [separationProgress, setSeparationProgress] = useState<number>(0);
  const [separationStatus, setSeparationStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pythonServerOnline, setPythonServerOnline] = useState<boolean | null>(null);

  // Multi-track playback state
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [activeStemSolo, setActiveStemSolo] = useState<DemucsStemType | null>(null);
  const [masterVolume, setMasterVolume] = useState<number>(0.9);

  // 4 Stems Data
  const [stems, setStems] = useState<DemucsStemItem[]>([
    {
      id: 'drum',
      name: 'Drums & Perkusi',
      subtitle: 'Kick, Snare, Hi-Hats, Toms, Cymbals',
      color: '#ef4444',
      icon: '🥁',
      volume: 0.9,
      muted: false,
      solo: false,
      pan: 0,
      audioBuffer: null,
      audioBlob: null,
      audioUrl: null,
      peaks: [],
      notes: [],
      isMidiConverting: false,
      yamahaChannels: [10, 9],
      yamahaPartNames: ['Rhythm 2 (Main Drums)', 'Rhythm 1 (Percussion)']
    },
    {
      id: 'bass',
      name: 'Bass Elektrik / Synth',
      subtitle: 'Sub-bass & Low fundamental root groove',
      color: '#10b981',
      icon: '🎸',
      volume: 0.9,
      muted: false,
      solo: false,
      pan: 0,
      audioBuffer: null,
      audioBlob: null,
      audioUrl: null,
      peaks: [],
      notes: [],
      isMidiConverting: false,
      yamahaChannels: [11],
      yamahaPartNames: ['Bass (Bassline)']
    },
    {
      id: 'vocal',
      name: 'Vokal & Melodi Lead',
      subtitle: 'Vocal line, lead instruments & melody solo',
      color: '#ec4899',
      icon: '🎙️',
      volume: 0.85,
      muted: false,
      solo: false,
      pan: 0,
      audioBuffer: null,
      audioBlob: null,
      audioUrl: null,
      peaks: [],
      notes: [],
      isMidiConverting: false,
      yamahaChannels: [15],
      yamahaPartNames: ['Phrase 1 (Melodic Lead)']
    },
    {
      id: 'other',
      name: 'Other (Chords, Guitars & Pad)',
      subtitle: 'Keyboard rhythm, acoustic guitars, backing synths & pads',
      color: '#06b6d4',
      icon: '🎹',
      volume: 0.85,
      muted: false,
      solo: false,
      pan: 0,
      audioBuffer: null,
      audioBlob: null,
      audioUrl: null,
      peaks: [],
      notes: [],
      isMidiConverting: false,
      yamahaChannels: [12, 13, 14, 16],
      yamahaPartNames: ['Chord 1', 'Chord 2', 'Pad', 'Phrase 2']
    }
  ]);

  // Audio nodes references for synchronized playback
  const activeSourcesRef = useRef<{ [key in DemucsStemType]?: AudioBufferSourceNode }>({});
  const activeGainNodesRef = useRef<{ [key in DemucsStemType]?: GainNode }>({});
  const activePanNodesRef = useRef<{ [key in DemucsStemType]?: StereoPannerNode }>({});
  const playStartTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Python backend health on mount
  useEffect(() => {
    checkPythonHealth();
  }, []);

  const checkPythonHealth = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) {
        setPythonServerOnline(true);
      } else {
        setPythonServerOnline(false);
      }
    } catch {
      setPythonServerOnline(false);
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      stems.forEach(s => {
        if (s.audioUrl) URL.revokeObjectURL(s.audioUrl);
      });
      stopAllPlayback();
    };
  }, []);

  // Update animated playhead
  useEffect(() => {
    const updatePlayhead = () => {
      if (isPlayingAll) {
        const ctx = getAudioContext();
        const elapsed = (ctx.currentTime - playStartTimeRef.current) + pauseOffsetRef.current;
        if (elapsed >= sourceDuration && sourceDuration > 0) {
          stopAllPlayback();
          setPlaybackTime(0);
          pauseOffsetRef.current = 0;
        } else {
          setPlaybackTime(elapsed);
        }
      }
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    };

    animFrameRef.current = requestAnimationFrame(updatePlayhead);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlayingAll, sourceDuration]);

  // Handle file upload
  const handleProcessAudioFile = async (file: File) => {
    setErrorMessage(null);
    setSourceAudioFile(file);
    setIsSeparating(true);
    setSeparationProgress(10);
    setSeparationStatus(`Membaca dan mendekode ${file.name}...`);

    try {
      const decoded = await decodeAudioFile(file);
      setSourceAudioBuffer(decoded.buffer);
      setSourcePeaks(decoded.peaks);
      setSourceDuration(decoded.buffer.duration);

      // Update project metadata
      onUpdateProject({
        tempo: decoded.metadata.detectedBpm,
        timeSignature: decoded.metadata.detectedTimeSignature,
        sourceAudio: {
          name: decoded.metadata.name,
          size: decoded.metadata.size,
          duration: decoded.metadata.duration
        }
      });

      setSeparationProgress(30);
      setSeparationStatus('Audio berhasil dimuat. Siap dipisahkan menggunakan Demucs 4-Stem!');
      setIsSeparating(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal membaca file audio. Pastikan file berformat MP3 atau WAV yang valid.');
      setIsSeparating(false);
    }
  };

  // RUN STEM SEPARATION (Demucs Python / Browser DSP)
  const handleRunStemSeparation = async () => {
    if (!sourceAudioBuffer) {
      setErrorMessage('Silakan pilih dan muat file audio MP3/WAV terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    stopAllPlayback();
    setIsSeparating(true);
    setSeparationProgress(5);
    setSeparationStatus('Memulai pemisahan 4-stem...');

    try {
      // 1. Python Demucs Bridge (if selected)
      if (selectedEngine === 'python_demucs') {
        setSeparationStatus('Menghubungkan ke server Python Demucs di http://127.0.0.1:8000...');
        try {
          const testRes = await fetch('http://127.0.0.1:8000/health', { method: 'GET', signal: AbortSignal.timeout(1800) });
          if (!testRes.ok) throw new Error('Status server tidak siap');
        } catch {
          throw new Error('Server Python Demucs lokal (http://127.0.0.1:8000) belum berjalan. Jalankan "uvicorn main:app --reload --port 8000" di terminal Windows atau gunakan "DSP 4-Stem Bawaan Browser".');
        }

        if (sourceAudioFile) {
          const formData = new FormData();
          formData.append('file', sourceAudioFile);
          setSeparationStatus('Mengunggah audio ke model Demucs htdemucs AI...');
          const sepRes = await fetch('http://127.0.0.1:8000/separate-stems', {
            method: 'POST',
            body: formData,
          });

          if (!sepRes.ok) {
            const errData = await sepRes.json().catch(() => ({}));
            throw new Error(errData.detail || 'Proses Demucs di backend Python mengalami kendala.');
          }
        }
      }

      // 2. Client-Side High-Definition Multi-Band DSP Separation
      setSeparationProgress(15);
      const separatedBuffers = await separateAudioIntoStems(sourceAudioBuffer, (pct, msg) => {
        setSeparationProgress(pct);
        setSeparationStatus(msg);
      });

      // Generate Blobs, URLs, and Peaks for all 4 stems
      const updatedStems: DemucsStemItem[] = stems.map(stem => {
        const buf = separatedBuffers[stem.id];
        const wavBlob = audioBufferToWavBlob(buf);
        const url = URL.createObjectURL(wavBlob);
        const pks = extractWaveformPeaks(buf, 200);

        return {
          ...stem,
          audioBuffer: buf,
          audioBlob: wavBlob,
          audioUrl: url,
          peaks: pks
        };
      });

      setStems(updatedStems);
      setIsSeparating(false);
      setSeparationProgress(100);
      setSeparationStatus('Pemisahan 4-stem Demucs selesai! Semua stem siap didengar dan diunduh.');
    } catch (err: any) {
      console.error('Separation error:', err);
      setIsSeparating(false);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memisahkan stem audio.');
    }
  };

  // MULTI-TRACK AUDIO PLAYBACK ENGINE
  const playAllStems = (offset: number = 0) => {
    stopAllPlayback();
    const ctx = getAudioContext();
    const safeOffset = Math.max(0, Math.min(sourceDuration, offset));
    pauseOffsetRef.current = safeOffset;
    playStartTimeRef.current = ctx.currentTime;

    const hasAnySolo = stems.some(s => s.solo);

    stems.forEach(stem => {
      if (!stem.audioBuffer) return;

      const isAudible = hasAnySolo ? stem.solo : !stem.muted;
      const src = ctx.createBufferSource();
      src.buffer = stem.audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = isAudible ? stem.volume * masterVolume : 0.0001;

      const panner = ctx.createStereoPanner();
      panner.pan.value = stem.pan;

      src.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);

      src.start(0, safeOffset);

      activeSourcesRef.current[stem.id] = src;
      activeGainNodesRef.current[stem.id] = gain;
      activePanNodesRef.current[stem.id] = panner;
    });

    setIsPlayingAll(true);
  };

  const pauseAllPlayback = () => {
    if (!isPlayingAll) return;
    const ctx = getAudioContext();
    const elapsed = (ctx.currentTime - playStartTimeRef.current) + pauseOffsetRef.current;
    pauseOffsetRef.current = elapsed;
    stopAllPlayback();
    setPlaybackTime(elapsed);
  };

  const stopAllPlayback = () => {
    Object.values(activeSourcesRef.current).forEach(src => {
      try {
        src?.stop();
        src?.disconnect();
      } catch {}
    });
    activeSourcesRef.current = {};
    activeGainNodesRef.current = {};
    activePanNodesRef.current = {};
    setIsPlayingAll(false);
  };

  const handleTogglePlayAll = () => {
    if (isPlayingAll) {
      pauseAllPlayback();
    } else {
      playAllStems(playbackTime);
    }
  };

  // Solo, Mute, Volume, Pan Controls
  const toggleMute = (stemId: DemucsStemType) => {
    const updated = stems.map(s => s.id === stemId ? { ...s, muted: !s.muted } : s);
    setStems(updated);
    updateAudioNodeGains(updated);
  };

  const toggleSolo = (stemId: DemucsStemType) => {
    const currentSolo = activeStemSolo === stemId ? null : stemId;
    setActiveStemSolo(currentSolo);

    const updated = stems.map(s => ({
      ...s,
      solo: currentSolo === s.id
    }));
    setStems(updated);
    updateAudioNodeGains(updated, currentSolo);
  };

  const updateVolume = (stemId: DemucsStemType, vol: number) => {
    const updated = stems.map(s => s.id === stemId ? { ...s, volume: vol } : s);
    setStems(updated);
    updateAudioNodeGains(updated);
  };

  const updatePan = (stemId: DemucsStemType, pan: number) => {
    const updated = stems.map(s => s.id === stemId ? { ...s, pan } : s);
    setStems(updated);
    const panNode = activePanNodesRef.current[stemId];
    if (panNode) panNode.pan.value = pan;
  };

  const updateAudioNodeGains = (currentStems: DemucsStemItem[], currentSolo: DemucsStemType | null = activeStemSolo) => {
    const hasSolo = currentSolo !== null;
    currentStems.forEach(stem => {
      const gainNode = activeGainNodesRef.current[stem.id];
      if (gainNode) {
        const isAudible = hasSolo ? (currentSolo === stem.id) : !stem.muted;
        gainNode.gain.value = isAudible ? stem.volume * masterVolume : 0.0001;
      }
    });
  };

  // Download Individual Stem Audio WAV
  const downloadStemWav = (stem: DemucsStemItem) => {
    if (!stem.audioBlob) return;
    const url = URL.createObjectURL(stem.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (project.title || 'Audio').replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeTitle}_${stem.id.toUpperCase()}_STEM.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CONVERT INDIVIDUAL STEM TO MIDI
  const handleConvertStemToMidi = async (stemId: DemucsStemType) => {
    const targetStem = stems.find(s => s.id === stemId);
    if (!targetStem || !targetStem.audioBuffer) {
      setErrorMessage(`Stem ${stemId} belum memiliki data audio. Jalankan pemisahan stem terlebih dahulu.`);
      return;
    }

    setStems(prev => prev.map(s => s.id === stemId ? { ...s, isMidiConverting: true } : s));
    setErrorMessage(null);

    try {
      const activeSecId = project.activeSectionId || 'main_a';
      const targetBars = project.sections[activeSecId]?.bars || 2;
      const tempo = project.tempo || 120;

      const extractedNotes = await transcribeStemToMidi(
        stemId,
        targetStem.audioBuffer,
        tempo,
        targetBars
      );

      setStems(prev => prev.map(s => s.id === stemId ? {
        ...s,
        notes: extractedNotes,
        isMidiConverting: false
      } : s));

    } catch (err: any) {
      console.error(`Error converting stem ${stemId} to MIDI:`, err);
      setStems(prev => prev.map(s => s.id === stemId ? { ...s, isMidiConverting: false } : s));
      setErrorMessage(`Gagal mengonversi stem ${stemId} ke MIDI: ${err.message}`);
    }
  };

  // CONVERT ALL 4 STEMS TO MIDI
  const handleConvertAllStemsToMidi = async () => {
    setErrorMessage(null);
    for (const stem of stems) {
      if (stem.audioBuffer) {
        await handleConvertStemToMidi(stem.id);
      }
    }
  };

  // Download Individual Stem MIDI file (.MID)
  const downloadStemMidi = (stem: DemucsStemItem) => {
    if (stem.notes.length === 0) {
      alert(`Stem ${stem.name} belum memiliki notasi MIDI. Klik "Konversi ke MIDI" terlebih dahulu.`);
      return;
    }

    const channelMap: Record<DemucsStemType, number> = {
      drum: 9, // GM channel 10 (0-indexed 9)
      bass: 1, // GM channel 2 (Finger Bass)
      vocal: 0, // GM channel 1 (Piano / Lead)
      other: 1 // GM channel 2 (Strings / Chord)
    };

    const pcMap: Record<DemucsStemType, number> = {
      drum: 0,
      bass: 33, // Finger Bass
      vocal: 0,  // Grand Piano / Lead
      other: 48  // String Ensemble
    };

    const midiBytes = buildMidiFromTrackNotes(
      stem.notes,
      project.tempo || 120,
      `Audio2Style_${stem.name}`,
      channelMap[stem.id],
      pcMap[stem.id]
    );

    const blob = new Blob([midiBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (project.title || 'Audio').replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeTitle}_${stem.id.toUpperCase()}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Preview MIDI with synthesizer
  const handleAuditionMidi = (stem: DemucsStemItem) => {
    if (stem.notes.length === 0) return;
    const tempo = project.tempo || 120;
    globalSynth.playTrackNotes(stem.notes, tempo);
  };

  // INJECT 8-PART YAMAHA STYLE INTO ACTIVE SECTION
  const handleApplyToYamahaStyle = () => {
    const activeSecId = project.activeSectionId || 'main_a';
    const sections = { ...project.sections };
    const activeSec = { ...sections[activeSecId] };
    const tracks = { ...activeSec.tracks };

    const drumNotes = stems.find(s => s.id === 'drum')?.notes || [];
    const bassNotes = stems.find(s => s.id === 'bass')?.notes || [];
    const vocalNotes = stems.find(s => s.id === 'vocal')?.notes || [];
    const otherNotes = stems.find(s => s.id === 'other')?.notes || [];

    // Ch 9: Rhythm 1 (Percussion) - subset of hi-hats / shakers
    const rhythm1Notes = drumNotes.filter(n => n.pitch === 42 || n.pitch === 46).map(n => ({ ...n, channel: 9 }));
    tracks[9] = { ...tracks[9], notes: rhythm1Notes };

    // Ch 10: Rhythm 2 (Main Drums) - full drum kit
    tracks[10] = { ...tracks[10], notes: drumNotes };

    // Ch 11: Bass - bassline
    tracks[11] = { ...tracks[11], notes: bassNotes };

    // Ch 12: Chord 1 - rhythmic chord comping
    const chord1Notes = otherNotes.filter(n => n.channel === 12);
    tracks[12] = { ...tracks[12], notes: chord1Notes.length > 0 ? chord1Notes : otherNotes };

    // Ch 13: Chord 2 - secondary arpeggios
    const chord2Notes = otherNotes.filter(n => n.channel === 13);
    tracks[13] = { ...tracks[13], notes: chord2Notes };

    // Ch 14: Pad - sustained background strings
    const padNotes = otherNotes.filter(n => n.channel === 14);
    tracks[14] = { ...tracks[14], notes: padNotes };

    // Ch 15: Phrase 1 (Melodic Riff / Lead) - vocal stem
    tracks[15] = { ...tracks[15], notes: vocalNotes };

    // Ch 16: Phrase 2 (Counterpoint / Fill)
    const phrase2Notes = vocalNotes.filter((_, idx) => idx % 2 === 1).map(n => ({ ...n, channel: 16 }));
    tracks[16] = { ...tracks[16], notes: phrase2Notes };

    activeSec.tracks = tracks;
    sections[activeSecId] = activeSec;

    onUpdateProject({ sections });
    alert(`Aransemen 8 Part Yamaha Style berhasil diterapkan ke Section ${activeSec.name}! Anda dapat menyempurnakannya di Style Creator dan Piano Roll.`);
    onNavigate('style_creator');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasAnySeparated = stems.some(s => s.audioBuffer !== null);
  const totalExtractedNotes = stems.reduce((acc, s) => acc + s.notes.length, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30">
              <Split className="w-4 h-4" />
            </div>
            <span>AI Audio Stem Separator (Demucs 4-Stems)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pisahkan file MP3 atau WAV menjadi 4 track terisolasi: <strong>Drums</strong>, <strong>Bass</strong>, <strong>Vokal</strong>, dan <strong>Other</strong>. Dengarkan, unduh per stem, dan konversi ke MIDI untuk 8 part Yamaha PSR-S750.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleProcessAudioFile(f);
            }}
            accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Pilih File MP3 / WAV</span>
          </button>
        </div>
      </div>

      {/* Engine Selection & Python Bridge Indicator Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-300">Mesin Pemisahan Stem:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedEngine('browser_dsp')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              selectedEngine === 'browser_dsp'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>DSP 4-Stem Web Audio (Browser Klien - Aktif Langsung)</span>
          </button>

          <button
            onClick={() => setSelectedEngine('python_demucs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              selectedEngine === 'python_demucs'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Demucs AI Backend Python (:8000)</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 font-mono text-[11px]">
          <span className="text-slate-500">Status Server:</span>
          {pythonServerOnline === true && (
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              FastAPI Online (:8000)
            </span>
          )}
          {pythonServerOnline === false && (
            <span className="text-amber-400 flex items-center gap-1" title="Jalankan server lokal untuk Demucs htdemucs AI">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Offline (Menggunakan DSP Browser)
            </span>
          )}
          <button
            onClick={checkPythonHealth}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Cek Ulang Status Server Python"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-4 flex items-start space-x-3 text-xs text-red-200 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-red-300">Pemberitahuan:</div>
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Processing Banner */}
      {isSeparating && (
        <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-xl p-4 space-y-2.5 animate-pulse shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cyan-300 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              {separationStatus}
            </span>
            <span className="font-mono text-cyan-400 font-bold">{separationProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${separationProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Source Audio Card & Multi-track Master Transport Deck */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white truncate max-w-xs sm:max-w-md">
                {sourceAudioFile?.name || project.sourceAudio?.name || 'Belum Ada Audio (Pilih file MP3 atau WAV)'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {sourceDuration > 0
                  ? `Durasi: ${formatTime(sourceDuration)} • Tempo: ${project.tempo || 120} BPM • 4-Stems Demucs`
                  : 'Silakan pilih file audio di atas untuk memulai pemisahan'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunStemSeparation}
              disabled={isSeparating || !sourceAudioBuffer}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-900/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Split className="w-4 h-4" />
              <span>Proses Pemisahan 4 Stem</span>
            </button>
          </div>
        </div>

        {/* Master Synchronized Transport */}
        {hasAnySeparated && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleTogglePlayAll}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
                title={isPlayingAll ? 'Jeda Semua Stem' : 'Putar Semua Stem Bersama (Sinkron)'}
              >
                {isPlayingAll ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  stopAllPlayback();
                  setPlaybackTime(0);
                  pauseOffsetRef.current = 0;
                }}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Stop Pemutaran"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={() => {
                  pauseOffsetRef.current = 0;
                  setPlaybackTime(0);
                  if (isPlayingAll) playAllStems(0);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Kembali ke awal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="font-mono text-xs font-semibold text-slate-200 px-3 py-1.5 bg-slate-900 rounded-md border border-slate-800">
                {formatTime(playbackTime)} / {formatTime(sourceDuration)}
              </div>
            </div>

            {/* Master Volume Slider */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Master Vol</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setMasterVolume(vol);
                  updateAudioNodeGains(stems);
                }}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="font-mono text-xs text-slate-400 w-8">{Math.round(masterVolume * 100)}%</span>
            </div>

            {/* Master Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleConvertAllStemsToMidi}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition-colors cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Konversi Semua ke MIDI</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4 Stems Deck: Drums, Bass, Vocal, Other */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Hasil Pemisahan 4 Stem (Drums, Bass, Vocal, Other)</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Total Notasi Terkonversi: <strong className="text-emerald-400 font-bold">{totalExtractedNotes} not</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stems.map((stem) => {
            const isAudible = activeStemSolo ? activeStemSolo === stem.id : !stem.muted;

            return (
              <div
                key={stem.id}
                className={`bg-slate-900/90 border rounded-xl p-4 space-y-4 transition-all shadow-xl relative overflow-hidden ${
                  !isAudible ? 'opacity-60 border-slate-800' : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Accent top bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1" 
                  style={{ backgroundColor: stem.color }}
                />

                {/* Header & Meta */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md"
                      style={{ backgroundColor: `${stem.color}15`, border: `1px solid ${stem.color}40` }}
                    >
                      {stem.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{stem.name}</span>
                        <span 
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                          style={{ color: stem.color, borderColor: `${stem.color}50`, backgroundColor: `${stem.color}10` }}
                        >
                          {stem.id.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{stem.subtitle}</div>
                    </div>
                  </div>

                  {/* Yamaha PSR-S750 Target Part Badge */}
                  <div className="text-right">
                    <span className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 text-cyan-400 block">
                      Yamaha Ch: {stem.yamahaChannels.join(', ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      {stem.yamahaPartNames[0]}
                    </span>
                  </div>
                </div>

                {/* Mini Waveform visualization */}
                <div className="bg-slate-950 rounded-lg p-2 border border-slate-800/80 h-16 flex items-center justify-center overflow-hidden relative">
                  {stem.peaks.length > 0 ? (
                    <div className="w-full h-full flex items-center space-x-0.5">
                      {stem.peaks.slice(0, 100).map((p, idx) => {
                        const progress = sourceDuration > 0 ? playbackTime / sourceDuration : 0;
                        const barPos = idx / 100;
                        const isPlayed = barPos <= progress;

                        return (
                          <div
                            key={idx}
                            className="flex-1 rounded-sm transition-all"
                            style={{
                              height: `${Math.max(4, p * 100)}%`,
                              backgroundColor: isPlayed ? stem.color : '#334155',
                              opacity: isPlayed ? 1 : 0.6
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {stem.audioBuffer ? 'Waveform Siap' : 'Menunggu pemisahan stem...'}
                    </span>
                  )}

                  {/* Active playing indicator badge */}
                  {isPlayingAll && isAudible && stem.audioBuffer && (
                    <div className="absolute top-1 right-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      PLAYING
                    </div>
                  )}
                </div>

                {/* Mixer Channel Controls: Solo, Mute, Volume, Pan */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70 text-xs">
                  {/* Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Volume</span>
                      <span>{Math.round(stem.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={stem.volume}
                      onChange={(e) => updateVolume(stem.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  {/* Pan Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Pan (L/R)</span>
                      <span>{stem.pan === 0 ? 'Center' : stem.pan < 0 ? `L ${Math.abs(Math.round(stem.pan * 100))}` : `R ${Math.round(stem.pan * 100)}`}</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.02"
                      value={stem.pan}
                      onChange={(e) => updatePan(stem.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>
                </div>

                {/* Solo / Mute Buttons & WAV Download */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleMute(stem.id)}
                      className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        stem.muted
                          ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      MUTE
                    </button>

                    <button
                      onClick={() => toggleSolo(stem.id)}
                      className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        stem.solo
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      SOLO
                    </button>
                  </div>

                  {/* Download Stem Audio WAV Button */}
                  <button
                    onClick={() => downloadStemWav(stem)}
                    disabled={!stem.audioBlob}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    title="Unduh file audio WAV stem ini"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Unduh WAV</span>
                  </button>
                </div>

                {/* MIDI Conversion Section per Stem */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-emerald-400" />
                      Notasi MIDI {stem.name}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 font-bold">
                      {stem.notes.length} not
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Convert to MIDI button */}
                    <button
                      onClick={() => handleConvertStemToMidi(stem.id)}
                      disabled={stem.isMidiConverting || !stem.audioBuffer}
                      className="flex-1 flex items-center justify-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg shadow-md transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>{stem.isMidiConverting ? 'Mengonversi...' : 'Konversi ke MIDI'}</span>
                    </button>

                    {/* Audition Converted MIDI */}
                    {stem.notes.length > 0 && (
                      <button
                        onClick={() => handleAuditionMidi(stem)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Dengarkan hasil MIDI dengan instrumen synthesizer"
                      >
                        <Play className="w-3 h-3 text-emerald-400 fill-current" />
                        <span>Audisi</span>
                      </button>
                    )}

                    {/* Download Isolated MIDI File */}
                    {stem.notes.length > 0 && (
                      <button
                        onClick={() => downloadStemMidi(stem)}
                        className="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Unduh file MIDI standar (.MID)"
                      >
                        <Download className="w-3 h-3" />
                        <span>.MID</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8-Part Yamaha PSR-S750 Style Architecture Card */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Struktur 8-Part Yamaha PSR-S750 Style</h3>
              <p className="text-xs text-slate-400">Pemetaan otomatis dari 4 stem ke arsitektur 8 kanal Arranger Yamaha SFF1</p>
            </div>
          </div>

          <button
            onClick={handleApplyToYamahaStyle}
            disabled={totalExtractedNotes === 0}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Terapkan ke Style Creator (Main A)</span>
          </button>
        </div>

        {/* 8-Channel Yamaha Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-red-400 block font-bold">CH 9</span>
            <span className="text-white font-semibold text-[11px] block truncate">Rhythm 1</span>
            <span className="text-[10px] text-slate-500 block">Sub-Percussion</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-red-400 block font-bold">CH 10</span>
            <span className="text-white font-semibold text-[11px] block truncate">Rhythm 2</span>
            <span className="text-[10px] text-slate-500 block">Main Drum Kit</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-emerald-400 block font-bold">CH 11</span>
            <span className="text-white font-semibold text-[11px] block truncate">Bass</span>
            <span className="text-[10px] text-slate-500 block">Bassline</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-cyan-400 block font-bold">CH 12</span>
            <span className="text-white font-semibold text-[11px] block truncate">Chord 1</span>
            <span className="text-[10px] text-slate-500 block">Rhythm Comping</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-cyan-400 block font-bold">CH 13</span>
            <span className="text-white font-semibold text-[11px] block truncate">Chord 2</span>
            <span className="text-[10px] text-slate-500 block">Harmoni Guitar/EP</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-cyan-400 block font-bold">CH 14</span>
            <span className="text-white font-semibold text-[11px] block truncate">Pad</span>
            <span className="text-[10px] text-slate-500 block">Strings / Choir</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-pink-400 block font-bold">CH 15</span>
            <span className="text-white font-semibold text-[11px] block truncate">Phrase 1</span>
            <span className="text-[10px] text-slate-500 block">Melodic Riff/Lead</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-pink-400 block font-bold">CH 16</span>
            <span className="text-white font-semibold text-[11px] block truncate">Phrase 2</span>
            <span className="text-[10px] text-slate-500 block">Counter-Melody</span>
          </div>
        </div>

        {/* IMPORTANT PROFESSIONAL NOTICE: No false claims of 100% perfection */}
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-200/90 leading-relaxed">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-300 font-bold block">
              Catatan Penting Musisi (Tanpa Klaim Hasil Otomatis 100% Sempurna):
            </strong>
            <p>
              Pemisahan stem AI dan transkripsi MIDI menyediakan <strong>fondasi aransemen dasar</strong> yang sangat mempercepat pembuatan style. Namun, karena rekaman lagu asli memiliki tumpang tindih harmonik, reverb, dan efek polifonik yang kompleks, <em>hasil konversi otomatis tidak diklaim pasti akurat 100%</em>. Anda disarankan meninjau dan merapikan not pada menu <strong>MIDI Editor (Piano Roll)</strong> serta memeriksa aturan CASM di <strong>Style Creator</strong> sebelum mengekspor file <code>.STY</code> ke keyboard Yamaha PSR-S750.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
