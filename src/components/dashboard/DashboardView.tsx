import React from 'react';
import { 
  AudioWaveform, Piano, Layers, DownloadCloud, Sparkles, 
  CheckCircle2, ArrowRight, Play, Disc, Sliders, ShieldCheck, 
  FileMusic, Activity, HelpCircle, HardDrive, Split
} from 'lucide-react';
import { ProjectData, NavTab } from '../../types';

interface DashboardViewProps {
  project: ProjectData;
  onNavigate: (tab: NavTab) => void;
  hasAudioLoaded: boolean;
  totalNotes: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  onNavigate,
  hasAudioLoaded,
  totalNotes
}) => {
  const activeSectionsCount = Object.values(project.sections).filter(
    s => Object.values(s.tracks).some(t => t.notes && t.notes.length > 0)
  ).length;

  const steps = [
    {
      num: '1',
      title: 'Impor & Analisis Audio',
      desc: 'Masukkan file lagu MP3 atau WAV. Sistem mendeteksi BPM, ketukan, dan akor.',
      tab: 'audio_converter' as NavTab,
      status: hasAudioLoaded ? 'Selesai' : 'Siap Impor',
      isComplete: hasAudioLoaded
    },
    {
      num: '2',
      title: 'Konversi Multi-Track & Akor',
      desc: 'Ekstraksi Drum (Ch 10), Bass (Ch 11), dan Chord (Ch 12). Harmonisasi ke Root C standar style.',
      tab: 'chord_analyzer' as NavTab,
      status: project.chords.length > 0 ? `${project.chords.length} Bar Akor` : 'Menunggu',
      isComplete: project.chords.length > 0
    },
    {
      num: '3',
      title: 'Edit Piano Roll MIDI',
      desc: 'Sempurnakan notasi, velocity, dan artikulasi drum/kendang pada piano roll.',
      tab: 'midi_editor' as NavTab,
      status: `${totalNotes} Not Terpasang`,
      isComplete: totalNotes > 0
    },
    {
      num: '4',
      title: 'Penyusunan Bagian Style',
      desc: 'Atur variasi Intro 1-3, Main A-D, Fill In A-D, Break, dan Ending 1-3 untuk aransemen live.',
      tab: 'style_creator' as NavTab,
      status: `${activeSectionsCount} Bagian Aktif`,
      isComplete: activeSectionsCount > 0
    },
    {
      num: '5',
      title: 'Ekspor Style Yamaha .STY',
      desc: 'Validasi chunk CASM dan unduh file style format SFF1 siap dimasukkan Flashdisk USB PSR-S750.',
      tab: 'export_manager' as NavTab,
      status: 'SFF1 Valid',
      isComplete: true
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 border border-slate-800 p-6 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Arranger Workstation untuk Yamaha PSR-S750</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Selamat Datang di <span className="text-cyan-400">Audio2Style Pro</span>
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            Platform modern untuk mentransformasikan lagu audio MP3/WAV menjadi susunan pengiring (Style) 
            keyboard arranger Yamaha PSR-S750 dengan struktur binary <span className="font-mono text-cyan-300 font-semibold">SMF0 + CASM + CSEG</span> asli.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('stem_separator')}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-900/30 transition-all hover:scale-[1.02]"
            >
              <Split className="w-4 h-4" />
              <span>AI Stem Separator (Demucs)</span>
            </button>

            <button
              onClick={() => onNavigate('audio_converter')}
              className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-cyan-900/30 transition-all hover:scale-[1.02]"
            >
              <AudioWaveform className="w-4 h-4" />
              <span>Audio Converter & DSP</span>
            </button>

            <button
              onClick={() => onNavigate('style_creator')}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-all"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Buka Arranger Style (Main A - D)</span>
            </button>

            <button
              onClick={() => onNavigate('export_manager')}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-all"
            >
              <DownloadCloud className="w-4 h-4 text-emerald-400" />
              <span>Ekspor File .STY untuk USB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Status Audio</span>
            <AudioWaveform className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white truncate">
            {project.sourceAudio ? project.sourceAudio.name : 'Audio Belum Diimpor'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {project.sourceAudio ? `${Math.round(project.sourceAudio.duration)} Detik • MP3/WAV` : 'Klik tab Audio Converter'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Tempo & Birama</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400 font-mono">
            {project.tempo} BPM <span className="text-slate-400 font-normal text-sm">({project.timeSignature})</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Source Chord: <span className="text-cyan-400 font-bold">C Major</span> (Yamaha S750)
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Notasi MIDI Aktif</span>
            <Piano className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono">
            {totalNotes} Not
          </div>
          <div className="text-[11px] text-slate-500">
            Dapat diedit di Piano Roll
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Format Output</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono flex items-center gap-1.5">
            <span>.STY</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              SFF1
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Kompatibel USB Yamaha S750
          </div>
        </div>
      </div>

      {/* Workflow Step Pipeline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Alur Kerja Produksi Style (Workflow Pipeline)
            </h2>
            <p className="text-xs text-slate-400">
              Ikuti 5 langkah terstruktur untuk menghasilkan file style pengiring keyboard Yamaha profesional
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {steps.map((step, idx) => (
            <button
              key={step.num}
              onClick={() => onNavigate(step.tab)}
              className="text-left bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 p-4 rounded-xl transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-slate-800 group-hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center font-mono border border-slate-700 group-hover:border-cyan-500/40">
                    {step.num}
                  </span>
                  {step.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>

                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                  {step.desc}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="font-mono text-cyan-400">{step.status}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Target Keyboard Hardware Specification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Disc className="w-4 h-4 text-cyan-400" />
              Spesifikasi Mesin Style Yamaha PSR-S750
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Target Primer
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Struktur File</div>
              <div className="font-bold text-slate-200 mt-0.5 font-mono">SMF0 + CASM</div>
              <div className="text-[10px] text-slate-400 mt-1">1 Track Multi-Channel</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Polyphony Mesin</div>
              <div className="font-bold text-slate-200 mt-0.5 font-mono">128 Voice</div>
              <div className="text-[10px] text-slate-400 mt-1">Yamaha AWM Stereo</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Format Style</div>
              <div className="font-bold text-cyan-400 mt-0.5 font-mono">SFF1 Standard</div>
              <div className="text-[10px] text-slate-400 mt-1">Kompatibel PSR-S Series</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Voice Eksklusif</div>
              <div className="font-bold text-slate-200 mt-0.5 font-mono">MegaVoice / Sweet!</div>
              <div className="text-[10px] text-slate-400 mt-1">Artikulasi realistik</div>
            </div>
          </div>

          {/* Arranger Channel Architecture Table */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              Pemetaan Channel Arranger Keyboard (Bus 9 - 16):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-amber-400">Ch 9 (Rhy 2)</span>
                <span className="text-slate-400 text-[10px]">Percussion / Kendang</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-red-400">Ch 10 (Rhy 1)</span>
                <span className="text-slate-400 text-[10px]">Main Drum Kit</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-emerald-400">Ch 11 (Bass)</span>
                <span className="text-slate-400 text-[10px]">Finger / Slap Bass</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-cyan-400">Ch 12 (Chord 1)</span>
                <span className="text-slate-400 text-[10px]">Piano / Keyboard</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-blue-400">Ch 13 (Chord 2)</span>
                <span className="text-slate-400 text-[10px]">Gitar Rhythm</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-purple-400">Ch 14 (Pad)</span>
                <span className="text-slate-400 text-[10px]">Strings Ensemble</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-pink-400">Ch 15 (Phrase 1)</span>
                <span className="text-slate-400 text-[10px]">Suling / Sax Lead</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-orange-400">Ch 16 (Phrase 2)</span>
                <span className="text-slate-400 text-[10px]">Guitar Solo / Riff</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Notes & Tips Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Petunjuk Pengguna (Tips Arranger)
            </h3>
            
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                <strong className="text-cyan-300">Aturan Akor Dasar (Root C):</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Keyboard arranger Yamaha mengharapkan seluruh pola pengiring direkam dalam kunci <strong>C Mayor</strong>. 
                  Mesin CASM internal keyboard yang akan mentransposisikannya ke Kunci D, G, atau akor lain saat tuts kiri ditekan.
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                <strong className="text-amber-300">Struktur Bagian Komplit:</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Sediakan minimal <strong>Main A</strong> dan <strong>Fill In A</strong> agar style dapat dimainkan dengan harmonis pada keyboard Anda.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Sistem:</span>
            <span className="text-cyan-400 font-semibold font-mono">Windows 10 / 11 64-bit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
