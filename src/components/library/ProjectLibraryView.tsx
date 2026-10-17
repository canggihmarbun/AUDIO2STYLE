import React, { useState } from 'react';
import { 
  Library, Plus, FolderOpen, Trash2, Copy, Download, 
  Upload, Clock, Sparkles, Music2, CheckCircle2, ArrowRight 
} from 'lucide-react';
import { ProjectData, NavTab } from '../../types';
import { 
  getSavedProjectsList, saveCurrentProject, deleteSavedProject, 
  loadCurrentProject, downloadProjectFile, ProjectSummary 
} from '../../utils/projectStore';
import { TEMPLATE_PROJECTS, createDefaultProject } from '../../data/defaultProjects';

interface ProjectLibraryViewProps {
  currentProject: ProjectData;
  onLoadProject: (project: ProjectData) => void;
  onNavigate: (tab: NavTab) => void;
}

export const ProjectLibraryView: React.FC<ProjectLibraryViewProps> = ({
  currentProject,
  onLoadProject,
  onNavigate,
}) => {
  const [savedList, setSavedList] = useState<ProjectSummary[]>(getSavedProjectsList());
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('Style Baru S750');
  const [newTempo, setNewTempo] = useState<number>(120);
  const [newGenre, setNewGenre] = useState<string>('Pop Ballad');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCreateNew = () => {
    const fresh = createDefaultProject();
    fresh.id = `proj_${Date.now()}`;
    fresh.title = newTitle;
    fresh.tempo = newTempo;
    fresh.genre = newGenre;
    saveCurrentProject(fresh);
    setSavedList(getSavedProjectsList());
    onLoadProject(fresh);
    setShowNewModal(false);
    onNavigate('dashboard');
  };

  const handleLoadSaved = (id: string) => {
    // If loading active, just navigate
    if (id === currentProject.id) {
      onNavigate('dashboard');
      return;
    }
    // Load from storage
    const saved = localStorage.getItem('audio2style_current_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === id) {
          onLoadProject(parsed);
          onNavigate('dashboard');
          return;
        }
      } catch (e) {}
    }

    // Otherwise load template matching id or create
    if (id.includes('dangdut')) {
      const p = createDefaultProject('dangdut_koplo');
      saveCurrentProject(p);
      onLoadProject(p);
    } else {
      const p = createDefaultProject();
      saveCurrentProject(p);
      onLoadProject(p);
    }
    onNavigate('dashboard');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus proyek ini dari daftar penyimpanan lokal?')) {
      deleteSavedProject(id);
      setSavedList(getSavedProjectsList());
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const templateProj = createDefaultProject(templateId);
    templateProj.id = `proj_${Date.now()}`;
    saveCurrentProject(templateProj);
    setSavedList(getSavedProjectsList());
    onLoadProject(templateProj);
    onNavigate('dashboard');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed: ProjectData = JSON.parse(content);
        if (parsed && parsed.title && parsed.sections) {
          parsed.id = `proj_${Date.now()}`;
          saveCurrentProject(parsed);
          setSavedList(getSavedProjectsList());
          onLoadProject(parsed);
          alert(`Proyek "${parsed.title}" berhasil diimpor!`);
          onNavigate('dashboard');
        } else {
          alert('Format file .a2s tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file proyek: ' + String(err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Library className="w-5 h-5 text-cyan-400" />
            Project Library & Pengelolaan Style
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Buat proyek baru, simpan ke database lokal, buka template siap pakai, atau impor file arsip <code>.a2s</code>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".a2s,.json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Impor File (.a2s)</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Proyek Baru</span>
          </button>
        </div>
      </div>

      {/* Starter Templates Section */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Template Proyek Siap Pakai (Yamaha S750 Presets):
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TEMPLATE_PROJECTS.map((t) => (
            <div
              key={t.id}
              onClick={() => handleLoadTemplate(t.id)}
              className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 p-4 rounded-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{t.genre}</span>
                  <span className="text-cyan-400 font-bold">{t.tempo} BPM</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {t.title}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                  {t.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-cyan-400 font-semibold">
                <span>Gunakan Template</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Saved Projects List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            Daftar Proyek Anda di Komputer (Penyimpanan Lokal):
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {savedList.length} Proyek Tersimpan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {savedList.map((item) => {
            const isCurrent = item.id === currentProject.id;

            return (
              <div
                key={item.id}
                onClick={() => handleLoadSaved(item.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-slate-950 hover:bg-slate-900 border-slate-800'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {item.genre || 'Style'}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Proyek Aktif
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-white">
                    {item.title}
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                    <span>{item.tempo} BPM</span>
                    <span>•</span>
                    <span className="text-cyan-400">Yamaha PSR-S750</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(item.updatedAt).toLocaleDateString('id-ID')}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                      title="Hapus Proyek"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Buat Proyek Style Baru
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">Judul Style:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Tempo Awal (BPM):</label>
                  <input
                    type="number"
                    min="40"
                    max="240"
                    value={newTempo}
                    onChange={(e) => setNewTempo(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">Genre:</label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="Pop Ballad">Pop Ballad</option>
                    <option value="Dangdut Koplo">Dangdut Koplo</option>
                    <option value="Pop Rock">Pop Rock</option>
                    <option value="Slow Worship">Slow Worship 6/8</option>
                    <option value="Campursari">Campursari</option>
                    <option value="Bossa Nova">Bossa Nova</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="text-slate-300 font-semibold">Target Default:</div>
                <div>Keyboard: <strong className="text-cyan-400">Yamaha PSR-S750</strong></div>
                <div>Format Style: <strong className="text-emerald-400">SFF1 (SMF0 + CASM)</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>

              <button
                onClick={handleCreateNew}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
              >
                Buat Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
