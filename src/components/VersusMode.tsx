import React, { useState, useEffect } from 'react';
import { Character, Move } from '../types/game';
import { CHARACTERS_ROSTER, DEFAULT_PLAYER_LEADER } from '../data/characters';
import { DancerSprite } from './DancerSprite';
import { getDuelResult, getOutcomeExplanation } from '../utils/rpsLogic';
import { audioSystem, soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';

interface VersusModeProps {
  onBackToMenu: () => void;
}

const P2_LEADER: Character = {
  id: 'p2_leader',
  name: 'Samba Serena',
  title: 'Conga Queen',
  hat: 'feathers',
  hairColor: '#312e81',
  shirtColor: '#06b6d4',
  pantsColor: '#1e293b',
  skinTone: '#ffd1aa',
  accessoryColor: '#38bdf8',
  personality: 'balanced',
  bio: 'Challenger for the Conga Crown.',
  quote: "My conga line will circle the entire arena!",
  danceStyle: 'Samba Glide',
};

const MOVE_DATA: Record<Move, { emoji: string; name: string }> = {
  rock: { emoji: '✊', name: 'Rock' },
  paper: { emoji: '✋', name: 'Paper' },
  scissors: { emoji: '✌️', name: 'Scissors' },
};

export const VersusMode: React.FC<VersusModeProps> = ({ onBackToMenu }) => {
  const [p1Leader] = useState<Character>(DEFAULT_PLAYER_LEADER);
  const [p2Leader] = useState<Character>(P2_LEADER);

  const [p1Followers, setP1Followers] = useState<Character[]>([]);
  const [p2Followers, setP2Followers] = useState<Character[]>([]);

  const [currentPrizeDancer, setCurrentPrizeDancer] = useState<Character>(CHARACTERS_ROSTER[0]);
  const [dancerPoolIndex, setDancerPoolIndex] = useState(1);

  const [p1Choice, setP1Choice] = useState<Move | null>(null);
  const [p2Choice, setP2Choice] = useState<Move | null>(null);

  const [revealed, setRevealed] = useState(false);
  const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | 'tie' | null>(null);
  const [matchWinner, setMatchWinner] = useState<'p1' | 'p2' | null>(null);

  const targetToWin = 5;

  // Keyboard shortcut listener for simultaneous 2-player input
  useEffect(() => {
    if (revealed || matchWinner) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // P1 Keys: A (Rock), S (Paper), D (Scissors)
      if (p1Choice === null) {
        if (e.key === 'a' || e.key === 'A') {
          audioSystem.playSelectSound();
          setP1Choice('rock');
        } else if (e.key === 's' || e.key === 'S') {
          audioSystem.playSelectSound();
          setP1Choice('paper');
        } else if (e.key === 'd' || e.key === 'D') {
          audioSystem.playSelectSound();
          setP1Choice('scissors');
        }
      }

      // P2 Keys: J (Rock), K (Paper), L (Scissors)
      if (p2Choice === null) {
        if (e.key === 'j' || e.key === 'J') {
          audioSystem.playSelectSound();
          setP2Choice('rock');
        } else if (e.key === 'k' || e.key === 'K') {
          audioSystem.playSelectSound();
          setP2Choice('paper');
        } else if (e.key === 'l' || e.key === 'L') {
          audioSystem.playSelectSound();
          setP2Choice('scissors');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [p1Choice, p2Choice, revealed, matchWinner]);

  // Reveal when both players have locked in
  useEffect(() => {
    if (p1Choice !== null && p2Choice !== null && !revealed) {
      setRevealed(true);
      const res = getDuelResult(p1Choice, p2Choice);
      if (res === 'win') {
        setRoundWinner('p1');
        audioSystem.playWinRecruit();
        soundManager.playCrowdCheer(p1Followers.length + 2, -0.55);
        setP1Followers((prev) => {
          const next = [...prev, currentPrizeDancer];
          if (next.length >= targetToWin) {
            setMatchWinner('p1');
            confetti({ particleCount: 100, spread: 70 });
          }
          return next;
        });
      } else if (res === 'lose') {
        setRoundWinner('p2');
        audioSystem.playWinRecruit();
        soundManager.playCrowdCheer(p2Followers.length + 2, 0.55);
        setP2Followers((prev) => {
          const next = [...prev, currentPrizeDancer];
          if (next.length >= targetToWin) {
            setMatchWinner('p2');
            confetti({ particleCount: 100, spread: 70 });
          }
          return next;
        });
      } else {
        setRoundWinner('tie');
        audioSystem.playTieSound();
      }
    }
  }, [p1Choice, p2Choice, revealed, currentPrizeDancer]);

  const handleNextRound = () => {
    setP1Choice(null);
    setP2Choice(null);
    setRevealed(false);
    setRoundWinner(null);

    // Pick next dancer from roster
    if (roundWinner !== 'tie') {
      const nextIndex = (dancerPoolIndex + 1) % CHARACTERS_ROSTER.length;
      setDancerPoolIndex(nextIndex);
      setCurrentPrizeDancer(CHARACTERS_ROSTER[nextIndex]);
    }
  };

  const handleRestart = () => {
    setP1Followers([]);
    setP2Followers([]);
    setP1Choice(null);
    setP2Choice(null);
    setRevealed(false);
    setRoundWinner(null);
    setMatchWinner(null);
    setDancerPoolIndex(1);
    setCurrentPrizeDancer(CHARACTERS_ROSTER[0]);
  };

  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-6">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3 shadow-lg">
        <div>
          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">2-Player Same Screen Battle</span>
          <h2 className="font-display font-extrabold text-white text-lg sm:text-xl">
            Conga Tug-Of-War (First to {targetToWin} Dancers)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Reset Match
          </button>
          <button
            onClick={onBackToMenu}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Main Split Arena */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Center Neutral Dancer Ring (The Prize!) */}
        <div className="md:col-span-2 bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <DancerSprite character={currentPrizeDancer} size={64} isDancing={true} facing="front" />
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                Neutral Dancer to Recruit:
              </div>
              <h3 className="font-display font-extrabold text-white text-xl">{currentPrizeDancer.name}</h3>
              <p className="text-xs text-slate-300">{currentPrizeDancer.title} · "{currentPrizeDancer.quote}"</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs text-slate-400">Score Tracker:</div>
            <div className="font-display font-extrabold text-lg text-white tabular-nums">
              <span className="text-orange-400">P1 ({p1Followers.length})</span> vs{' '}
              <span className="text-cyan-400">P2 ({p2Followers.length})</span>
            </div>
          </div>
        </div>

        {/* Player 1 (Left Side) */}
        <div className="bg-slate-900 border-2 border-orange-500/40 rounded-2xl p-6 flex flex-col items-center shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <h3 className="font-display font-black text-xl text-orange-400">Player 1</h3>
          </div>
          <div className="text-xs text-slate-400 mb-4">Keys: [A] Rock · [S] Paper · [D] Scissors</div>

          {/* P1 Leader & Conga Line Mini-Stage */}
          <div className="relative mb-6">
            <DancerSprite character={p1Leader} size={80} isDancing={true} isLeader={true} facing="right" />
            {p1Choice !== null && (
              <div className="absolute -top-3 -right-3 bg-orange-500 text-slate-950 font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                {revealed ? MOVE_DATA[p1Choice].emoji : '🔒'}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-300 mb-4">
            Conga Line: <strong>{p1Followers.length + 1} Dancers</strong>
          </div>

          {/* P1 Controls */}
          <div className="w-full grid grid-cols-3 gap-2">
            {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
              <button
                key={move}
                disabled={p1Choice !== null || revealed || matchWinner !== null}
                onClick={() => {
                  audioSystem.playSelectSound();
                  setP1Choice(move);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  p1Choice === move
                    ? 'bg-orange-500 text-slate-950 border-white font-bold scale-105'
                    : 'bg-slate-800 text-white border-slate-700 hover:border-orange-400'
                } disabled:opacity-50 cursor-pointer`}
              >
                <span className="text-2xl mb-1">{MOVE_DATA[move].emoji}</span>
                <span className="text-xs font-semibold">{MOVE_DATA[move].name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Player 2 (Right Side) */}
        <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-6 flex flex-col items-center shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500" />
            <h3 className="font-display font-black text-xl text-cyan-400">Player 2</h3>
          </div>
          <div className="text-xs text-slate-400 mb-4">Keys: [J] Rock · [K] Paper · [L] Scissors</div>

          {/* P2 Leader & Conga Line Mini-Stage */}
          <div className="relative mb-6">
            <DancerSprite character={p2Leader} size={80} isDancing={true} isLeader={true} facing="left" />
            {p2Choice !== null && (
              <div className="absolute -top-3 -left-3 bg-cyan-500 text-slate-950 font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                {revealed ? MOVE_DATA[p2Choice].emoji : '🔒'}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-300 mb-4">
            Conga Line: <strong>{p2Followers.length + 1} Dancers</strong>
          </div>

          {/* P2 Controls */}
          <div className="w-full grid grid-cols-3 gap-2">
            {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
              <button
                key={move}
                disabled={p2Choice !== null || revealed || matchWinner !== null}
                onClick={() => {
                  audioSystem.playSelectSound();
                  setP2Choice(move);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  p2Choice === move
                    ? 'bg-cyan-500 text-slate-950 border-white font-bold scale-105'
                    : 'bg-slate-800 text-white border-slate-700 hover:border-cyan-400'
                } disabled:opacity-50 cursor-pointer`}
              >
                <span className="text-2xl mb-1">{MOVE_DATA[move].emoji}</span>
                <span className="text-xs font-semibold">{MOVE_DATA[move].name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Outcome Banner & Next Round CTA */}
      {revealed && (
        <div className="w-full bg-slate-900 border border-amber-400 rounded-2xl p-6 text-center animate-in zoom-in-95 shadow-2xl">
          <div className="font-display font-black text-2xl mb-1">
            {roundWinner === 'p1' && <span className="text-orange-400">🎉 Player 1 Won & Recruited {currentPrizeDancer.name}!</span>}
            {roundWinner === 'p2' && <span className="text-cyan-400">🎉 Player 2 Won & Recruited {currentPrizeDancer.name}!</span>}
            {roundWinner === 'tie' && <span className="text-amber-400">🤝 It's a Tie! Rematch!</span>}
          </div>
          <p className="text-xs text-slate-300 mb-4">
            {p1Choice && p2Choice && getOutcomeExplanation(p1Choice, p2Choice)}
          </p>

          {!matchWinner ? (
            <button
              onClick={handleNextRound}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer text-sm"
            >
              Next Dancer Round 🪇
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-3xl font-black text-amber-300">
                👑 {matchWinner === 'p1' ? 'PLAYER 1' : 'PLAYER 2'} TAKES THE CONGA CROWN!
              </div>
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-xl shadow-lg cursor-pointer text-sm"
              >
                Play Match Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
