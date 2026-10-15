import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CHARACTERS_ROSTER } from '../data/characters';
import { SHOP_HATS, SHOP_EMOTES } from '../data/shopItems';
import { Character, HatStyle } from '../types/game';
import { DancerSprite } from './DancerSprite';

interface ShopModalProps {
  onClose: () => void;
  onOpenAuth: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, onOpenAuth }) => {
  const {
    user,
    buyCharacter,
    buyHat,
    buyEmote,
    selectCharacter,
    selectHat,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'characters' | 'hats' | 'emotes'>('characters');
  const [selectedCharacterPreview, setSelectedCharacterPreview] = useState<Character>(
    () => CHARACTERS_ROSTER.find((c) => c.id === user.selectedCharacterId) || CHARACTERS_ROSTER[0]
  );
  const [purchaseFeedback, setPurchaseFeedback] = useState<string | null>(null);

  const handleBuyChar = (char: Character) => {
    if (user.isGuest) {
      onOpenAuth();
      return;
    }
    const cost = char.cost ?? (char.rarity === 'legendary' ? 800 : char.rarity === 'epic' ? 500 : 250);
    const success = buyCharacter(char.id, cost);
    if (success) {
      setPurchaseFeedback(`Unlocked ${char.name}!`);
      setTimeout(() => setPurchaseFeedback(null), 2500);
    } else {
      setPurchaseFeedback('Not enough Carnival Coins! Complete Daily Missions or play duels to earn more.');
      setTimeout(() => setPurchaseFeedback(null), 3000);
    }
  };

  const handleBuyHat = (hat: HatStyle, cost: number, name: string) => {
    if (user.isGuest) {
      onOpenAuth();
      return;
    }
    const success = buyHat(hat, cost);
    if (success) {
      setPurchaseFeedback(`Equipped ${name}!`);
      setTimeout(() => setPurchaseFeedback(null), 2500);
    } else {
      setPurchaseFeedback('Not enough Carnival Coins! Complete Daily Missions or play duels to earn more.');
      setTimeout(() => setPurchaseFeedback(null), 3000);
    }
  };

  const handleBuyEmote = (emoteId: string, cost: number, name: string) => {
    if (user.isGuest) {
      onOpenAuth();
      return;
    }
    const success = buyEmote(emoteId, cost);
    if (success) {
      setPurchaseFeedback(`Unlocked emote: ${name}!`);
      setTimeout(() => setPurchaseFeedback(null), 2500);
    } else {
      setPurchaseFeedback('Not enough Carnival Coins! Complete Daily Missions or play duels to earn more.');
      setTimeout(() => setPurchaseFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛍️</span>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white">Carnival Shop</h2>
              <p className="text-xs text-slate-400">
                Unlock 32 festive characters, 3D accessories, and party emotes with Carnival Coins!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Wallet pill */}
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-base">🪙</span>
              <div className="text-left">
                <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-bold leading-none">
                  Coins
                </span>
                <span className="font-display font-black text-amber-400 text-sm sm:text-base tabular-nums leading-none">
                  {user.coins}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Guest Lock Banner */}
        {user.isGuest && (
          <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/60 to-purple-950/70 border-b border-amber-500/30 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="text-lg">🔒</span>
              <div>
                <strong className="text-amber-400 font-bold">Guest Mode Active ({user.displayName}): </strong>
                Sign in with Google or Microsoft to unlock Carnival Coins, keep purchases, and equip 32 characters!
              </div>
            </div>
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-black text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Log In / Sign Up →
            </button>
          </div>
        )}

        {/* Feedback alert */}
        {purchaseFeedback && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 text-center text-xs text-emerald-300 font-bold animate-pulse">
            {purchaseFeedback}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-900/60 text-xs font-bold">
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'characters'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>💃</span>
            <span>32 Characters ({CHARACTERS_ROSTER.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('hats')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hats'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>👒</span>
            <span>Accessories & Hats ({SHOP_HATS.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('emotes')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'emotes'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🎭</span>
            <span>Emotes ({SHOP_EMOTES.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {/* TAB 1: 32 CHARACTERS */}
          {activeTab === 'characters' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left 2 Cols: Character Grid */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CHARACTERS_ROSTER.map((char) => {
                  const isUnlocked = user.unlockedCharacterIds.includes(char.id);
                  const isEquipped = user.selectedCharacterId === char.id;
                  const cost = char.cost ?? (char.rarity === 'legendary' ? 800 : char.rarity === 'epic' ? 500 : 250);

                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedCharacterPreview(char)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                        selectedCharacterPreview.id === char.id
                          ? 'bg-slate-800 border-amber-400 shadow-lg scale-[1.02]'
                          : isEquipped
                          ? 'bg-amber-950/20 border-amber-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Rarity tag */}
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                        <span
                          className={`${
                            char.rarity === 'legendary'
                              ? 'text-amber-400'
                              : char.rarity === 'epic'
                              ? 'text-purple-400'
                              : char.rarity === 'rare'
                              ? 'text-cyan-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {char.rarity || 'common'}
                        </span>
                        {isEquipped && (
                          <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-black">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {/* Sprite Preview */}
                      <div className="flex justify-center my-2">
                        <DancerSprite character={char} size={64} isDancing={false} />
                      </div>

                      <div>
                        <h4 className="font-display font-bold text-xs text-white truncate">{char.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{char.title}</p>
                      </div>

                      {/* Status / Purchase Button */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                        {isUnlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectCharacter(char.id);
                            }}
                            className={`w-full py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              isEquipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isEquipped ? 'Equipped' : 'Equip'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuyChar(char);
                            }}
                            className="w-full py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-xs rounded-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>🪙</span>
                            <span>{cost}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Col: Character Detail Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center justify-between">
                <div className="w-full flex flex-col items-center">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-3 ${
                      selectedCharacterPreview.rarity === 'legendary'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : selectedCharacterPreview.rarity === 'epic'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : selectedCharacterPreview.rarity === 'rare'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {selectedCharacterPreview.rarity || 'common'} Roster
                  </span>

                  <DancerSprite character={selectedCharacterPreview} size={110} isDancing={true} isLeader={true} />

                  <h3 className="font-display font-black text-xl text-white mt-3">{selectedCharacterPreview.name}</h3>
                  <span className="text-xs text-amber-400 font-semibold">{selectedCharacterPreview.title}</span>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed px-2">
                    {selectedCharacterPreview.bio}
                  </p>

                  <div className="w-full bg-slate-900 rounded-xl p-3 mt-4 text-xs space-y-1.5 text-left border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dance Style:</span>
                      <span className="text-white font-medium">{selectedCharacterPreview.danceStyle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hat / Style:</span>
                      <span className="text-amber-400 font-medium capitalize">
                        {selectedCharacterPreview.hat.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quote:</span>
                      <span className="text-slate-300 italic truncate max-w-[180px]">
                        "{selectedCharacterPreview.quote}"
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full mt-5">
                  {user.unlockedCharacterIds.includes(selectedCharacterPreview.id) ? (
                    <button
                      onClick={() => selectCharacter(selectedCharacterPreview.id)}
                      className={`w-full py-2.5 rounded-xl font-display font-black text-xs transition-colors cursor-pointer ${
                        user.selectedCharacterId === selectedCharacterPreview.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                      }`}
                    >
                      {user.selectedCharacterId === selectedCharacterPreview.id
                        ? '✓ Currently Selected Leader'
                        : 'Select as Your Conga Leader'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyChar(selectedCharacterPreview)}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-black text-xs rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Unlock with</span>
                      <span>🪙 {selectedCharacterPreview.cost || 250} Coins</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESSORIES & HATS */}
          {activeTab === 'hats' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {SHOP_HATS.map((hatItem) => {
                const hatStyle = hatItem.hatStyle as HatStyle;
                const isUnlocked = user.unlockedHats.includes(hatStyle);
                const isEquipped = user.selectedHat === hatStyle;

                return (
                  <div
                    key={hatItem.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-amber-950/20 border-amber-500/50'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-2">
                        <span
                          className={`${
                            hatItem.rarity === 'legendary'
                              ? 'text-amber-400'
                              : hatItem.rarity === 'epic'
                              ? 'text-purple-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {hatItem.rarity}
                        </span>
                        {isEquipped && (
                          <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-black">
                            EQUIPPED
                          </span>
                        )}
                      </div>

                      <div className="text-4xl text-center my-3">{hatItem.icon}</div>
                      <h4 className="font-display font-bold text-sm text-white">{hatItem.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                        {hatItem.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800">
                      {isUnlocked ? (
                        <button
                          onClick={() => selectHat(hatStyle)}
                          className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isEquipped
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip Hat'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyHat(hatStyle, hatItem.cost, hatItem.name)}
                          className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-xs rounded-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>🪙</span>
                          <span>{hatItem.cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: EMOTES */}
          {activeTab === 'emotes' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {SHOP_EMOTES.map((emote) => {
                const isUnlocked = user.unlockedEmotes.includes(emote.id);

                return (
                  <div
                    key={emote.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-[10px] uppercase font-bold text-purple-400 mb-2">{emote.rarity}</div>
                      <div className="text-4xl text-center my-3">{emote.icon}</div>
                      <h4 className="font-display font-bold text-sm text-white">{emote.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">{emote.description}</p>
                      {emote.emoteData && (
                        <div className="mt-2 text-[10px] bg-slate-900 px-2 py-1 rounded text-amber-400 italic">
                          "{emote.emoteData.text}"
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800">
                      {isUnlocked ? (
                        <span className="w-full block py-1.5 rounded-lg text-center text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          ✓ Unlocked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyEmote(emote.id, emote.cost, emote.name)}
                          className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-xs rounded-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>🪙</span>
                          <span>{emote.cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
