import React, { useState } from 'react';
import { Character, DuelResult, Move } from '../types/game';
import { CHARACTERS_ROSTER } from '../data/characters';
import { DancerSprite } from './DancerSprite';
import { CongaStage } from './CongaStage';
import { RPSDuelModal } from './RPSDuelModal';
import { audioSystem } from '../utils/audio';

interface GauntletModeProps {
  playerLeader: Character;
  onUpdateStats: (recruits: number, won: boolean, tied: boolean) => void;
  onBackToMenu: () => void;
}

export const GauntletMode: React.FC<GauntletModeProps> = ({
  playerLeader,
  onUpdateStats,
  onBackToMenu,
}) => {
  // Ladder of 8 carnival challengers
  const ladder = CHARACTERS_ROSTER.slice(0, 8);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [recruitedDancers, setRecruitedDancers] = useState<Character[]>([]);
  const [inDuel, setInDuel] = useState(false);
  const [hasGlasses, setHasGlasses] = useState(false);
  const [hasFever, setHasFever] = useState(false);
  const [isGauntletComplete, setIsGauntletComplete] = useState(false);

  const currentChallenger = ladder[currentStageIndex];

  const handleStartDuel = () => {
    setInDuel(true);
  };

  const handleDuelComplete = (result: DuelResult, recruits: Character[]) => {
    setInDuel(false);
    const won = result === 'win';
    const tied = result === 'tie';

    onUpdateStats(recruits.length, won, tied);

    if (won) {
      setRecruitedDancers((prev) => [...prev, ...recruits]);

      // Move to next stage or finish
      if (currentStageIndex + 1 < ladder.length) {
        setCurrentStageIndex((prev) => prev + 1);
      } else {
        setIsGauntletComplete(true);
        audioSystem.playWinRecruit();
      }
    }
  };

  const handleRestart = () => {
    setCurrentStageIndex(0);
    setRecruitedDancers([]);
    setIsGauntletComplete(false);
    setInDuel(false);
  };

  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-6">
      {/* Header and Controls */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3 shadow-lg">
        <div>
          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Carnival Gauntlet</span>
          <h2 className="font-display font-extrabold text-white text-lg sm:text-xl">
            Stage {currentStageIndex + 1} of {ladder.length}: {currentChallenger?.name}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400">Conga Length:</span>
            <div className="font-display font-bold text-emerald-400 tabular-nums">
              {recruitedDancers.length + 1} Dancers
            </div>
          </div>
          <button
            onClick={onBackToMenu}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Stage Conga Line Viewer */}
      <CongaStage
        leader={playerLeader}
        followers={recruitedDancers}
        title="Your Gauntlet Conga Line"
      />

      {/* Stage Challenger Arena Showcase */}
      {!isGauntletComplete ? (
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
          {/* Left: Opponent Avatar & Bio */}
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="relative">
              <DancerSprite
                character={currentChallenger}
                size={96}
                isDancing={true}
                facing="front"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                Challenger
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="font-display font-extrabold text-white text-2xl">
                  {currentChallenger.name}
                </h3>
                <span className="text-xs text-amber-400 font-semibold">{currentChallenger.title}</span>
              </div>
              <p className="text-xs text-slate-300 max-w-md">{currentChallenger.bio}</p>
              <p className="text-xs text-slate-400 italic">"{currentChallenger.quote}"</p>
              <div className="text-[11px] text-slate-400 pt-1">
                Dance Style: <strong className="text-cyan-400">{currentChallenger.danceStyle}</strong> · RPS Trait:{' '}
                <strong className="text-rose-400 capitalize">{currentChallenger.personality.replace('_', ' ')}</strong>
              </div>
            </div>
          </div>

          {/* Right: Challenge CTA */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStartDuel}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-lg rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-3"
            >
              <span>Rock-Paper-Scissors!</span>
              <span className="text-2xl">✌️</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Win to recruit {currentChallenger.name} directly behind your line!
            </span>
          </div>
        </div>
      ) : (
        /* Gauntlet Completion Screen */
        <div className="w-full bg-slate-900 border-2 border-amber-400 rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in-95">
          <div className="text-6xl mb-3">👑🎉🎊</div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-amber-400 mb-2">
            GAUNTLET CONQUERED!
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto mb-6">
            You defeated every single dancer in the carnival tournament! All {ladder.length} master dancers are now happily following your conga line!
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Play Again
            </button>
            <button
              onClick={onBackToMenu}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-display font-bold rounded-xl border border-slate-700 shadow-lg cursor-pointer"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Ladder Progress Bar */}
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span>Carnival Tour Progress</span>
          <span>
            {currentStageIndex} of {ladder.length} Recruited
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ladder.map((char, index) => {
            const isDefeated = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            return (
              <div
                key={char.id}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isDefeated
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : isCurrent
                    ? 'bg-amber-950/60 border-amber-400 text-amber-300 shadow-md ring-2 ring-amber-400/30'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <div className="text-lg">{isDefeated ? '✓' : isCurrent ? '👉' : '🔒'}</div>
                <div className="text-[10px] font-bold truncate mt-1">{char.name.split(' ')[0]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duel Modal */}
      {inDuel && currentChallenger && (
        <RPSDuelModal
          playerLeader={playerLeader}
          playerFollowerCount={recruitedDancers.length}
          opponent={currentChallenger}
          hasMirrorGlasses={hasGlasses}
          hasCongaFever={hasFever}
          onDuelComplete={handleDuelComplete}
        />
      )}
    </div>
  );
};
