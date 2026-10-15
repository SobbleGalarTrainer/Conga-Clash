import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CHARACTERS_ROSTER } from '../data/characters';
import { HatStyle } from '../types/game';
import { DancerSprite } from './DancerSprite';

interface CustomizeModalProps {
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenShop: () => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  onClose,
  onOpenAuth,
  onOpenShop,
}) => {
  const {
    user,
    currentLeader,
    updateCustomName,
    selectCharacter,
    selectHat,
    selectShirtColor,
  } = useAuth();

  const [nameInput, setNameInput] = useState(user.displayName);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSaveName = () => {
    if (user.isGuest) {
      onOpenAuth();
      return;
    }
    const ok = updateCustomName(nameInput);
    if (!ok) {
      setNameError('Please enter a valid name (1-18 characters).');
    } else {
      setNameError(null);
    }
  };

  const colors = ['#f97316', '#ec4899', '#06b6d4', '#10b981', '#8b5cf6', '#eab308', '#ef4444', '#ca8a04', '#38bdf8'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👑</span>
            <h3 className="font-display font-black text-xl text-white">Customize Your Conga Leader</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Live Sprite Preview */}
        <div className="flex flex-col items-center justify-center py-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-5">
          <DancerSprite character={currentLeader} size={100} isDancing={true} isLeader={true} />
          <span className="font-display font-black text-white text-base mt-2">{currentLeader.name}</span>
          <span className="text-xs text-amber-400 font-semibold">{currentLeader.title}</span>
        </div>

        <div className="space-y-4 text-xs">
          {/* Custom Name Section */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-bold block">Leader Display Name</label>
              {user.isGuest && (
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                  <span>🔒 Locked for Guests</span>
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                disabled={user.isGuest}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={18}
                placeholder={user.isGuest ? 'Sign in to customize' : 'Enter your name'}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {user.isGuest ? (
                <button
                  onClick={onOpenAuth}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-black rounded-xl hover:scale-105 transition-transform cursor-pointer whitespace-nowrap"
                >
                  Sign In to Edit
                </button>
              ) : (
                <button
                  onClick={handleSaveName}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Update
                </button>
              )}
            </div>

            {nameError && <p className="text-rose-400 text-[11px] mt-1">{nameError}</p>}
          </div>

          {/* Quick Character Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-bold">Select Character Base</label>
              <button
                onClick={() => {
                  onClose();
                  onOpenShop();
                }}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-bold underline cursor-pointer"
              >
                View all 32 in Shop 🛍️
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {CHARACTERS_ROSTER.slice(0, 12).map((char) => {
                const isSelected = user.selectedCharacterId === char.id;
                const isUnlocked = user.unlockedCharacterIds.includes(char.id);

                return (
                  <button
                    key={char.id}
                    onClick={() => {
                      if (isUnlocked) selectCharacter(char.id);
                      else onOpenShop();
                    }}
                    className={`p-2 rounded-xl border transition-all text-center flex flex-col items-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400'
                        : isUnlocked
                        ? 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        : 'bg-slate-950/40 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <DancerSprite character={char} size={36} isDancing={false} />
                    <span className="text-[10px] text-white truncate max-w-full font-semibold mt-1">
                      {char.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hat / Accessory Style */}
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Party Hat / Accessory</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(
                [
                  'sombrero',
                  'feathers',
                  'party_hat',
                  'disco_afro',
                  'flower_lei',
                  'chef_hat',
                  'sunglasses',
                  'carnival_mask',
                  'crown',
                  'viking_horns',
                  'neon_visor',
                  'astronaut_helmet',
                ] as HatStyle[]
              ).map((h) => {
                const isSelected = user.selectedHat === h;
                const isUnlocked = user.unlockedHats.includes(h);

                return (
                  <button
                    key={h}
                    onClick={() => {
                      if (isUnlocked) selectHat(h);
                      else onOpenShop();
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border capitalize transition-all cursor-pointer text-center text-[11px] font-bold ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : isUnlocked
                        ? 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                        : 'bg-slate-950/40 text-slate-500 border-slate-800/40'
                    }`}
                  >
                    {h.replace('_', ' ')} {!isUnlocked && '🔒'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shirt Color Palette */}
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Carnival Shirt Color</label>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => selectShirtColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    user.selectedShirtColor === c ? 'scale-125 border-white shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              handleSaveName();
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-black text-xs rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Save & Dance! 💃
          </button>
        </div>
      </div>
    </div>
  );
};
