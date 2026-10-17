import React, { useState } from 'react';
import { 
  GitCommit, Music2, Sparkles, Volume2, ArrowRight, 
  CheckCircle2, RefreshCw, Sliders, Layers, Info 
} from 'lucide-react';
import { ProjectData, ChordEvent, NavTab } from '../../types';
import { globalSynth } from '../../utils/audioEngine';

interface ChordAnalyzerViewProps {
  project: ProjectData;
  onUpdateProject: (updated: Partial<ProjectData>) => void;
  onNavigate: (tab: NavTab) => void;
}

export const ChordAnalyzerView: React.FC<ChordAnalyzerViewProps> = ({
  project,
  onUpdateProject,
  onNavigate,
}) => {
  const [selectedChordIdx, setSelectedChordIdx] = useState<number | null>(0);
  const [targetHarmonization, setTargetHarmonization] = useState<'C Major' | 'A Minor'>('C Major');

  const chords = project.chords;

  // Circle of fifths notes
  const circleOfFifths = [
    { note: 'C', top: '10%', left: '50%' },
    { note: 'G', top: '18%', left: '72%' },
    { note: 'D', top: '38%', left: '88%' },
    { note: 'A', top: '62%', left: '88%' },
    { note: 'E', top: '82%', left: '72%' },
    { note: 'B', top: '90%', left: '50%' },
    { note: 'F#', top: '82%', left: '28%' },
    { note: 'Db', top: '62%', left: '12%' },
    { note: 'Ab', top: '38%', left: '12%' },
    { note: 'Eb', top: '18%', left: '28%' },
    { note: 'Bb', top: '12%', left: '38%' },
    { note: 'F', top: '12%', left: '62%' },
  ];

  const auditionChord = (chordStr: string) => {
    // Map chord root to MIDI pitches
    const rootMap: Record<string, number> = {
      'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'Eb': 63, 'E': 64,
      'F': 65, 'F#': 66, 'G': 67, 'Ab': 68, 'A': 69, 'Bb': 70, 'B': 71
    };

    let rootName = 'C';
    for (const k of Object.keys(rootMap)) {
      if (chordStr.startsWith(k) && k.length >= rootName.length) {
        rootName = k;
      }
    }

    const rootPitch = rootMap[rootName] || 60;
    const isMinor = chordStr.includes('m') && !chordStr.includes('maj');
    const is7th = chordStr.includes('7');

    const third = rootPitch + (isMinor ? 3 : 4);
    const fifth = rootPitch + 7;
    const seventh = rootPitch + (isMinor ? 10 : 11);

    globalSynth.playNote(rootPitch - 12, 100, 11, 0.8); // Bass note
    globalSynth.playNote(rootPitch, 90, 12, 0.8); // Root
    globalSynth.playNote(third, 85, 12, 0.8);     // Third
    globalSynth.playNote(fifth, 88, 12, 0.8);     // Fifth
    if (is7th) {
      globalSynth.playNote(seventh, 82, 12, 0.8); // Seventh
    }
  };

  const handleUpdateChord = (index: number, newChord: string) => {
    const updated = [...chords];
    const isMinor = newChord.includes('m');
    const is7th = newChord.includes('7');
    const root = newChord.replace(/m|7/g, '');

    updated[index] = {
      ...updated[index],
      chord: newChord,
      root,
      type: is7th ? '7' : (isMinor ? 'min' : 'maj'),
    };

    onUpdateProject({ chords: updated });
  };

  // Convert progression to standard Yamaha C Major style source chord
  const handleHarmonizeToYamahaStandard = () => {
    // Yamaha PSR-S750 expects style source tracks arranged in C Major (C - E - G)
    const normalizedChords = chords.map(ch => ({
      ...ch,
      chord: 'C',
      root: 'C',
      type: 'maj',
      confidence: 1.0
    }));

    onUpdateProject({ chords: normalizedChords });
    alert('Seluruh progresi telah diharmonisasikan ke Kunci C Mayor sesuai standar aransemen Yamaha CASM.');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-cyan-400" />
            Chord Analyzer & Harmonisasi Yamaha
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analisis harmoni bar-by-bar, penyesuaian progresi akor, dan penyelarasan ke standar Root C Yamaha SFF1.
          </p>
        </div>

        <button
          onClick={handleHarmonizeToYamahaStandard}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Harmonisasikan ke Root C (Standar S750)</span>
        </button>
      </div>

      {/* Yamaha Style Rule Callout */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start space-x-3.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="font-bold text-white">Prinsip Harmoni Arranger Yamaha (SFF1 / S750):</div>
          <p className="text-slate-400 leading-relaxed">
            Pada keyboard arranger Yamaha PSR-S750, modul <strong>CASM (Channel Assignment)</strong> menggunakan 
            <strong> Source Chord C Mayor</strong> sebagai patokan dasar. Ketika pemain menekan akor apapun di tuts kiri, 
            mesin keyboard otomatis mentransposisikan notasi bass, chord gitar/piano, dan lead sesuai aturan NTT (Note Transposition Table).
          </p>
        </div>
      </div>

      {/* Main Grid: Chord Timeline & Circle of Fifths */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chord Timeline (Left 2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Music2 className="w-4 h-4 text-cyan-400" />
              Progresi Akor per Birama (Bar-by-Bar Timeline)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Total {chords.length} Birama
            </span>
          </div>

          {/* Chord Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {chords.map((ch, idx) => {
              const isSelected = selectedChordIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedChordIdx(idx);
                    auditionChord(ch.chord);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 text-left ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-900/20'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>BAR {ch.bar}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        auditionChord(ch.chord);
                      }}
                      className="text-slate-500 hover:text-cyan-400 transition-colors"
                      title="Dengarkan Akor"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xl font-bold font-mono text-white">
                    {ch.chord}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                    <span>Root: <strong className="text-slate-300">{ch.root}</strong></span>
                    <span className="text-emerald-400 font-mono">
                      {Math.round(ch.confidence * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Selected Chord */}
          {selectedChordIdx !== null && chords[selectedChordIdx] && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Ubah Akor untuk Birama {chords[selectedChordIdx].bar}:</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {chords[selectedChordIdx].chord}
                </span>
              </div>

              {/* Quick Root Select */}
              <div className="flex flex-wrap gap-1.5">
                {['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'Ab', 'Db', 'F#'].map(root => (
                  <button
                    key={root}
                    onClick={() => {
                      const type = chords[selectedChordIdx].type === 'min' ? 'm' : (chords[selectedChordIdx].type === '7' ? '7' : '');
                      handleUpdateChord(selectedChordIdx, `${root}${type}`);
                      auditionChord(`${root}${type}`);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                      chords[selectedChordIdx].root === root
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {root}
                  </button>
                ))}
              </div>

              {/* Quick Type Select */}
              <div className="flex gap-2 pt-1">
                {[
                  { label: 'Mayor', suffix: '' },
                  { label: 'Minor (m)', suffix: 'm' },
                  { label: 'Dominant 7', suffix: '7' },
                  { label: 'Minor 7 (m7)', suffix: 'm7' },
                  { label: 'Major 7 (maj7)', suffix: 'maj7' },
                  { label: 'Sus 4', suffix: 'sus4' },
                ].map(type => (
                  <button
                    key={type.label}
                    onClick={() => {
                      const root = chords[selectedChordIdx].root;
                      handleUpdateChord(selectedChordIdx, `${root}${type.suffix}`);
                      auditionChord(`${root}${type.suffix}`);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Harmonic Wheel & Rules (Right 1 col) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Lingkaran Kuint (Circle of Fifths)
              </h3>
            </div>

            {/* Visual Circle Box */}
            <div className="relative w-full aspect-square max-w-[260px] mx-auto rounded-full border-2 border-slate-800/80 bg-slate-950/60 p-4 flex items-center justify-center">
              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-cyan-400 font-mono">C</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Tonalitas Acuan</div>
                <div className="text-[9px] text-emerald-400 font-mono">Yamaha CASM OK</div>
              </div>

              {/* Notes arranged in circle */}
              {circleOfFifths.map((item, idx) => (
                <div
                  key={idx}
                  style={{ top: item.top, left: item.left }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    item.note === 'C'
                      ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.note}
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-300">Tabel Transposisi Nada Yamaha (NTT):</div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">Chord 1 & 2:</span>
                  <span className="text-cyan-400 font-mono">NTT: Chord / NTR: Root</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">Bass (Ch 11):</span>
                  <span className="text-emerald-400 font-mono">NTT: Bass / NTR: Root</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">Drums (Ch 9 & 10):</span>
                  <span className="text-amber-400 font-mono">NTT: Bypass / NTR: Fixed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Notasi siap diedit?</span>
            <button
              onClick={() => onNavigate('midi_editor')}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <span>Buka Piano Roll</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
