import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Character, DuelResult, Move } from '../types/game';
import { DancerSprite } from './DancerSprite';
import { getDuelResult, getOpponentMove, getOutcomeExplanation, getPsychicHint } from '../utils/rpsLogic';
import { audioSystem, soundManager } from '../utils/audio';

interface RPSDuelModalProps {
  playerLeader: Character;
  playerFollowerCount: number;
  opponent: Character;
  opponentFollowers?: Character[];
  hasMirrorGlasses?: boolean;
  hasCongaFever?: boolean;
  onDuelComplete: (result: DuelResult, recruitedCharacters: Character[]) => void;
  onClose?: () => void;
}

const MOVE_ICONS: Record<Move, { emoji: string; name: string; key: string }> = {
  rock: { emoji: '✊', name: 'Rock', key: '1' },
  paper: { emoji: '✋', name: 'Paper', key: '2' },
  scissors: { emoji: '✌️', name: 'Scissors', key: '3' },
};

export const RPSDuelModal: React.FC<RPSDuelModalProps> = ({
  playerLeader,
  playerFollowerCount,
  opponent,
  opponentFollowers = [],
  hasMirrorGlasses = false,
  hasCongaFever = false,
  onDuelComplete,
}) => {
  const [countdown, setCountdown] = useState<number>(3); // 3, 2, 1, 0 (SHOOT!)
  const [playerChoice, setPlayerChoice] = useState<Move | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<Move | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isTieRound, setIsTieRound] = useState<boolean>(false);
  const [history] = useState<Move[]>([]);

  // Psychic hint if player picked up mirror glasses
  const hintMove = hasMirrorGlasses ? getPsychicHint(opponent, history) : null;

  // Countdown timer
  useEffect(() => {
    if (showResult) return;

    if (countdown > 0) {
      audioSystem.playCountdownTick(4 - countdown);
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      audioSystem.playCountdownTick(4);
    }
  }, [countdown, showResult]);

  // Handle choice submission
  const handleSelectMove = (move: Move) => {
    if (playerChoice !== null || showResult) return;

    audioSystem.playSelectSound();
    setPlayerChoice(move);

    // AI selects its move
    const oppMove = getOpponentMove(opponent, history);
    setOpponentChoice(oppMove);

    // Calculate result
    const result = getDuelResult(move, oppMove);
    setDuelResult(result);
    setShowResult(true);

    if (result === 'win') {
      soundManager.playWinRecruit();
      // Trigger crowd cheer scaled to the conga line size
      soundManager.playCrowdCheer(playerFollowerCount + 1, 0);
      // Blast celebratory carnival confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#ef4444'],
        });
      } catch {
        // Fallback gracefully
      }
    } else if (result === 'tie') {
      audioSystem.playTieSound();
    } else {
      audioSystem.playLoseSound();
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playerChoice !== null || showResult) return;
      if (e.key === '1' || e.key === 'r' || e.key === 'R') {
        handleSelectMove('rock');
      } else if (e.key === '2' || e.key === 'p' || e.key === 'P') {
        handleSelectMove('paper');
      } else if (e.key === '3' || e.key === 's' || e.key === 'S') {
        handleSelectMove('scissors');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerChoice, showResult, opponent]);

  // Tie rematch trigger
  const handleTieRematch = () => {
    setIsTieRound(true);
    setPlayerChoice(null);
    setOpponentChoice(null);
    setDuelResult(null);
    setShowResult(false);
    setCountdown(3);
  };

  // Finish duel and recruit
  const handleFinish = () => {
    if (!duelResult) return;
    const recruits = duelResult === 'win' ? [opponent, ...opponentFollowers] : [];
    onDuelComplete(duelResult, recruits);
  };

  const totalRecruitsPossible = 1 + opponentFollowers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Festive background decor */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Duel Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪇</span>
            <span className="font-display font-bold text-lg text-amber-400 tracking-wide uppercase">
              {isTieRound ? 'Double Shake Rematch!' : 'Rock Paper Scissors Duel'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Your Conga: <strong className="text-white tabular-nums">{playerFollowerCount + 1}</strong></span>
            <span>·</span>
            <span>Prize: <strong className="text-emerald-400 tabular-nums">+{totalRecruitsPossible} Dancers</strong></span>
          </div>
        </div>

        {/* Active Power-up indicators */}
        <div className="flex gap-2 mb-4">
          {hasMirrorGlasses && hintMove && (
            <div className="bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs px-3 py-1 rounded-md flex items-center gap-1.5">
              <span>🕶️</span>
              <span>Disco Shades intuition: Rival leans toward <strong>{hintMove.toUpperCase()}</strong></span>
            </div>
          )}
          {hasCongaFever && (
            <div className="bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs px-3 py-1 rounded-md flex items-center gap-1.5 animate-pulse">
              <span>🔥</span>
              <span>Conga Fever Active: Double Recruitment!</span>
            </div>
          )}
        </div>

        {/* Duel Arena: Two Dancers Facing Off */}
        <div className="w-full grid grid-cols-2 gap-4 sm:gap-8 items-center justify-items-center my-4 py-4 bg-slate-950/60 rounded-xl border border-slate-800/80 px-4">
          {/* Player Side */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <DancerSprite
                character={playerLeader}
                size={84}
                isDancing={!showResult}
                isLeader={true}
                facing="right"
              />
              {playerChoice && (
                <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 font-bold w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white animate-bounce">
                  {MOVE_ICONS[playerChoice].emoji}
                </div>
              )}
            </div>
            <div className="font-bold text-white text-base">{playerLeader.name}</div>
            <div className="text-xs text-amber-400 font-medium">You (Conga Leader)</div>
          </div>

          {/* Opponent Side */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <DancerSprite
                character={opponent}
                size={84}
                isDancing={!showResult || duelResult === 'win'}
                isLeader={opponentFollowers.length > 0}
                isLoserStumble={showResult && duelResult === 'win'}
                facing="left"
              />
              {showResult && opponentChoice && (
                <div className="absolute -top-3 -left-3 bg-indigo-500 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white animate-bounce">
                  {MOVE_ICONS[opponentChoice].emoji}
                </div>
              )}
            </div>
            <div className="font-bold text-white text-base">{opponent.name}</div>
            <div className="text-xs text-indigo-400 font-medium">{opponent.title}</div>
            <p className="text-[11px] text-slate-400 italic max-w-[180px] mt-1">"{opponent.quote}"</p>
          </div>
        </div>

        {/* Countdown / Status Banner */}
        <div className="my-3 text-center min-h-[3rem] flex flex-col items-center justify-center">
          {!showResult ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pick your move before the beat:
              </span>
              <span className="font-display font-extrabold text-2xl text-amber-400 tabular-nums">
                {countdown > 0 ? `${countdown}...` : 'SHOOT!'}
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <div
                className={`font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide ${
                  duelResult === 'win'
                    ? 'text-emerald-400'
                    : duelResult === 'tie'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {duelResult === 'win' && '🎉 VICTORY! CONGA RECRUITED! 🎉'}
                {duelResult === 'tie' && '🤝 IT’S A TIE! DOUBLE SHAKE! 🤝'}
                {duelResult === 'lose' && '😢 DEFEAT! DANCER STEPPED AWAY! 😢'}
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                {playerChoice && opponentChoice && getOutcomeExplanation(playerChoice, opponentChoice)}
              </p>
            </div>
          )}
        </div>

        {/* Action Controls: Rock, Paper, Scissors Buttons */}
        {!showResult ? (
          <div className="w-full mt-4">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
                <button
                  key={move}
                  onClick={() => handleSelectMove(move)}
                  className="group relative flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700/90 active:scale-95 border border-slate-700 hover:border-amber-400 rounded-xl transition-all cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <span className="text-4xl sm:text-5xl mb-2 group-hover:scale-110 transition-transform">
                    {MOVE_ICONS[move].emoji}
                  </span>
                  <span className="font-display font-bold text-sm text-white group-hover:text-amber-300">
                    {MOVE_ICONS[move].name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Press [{MOVE_ICONS[move].key}]</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Result Next Step Button */
          <div className="w-full mt-5 flex justify-center gap-4">
            {duelResult === 'tie' ? (
              <button
                onClick={handleTieRematch}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-sm sm:text-base cursor-pointer"
              >
                Shake Hands & Rematch!
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className={`px-8 py-3 font-display font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-sm sm:text-base cursor-pointer ${
                  duelResult === 'win'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {duelResult === 'win'
                  ? `Lead the Conga Line! (+${totalRecruitsPossible})`
                  : 'Resume Dance Floor'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
