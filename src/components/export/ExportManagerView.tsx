import React, { useState, useMemo } from 'react';
import { 
  DownloadCloud, ShieldCheck, AlertCircle, CheckCircle2, 
  FileMusic, HardDrive, Usb, Info, RefreshCw, FileText, 
  ArrowRight, Sparkles 
} from 'lucide-react';
import { ProjectData, StyleValidationResult } from '../../types';
import { generateYamahaStyleFile, generateStandardMidiFile, validateYamahaStyle } from '../../utils/yamahaStyleEngine';
import { buildSMF0 } from '../../utils/midiGenerator';
import { downloadProjectFile } from '../../utils/projectStore';

interface ExportManagerViewProps {
  project: ProjectData;
}

export const ExportManagerView: React.FC<ExportManagerViewProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<'sty' | 'mid' | 'project'>('sty');

  // Generate binary Yamaha .STY
  const { styleBytes, validationResult } = useMemo(() => {
    try {
      const bytes = generateYamahaStyleFile(project);
      const validation = validateYamahaStyle(bytes);
      return { styleBytes: bytes, validationResult: validation };
    } catch (err) {
      console.error('Style generation error:', err);
      return {
        styleBytes: new Uint8Array(),
        validationResult: {
          valid: false,
          format: 'Standard MIDI File 0',
          sectionsFound: [],
          channelsUsed: [],
          issues: [{ severity: 'error', message: 'Gagal membuat binary style: ' + String(err) }],
          casmValid: false,
          estimatedFileSizeKb: 0
        } as StyleValidationResult
      };
    }
  }, [project]);

  // Download real .STY binary file
  const handleDownloadStyle = () => {
    if (styleBytes.length === 0) return;
    const blob = new Blob([styleBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = project.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeTitle}.STY`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download SMF .MID
  const handleDownloadMidi = () => {
    // Generate valid SMF0 file without CASM chunk for generic MIDI players and DAWs
    const midiBytes = generateStandardMidiFile(project);
    const blob = new Blob([midiBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = project.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeTitle}.MID`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-cyan-400" />
            Yamaha Style Exporter & Validator (PSR-S750)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ekspor format style Yamaha asli dengan header SMF0, penanda bagian (Markers), dan modul CASM/CSEG.
          </p>
        </div>

        <button
          onClick={handleDownloadStyle}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
        >
          <DownloadCloud className="w-4 h-4" />
          <span>Unduh File Style (.STY)</span>
        </button>
      </div>

      {/* Validation Audit Status Box */}
      <div className={`rounded-xl border p-5 space-y-4 ${
        validationResult.valid 
          ? 'bg-slate-900/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20' 
          : 'bg-red-950/20 border-red-500/40'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              validationResult.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {validationResult.valid ? <ShieldCheck className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>Hasil Validasi Format Style Yamaha:</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  validationResult.valid 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {validationResult.valid ? 'LOLOS VALIDASI (SFF1 ASLI)' : 'PERLU PERBAIKAN'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Struktur binary terverifikasi untuk <strong className="text-cyan-300">Yamaha PSR-S750</strong> (Ukuran: {validationResult.estimatedFileSizeKb} KB)
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">FORMAT</span>
              <span className="text-cyan-400 font-bold">{validationResult.format}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">CHUNK CASM</span>
              <span className={validationResult.casmValid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {validationResult.casmValid ? 'TERVERIFIKASI' : 'TIDAK ADA'}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Log Items */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">
            Pemeriksaan Detail Integritas File:
          </div>

          <div className="space-y-1.5">
            {validationResult.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg text-xs flex items-start space-x-2.5 font-mono ${
                  issue.severity === 'error'
                    ? 'bg-red-950/40 text-red-300 border border-red-900/40'
                    : issue.severity === 'warning'
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-900/40'
                    : 'bg-slate-950 text-slate-300 border border-slate-800'
                }`}
              >
                {issue.severity === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                {issue.severity === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                {issue.severity === 'info' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Yamaha .STY */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <FileMusic className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                REKOMENDASI
              </span>
            </div>

            <div>
              <h3 className="font-bold text-white text-base">File Style Yamaha (.STY)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                File binary arranger lengkap dengan metadata SFF1, Marker bagian, dan tabel transposisi CASM.
              </p>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Ekstensi:</span>
                <span className="text-cyan-400">.STY</span>
              </div>
              <div className="flex justify-between">
                <span>Kompatibel:</span>
                <span className="text-white">Yamaha PSR-S750</span>
              </div>
              <div className="flex justify-between">
                <span>Media:</span>
                <span className="text-emerald-400">Flashdisk USB</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadStyle}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Unduh {project.title.slice(0, 16)}.STY</span>
          </button>
        </div>

        {/* Card 2: Standard MIDI File */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                DAW UNIVERSAL
              </span>
            </div>

            <div>
              <h3 className="font-bold text-white text-base">Standard MIDI (.MID)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ekspor track channel 9-16 sebagai Standard MIDI Format 0 standar untuk Cubase, Reaper, FL Studio, atau DAW lain.
              </p>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="text-blue-400">SMF Type 0</span>
              </div>
              <div className="flex justify-between">
                <span>Resolusi:</span>
                <span className="text-white">480 PPQN</span>
              </div>
              <div className="flex justify-between">
                <span>Multi-Channel:</span>
                <span className="text-emerald-400">Ch 9 - 16</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadMidi}
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Unduh File .MID</span>
          </button>
        </div>

        {/* Card 3: Project File (.a2s) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                PROYEK
              </span>
            </div>

            <div>
              <h3 className="font-bold text-white text-base">Paket Proyek (.a2s)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Simpan seluruh aransemen, akor harmoni, notasi piano roll, dan konfigurasi instrumen ke arsip JSON Audio2Style.
              </p>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="text-amber-400">.a2s Bundle</span>
              </div>
              <div className="flex justify-between">
                <span>Penyimpanan:</span>
                <span className="text-white">Cadangan Komputer</span>
              </div>
              <div className="flex justify-between">
                <span>Kompatibilitas:</span>
                <span className="text-emerald-400">Audio2Style Pro</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => downloadProjectFile(project)}
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Simpan Arsip .a2s</span>
          </button>
        </div>
      </div>

      {/* USB Flashdisk Loading Guide for Yamaha PSR-S750 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Usb className="w-4 h-4 text-cyan-400" />
          Panduan Memuat File .STY ke Keyboard Yamaha PSR-S750:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-300 pt-1">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px] font-mono mb-2">1</span>
            <strong className="text-white block">Salin ke Flashdisk</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Format flashdisk dengan FAT32 pada Windows, lalu salin file <code>.STY</code> hasil ekspor ke dalam flashdisk.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px] font-mono mb-2">2</span>
            <strong className="text-white block">Tancapkan ke PSR-S750</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Colokkan flashdisk ke port <strong>[USB TO DEVICE]</strong> di panel belakang/atas keyboard Yamaha PSR-S750 Anda.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px] font-mono mb-2">3</span>
            <strong className="text-white block">Pilih Tab [USB1]</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tekan tombol kategori Style apa saja di keyboard, lalu tekan tab <strong>[USER]</strong> atau <strong>[USB 1]</strong> di layar LCD.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px] font-mono mb-2">4</span>
            <strong className="text-white block">Mainkan Style</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Pilih file style Anda, nyalakan <strong>[ACMP]</strong> (Accompaniment) dan <strong>[SYNC START]</strong>, lalu mainkan akor!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
