import React from 'react';
import { GameStats } from '../types/game';
import { CHARACTERS_ROSTER } from '../data/characters';
import { DancerSprite } from './DancerSprite';

interface HallOfFameProps {
  stats: GameStats;
  onClose: () => void;
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ stats, onClose }) => {
  const winRate =
    stats.duelsWon + stats.duelsLost > 0
      ? Math.round((stats.duelsWon / (stats.duelsWon + stats.duelsLost)) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className="font-display font-extrabold text-white text-xl sm:text-2xl">
                Carnival Hall of Fame & Dancer Guide
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every dancer recruited into your conga train · Read their RPS tendencies!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Career Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 font-medium">Longest Conga Line</span>
            <div className="font-display font-black text-2xl text-amber-400 tabular-nums mt-1">
              {stats.longestConga} <span className="text-xs font-normal text-slate-400">Dancers</span>
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 font-medium">Total Dancers Recruited</span>
            <div className="font-display font-black text-2xl text-emerald-400 tabular-nums mt-1">
              {stats.totalRecruits}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 font-medium">Duels Won</span>
            <div className="font-display font-black text-2xl text-cyan-400 tabular-nums mt-1">
              {stats.duelsWon}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 font-medium">RPS Win Rate</span>
            <div className="font-display font-black text-2xl text-rose-400 tabular-nums mt-1">
              {winRate}%
            </div>
          </div>
        </div>

        {/* Dancer Directory & Strategy Guide */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <h3 className="font-display font-bold text-white text-base">Carnival Dancer Roster</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHARACTERS_ROSTER.map((char) => (
              <div
                key={char.id}
                className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors"
              >
                <DancerSprite character={char} size={58} isDancing={false} facing="front" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm truncate">{char.name}</h4>
                    <span className="text-[11px] text-amber-400 font-medium capitalize">
                      {char.personality.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{char.title} · {char.danceStyle}</div>
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{char.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
