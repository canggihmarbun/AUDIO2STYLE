import React, { useState } from 'react';
import { 
  Sliders, Disc, CheckCircle2, AlertTriangle, Cpu, 
  Layers, Info, ShieldCheck, Sparkles, Volume2 
} from 'lucide-react';
import { ProjectData, KeyboardProfile } from '../../types';
import { KEYBOARD_PROFILES } from '../../data/keyboardProfiles';
import { globalSynth } from '../../utils/audioEngine';

interface KeyboardCompatibilityViewProps {
  project: ProjectData;
  onUpdateProject: (updated: Partial<ProjectData>) => void;
}

export const KeyboardCompatibilityView: React.FC<KeyboardCompatibilityViewProps> = ({
  project,
  onUpdateProject,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(project.targetKeyboardId || 'yamaha_psr_s750');
  const [activeVoiceCategory, setActiveVoiceCategory] = useState<'drums' | 'bass' | 'chords' | 'leads'>('drums');

  const activeProfile = KEYBOARD_PROFILES.find(p => p.id === selectedProfileId) || KEYBOARD_PROFILES[0];

  const handleSelectProfile = (profile: KeyboardProfile) => {
    setSelectedProfileId(profile.id);
    onUpdateProject({
      targetKeyboardId: profile.id,
      targetSff: profile.recommendedSff
    });
  };

  const auditionVoice = (type: string) => {
    if (type === 'drum') {
      globalSynth.playNote(36, 110, 10, 0.4);
      setTimeout(() => globalSynth.playNote(38, 105, 10, 0.4), 180);
      setTimeout(() => globalSynth.playNote(42, 95, 10, 0.3), 360);
    } else if (type === 'bass') {
      globalSynth.playNote(36, 100, 11, 0.6);
      setTimeout(() => globalSynth.playNote(43, 95, 11, 0.6), 250);
    } else if (type === 'chord') {
      globalSynth.playNote(60, 90, 12, 0.8);
      globalSynth.playNote(64, 85, 12, 0.8);
      globalSynth.playNote(67, 88, 12, 0.8);
    } else {
      globalSynth.playNote(72, 95, 15, 0.6);
      setTimeout(() => globalSynth.playNote(76, 100, 15, 0.8), 200);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Kompatibilitas Keyboard Arranger & Bank Voice
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Arsitektur modular mendukung Yamaha PSR-S750 (Target Utama) dan profil keyboard Korg, Roland, Ketron.
          </p>
        </div>

        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Format Terpilih: {project.targetSff || 'SFF1'}
        </span>
      </div>

      {/* Target Keyboard Switcher Cards */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Pilih Profil Keyboard Target:
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {KEYBOARD_PROFILES.map((profile) => {
            const isSelected = selectedProfileId === profile.id;
            const isPrimary = profile.id === 'yamaha_psr_s750';

            return (
              <div
                key={profile.id}
                onClick={() => handleSelectProfile(profile)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {profile.manufacturer}
                    </span>
                    {isPrimary && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        PRIORITAS
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-sm text-white pt-1">
                    {profile.name}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {profile.series}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Poly: {profile.polyphony}</span>
                  <span className="text-cyan-400 font-semibold">{profile.recommendedSff}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Keyboard Deep Profile & Voice Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Disc className="w-4 h-4 text-cyan-400" />
              Detail Spesifikasi & Bank Voice: {activeProfile.name}
            </h2>
            <p className="text-xs text-slate-400">
              Format Style: <strong className="text-cyan-300">{activeProfile.supportedFormats.join(', ')}</strong> • CASM Chunk: <strong className="text-emerald-400">{activeProfile.casmSupported ? 'Didukung Penuh' : 'SMF Standar'}</strong>
            </p>
          </div>

          {/* Voice Category Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveVoiceCategory('drums')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeVoiceCategory === 'drums' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Drum Kits (Ch 10/9)
            </button>
            <button
              onClick={() => setActiveVoiceCategory('bass')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeVoiceCategory === 'bass' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bass (Ch 11)
            </button>
            <button
              onClick={() => setActiveVoiceCategory('chords')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeVoiceCategory === 'chords' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chord & Piano (Ch 12-14)
            </button>
            <button
              onClick={() => setActiveVoiceCategory('leads')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeVoiceCategory === 'leads' ? 'bg-pink-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lead & S.Art! (Ch 15-16)
            </button>
          </div>
        </div>

        {/* Voice Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2.5 font-semibold">Nama Voice Instrumen</th>
                <th className="pb-2.5 font-semibold">Bank Select MSB (CC0)</th>
                <th className="pb-2.5 font-semibold">Bank Select LSB (CC32)</th>
                <th className="pb-2.5 font-semibold">Program Change (PC)</th>
                <th className="pb-2.5 font-semibold">Fitur Khusus</th>
                <th className="pb-2.5 font-semibold text-right">Uji Suara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {activeVoiceCategory === 'drums' && activeProfile.drumKits.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-2.5 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    {item.name}
                  </td>
                  <td className="py-2.5 text-cyan-400">{item.msb}</td>
                  <td className="py-2.5 text-cyan-400">{item.lsb}</td>
                  <td className="py-2.5 text-amber-400">{item.pc}</td>
                  <td className="py-2.5 font-sans text-slate-400">Standard Yamaha GM/XG Drum Map</td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => auditionVoice('drum')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Dengarkan Drum"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {activeVoiceCategory === 'bass' && activeProfile.bassVoices.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-2.5 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {item.name}
                  </td>
                  <td className="py-2.5 text-cyan-400">{item.msb}</td>
                  <td className="py-2.5 text-cyan-400">{item.lsb}</td>
                  <td className="py-2.5 text-amber-400">{item.pc}</td>
                  <td className="py-2.5 font-sans">
                    {item.isMegaVoice ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        MegaVoice (Fret Noise & Harmonics)
                      </span>
                    ) : (
                      <span className="text-slate-400">Regular Bass</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => auditionVoice('bass')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {activeVoiceCategory === 'chords' && activeProfile.chordVoices.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-2.5 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {item.name}
                  </td>
                  <td className="py-2.5 text-cyan-400">{item.msb}</td>
                  <td className="py-2.5 text-cyan-400">{item.lsb}</td>
                  <td className="py-2.5 text-amber-400">{item.pc}</td>
                  <td className="py-2.5 font-sans">
                    {item.isMegaVoice ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        MegaVoice Strum
                      </span>
                    ) : (
                      <span className="text-slate-400">Live! Stereo Sampling</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => auditionVoice('chord')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {activeVoiceCategory === 'leads' && activeProfile.leadVoices.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-2.5 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    {item.name}
                  </td>
                  <td className="py-2.5 text-cyan-400">{item.msb}</td>
                  <td className="py-2.5 text-cyan-400">{item.lsb}</td>
                  <td className="py-2.5 text-amber-400">{item.pc}</td>
                  <td className="py-2.5 font-sans">
                    {item.isSweetVoice ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        Sweet! Voice (Natural Vibrato)
                      </span>
                    ) : (
                      <span className="text-slate-400">Cool! Lead Solo</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => auditionVoice('lead')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
