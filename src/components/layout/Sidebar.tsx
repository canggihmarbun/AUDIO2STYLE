import React from 'react';
import { 
  LayoutDashboard, AudioWaveform, GitCommit, Piano, 
  Layers, Sliders, DownloadCloud, Library, Settings, 
  Disc, CheckCircle2, Terminal, Usb
} from 'lucide-react';
import { NavTab } from '../../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hasAudioLoaded: boolean;
  notesCount: number;
  activeSectionName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  hasAudioLoaded,
  notesCount,
  activeSectionName,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'audio_converter', 
      label: 'Audio Converter', 
      icon: AudioWaveform, 
      badge: hasAudioLoaded ? 'Audio Aktif' : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    { id: 'chord_analyzer', label: 'Chord Analyzer', icon: GitCommit },
    { 
      id: 'midi_editor', 
      label: 'MIDI Editor', 
      icon: Piano,
      badge: notesCount > 0 ? `${notesCount} Not` : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    },
    { 
      id: 'style_creator', 
      label: 'Style Creator', 
      icon: Layers,
      badge: activeSectionName,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    },
    { id: 'compatibility', label: 'Kompatibilitas Keyboard', icon: Sliders },
    { id: 'export_manager', label: 'Export Manager', icon: DownloadCloud },
    { id: 'web_midi', label: 'Load Style via MIDI', icon: Usb, badge: 'Live Cable', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'project_library', label: 'Project Library', icon: Library },
    { id: 'settings', label: 'Pengaturan & Windows', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Navigation List */}
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Alat Produksi Arranger
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-cyan-600/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono shrink-0 ml-1.5 ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Target Keyboard Hardware Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Disc className="w-3 h-3 text-cyan-400" /> Profil Target
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SFF1 OK
            </span>
          </div>

          <div>
            <div className="text-xs font-bold text-white">Yamaha PSR-S750</div>
            <div className="text-[11px] text-slate-400">128-Poly • CASM • 8 Parts</div>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Arranger Bus:</span>
            <span className="text-cyan-400 font-semibold">Ch 9 - 16</span>
          </div>
        </div>

        {/* Windows Ready Footer */}
        <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between px-1">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-slate-600" /> Python Bridge Ready
          </span>
          <span className="font-mono text-slate-500">64-bit Win</span>
        </div>
      </div>
    </aside>
  );
};
