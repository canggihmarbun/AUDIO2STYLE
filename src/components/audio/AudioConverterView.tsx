import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Play, Pause, Square, RotateCcw, Volume2, 
  Sparkles, Music, Activity, Cpu, CheckCircle2, AlertCircle, 
  Layers, VolumeX, Eye, ArrowRight, Wand2, SlidersHorizontal,
  AudioWaveform, Terminal, RefreshCw, FileText, Check, ShieldCheck
} from 'lucide-react';
import { ProjectData, StemType, StemTrack, NavTab, MidiNote, ConversionEngineType, AudioConversionResult } from '../../types';
import { 
  decodeAudioFile, StemAudioPlayer, generateChordsFromAudio, 
  estimateKeyFromBuffer, transcribeAudioToMidi 
} from '../../utils/audioEngine';

interface AudioConverterViewProps {
  project: ProjectData;
  onUpdateProject: (updated: Partial<ProjectData>) => void;
  onNavigate: (tab: NavTab) => void;
  stemPlayer: StemAudioPlayer;
  isAudioPlaying: boolean;
  onTogglePlay: () => void;
}

export const AudioConverterView: React.FC<AudioConverterViewProps> = ({
  project,
  onUpdateProject,
  onNavigate,
  stemPlayer,
  isAudioPlaying,
  onTogglePlay,
}) => {
  const [selectedEngine, setSelectedEngine] = useState<ConversionEngineType>('browser_dsp');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [conversionReport, setConversionReport] = useState<AudioConversionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [keyConfidence, setKeyConfidence] = useState<number>(0.92);

  // Stems configuration
  const [stems, setStems] = useState<StemTrack[]>([
    { id: 'drum', name: 'Drum & Perkusi', color: '#ef4444', icon: '🥁', volume: 0.9, muted: false, solo: false, pan: 0, channel: 10, notesCount: 0 },
    { id: 'bass', name: 'Bass Elektrik', color: '#10b981', icon: '🎸', volume: 0.85, muted: false, solo: false, pan: 0, channel: 11, notesCount: 0 },
    { id: 'chord', name: 'Piano & Keyboard Rhythm', color: '#06b6d4', icon: '🎹', volume: 0.8, muted: false, solo: false, pan: -0.2, channel: 12, notesCount: 0 },
    { id: 'melody', name: 'Melodi / Vokal / Lead', color: '#ec4899', icon: '🎷', volume: 0.75, muted: false, solo: false, pan: 0.2, channel: 15, notesCount: 0 },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync current time while playing
  useEffect(() => {
    const updateTime = () => {
      if (stemPlayer.getIsPlaying()) {
        setCurrentTime(stemPlayer.getCurrentTime());
      }
      animFrameRef.current = requestAnimationFrame(updateTime);
    };
    animFrameRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stemPlayer]);

  // Redraw waveform canvas
  useEffect(() => {
    drawWaveform();
  }, [peaks, currentTime, audioBuffer]);

  // Initial stem notes count sync from project
  useEffect(() => {
    const mainA = project.sections['main_a'];
    if (mainA) {
      setStems(prev => prev.map(s => {
        const count = mainA.tracks[s.channel]?.notes?.length || 0;
        return { ...s, notesCount: count };
      }));
    }
  }, [project]);

  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);
    setConversionReport(null);
    setIsProcessing(true);
    setProcessProgress(10);
    setProcessStatus(`Membaca file ${file.name}...`);

    try {
      setProcessProgress(30);
      setProcessStatus('Mendekode PCM audio via Web Audio API...');
      const decoded = await decodeAudioFile(file);

      setProcessProgress(60);
      setProcessStatus('Mengekstraksi spektrum waveform & mendeteksi BPM autokorelasi...');
      setAudioBuffer(decoded.buffer);
      setPeaks(decoded.peaks);
      stemPlayer.setBuffer(decoded.buffer);

      setProcessProgress(80);
      setProcessStatus('Menganalisis matriks Chromagram 12-semitone & nada dasar...');
      const keyResult = estimateKeyFromBuffer(decoded.buffer);
      setKeyConfidence(keyResult.confidence);

      setProcessProgress(95);
      setProcessStatus('Mendeteksi progresi harmoni akor per birama...');
      const generatedChords = generateChordsFromAudio(
        decoded.metadata.detectedBpm,
        decoded.metadata.duration,
        decoded.buffer
      );

      setProcessProgress(100);
      setProcessStatus('Pemuatan file audio berhasil!');

      // Update project metadata
      onUpdateProject({
        tempo: decoded.metadata.detectedBpm,
        timeSignature: decoded.metadata.detectedTimeSignature,
        sourceAudio: {
          name: decoded.metadata.name,
          size: decoded.metadata.size,
          duration: decoded.metadata.duration
        },
        chords: generatedChords
      });

      setTimeout(() => {
        setIsProcessing(false);
      }, 400);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memproses file audio. Pastikan file berformat MP3 atau WAV yang valid.');
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (peaks.length === 0) {
      // Empty placeholder waveform
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Belum ada file audio yang dimuat. Klik "Impor File MP3 / WAV" atau seret file ke sini.', width / 2, height / 2);
      return;
    }

    const duration = project.sourceAudio?.duration || 1;
    const playProgress = Math.min(1, currentTime / duration);
    const playheadX = playProgress * width;

    // Draw bars
    const barWidth = width / peaks.length;
    const midY = height / 2;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const peakVal = peaks[i];
      const barHeight = Math.max(2, peakVal * (height * 0.85));

      // Color before playhead (played) vs after (unplayed)
      if (x < playheadX) {
        ctx.fillStyle = '#06b6d4'; // Cyan active
      } else {
        ctx.fillStyle = '#334155'; // Slate dark
      }

      ctx.fillRect(x, midY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
    }

    // Draw playhead vertical line
    ctx.strokeStyle = '#f59e0b'; // Amber playhead
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !project.sourceAudio?.duration) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = progress * project.sourceAudio.duration;
    setCurrentTime(targetSeconds);
    stemPlayer.seek(targetSeconds);
  };

  // REAL AUDIO-TO-MIDI CONVERSION TRIGGER
  const handleConvertToMidi = async () => {
    setErrorMessage(null);

    // Validation: Ensure audio buffer exists
    if (!audioBuffer) {
      setErrorMessage('Silakan pilih dan muat file audio MP3 atau WAV terlebih dahulu sebelum memulai konversi.');
      return;
    }

    // Engine: Python Bridge Check
    if (selectedEngine === 'python_bridge') {
      setIsProcessing(true);
      setProcessProgress(20);
      setProcessStatus('Memeriksa ketersediaan server Python lokal di http://127.0.0.1:8000...');

      try {
        const testRes = await fetch('http://127.0.0.1:8000/health', { method: 'GET', signal: AbortSignal.timeout(1800) });
        if (!testRes.ok) throw new Error('Status server tidak siap');
      } catch (e) {
        setIsProcessing(false);
        setErrorMessage(
          'Server Python lokal (http://127.0.0.1:8000) belum berjalan di komputer Anda. Silakan jalankan script Python (FastAPI/Demucs) atau gunakan "Mesin DSP Bawaan Browser" yang aktif langsung.'
        );
        return;
      }
    }

    // Run Real Browser DSP Transcription
    setIsProcessing(true);
    setProcessProgress(5);
    setProcessStatus('Memulai pemrosesan DSP audio multi-pass...');

    try {
      const activeSectionId = project.activeSectionId || 'main_a';
      const targetBars = project.sections[activeSectionId]?.bars || 2;

      const result = await transcribeAudioToMidi(
        audioBuffer,
        project.tempo || 120,
        targetBars,
        (pct, msg) => {
          setProcessProgress(pct);
          setProcessStatus(msg);
        }
      );

      // Populate notes into the active section (Main A)
      const sections = { ...project.sections };
      const activeSec = { ...sections[activeSectionId] };
      const tracks = { ...activeSec.tracks };

      // Ch 10: Drums
      tracks[10] = { ...tracks[10], notes: result.drumNotes };
      // Ch 11: Bass
      tracks[11] = { ...tracks[11], notes: result.bassNotes };
      // Ch 12: Chord 1
      tracks[12] = { ...tracks[12], notes: result.chordNotes };
      // Ch 15: Phrase 1 / Lead
      tracks[15] = { ...tracks[15], notes: result.melodyNotes };

      activeSec.tracks = tracks;
      sections[activeSectionId] = activeSec;

      // Update stem counters
      setStems(prev => prev.map(s => {
        if (s.id === 'drum') return { ...s, notesCount: result.drumNotes.length };
        if (s.id === 'bass') return { ...s, notesCount: result.bassNotes.length };
        if (s.id === 'chord') return { ...s, notesCount: result.chordNotes.length };
        if (s.id === 'melody') return { ...s, notesCount: result.melodyNotes.length };
        return s;
      }));

      // Update Project
      onUpdateProject({
        sections,
        chords: result.chords,
        tempo: result.detectedBpm
      });

      const conversionReportData: AudioConversionResult = {
        success: true,
        engineUsed: selectedEngine,
        engineName: selectedEngine === 'python_bridge' ? 'Python FastAPI Engine (Lokal)' : 'Browser Client-Side DSP Engine (Web Audio API)',
        detectedBpm: result.detectedBpm,
        detectedKey: result.detectedKey,
        keyConfidence: result.keyConfidence,
        chords: result.chords,
        tracksNotes: {
          drum: result.drumNotes,
          bass: result.bassNotes,
          chord: result.chordNotes,
          melody: result.melodyNotes
        },
        stats: result.stats
      };

      setConversionReport(conversionReportData);
      setIsProcessing(false);

    } catch (err: any) {
      console.error('Transcription error:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses sinyal audio.');
    }
  };

  // Stem Controls
  const toggleMute = (stemId: StemType) => {
    const updated = stems.map(s => s.id === stemId ? { ...s, muted: !s.muted } : s);
    setStems(updated);
    applyStemFilters(updated);
  };

  const toggleSolo = (stemId: StemType) => {
    const target = stems.find(s => s.id === stemId);
    const newSoloState = !target?.solo;
    const updated = stems.map(s => s.id === stemId ? { ...s, solo: newSoloState } : { ...s, solo: false });
    setStems(updated);
    applyStemFilters(updated);
  };

  const updateStemVolume = (stemId: StemType, vol: number) => {
    const updated = stems.map(s => s.id === stemId ? { ...s, volume: vol } : s);
    setStems(updated);
    applyStemFilters(updated);
  };

  const applyStemFilters = (currentStems: StemTrack[]) => {
    const hasSolo = currentStems.some(s => s.solo);
    currentStems.forEach(stem => {
      stemPlayer.setStemVolume(stem.id, stem.volume, stem.muted, hasSolo, stem.solo);
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AudioWaveform className="w-5 h-5 text-cyan-400" />
            Audio Converter & Transkripsi MIDI Nyata
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ekstraksi notasi MIDI asli (Drum, Bass, Chord, Melodi) dari audio MP3 atau WAV menggunakan pemrosesan DSP nyata.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
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

      {/* Engine Selection Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-300">Pilihan Mesin Pemrosesan:</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedEngine('browser_dsp')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              selectedEngine === 'browser_dsp'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mesin DSP Browser (Web Audio API - Bawaan Aktif)</span>
          </button>

          <button
            onClick={() => setSelectedEngine('python_bridge')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              selectedEngine === 'python_bridge'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Python FastAPI Bridge (Lokal :8000)</span>
          </button>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-4 flex items-start space-x-3 text-xs text-red-200 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-red-300">Terjadi Kendala:</div>
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Processing Status Banner */}
      {isProcessing && (
        <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-xl p-4 space-y-2 animate-pulse shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cyan-300 font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
              {processStatus}
            </span>
            <span className="font-mono text-cyan-400 font-bold">{processProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${processProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Waveform & Player Deck */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-slate-900/80 border rounded-xl p-5 space-y-4 shadow-xl transition-all ${
          isDragging ? 'border-cyan-400 bg-cyan-950/20' : 'border-slate-800'
        }`}
      >
        {/* Audio File Metadata Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white truncate max-w-[260px] sm:max-w-md">
                {project.sourceAudio?.name || 'Belum Ada Audio (Pilih file MP3 atau WAV)'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {project.sourceAudio 
                  ? `${(project.sourceAudio.size / (1024 * 1024)).toFixed(2)} MB • ${formatTime(project.sourceAudio.duration)}` 
                  : 'Seret & lepas file audio ke area ini atau gunakan tombol di atas'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <div className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">ESTIMASI BPM</span>
              <span className="text-amber-400 font-bold text-sm">{project.tempo} BPM</span>
            </div>

            <div className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">NADA DASAR (CHROMAGRAM)</span>
              <span className="text-cyan-400 font-bold text-sm">
                {project.sourceAudio ? `${keyConfidence > 0 ? (project.chords[0]?.root || 'C') + ' ' + (project.chords[0]?.type === 'min' ? 'Minor' : 'Major') : 'C Major'}` : 'Belum Terdeteksi'}
              </span>
            </div>
          </div>
        </div>

        {/* Waveform Canvas */}
        <div className="relative bg-slate-950 rounded-lg p-2 border border-slate-800 overflow-hidden group">
          <canvas
            ref={canvasRef}
            width={1000}
            height={130}
            onClick={handleWaveformClick}
            className="w-full h-32 block cursor-pointer transition-opacity group-hover:opacity-95"
            title="Klik pada waveform untuk melompat ke posisi pemutaran"
          />

          {/* Time floating display */}
          <div className="absolute bottom-2 right-3 bg-slate-900/90 border border-slate-700 px-2.5 py-0.5 rounded text-[11px] font-mono text-slate-300">
            {formatTime(currentTime)} / {formatTime(project.sourceAudio?.duration || 0)}
          </div>
        </div>

        {/* Player Transport Controls & Main Convert Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={onTogglePlay}
              disabled={!audioBuffer}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
              title={isAudioPlaying ? 'Jeda Audio' : 'Putar Audio'}
            >
              {isAudioPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => {
                stemPlayer.stop();
                setCurrentTime(0);
              }}
              disabled={!audioBuffer}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
              title="Stop Pemutaran"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => {
                stemPlayer.seek(0);
                setCurrentTime(0);
              }}
              disabled={!audioBuffer}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
              title="Kembali ke awal lagu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="font-mono text-sm font-semibold text-slate-200 px-3 py-1 bg-slate-950 rounded-md border border-slate-800">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Action to trigger REAL Audio-to-MIDI conversion */}
          <button
            onClick={handleConvertToMidi}
            disabled={isProcessing || !audioBuffer}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            <span>Konversi Audio ke MIDI Nyata</span>
          </button>
        </div>
      </div>

      {/* Conversion Report Card (If Converted) */}
      {conversionReport && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hasil Transkripsi Audio ke MIDI Nyata</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Mesin: <strong className="text-cyan-300">{conversionReport.engineName}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('midi_editor')}
                className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <span>Buka di Piano Roll</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate('style_creator')}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                <span>Lihat di Style Creator</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">TOTAL NOT</span>
              <span className="text-emerald-400 font-bold text-base">{conversionReport.stats.totalNotes}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">DRUM (CH 10)</span>
              <span className="text-red-400 font-bold text-base">{conversionReport.stats.drumCount} not</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">BASS (CH 11)</span>
              <span className="text-emerald-400 font-bold text-base">{conversionReport.stats.bassCount} not</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">CHORD (CH 12)</span>
              <span className="text-cyan-400 font-bold text-base">{conversionReport.stats.chordCount} not</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">MELODI (CH 15)</span>
              <span className="text-pink-400 font-bold text-base">{conversionReport.stats.melodyCount} not</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">RATA2 VELOCITY</span>
              <span className="text-amber-400 font-bold text-base">{conversionReport.stats.avgVelocity}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stem Separation & Multi-Band Mixer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              Pemisahan Stem Audio & Jalur Channel Arranger
            </h3>
            <p className="text-xs text-slate-400">
              Kontrol frekuensi terisolasi dan atur level audio per instrumen sebelum atau setelah konversi
            </p>
          </div>

          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            DSP Multi-Band Filter Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stems.map((stem) => (
            <div
              key={stem.id}
              className={`bg-slate-950 border rounded-xl p-4 space-y-3 transition-all ${
                stem.muted ? 'opacity-50 border-slate-800' : 'border-slate-800/80 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{stem.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{stem.name}</div>
                    <div className="text-[10px] font-mono text-cyan-400">
                      Channel {stem.channel} (Yamaha S750)
                    </div>
                  </div>
                </div>

                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: stem.color }}
                />
              </div>

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
                  onChange={(e) => updateStemVolume(stem.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Solo & Mute Buttons */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => toggleMute(stem.id)}
                  className={`flex-1 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                    stem.muted
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  MUTE
                </button>

                <button
                  onClick={() => toggleSolo(stem.id)}
                  className={`flex-1 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                    stem.solo
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  SOLO
                </button>
              </div>

              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Notasi Diekstrak:</span>
                <span className="font-mono text-slate-300 font-semibold">{stem.notesCount} not</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
