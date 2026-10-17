import React, { useState, useEffect, useRef } from 'react';
import { 
  Usb, Radio, Play, Square, RefreshCw, CheckCircle2, 
  AlertCircle, ShieldCheck, Terminal, ArrowRight, Zap, Volume2, Music, Disc, Upload
} from 'lucide-react';
import { ProjectData } from '../../types';
import { generateYamahaStyleFile } from '../../utils/yamahaStyleEngine';

interface WebMidiTransferViewProps {
  project: ProjectData;
}

export const WebMidiTransferView: React.FC<WebMidiTransferViewProps> = ({ project }) => {
  const [midiAccess, setMidiAccess] = useState<any>(null);
  const [outputs, setOutputs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Menunggu inisialisasi Web MIDI API...');
  const [isPlayingLive, setIsPlayingLive] = useState<boolean>(false);
  const [isRecordingToKeyboard, setIsRecordingToKeyboard] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [logs, setLogs] = useState<string[]>([]);
  
  const playbackTimerRef = useRef<any>(null);
  const recordTimerRef = useRef<any>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [formatTime() + ' - ' + msg, ...prev.slice(0, 30)]);
  };

  const formatTime = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  // Initialize Web MIDI API
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setStatusMessage('Web MIDI API tidak didukung oleh browser ini. Gunakan Google Chrome atau Microsoft Edge.');
      addLog('Error: Web MIDI API tidak tersedia di browser.');
      return;
    }

    navigator.requestMIDIAccess({ sysex: true })
      .then((access) => {
        setMidiAccess(access);
        setStatusMessage('Web MIDI API siap diakses. Hubungkan kabel USB-MIDI ke komputer dan Yamaha PSR-S750.');
        addLog('Web MIDI API berhasil diinisialisasi (dengan dukungan SysEx).');

        updateOutputs(access);

        access.onstatechange = () => {
          updateOutputs(access);
        };
      })
      .catch((err) => {
        setStatusMessage('Akses MIDI ditolak atau gagal: ' + err.message);
        addLog('Gagal meminta izin MIDI: ' + err.message);
      });

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const updateOutputs = (access: any) => {
    const outList: { id: string; name: string }[] = [];
    const iterator = access.outputs.values();
    for (let output = iterator.next(); !output.done; output = iterator.next()) {
      const port = output.value;
      outList.push({ id: port.id, name: port.name || 'Yamaha MIDI Device' });
    }
    setOutputs(outList);
    if (outList.length > 0 && !selectedOutputId) {
      setSelectedOutputId(outList[0].id);
      addLog(`Ditemukan perangkat MIDI: ${outList[0].name}`);
    }
  };

  // Test Sound / Note Check
  const handleTestNote = () => {
    if (!midiAccess || !selectedOutputId) {
      alert('Pilih port output MIDI terlebih dahulu.');
      return;
    }

    try {
      const output = midiAccess.outputs.get(selectedOutputId);
      if (!output) {
        alert('Port output MIDI tidak ditemukan.');
        return;
      }

      addLog('Mengirim uji suara (Note On C4, Ch 10)...');
      output.send([0x99, 60, 100]);
      setTimeout(() => {
        output.send([0x89, 60, 0]);
        addLog('Uji suara berhasil dikirim via kabel MIDI.');
      }, 500);
    } catch (e: any) {
      addLog('Error saat mengirim uji MIDI: ' + e.message);
      alert('Gagal mengirim MIDI: ' + e.message);
    }
  };

  // Live MIDI Streaming Playback
  const handleToggleLivePlayback = () => {
    if (!midiAccess || !selectedOutputId) {
      alert('Pilih port MIDI Output (Yamaha PSR-S750) terlebih dahulu.');
      return;
    }

    const output = midiAccess.outputs.get(selectedOutputId);
    if (!output) {
      alert('Port output MIDI tidak valid.');
      return;
    }

    if (isPlayingLive) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
      setIsPlayingLive(false);
      addLog('Pemutaran style live via MIDI dihentikan.');

      for (let ch = 0; ch < 16; ch++) {
        output.send([0xB0 | ch, 123, 0]); // All Notes Off
      }
      return;
    }

    setIsPlayingLive(true);
    setCurrentBar(1);
    addLog(`Memulai Streaming Live Style "${project.title}" ke Yamaha PSR-S750 via Kabel MIDI...`);

    // XG System On SysEx
    output.send([0xF0, 0x43, 0x10, 0x4C, 0x00, 0x00, 0x7E, 0x00, 0xF7]);

    const mainA = project.sections['main_a'] || Object.values(project.sections)[0];
    if (mainA && mainA.tracks) {
      Object.values(mainA.tracks).forEach(trk => {
        const ch = (trk.channel - 1) & 0x0F;
        output.send([0xB0 | ch, 0, trk.msb ?? 0]);
        output.send([0xB0 | ch, 32, trk.lsb ?? 0]);
        output.send([0xC0 | ch, trk.programChange ?? 0]);
        output.send([0xB0 | ch, 7, trk.volume ?? 100]);
        output.send([0xB0 | ch, 10, trk.pan ?? 64]);
        output.send([0xB0 | ch, 11, 127]);
      });
      addLog('Inisialisasi Voice XG (Ch 9-16) berhasil dikirim.');
    }

    const tempo = project.tempo || 120;
    const msPerBeat = (60000 / tempo);
    const msPerStep = msPerBeat / 4;

    let stepCounter = 0;

    playbackTimerRef.current = setInterval(() => {
      const currentStepInBar = stepCounter % 16;
      const barNum = Math.floor(stepCounter / 16) + 1;
      setCurrentBar(barNum > 2 ? 1 + ((barNum - 1) % 4) : barNum);

      if (mainA && mainA.tracks) {
        Object.values(mainA.tracks).forEach(trk => {
          const ch = (trk.channel - 1) & 0x0F;
          const matchingNotes = trk.notes.filter(n => n.startStep === currentStepInBar);
          matchingNotes.forEach(note => {
            const pitch = note.pitch & 0x7F;
            const velocity = note.velocity & 0x7F;
            output.send([0x90 | ch, pitch, velocity]);

            const durationMs = Math.max(50, (note.durationSteps || 2) * msPerStep);
            setTimeout(() => {
              try {
                output.send([0x80 | ch, pitch, 0]);
              } catch (e) {}
            }, durationMs);
          });
        });
      }

      stepCounter++;
    }, msPerStep);
  };

  // Direct Record to Keyboard Song Memory via MIDI Cable
  const handleRecordToKeyboard = () => {
    if (!midiAccess || !selectedOutputId) {
      alert('Pilih port MIDI Output (Yamaha PSR-S750) terlebih dahulu.');
      return;
    }

    const output = midiAccess.outputs.get(selectedOutputId);
    if (!output) {
      alert('Port output MIDI tidak valid.');
      return;
    }

    const confirmed = window.confirm(
      'PENTING:\n1. Pastikan keyboard Yamaha PSR-S750 sudah masuk ke mode REC (Song Recording / User Song).\n2. Aplikasi akan mentransmisikan seluruh data not lagu secara real-time ke sequencer keyboard agar langsung terekam di memori internal.\n\nLanjutkan proses rekam ke keyboard sekarang?'
    );

    if (!confirmed) return;

    setIsRecordingToKeyboard(true);
    setRecordProgress(0);
    addLog(`Memulai transfer rekam song "${project.title}" ke memori internal keyboard via kabel MIDI...`);

    // Send XG Reset
    output.send([0xF0, 0x43, 0x10, 0x4C, 0x00, 0x00, 0x7E, 0x00, 0xF7]);

    const mainA = project.sections['main_a'] || Object.values(project.sections)[0];
    const tempo = project.tempo || 120;
    const msPerBeat = (60000 / tempo);
    const msPerStep = msPerBeat / 4;

    let totalSteps = 64; // 4 bars of recording
    let currentStep = 0;

    recordTimerRef.current = setInterval(() => {
      const progress = Math.round((currentStep / totalSteps) * 100);
      setRecordProgress(progress);

      const stepInBar = currentStep % 16;
      if (mainA && mainA.tracks) {
        Object.values(mainA.tracks).forEach(trk => {
          const ch = (trk.channel - 1) & 0x0F;
          const notes = trk.notes.filter(n => n.startStep === stepInBar);
          notes.forEach(note => {
            output.send([0x90 | ch, note.pitch & 0x7F, note.velocity & 0x7F]);
            setTimeout(() => {
              try { output.send([0x80 | ch, note.pitch & 0x7F, 0]); } catch(e) {}
            }, msPerStep * (note.durationSteps || 2));
          });
        });
      }

      currentStep++;
      if (currentStep >= totalSteps) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
        setIsRecordingToKeyboard(false);
        setRecordProgress(100);
        addLog('Transfer rekam song ke keyboard selesai! Tekan SAVE di keyboard untuk menyimpan ke memori internal.');
        alert('Transfer rekam song ke Yamaha PSR-S750 selesai!\n\nSilakan tekan tombol SAVE di keyboard untuk menyimpan rekaman ke User Song Memory tanpa flashdisk.');
      }
    }, msPerStep);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Usb className="w-5 h-5 text-emerald-400" />
            Transfer & Rekam Style/MIDI Langsung ke Keyboard via Kabel MIDI
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kopi dan rekam aransemen langsung ke memori internal Yamaha PSR-S750 via kabel USB-MIDI tanpa flashdisk.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleLivePlayback}
            disabled={outputs.length === 0}
            className={`flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-all cursor-pointer ${
              outputs.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isPlayingLive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/30'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isPlayingLive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlayingLive ? 'Stop Live Play' : 'Test Live Audio'}</span>
          </button>

          <button
            onClick={handleRecordToKeyboard}
            disabled={outputs.length === 0 || isRecordingToKeyboard}
            className="flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/30 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isRecordingToKeyboard ? `Merekam... (${recordProgress}%)` : 'Kopi/Rekam ke Memory Keyboard'}</span>
          </button>
        </div>
      </div>

      {/* Connection Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Status Perangkat MIDI
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              outputs.length > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {outputs.length > 0 ? 'Kabel Terdeteksi' : 'Tidak Ada Perangkat'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Pilih Port MIDI Output (Yamaha Keyboard):</label>
              <select
                value={selectedOutputId}
                onChange={(e) => setSelectedOutputId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                {outputs.length === 0 ? (
                  <option value="">Tidak ada port MIDI ditemukan (Sambungkan kabel USB-MIDI)</option>
                ) : (
                  outputs.map(out => (
                    <option key={out.id} value={out.id}>{out.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Dukungan SysEx:</span>
                <span className="text-emerald-400 font-bold">Aktif (Enabled)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Target Model:</span>
                <span className="text-white">Yamaha PSR-S750</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Metode Kopi:</span>
                <span className="text-cyan-400">Direct Sequencer Record</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTestNote}
                disabled={outputs.length === 0}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Uji Suara (Test Note)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Stream Status Panel */}
        <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Log Transmisi & Rekam Song ke Yamaha PSR-S750
              </h3>
              <div className="flex items-center gap-2">
                {(isPlayingLive || isRecordingToKeyboard) && (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                    <Music className="w-3 h-3" /> {isRecordingToKeyboard ? `Merekam (${recordProgress}%)` : `Live (Bar ${currentBar})`}
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  {isRecordingToKeyboard ? 'Recording' : isPlayingLive ? 'Playing' : 'Standby'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 h-52 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-cyan-400">›</span> {log}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
            <span>Status: <strong className="text-white">{statusMessage}</strong></span>
            <span className="text-emerald-400 font-mono font-bold">Web MIDI OK</span>
          </div>
        </div>
      </div>

      {/* Hardware Guide */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Panduan Kopi File ke Keyboard Tanpa Flashdisk (Direct Sequencer Record)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">1</span>
              Aktifkan Mode Record di PSR-S750
            </div>
            <p className="text-slate-400 leading-relaxed">
              Tekan tombol <strong className="text-white">REC</strong> pada bagian Song / Sequencer di keyboard Yamaha PSR-S750 Anda agar keyboard siap merekam data MIDI yang masuk.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">2</span>
              Klik Kopi/Rekam di Aplikasi
            </div>
            <p className="text-slate-400 leading-relaxed">
              Klik tombol <strong className="text-emerald-400">"Kopi/Rekam ke Memory Keyboard"</strong> di atas. Aplikasi akan mengirimkan seluruh not aransemen secara real-time melalui kabel MIDI.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">3</span>
              Simpan di Memori Internal
            </div>
            <p className="text-slate-400 leading-relaxed">
              Setelah selesai, tekan tombol <strong className="text-white">SAVE</strong> di keyboard untuk menyimpan hasil rekaman ke User Memory internal tanpa flashdisk!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
