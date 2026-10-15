import React, { useState, useEffect } from 'react';
import { Character } from '../types/game';
import { DancerSprite } from './DancerSprite';

interface CongaStageProps {
  leader: Character;
  followers: Character[];
  title?: string;
  maxDisplay?: number;
  interactive?: boolean;
}

export const CongaStage: React.FC<CongaStageProps> = ({
  leader,
  followers,
  title = 'Your Active Conga Train',
  interactive = true,
}) => {
  const [kickBeat, setKickBeat] = useState(false);
  const [selectedDancer, setSelectedDancer] = useState<Character | null>(null);

  // 1-2-3-KICK beat rhythm (every 600ms, kick on beat 4)
  useEffect(() => {
    let beat = 0;
    const interval = setInterval(() => {
      beat = (beat + 1) % 4;
      setKickBeat(beat === 3);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const totalDancers = 1 + followers.length;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Stage Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-2">
            <span>🎉</span>
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            1-2-3-KICK rhythm · Defeated opponents join the line and follow your lead!
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Train Length:</span>
          <span className="font-display font-extrabold text-amber-400 text-sm sm:text-base tabular-nums">
            {totalDancers} {totalDancers === 1 ? 'Dancer' : 'Dancers'}
          </span>
        </div>
      </div>

      {/* Stage Dance Floor with Wooden Plank & Carnival Lights */}
      <div className="relative w-full overflow-x-auto pb-4 pt-6 px-4 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-inner scrollbar-thin">
        {/* Overhead Carnival Festoon Lights */}
        <div className="absolute top-2 left-0 right-0 flex justify-around pointer-events-none opacity-80">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i % 4 === 0
                  ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                  : i % 4 === 1
                  ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                  : i % 4 === 2
                  ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
                  : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
              } ${kickBeat ? 'scale-125' : 'scale-100'} transition-transform duration-200`}
            />
          ))}
        </div>

        {/* The Conga Line Train (Leader at front right, followers trailing behind to the left) */}
        <div className="flex items-center justify-start min-w-max pl-4 pr-12 space-x-[-18px] sm:space-x-[-22px]">
          {/* Followers (trailing in reverse order or recruitment order) */}
          {[...followers].reverse().map((follower, index) => {
            const followerNum = followers.length - index;
            return (
              <div
                key={follower.id + index}
                onClick={() => interactive && setSelectedDancer(follower)}
                className={`group relative flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-2 hover:z-30`}
                title={`${follower.name} (${follower.title})`}
              >
                <div className="text-[10px] text-slate-400 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                  #{followerNum} {follower.name}
                </div>
                <DancerSprite
                  character={follower}
                  size={68}
                  isDancing={true}
                  isLeader={false}
                  kickBeat={kickBeat}
                  showHandsOnHips={true}
                  facing="right"
                />
              </div>
            );
          })}

          {/* The Grand Leader at the front */}
          <div
            onClick={() => interactive && setSelectedDancer(leader)}
            className="group relative flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-2 z-20 pl-2"
            title={`${leader.name} (Conga Leader)`}
          >
            <div className="text-[10px] text-amber-300 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500/50 whitespace-nowrap">
              👑 Leader {leader.name}
            </div>
            <DancerSprite
              character={leader}
              size={76}
              isDancing={true}
              isLeader={true}
              kickBeat={kickBeat}
              facing="right"
            />
          </div>
        </div>

        {/* Stage Footlights reflection */}
        <div className="w-full h-1 mt-2 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>

      {/* Selected Dancer Bio Quick Popup */}
      {selectedDancer && (
        <div className="mt-4 p-4 bg-slate-800/90 border border-slate-700 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-in fade-in">
          <DancerSprite character={selectedDancer} size={56} isDancing={false} facing="front" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="font-bold text-white text-sm sm:text-base">{selectedDancer.name}</h4>
              <span className="text-xs text-amber-400 font-medium">{selectedDancer.title}</span>
              <span className="text-xs text-slate-400">· Style: {selectedDancer.danceStyle}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">{selectedDancer.bio}</p>
            <p className="text-xs text-slate-400 italic mt-0.5">"{selectedDancer.quote}"</p>
          </div>
          <button
            onClick={() => setSelectedDancer(null)}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
