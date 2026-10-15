import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DancerSprite } from './DancerSprite';

interface LeaderboardModalProps {
  onClose: () => void;
  onOpenCustomize: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, onOpenCustomize }) => {
  const { leaderboard, user, currentLeader } = useAuth();
  const [activeTab, setActiveTab] = useState<'longest' | 'royale' | 'duels'>('longest');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white">Carnival Leaderboard</h2>
              <p className="text-xs text-slate-400">
                Top conga legends from across the carnival ballroom!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current User Snapshot Banner */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DancerSprite character={currentLeader} size={42} isDancing={false} />
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Your Leader Profile
              </span>
              <span className="font-display font-black text-sm text-white">{user.displayName}</span>
              <span className="text-xs text-slate-400 ml-2">({currentLeader.title})</span>
            </div>
          </div>

          <button
            onClick={onOpenCustomize}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            Customize Name & Look ✏️
          </button>
        </div>

        {/* Leaderboard Entries List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 scrollbar-thin">
          {leaderboard.map((entry) => {
            const isMe = entry.isCurrentUser || entry.playerId === user.id;

            return (
              <div
                key={`${entry.playerId}_${entry.rank}`}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isMe
                    ? 'bg-amber-950/30 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Rank & Avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl font-display font-black text-sm flex items-center justify-center shrink-0 ${
                      entry.rank === 1
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : entry.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </div>

                  <DancerSprite character={entry.character} size={40} isDancing={false} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-sm text-white truncate">
                        {entry.playerName}
                      </span>
                      {isMe && (
                        <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {entry.character.title} · {entry.date}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <div className="font-display font-black text-base sm:text-lg text-amber-400 tabular-nums">
                    {entry.score}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    {entry.metricLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center text-xs text-slate-400">
          Climb the ranks by recruiting dancers and winning duels in any game mode!
        </div>
      </div>
    </div>
  );
};
