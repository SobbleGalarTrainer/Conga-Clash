import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ALL_16_MAPS } from '../data/maps';
import { MapId } from '../types/game';

interface MapSelectorModalProps {
  onClose: () => void;
}

export const MapSelectorModal: React.FC<MapSelectorModalProps> = ({ onClose }) => {
  const { selectedMapId, setSelectedMapId } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'CITY' | 'NATURE_TROPICAL' | 'LANDMARK'>('ALL');
  const [search, setSearch] = useState('');

  const filterMap = (mapId: MapId, tag: string) => {
    if (filter === 'ALL') return true;
    if (filter === 'CITY') {
      return ['toronto_city_hall', '6000_yonge_street', 'london', 'paris', 'moscow', 'beijing', 'manila', 'san_francisco'].includes(mapId);
    }
    if (filter === 'NATURE_TROPICAL') {
      return ['the_park', 'the_island', 'hinundayan'].includes(mapId);
    }
    if (filter === 'LANDMARK') {
      return ['the_white_house', 'the_airport', 'brebeuf_college_school', 'the_gym', 'an_amusement_park'].includes(mapId);
    }
    return true;
  };

  const filteredMaps = ALL_16_MAPS.filter((m) => {
    const matchesFilter = filterMap(m.id, m.tag);
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.location.toLowerCase().includes(search.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSelect = (mapId: MapId) => {
    setSelectedMapId(mapId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[680px] max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow">
              🗺️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                  Carnival Map Pavilion
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  16 Maps
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Choose from 16 authentic venues worldwide for all 2D and 3D conga modes!
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

        {/* Filter and Search Bar */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-bold">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              All 16 Maps
            </button>
            <button
              onClick={() => setFilter('CITY')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                filter === 'CITY'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Metropolises & Cities
            </button>
            <button
              onClick={() => setFilter('NATURE_TROPICAL')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                filter === 'NATURE_TROPICAL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Nature & Tropical
            </button>
            <button
              onClick={() => setFilter('LANDMARK')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                filter === 'LANDMARK'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Campuses & Arenas
            </button>
          </div>

          <div className="w-full sm:w-56">
            <input
              type="text"
              placeholder="Search maps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* 16 Maps Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMaps.map((mapItem) => {
              const isSelected = mapItem.id === selectedMapId;

              return (
                <div
                  key={mapItem.id}
                  onClick={() => handleSelect(mapItem.id)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-md hover:scale-[1.01] ${
                    isSelected
                      ? 'bg-slate-950 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  {/* Decorative top color stripe based on map theme */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: mapItem.accentColorHex }}
                  />

                  <div>
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl group-hover:scale-110 transition-transform">
                          {mapItem.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-black text-base text-white group-hover:text-amber-400 transition-colors">
                              {mapItem.name}
                            </h3>
                            <span
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border"
                              style={{
                                color: mapItem.accentColorHex,
                                borderColor: `${mapItem.accentColorHex}40`,
                                backgroundColor: `${mapItem.accentColorHex}15`,
                              }}
                            >
                              {mapItem.tag}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            📍 {mapItem.location}
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 shadow flex items-center gap-1">
                          <span>✓ Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-[11px] font-bold text-slate-400 group-hover:text-amber-400 transition-colors shrink-0"
                        >
                          Select →
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                      {mapItem.description}
                    </p>

                    {/* Key Landmark feature */}
                    <div className="bg-slate-900/80 rounded-xl p-2 text-[11px] border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Centerpiece:</span>
                      <strong className="text-amber-300 font-bold">
                        {mapItem.featuredCenterpiece}
                      </strong>
                    </div>

                    {/* Landmarks pill list */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {mapItem.landmarks.slice(0, 3).map((lm) => (
                        <span
                          key={lm.name}
                          className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-800"
                        >
                          {lm.icon} {lm.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono text-[10px]">
                      Theme: {mapItem.floorType.replace(/_/g, ' ')}
                    </span>
                    <span
                      className="font-bold font-display"
                      style={{ color: isSelected ? '#fbbf24' : '#94a3b8' }}
                    >
                      {isSelected ? 'Currently Selected' : 'Click to Drop Here'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
