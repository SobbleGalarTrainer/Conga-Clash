export type Move = 'rock' | 'paper' | 'scissors';

export type DuelResult = 'win' | 'lose' | 'tie';

export type HatStyle = 
  | 'sombrero'
  | 'feathers'
  | 'party_hat'
  | 'disco_afro'
  | 'flower_lei'
  | 'chef_hat'
  | 'sunglasses'
  | 'carnival_mask'
  | 'crown'
  | 'headband'
  | 'viking_horns'
  | 'pirate_tricorn'
  | 'astronaut_helmet'
  | 'cat_ears'
  | 'neon_visor'
  | 'wizard_hat'
  | 'golden_halo'
  | 'steampunk_goggles';

export type CharacterRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Character {
  id: string;
  name: string;
  title: string;
  hat: HatStyle;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  skinTone: string;
  accessoryColor: string;
  personality: 'rock_heavy' | 'paper_tactician' | 'scissors_blitz' | 'balanced' | 'mimic' | 'random';
  bio: string;
  quote: string;
  danceStyle: string;
  rarity?: CharacterRarity;
  cost?: number; // 0 if unlocked by default
}

export type AuthProvider = 'google' | 'microsoft' | 'guest';

export interface DailyStreakData {
  currentStreak: number;
  highestStreak: number;
  lastPlayedDate: string; // YYYY-MM-DD
  claimedToday: boolean;
  multiplier: number; // e.g. 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5
  totalDaysClaimed: number;
}

export interface UserAccount {
  id: string;
  customUserId?: string; // Permanent Custom User ID created during Sign Up (cannot be changed)
  isGuest: boolean;
  provider: AuthProvider;
  displayName: string; // NickName (can be changed anytime)
  email?: string;
  avatarUrl?: string;
  coins: number;
  unlockedCharacterIds: string[];
  unlockedHats: HatStyle[];
  unlockedEmotes: string[];
  selectedCharacterId: string;
  selectedHat: HatStyle;
  selectedShirtColor: string;
  dailyStreak?: DailyStreakData;
}

export interface ShopItem {
  id: string;
  type: 'character' | 'hat' | 'emote';
  name: string;
  description: string;
  cost: number;
  rarity: CharacterRarity;
  icon: string;
  hatStyle?: HatStyle;
  characterId?: string;
  emoteData?: { emoji: string; text: string };
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardCoins: number;
  isClaimed: boolean;
  category: 'duels' | 'recruits' | 'royale' | 'social';
}

export interface FriendUser {
  id: string; // User ID
  displayName: string; // Nickname
  character: Character;
  status: 'online' | 'in_conga' | 'offline';
  congaScore: number;
  lastSeen: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderDisplayName: string;
  senderCharacter: Character;
  targetId: string;
  targetDisplayName?: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: number;
  direction: 'incoming' | 'outgoing';
}

export interface RegisteredDancer {
  id: string; // Permanent Custom User ID
  displayName: string; // Nickname
  character: Character;
  isBot?: boolean;
  congaScore?: number;
  status?: 'online' | 'in_conga' | 'offline';
}

export type MapId =
  | 'the_park'
  | 'the_gym'
  | 'toronto_city_hall'
  | 'the_white_house'
  | 'the_airport'
  | 'brebeuf_college_school'
  | '6000_yonge_street'
  | 'an_amusement_park'
  | 'the_island'
  | 'london'
  | 'paris'
  | 'moscow'
  | 'beijing'
  | 'hinundayan'
  | 'manila'
  | 'san_francisco';

export interface GameMap {
  id: MapId;
  name: string;
  subtitle: string;
  location: string;
  icon: string;
  tag: string;
  skyColor: number;
  skyColorHex: string;
  groundColorHex: string;
  accentColorHex: string;
  floorType: string;
  landmarks: { name: string; x: number; z: number; icon?: string }[];
  description: string;
  featuredCenterpiece: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  isGuest: boolean;
  text: string;
  timestamp: number;
  isFriend?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  isCurrentUser?: boolean;
  character: Character;
  score: number;
  metricLabel: string;
  date: string;
}


export type PowerUpType = 'fever' | 'glasses' | 'magnet' | 'speed';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  label: string;
  durationMs: number;
  expiresAt: number;
}

export interface ArenaDancer {
  id: string;
  character: Character;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetX: number;
  targetY: number;
  state: 'idle' | 'dancing' | 'wandering';
}

export interface ArenaRivalTrain {
  id: string;
  leader: Character;
  followers: Character[];
  x: number;
  y: number;
  angle: number;
  speed: number;
  trail: { x: number; y: number; angle: number }[];
  targetX: number;
  targetY: number;
  color: string;
}

export type GameMode = 
  | 'MULTIPLAYER_2D'
  | 'MULTIPLAYER_3D'
  | 'SOLO_2D'
  | 'SOLO_3D'
  | 'ROYALE_2D'
  | 'ROYALE_3D'
  | 'ARENA'
  | 'GAUNTLET'
  | 'VERSUS'
  | 'MULTIPLAYER'
  | 'BATTLE_ROYALE'
  | 'THREE_ARENA';

export type GameState = 'MENU' | 'PLAYING' | 'DUEL' | 'ROUND_WIN' | 'VICTORY' | 'GAME_OVER' | 'SPECTATING';

export interface GameStats {
  longestConga: number;
  totalRecruits: number;
  duelsWon: number;
  duelsLost: number;
  duelsTied: number;
  carnivalTrophies: string[];
  battleRoyaleWins: number;
  bestPlacement: number;
}

export interface BattleRoyaleParticipant {
  id: string;
  name: string;
  character: Character;
  isHuman: boolean;
  isAlive: boolean; // True if still leading a line; False if absorbed as follower
  absorbedBy: string | null; // ID of the leader whose train they are dancing in
  followers: Character[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  trail: { x: number; y: number }[];
  kills: number;
  placement: number | null;
  personality: 'rock_heavy' | 'paper_tactician' | 'scissors_blitz' | 'balanced' | 'mimic' | 'random';
  shield: boolean; // Chug Jug shield protects from 1 loss
  speedBoostExpires: number;
}

export interface StormCircle {
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  phase: number;
  timer: number;
  isShrinking: boolean;
}

export interface EliminationFeedItem {
  id: string;
  winnerName: string;
  loserName: string;
  absorbedCount: number;
  timestamp: number;
  remainingCount: number;
}

// --- Multiplayer Types ---

export interface MultiplayerPlayer {
  id: string;
  name: string;
  hat: HatStyle;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  skinTone: string;
  x: number;
  y: number;
  angle: number;
  followers: Character[];
  inDuelId: string | null;
  isFollowerOf: string | null;
  trail: { x: number; y: number }[];
  lastActive: number;
  activeEmote?: { emoji: string; text: string; expiresAt: number } | null;
}

export interface MultiplayerDuel {
  id: string;
  type: 'pvp' | 'pve';
  player1Id: string;
  player2Id?: string;
  opponentCharacter: Character;
  p1Choice: Move | null;
  p2Choice: Move | null;
  status: 'countdown' | 'revealed' | 'complete';
  winnerId?: string | 'tie';
  explanation?: string;
  countdown: number;
  expiresAt: number;
}

export interface RoomFeedEvent {
  id: string;
  text: string;
  type: 'recruit' | 'duel' | 'join' | 'leave' | 'emote';
  timestamp: number;
}

export interface MultiplayerRoomState {
  roomId: string;
  players: Record<string, MultiplayerPlayer>;
  roamingDancers: {
    id: string;
    character: Character;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }[];
  powerUps: PowerUp[];
  activeDuels: Record<string, MultiplayerDuel>;
  events: RoomFeedEvent[];
}

export type ClientToServerMsg =
  | { type: 'join'; roomId: string; player: Omit<MultiplayerPlayer, 'id' | 'followers' | 'inDuelId' | 'isFollowerOf' | 'trail' | 'lastActive'> }
  | { type: 'move'; x: number; y: number; angle: number; trail: { x: number; y: number }[] }
  | { type: 'duel:init_pve'; dancerId: string }
  | { type: 'duel:init_pvp'; targetPlayerId: string }
  | { type: 'duel:submit_move'; duelId: string; move: Move }
  | { type: 'pickup_powerup'; powerUpId: string }
  | { type: 'send_emote'; emoji: string; text: string }
  | { type: 'break_free' }
  | { type: 'chat'; text: string; senderName?: string }; // in-game chat

export type ServerToClientMsg =
  | { type: 'init'; yourId: string; state: MultiplayerRoomState }
  | { type: 'state_sync'; players: Record<string, MultiplayerPlayer>; roamingDancers: MultiplayerRoomState['roamingDancers']; powerUps: PowerUp[] }
  | { type: 'player_joined'; player: MultiplayerPlayer; event: RoomFeedEvent }
  | { type: 'player_left'; playerId: string; event: RoomFeedEvent }
  | { type: 'player_moved'; playerId: string; x: number; y: number; angle: number; trail: { x: number; y: number }[] }
  | { type: 'duel_started'; duel: MultiplayerDuel }
  | { type: 'duel_progress'; duel: MultiplayerDuel }
  | { type: 'duel_resolved'; duel: MultiplayerDuel; event: RoomFeedEvent; updatedPlayers: Record<string, MultiplayerPlayer> }
  | { type: 'event_feed'; event: RoomFeedEvent }
  | { type: 'player_emote'; playerId: string; emote: { emoji: string; text: string; expiresAt: number } }
  | { type: 'chat_message'; message: { id: string; senderId: string; senderName: string; text: string; timestamp: number } };

