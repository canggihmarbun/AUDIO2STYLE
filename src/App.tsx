/**
 * Audio2Style Pro - Windows Arranger Workstation
 * Main Application Shell
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ProjectData, NavTab } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { AudioConverterView } from './components/audio/AudioConverterView';
import { ChordAnalyzerView } from './components/chords/ChordAnalyzerView';
import { MidiEditorView } from './components/midi/MidiEditorView';
import { StyleCreatorView } from './components/style/StyleCreatorView';
import { KeyboardCompatibilityView } from './components/compatibility/KeyboardCompatibilityView';
import { ExportManagerView } from './components/export/ExportManagerView';
import { ProjectLibraryView } from './components/library/ProjectLibraryView';
import { SettingsView } from './components/settings/SettingsView';
import { loadCurrentProject, saveCurrentProject } from './utils/projectStore';
import { StemAudioPlayer } from './utils/audioEngine';
import { generateYamahaStyleFile } from './utils/yamahaStyleEngine';

export default function App() {
  const [project, setProject] = useState<ProjectData>(() => loadCurrentProject());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.9);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio player instance for audio converter
  const stemPlayer = useMemo(() => new StemAudioPlayer(), []);

  // Sync player playing state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAudioPlaying(stemPlayer.getIsPlaying());
    }, 200);
    return () => clearInterval(interval);
  }, [stemPlayer]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateTempo = (bpm: number) => {
    const updated = { ...project, tempo: Math.min(260, Math.max(40, bpm)) };
    setProject(updated);
    saveCurrentProject(updated);
  };

  const handleUpdateTitle = (title: string) => {
    const updated = { ...project, title };
    setProject(updated);
    saveCurrentProject(updated);
  };

  const handleUpdateProject = (patch: Partial<ProjectData>) => {
    const updated = { ...project, ...patch };
    setProject(updated);
    saveCurrentProject(updated);
  };

  const handleSave = () => {
    saveCurrentProject(project);
    showToast(`Proyek "${project.title}" berhasil disimpan ke memori lokal!`);
  };

  const handleQuickExport = () => {
    try {
      const bytes = generateYamahaStyleFile(project);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = project.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `${safeTitle}.STY`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Style "${safeTitle}.STY" siap disalin ke flashdisk USB Yamaha S750!`);
    } catch (e) {
      setActiveTab('export_manager');
    }
  };

  const handleTogglePlay = () => {
    if (stemPlayer.getIsPlaying()) {
      stemPlayer.pause();
      setIsAudioPlaying(false);
    } else {
      stemPlayer.play();
      setIsAudioPlaying(true);
    }
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    stemPlayer.setMasterVolume(vol);
  };

  // Calculate total notes in project
  const totalNotes = useMemo(() => {
    let count = 0;
    Object.values(project.sections).forEach(sec => {
      Object.values(sec.tracks).forEach(trk => {
        count += (trk.notes || []).length;
      });
    });
    return count;
  }, [project]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0f17] text-slate-100 overflow-hidden select-none">
      {/* Top Application Header / Transport */}
      <Header
        project={project}
        onUpdateTempo={handleUpdateTempo}
        onUpdateTitle={handleUpdateTitle}
        onSave={handleSave}
        onOpenLibrary={() => setActiveTab('project_library')}
        onQuickExport={handleQuickExport}
        isAudioPlaying={isAudioPlaying}
        onTogglePlay={handleTogglePlay}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          hasAudioLoaded={!!project.sourceAudio}
          notesCount={totalNotes}
          activeSectionName={project.sections[project.activeSectionId]?.shortLabel || 'MAIN A'}
        />

        {/* Central Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-950/40 daw-grid-bg relative">
          {activeTab === 'dashboard' && (
            <DashboardView
              project={project}
              onNavigate={(tab) => setActiveTab(tab)}
              hasAudioLoaded={!!project.sourceAudio}
              totalNotes={totalNotes}
            />
          )}

          {activeTab === 'audio_converter' && (
            <AudioConverterView
              project={project}
              onUpdateProject={handleUpdateProject}
              onNavigate={(tab) => setActiveTab(tab)}
              stemPlayer={stemPlayer}
              isAudioPlaying={isAudioPlaying}
              onTogglePlay={handleTogglePlay}
            />
          )}

          {activeTab === 'chord_analyzer' && (
            <ChordAnalyzerView
              project={project}
              onUpdateProject={handleUpdateProject}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'midi_editor' && (
            <MidiEditorView
              project={project}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {activeTab === 'style_creator' && (
            <StyleCreatorView
              project={project}
              onUpdateProject={handleUpdateProject}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'compatibility' && (
            <KeyboardCompatibilityView
              project={project}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {activeTab === 'export_manager' && (
            <ExportManagerView
              project={project}
            />
          )}

          {activeTab === 'project_library' && (
            <ProjectLibraryView
              currentProject={project}
              onLoadProject={(loaded) => setProject(loaded)}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}

          {/* Floating Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/50 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 animate-bounce">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
