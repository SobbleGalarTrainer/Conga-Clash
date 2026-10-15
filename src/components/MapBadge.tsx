import React from 'react';
import { useAuth } from '../context/AuthContext';

interface MapBadgeProps {
  onClick: () => void;
  className?: string;
}

export const MapBadge: React.FC<MapBadgeProps> = ({ onClick, className = '' }) => {
  const { currentMap } = useAuth();

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 transition-all cursor-pointer shadow-sm text-xs ${className}`}
      title={`Active Map: ${currentMap.name} (${currentMap.location}). Click to switch maps!`}
    >
      <span className="text-base group-hover:scale-110 transition-transform">
        {currentMap.icon}
      </span>
      <div className="flex flex-col text-left">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">
          Map
        </span>
        <span className="font-display font-bold text-white group-hover:text-amber-400 transition-colors leading-tight max-w-[90px] sm:max-w-[130px] truncate">
          {currentMap.name}
        </span>
      </div>
      <span className="text-[10px] text-slate-500 group-hover:text-amber-400 transition-colors ml-0.5">
        ▾
      </span>
    </button>
  );
};
