import React, { useState } from 'react';
import { 
  Settings, Terminal, Monitor, Cpu, HardDrive, 
  CheckCircle2, AlertCircle, RefreshCw, Code2, 
  ExternalLink, Layers, Sparkles, Sliders 
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [pythonEndpoint, setPythonEndpoint] = useState<string>('http://127.0.0.1:8000');
  const [isTestingBridge, setIsTestingBridge] = useState<boolean>(false);
  const [bridgeStatus, setBridgeStatus] = useState<'connected' | 'fallback' | 'checking'>('fallback');
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [bufferSize, setBufferSize] = useState<number>(512);

  const testBridge = async () => {
    setIsTestingBridge(true);
    setBridgeStatus('checking');

    try {
      const res = await fetch(`${pythonEndpoint}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        setBridgeStatus('connected');
      } else {
        setBridgeStatus('fallback');
      }
    } catch (e) {
      // Local development fallback
      setBridgeStatus('fallback');
    } finally {
      setIsTestingBridge(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Pengaturan & Arsitektur Windows Desktop
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi audio engine lokal, bridge backend Python, dan roadmap pengemasan installer EXE untuk Windows.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">Antarmuka Aktif: React + TypeScript (Vite)</span>
        </div>
      </div>

      {/* Windows Desktop Packaging Notice */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Monitor className="w-5 h-5 text-cyan-400" />
          <span>Status Rilis Windows Desktop (Installer .EXE):</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Saat ini versi 1.0 berjalan sebagai workstation berbasis web (React + Web Audio API). 
          Kode telah dipersiapkan dengan arsitektur modular terpisah antara antarmuka (Frontend) dan mesin audio, 
          sehingga dapat dikemas menjadi aplikasi desktop Windows mandiri (Single-click <code>.EXE</code> installer) 
          menggunakan <strong>Tauri</strong> atau <strong>Electron</strong> dengan backend Python bundled.
        </p>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Status Installer EXE:</span>
          <span className="text-amber-400 font-bold">
            Tahap Desain & Persiapan (Belum Dikompilasi Menjadi .EXE)
          </span>
        </div>
      </div>

      {/* Python Backend Bridge Configuration */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Integrasi Backend Audio Engine (Python FastAPI Bridge)
            </h2>
            <p className="text-xs text-slate-400">
              Menghubungkan antarmuka ke pustaka pemrosesan audio tingkat lanjut (Demucs, Librosa, Basic Pitch)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={testBridge}
              disabled={isTestingBridge}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingBridge ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Uji Koneksi Bridge</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 block font-medium">Endpoint Server Python Lokal:</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={pythonEndpoint}
                  onChange={(e) => setPythonEndpoint(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">Status Bridge Audio:</span>
                {bridgeStatus === 'connected' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung ke Python Engine
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Web Audio Engine Bawaan (Aktif Standalone)
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Jika server Python lokal tidak berjalan, Audio2Style Pro otomatis menggunakan 
                <strong> Web Audio API DSP bawaan</strong> untuk pemutaran, filter bandpass stem, analisis akor, dan sintesis instrumen.
              </p>
            </div>
          </div>

          {/* Python server launch script reference */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="text-slate-400 font-semibold text-xs flex items-center gap-1.5 font-sans">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              Skrip Peluncur Backend Python:
            </div>
            <pre className="text-slate-300 text-[10px] overflow-x-auto p-2 bg-slate-900 rounded border border-slate-800/80 leading-relaxed">
{`# Jalankan di Windows Terminal:
pip install fastapi uvicorn librosa
pip install basic-pitch mido demucs

uvicorn server:app --port 8000`}
            </pre>
          </div>
        </div>
      </div>

      {/* Audio Engine Configuration */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Konfigurasi Mesin Suara (Audio Driver & Synth)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-slate-400 block font-medium">Sample Rate:</label>
            <select
              value={sampleRate}
              onChange={(e) => setSampleRate(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-cyan-400 font-bold focus:outline-none"
            >
              <option value="44100">44,100 Hz (CD Standard)</option>
              <option value="48000">48,000 Hz (Yamaha PSR Native)</option>
              <option value="96000">96,000 Hz (High Resolution)</option>
            </select>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-slate-400 block font-medium">Ukuran Buffer Latensi:</label>
            <select
              value={bufferSize}
              onChange={(e) => setBufferSize(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-emerald-400 font-bold focus:outline-none"
            >
              <option value="256">256 samples (~5.8 ms)</option>
              <option value="512">512 samples (~11.6 ms - Disarankan)</option>
              <option value="1024">1024 samples (~23.2 ms)</option>
            </select>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-slate-400 block font-medium">Resolusi Kuantisasi MIDI:</label>
            <div className="p-2 bg-slate-900 rounded font-mono text-cyan-300 font-bold text-center border border-slate-800">
              480 PPQN (Yamaha Standard)
            </div>
          </div>
        </div>
      </div>

      {/* Packaging Step Guide */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          Tahapan Membangun Installer EXE Windows (Roadmap Pengembang):
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-cyan-400 font-bold font-mono text-[11px] block">Langkah 1: Build Web Asset</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Jalankan <code>npm run build</code> untuk mengompilasi bundel React dan Tailwind CSS ke direktori <code>dist/</code>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-cyan-400 font-bold font-mono text-[11px] block">Langkah 2: Paketkan Shell Desktop</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Gunakan <strong>Tauri (Rust)</strong> untuk performa ringan atau <strong>Electron</strong> untuk menyematkan window native Windows 64-bit.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-cyan-400 font-bold font-mono text-[11px] block">Langkah 3: Pembuatan Installer EXE</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Kemas dengan NSIS (Nullsoft Scriptable Install System) menjadi file <code>Audio2Style_Pro_Setup.exe</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
