import React from 'react';
import { 
  Play, Pause, Square, Save, Download, FolderOpen, 
  Settings, Music2, Cpu, Volume2, ShieldCheck, Monitor 
} from 'lucide-react';
import { ProjectData } from '../../types';

interface HeaderProps {
  project: ProjectData;
  onUpdateTempo: (bpm: number) => void;
  onUpdateTitle: (title: string) => void;
  onSave: () => void;
  onOpenLibrary: () => void;
  onQuickExport: () => void;
  isAudioPlaying: boolean;
  onTogglePlay: () => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onUpdateTempo,
  onUpdateTitle,
  onSave,
  onOpenLibrary,
  onQuickExport,
  isAudioPlaying,
  onTogglePlay,
  masterVolume,
  onMasterVolumeChange
}) => {
  return (
    <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 select-none shrink-0 z-20">
      {/* Brand & Project Name */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 px-2.5 py-1 rounded-md">
          <Music2 className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm tracking-wide text-white">Audio2Style <span className="text-cyan-400">PRO</span></span>
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            v1.0 Win
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden md:block" />

        {/* Project Title Editor */}
        <div className="flex items-center space-x-2 min-w-0">
          <input
            type="text"
            value={project.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="bg-transparent hover:bg-slate-900 focus:bg-slate-900 border border-transparent focus:border-slate-700 px-2 py-0.5 rounded text-sm font-medium text-slate-200 focus:outline-none transition-colors truncate max-w-[200px] lg:max-w-[280px]"
            title="Klik untuk mengubah nama proyek"
          />
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono hidden sm:inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Yamaha S750 (SFF1)
          </span>
        </div>
      </div>

      {/* Central Transport & Clock Bar */}
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg shadow-inner">
        {/* Play/Stop preview */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            isAudioPlaying 
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
          }`}
          title={isAudioPlaying ? 'Jeda Pratinjau' : 'Putar Pratinjau Audio'}
        >
          {isAudioPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Tempo Controller */}
        <div className="flex items-center space-x-1.5 pl-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">BPM</span>
          <input
            type="number"
            min="40"
            max="260"
            value={project.tempo}
            onChange={(e) => onUpdateTempo(Number(e.target.value))}
            className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-sm text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Time Signature */}
        <div className="text-xs font-mono bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
          {project.timeSignature}
        </div>

        {/* Volume Master Slider */}
        <div className="hidden xl:flex items-center space-x-2 pl-2 border-l border-slate-800">
          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenLibrary}
          className="hidden sm:flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-800 transition-colors"
          title="Buka Pustaka Proyek"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Pustaka</span>
        </button>

        <button
          onClick={onSave}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-700 transition-colors"
          title="Simpan Proyek Sekarang"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Simpan</span>
        </button>

        <button
          onClick={onQuickExport}
          className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-md shadow-cyan-900/30 transition-colors"
          title="Ekspor Style Yamaha .STY"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor .STY</span>
        </button>

        {/* Windows Desktop Decorative Buttons */}
        <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-slate-800">
          <div className="w-3 h-3 rounded-full bg-slate-700" title="Windows Min" />
          <div className="w-3 h-3 rounded-full bg-slate-700" title="Windows Max" />
          <div className="w-3 h-3 rounded-full bg-slate-700" title="Windows Close" />
        </div>
      </div>
    </header>
  );
};
