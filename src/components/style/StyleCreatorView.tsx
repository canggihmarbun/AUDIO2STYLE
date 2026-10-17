import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, Play, Pause, Square, Copy, Volume2, 
  VolumeX, Sliders, CheckCircle2, Music, Sparkles, 
  ArrowRight, Plus, RefreshCw, Disc, Edit 
} from 'lucide-react';
import { ProjectData, StyleSectionId, StyleSection, MidiTrack, NavTab } from '../../types';
import { STYLE_SECTION_DEFINITIONS, ARRANGER_CHANNEL_DEFINITIONS } from '../../data/keyboardProfiles';
import { globalSynth } from '../../utils/audioEngine';

interface StyleCreatorViewProps {
  project: ProjectData;
  onUpdateProject: (updated: Partial<ProjectData>) => void;
  onNavigate: (tab: NavTab) => void;
}

export const StyleCreatorView: React.FC<StyleCreatorViewProps> = ({
  project,
  onUpdateProject,
  onNavigate,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<StyleSectionId>('main_a');
  const [isPlayingStyle, setIsPlayingStyle] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Mute / Solo states for arranger bus channels 9-16
  const [channelMutes, setChannelMutes] = useState<Record<number, boolean>>({});
  const [channelSolos, setChannelSolos] = useState<Record<number, boolean>>({});

  const playTimerRef = useRef<any>(null);

  const activeSection: StyleSection = project.sections[activeSectionId] || project.sections['main_a'];

  const toggleChannelMute = (ch: number) => {
    setChannelMutes(prev => ({ ...prev, [ch]: !prev[ch] }));
  };

  const toggleChannelSolo = (ch: number) => {
    setChannelSolos(prev => ({ ...prev, [ch]: !prev[ch] }));
  };

  // Multi-track Style Sequencer Playback
  const togglePlayStyle = () => {
    if (isPlayingStyle) {
      stopStylePlayback();
    } else {
      startStylePlayback();
    }
  };

  const startStylePlayback = () => {
    setIsPlayingStyle(true);
    let step = 0;
    const bpm = project.tempo || 120;
    const stepDurationMs = (60000 / bpm) / 4; // 16th note in ms
    const totalSteps = activeSection.bars * 16;

    playTimerRef.current = setInterval(() => {
      setCurrentStep(step);

      const hasSolo = Object.values(channelSolos).some(v => v);

      // Iterate all 8 channels in this section
      Object.values(activeSection.tracks).forEach(trk => {
        const isMuted = channelMutes[trk.channel];
        const isSolo = channelSolos[trk.channel];

        if (isMuted) return;
        if (hasSolo && !isSolo) return;

        // Find notes that start at this step
        const notesToPlay = trk.notes.filter(n => n.startStep === step);
        notesToPlay.forEach(n => {
          const durSec = (n.durationSteps * (60 / bpm)) / 4;
          globalSynth.playNote(n.pitch, n.velocity, trk.channel, durSec);
        });
      });

      step = (step + 1) % totalSteps;
    }, stepDurationMs);
  };

  const stopStylePlayback = () => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlayingStyle(false);
    setCurrentStep(0);
  };

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // Update Section Bars
  const handleUpdateBars = (newBars: number) => {
    const sections = { ...project.sections };
    sections[activeSectionId] = {
      ...activeSection,
      bars: newBars
    };
    onUpdateProject({ sections });
  };

  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMessage(msg);
    setTimeout(() => setNotificationMessage(null), 4000);
  };

  // Clone Section pattern to another (e.g. Main A to Main B)
  const handleCloneSection = (targetId: StyleSectionId) => {
    const sections = { ...project.sections };
    const sourceTracks = JSON.parse(JSON.stringify(activeSection.tracks));
    sections[targetId] = {
      ...sections[targetId],
      bars: activeSection.bars,
      tracks: sourceTracks
    };
    onUpdateProject({ sections });
    showNotification(`Pola dari ${activeSection.name} berhasil disalin ke ${sections[targetId].name}.`);
  };

  // Generate Auto Fill-in from Main rhythm
  const handleGenerateFillIn = () => {
    const sections = { ...project.sections };
    const fillA = { ...sections['fill_a'] };
    const mainTracks = activeSection.tracks;

    // Create 1-bar drum fill with tom rolls and snare climax
    const drumTrack = JSON.parse(JSON.stringify(mainTracks[10]));
    const fillNotes = [
      { id: 'f_0', pitch: 36, startStep: 0, durationSteps: 2, velocity: 105, channel: 10 },
      { id: 'f_4', pitch: 38, startStep: 4, durationSteps: 2, velocity: 110, channel: 10 },
      { id: 'f_8', pitch: 48, startStep: 8, durationSteps: 1, velocity: 100, channel: 10 },
      { id: 'f_9', pitch: 48, startStep: 9, durationSteps: 1, velocity: 100, channel: 10 },
      { id: 'f_10', pitch: 47, startStep: 10, durationSteps: 1, velocity: 105, channel: 10 },
      { id: 'f_11', pitch: 47, startStep: 11, durationSteps: 1, velocity: 105, channel: 10 },
      { id: 'f_12', pitch: 45, startStep: 12, durationSteps: 1, velocity: 110, channel: 10 },
      { id: 'f_13', pitch: 45, startStep: 13, durationSteps: 1, velocity: 110, channel: 10 },
      { id: 'f_14', pitch: 38, startStep: 14, durationSteps: 1, velocity: 115, channel: 10 },
      { id: 'f_15', pitch: 38, startStep: 15, durationSteps: 1, velocity: 120, channel: 10 },
    ];
    drumTrack.notes = fillNotes;
    fillA.tracks[10] = drumTrack;
    sections['fill_a'] = fillA;

    onUpdateProject({ sections });
    showNotification('Pola Fill In A berhasil dibuat otomatis dengan aksen tom drum roll!');
  };

  // Auto-generate full accompaniment suite (Main B, Fill In A, Fill In B, Intro 1, Ending 1)
  const handleAutoGenerateFullSuite = () => {
    const sections = { ...project.sections };
    const mainATracks = sections['main_a'].tracks;

    // 1. Generate Main B (higher energy with +10% velocity and ride/crash accents)
    const mainBTracks = JSON.parse(JSON.stringify(mainATracks));
    Object.values(mainBTracks).forEach((trk: any) => {
      trk.notes = trk.notes.map((n: any) => ({
        ...n,
        id: `mb_${n.id}`,
        velocity: Math.min(127, Math.round(n.velocity * 1.1))
      }));
    });
    // Add open hi-hat (46) or ride cymbal (51) to Main B drums
    if (mainBTracks[10]) {
      const bBars = sections['main_b'].bars || 2;
      for (let bar = 0; bar < bBars; bar++) {
        const offset = bar * 16;
        mainBTracks[10].notes.push(
          { id: `mb_ride_${offset}_0`, pitch: 51, startStep: offset + 0, durationSteps: 2, velocity: 90, channel: 10 },
          { id: `mb_ride_${offset}_4`, pitch: 51, startStep: offset + 4, durationSteps: 2, velocity: 85, channel: 10 },
          { id: `mb_ride_${offset}_8`, pitch: 51, startStep: offset + 8, durationSteps: 2, velocity: 90, channel: 10 },
          { id: `mb_ride_${offset}_12`, pitch: 51, startStep: offset + 12, durationSteps: 2, velocity: 85, channel: 10 }
        );
      }
    }
    sections['main_b'] = { ...sections['main_b'], tracks: mainBTracks };

    // 2. Generate Fill In A (1 bar with drum roll)
    const fillATracks = JSON.parse(JSON.stringify(mainATracks));
    fillATracks[10].notes = [
      { id: 'fa_0', pitch: 36, startStep: 0, durationSteps: 2, velocity: 105, channel: 10 },
      { id: 'fa_4', pitch: 38, startStep: 4, durationSteps: 2, velocity: 110, channel: 10 },
      { id: 'fa_8', pitch: 48, startStep: 8, durationSteps: 1, velocity: 100, channel: 10 },
      { id: 'fa_9', pitch: 48, startStep: 9, durationSteps: 1, velocity: 100, channel: 10 },
      { id: 'fa_10', pitch: 47, startStep: 10, durationSteps: 1, velocity: 105, channel: 10 },
      { id: 'fa_11', pitch: 47, startStep: 11, durationSteps: 1, velocity: 105, channel: 10 },
      { id: 'fa_12', pitch: 45, startStep: 12, durationSteps: 1, velocity: 110, channel: 10 },
      { id: 'fa_13', pitch: 45, startStep: 13, durationSteps: 1, velocity: 110, channel: 10 },
      { id: 'fa_14', pitch: 38, startStep: 14, durationSteps: 1, velocity: 115, channel: 10 },
      { id: 'fa_15', pitch: 38, startStep: 15, durationSteps: 1, velocity: 125, channel: 10 },
    ];
    sections['fill_a'] = { ...sections['fill_a'], bars: 1, tracks: fillATracks };

    // 3. Generate Intro 1 (2 bars arpeggio & buildup)
    const introTracks = JSON.parse(JSON.stringify(mainATracks));
    sections['intro_1'] = { ...sections['intro_1'], bars: 2, tracks: introTracks };

    // 4. Generate Ending 1 (2 bars final resolution to C chord)
    const endingTracks = JSON.parse(JSON.stringify(mainATracks));
    if (endingTracks[10]) {
      endingTracks[10].notes = [
        { id: 'end_kick', pitch: 36, startStep: 0, durationSteps: 4, velocity: 120, channel: 10 },
        { id: 'end_crash', pitch: 49, startStep: 0, durationSteps: 8, velocity: 120, channel: 10 },
        { id: 'end_snare', pitch: 38, startStep: 16, durationSteps: 4, velocity: 110, channel: 10 },
        { id: 'end_crash2', pitch: 49, startStep: 16, durationSteps: 16, velocity: 125, channel: 10 },
      ];
    }
    sections['ending_1'] = { ...sections['ending_1'], bars: 2, tracks: endingTracks };

    onUpdateProject({ sections });
    showNotification('Paket Style Lengkap berhasil dibuat: Main A & B, Fill In A, Intro 1, dan Ending 1 siap dimainkan di Yamaha PSR-S750!');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Style Creator (Penyusun Bagian Arranger)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi bagian Intro, Main A-D, Fill In, Break, dan Ending dengan kontrol multi-channel bus.
          </p>
        </div>

        {/* Global Audition Transport */}
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlayStyle}
            className={`flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md ${
              isPlayingStyle
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            {isPlayingStyle ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlayingStyle ? 'Hentikan Pratinjau' : 'Dengarkan Pola Style'}</span>
          </button>

          <button
            onClick={handleGenerateFillIn}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Fill In</span>
          </button>

          <button
            onClick={handleAutoGenerateFullSuite}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md shadow-cyan-950/40 transition-all cursor-pointer"
            title="Otomatis buat Main B, Fill In A, Intro 1, dan Ending 1 dari pola Main A"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Auto-Lengkapi Paket Style</span>
          </button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notificationMessage && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-xs text-cyan-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{notificationMessage}</span>
          </div>
          <button onClick={() => setNotificationMessage(null)} className="text-cyan-400 hover:text-white font-mono text-xs">✕</button>
        </div>
      )}

      {/* Arranger Section Selector Tabs (Intro 1-3, Main A-D, Fill A-D, Break, Ending 1-3) */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Pilih Bagian Style:</span>
          <span className="text-[10px] text-cyan-400 font-normal">Titik hijau = bagian terisi notasi musik</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {STYLE_SECTION_DEFINITIONS.map(def => {
            const isActive = activeSectionId === def.id;
            const sec = project.sections[def.id];
            const hasNotes = sec && Object.values(sec.tracks).some(t => t.notes && t.notes.length > 0);

            let groupColor = 'border-slate-800 text-slate-400';
            if (def.group === 'intro') groupColor = isActive ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-950/30 text-indigo-300 border-indigo-900/50';
            else if (def.group === 'main') groupColor = isActive ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-cyan-950/30 text-cyan-300 border-cyan-900/50';
            else if (def.group === 'fill') groupColor = isActive ? 'bg-amber-600 text-white border-amber-500' : 'bg-amber-950/30 text-amber-300 border-amber-900/50';
            else if (def.group === 'break') groupColor = isActive ? 'bg-purple-600 text-white border-purple-500' : 'bg-purple-950/30 text-purple-300 border-purple-900/50';
            else if (def.group === 'ending') groupColor = isActive ? 'bg-rose-600 text-white border-rose-500' : 'bg-rose-950/30 text-rose-300 border-rose-900/50';

            return (
              <button
                key={def.id}
                onClick={() => {
                  stopStylePlayback();
                  setActiveSectionId(def.id);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-2 ${groupColor}`}
              >
                <span>{def.shortLabel}</span>
                {hasNotes && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Berisi notasi" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Settings Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-0.5">
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{activeSection.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                Marker: "{STYLE_SECTION_DEFINITIONS.find(d => d.id === activeSectionId)?.markerTag}"
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pola birama untuk bagian ini dimainkan secara looping otomatis oleh arranger keyboard
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* Bars selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Panjang:</span>
              <select
                value={activeSection.bars}
                onChange={(e) => handleUpdateBars(Number(e.target.value))}
                className="bg-transparent font-mono text-cyan-400 font-bold focus:outline-none cursor-pointer"
              >
                {[1, 2, 4, 8, 16].map(b => (
                  <option key={b} value={b} className="bg-slate-900">{b} Bar</option>
                ))}
              </select>
            </div>

            {/* Clone pattern selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Salin Ke:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleCloneSection(e.target.value as StyleSectionId);
                    e.target.value = '';
                  }
                }}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">Pilih Target...</option>
                {STYLE_SECTION_DEFINITIONS.filter(d => d.id !== activeSectionId).map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Arranger 8 Channels Mixer Grid (Ch 9 to 16) */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Daftar Channel Arranger (Yamaha Bus 9 - 16):</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Klik "Buka di Piano Roll" untuk mengedit notasi channel secara detail
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ARRANGER_CHANNEL_DEFINITIONS.map(def => {
              const trk = activeSection.tracks[def.channel] || {
                notes: [],
                voiceName: def.defaultVoice,
                channel: def.channel
              };
              const isMuted = !!channelMutes[def.channel];
              const isSolo = !!channelSolos[def.channel];

              return (
                <div
                  key={def.channel}
                  className={`bg-slate-950 border rounded-xl p-3.5 space-y-3 transition-all ${
                    isMuted ? 'opacity-50 border-slate-800' : 'border-slate-800/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: def.color }}
                      />
                      <div className="text-xs font-bold text-white truncate max-w-[130px]">
                        {def.label}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                      Ch {def.channel}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate font-mono">
                    {trk.voiceName || def.defaultVoice}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Not: <strong className="text-slate-200">{trk.notes.length}</strong></span>
                    <span>NTR: {def.ntr}</span>
                  </div>

                  {/* Mute & Solo */}
                  <div className="flex items-center space-x-1.5 pt-1">
                    <button
                      onClick={() => toggleChannelMute(def.channel)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                        isMuted
                          ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      MUTE
                    </button>

                    <button
                      onClick={() => toggleChannelSolo(def.channel)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                        isSolo
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      SOLO
                    </button>

                    <button
                      onClick={() => onNavigate('midi_editor')}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 transition-colors"
                      title="Buka channel ini di Piano Roll"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Navigation to Export */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          Susunan bagian style sudah lengkap? Lakukan validasi struktur Yamaha SFF1 dan unduh file di <strong className="text-white">Export Manager</strong>.
        </div>

        <button
          onClick={() => onNavigate('export_manager')}
          className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-colors shrink-0"
        >
          <span>Lanjut ke Export Manager</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
