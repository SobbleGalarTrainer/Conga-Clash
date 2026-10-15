import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserAccount,
  DailyMission,
  FriendUser,
  ChatMessage,
  LeaderboardEntry,
  HatStyle,
  Character,
  DailyStreakData,
  FriendRequest,
  RegisteredDancer,
  MapId,
  GameMap,
} from '../types/game';
import { CHARACTERS_ROSTER, DEFAULT_PLAYER_LEADER } from '../data/characters';
import { INITIAL_DAILY_MISSIONS } from '../data/missions';
import { evaluateStreak, STREAK_DAY_REWARDS } from '../data/dailyStreak';
import { ALL_16_MAPS, DEFAULT_MAP_ID, getMapById } from '../data/maps';
import { audioSystem } from '../utils/audio';

export interface AuthContextType {
  user: UserAccount;
  currentLeader: Character;
  setCurrentLeader: (c: Character) => void;
  
  // Sign Up & Sign In
  signUpWithCustomId: (nickname: string, customUserId: string, email?: string, password?: string) => { success: boolean; message: string };
  loginWithCustomId: (userIdOrEmail: string, password?: string) => { success: boolean; message: string };
  loginWithGoogle: (email?: string, name?: string) => void;
  loginWithMicrosoft: (email?: string, name?: string) => void;
  logoutToGuest: () => void;
  updateCustomName: (name: string) => boolean;
  updateNickname: (name: string) => boolean;

  // Currency & Shop
  addCoins: (amount: number, reason?: string) => void;
  spendCoins: (amount: number) => boolean;
  buyCharacter: (characterId: string, cost: number) => boolean;
  buyHat: (hat: HatStyle, cost: number) => boolean;
  buyEmote: (emoteId: string, cost: number) => boolean;
  selectHat: (hat: HatStyle) => void;
  selectShirtColor: (color: string) => void;
  selectCharacter: (characterId: string) => void;
  
  // Missions
  dailyMissions: DailyMission[];
  incrementMissionProgress: (category: DailyMission['category'], amount?: number) => void;
  claimMissionReward: (missionId: string) => boolean;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  recordHighScore: (score: number, metricLabel: string) => void;
  
  // Friends, Social & Requests
  friends: FriendUser[];
  registeredUsers: RegisteredDancer[];
  friendRequests: FriendRequest[];
  sendFriendRequest: (targetUserId: string) => { success: boolean; message: string };
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  cancelOutgoingRequest: (requestId: string) => void;
  removeFriend: (id: string) => void;
  addFriend: (nameOrId: string) => boolean;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  
  // Daily Streak & Multiplier
  dailyStreak: DailyStreakData;
  streakMultiplier: number;
  claimDailyStreakReward: () => { coins: number; multiplier: number; day: number } | null;

  // 16 Maps System
  selectedMapId: MapId;
  setSelectedMapId: (id: MapId) => void;
  currentMap: GameMap;

  // UI Trigger Modals
  showAuthPrompt: boolean;
  setShowAuthPrompt: (val: boolean) => void;
  authPromptReason: string;
  triggerAuthPrompt: (reason: string) => void;
}

const STORAGE_KEY_USER = 'conga_user_account_v2';
const STORAGE_KEY_MISSIONS = 'conga_daily_missions_v2';
const STORAGE_KEY_LEADERBOARD = 'conga_leaderboard_v2';
const STORAGE_KEY_FRIENDS = 'conga_friends_v2';
const STORAGE_KEY_REQUESTS = 'conga_friend_requests_v2';
const STORAGE_KEY_REGISTERED_USERS = 'conga_registered_users_v2';
const STORAGE_KEY_MAP = 'conga_selected_map_v2';
const STORAGE_KEY_CHAT = 'conga_chat_v2';
const STORAGE_KEY_STREAK = 'conga_daily_streak_v2';

function generateGuestId(): string {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `GuestUser${randNum}`;
}

export function generateCustomUserIdSuggestion(prefix = 'CONGA'): string {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `#${prefix}-${randNum}`;
}

const INITIAL_REGISTERED_USERS: RegisteredDancer[] = [
  { id: '#CONGA-SOFIA', displayName: 'Salsa Sofia', character: CHARACTERS_ROSTER[1] || DEFAULT_PLAYER_LEADER, congaScore: 48, status: 'online' },
  { id: '#CONGA-DAVE', displayName: 'Disco Dave', character: CHARACTERS_ROSTER[2] || DEFAULT_PLAYER_LEADER, congaScore: 55, status: 'in_conga' },
  { id: '#CONGA-BOB', displayName: 'Beatbox Bob', character: CHARACTERS_ROSTER[9] || DEFAULT_PLAYER_LEADER, congaScore: 24, status: 'offline' },
  { id: '#CONGA-CRUZ', displayName: 'Captain Cruz', character: CHARACTERS_ROSTER[13] || DEFAULT_PLAYER_LEADER, congaScore: 42, status: 'online' },
  { id: '#CONGA-GLORIA', displayName: 'Golden Gloria', character: CHARACTERS_ROSTER[27] || DEFAULT_PLAYER_LEADER, congaScore: 68, status: 'online' },
  { id: '#CONGA-REY', displayName: 'El Rey del Conga', character: CHARACTERS_ROSTER[7] || DEFAULT_PLAYER_LEADER, congaScore: 84, status: 'in_conga' },
  { id: '#CONGA-CYNDI', displayName: 'Cyber Cyndi', character: CHARACTERS_ROSTER[12] || DEFAULT_PLAYER_LEADER, congaScore: 36, status: 'online' },
  { id: '#BREBEUF-LEO', displayName: 'Brebeuf Bull Leo', character: CHARACTERS_ROSTER[16] || DEFAULT_PLAYER_LEADER, congaScore: 50, status: 'online' },
  { id: '#TORONTO-MAYOR', displayName: 'City Hall Maestro', character: CHARACTERS_ROSTER[6] || DEFAULT_PLAYER_LEADER, congaScore: 62, status: 'online' },
  { id: '#WHITEHOUSE-VIP', displayName: 'Diplomat Dan', character: CHARACTERS_ROSTER[5] || DEFAULT_PLAYER_LEADER, congaScore: 39, status: 'offline' },
  { id: '#AIRPORT-ACE', displayName: 'Captain Cloud', character: CHARACTERS_ROSTER[15] || DEFAULT_PLAYER_LEADER, congaScore: 45, status: 'online' },
  { id: '#HINUNDAYAN-ISLA', displayName: 'Leyte Bamboo Dancer', character: CHARACTERS_ROSTER[3] || DEFAULT_PLAYER_LEADER, congaScore: 58, status: 'online' },
  { id: '#MANILA-JEEPNEY', displayName: 'Manila Fiesta Queen', character: CHARACTERS_ROSTER[4] || DEFAULT_PLAYER_LEADER, congaScore: 61, status: 'in_conga' },
  { id: '#SF-GOLDEN', displayName: 'Golden Gate Bopper', character: CHARACTERS_ROSTER[8] || DEFAULT_PLAYER_LEADER, congaScore: 47, status: 'online' },
  { id: '#LONDON-LORD', displayName: 'Big Ben Beatmaker', character: CHARACTERS_ROSTER[14] || DEFAULT_PLAYER_LEADER, congaScore: 53, status: 'online' },
  { id: '#PARIS-PIERRE', displayName: 'Bistro Accordionist', character: CHARACTERS_ROSTER[10] || DEFAULT_PLAYER_LEADER, congaScore: 49, status: 'online' },
  { id: '#MOSCOW-MAX', displayName: 'Tsar of the Conga', character: CHARACTERS_ROSTER[11] || DEFAULT_PLAYER_LEADER, congaScore: 71, status: 'in_conga' },
  { id: '#BEIJING-DRAGON', displayName: 'Imperial Drummer', character: CHARACTERS_ROSTER[17] || DEFAULT_PLAYER_LEADER, congaScore: 75, status: 'online' },
];

const INITIAL_FRIENDS: FriendUser[] = [
  {
    id: '#CONGA-SOFIA',
    displayName: 'Salsa Sofia',
    character: CHARACTERS_ROSTER[1] || DEFAULT_PLAYER_LEADER,
    status: 'online',
    congaScore: 48,
    lastSeen: 'In 100P Royale',
  },
  {
    id: '#CONGA-DAVE',
    displayName: 'Disco Dave',
    character: CHARACTERS_ROSTER[2] || DEFAULT_PLAYER_LEADER,
    status: 'in_conga',
    congaScore: 55,
    lastSeen: 'Leading Funk Train',
  },
  {
    id: '#CONGA-BOB',
    displayName: 'Beatbox Bob',
    character: CHARACTERS_ROSTER[9] || DEFAULT_PLAYER_LEADER,
    status: 'offline',
    congaScore: 24,
    lastSeen: '2 hours ago',
  },
];

const INITIAL_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'req_init_gloria',
    senderId: '#CONGA-GLORIA',
    senderDisplayName: 'Golden Gloria',
    senderCharacter: CHARACTERS_ROSTER[27] || DEFAULT_PLAYER_LEADER,
    targetId: 'me',
    status: 'pending',
    timestamp: Date.now() - 360000,
    direction: 'incoming',
  },
];

const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    playerId: '#CONGA-REY',
    playerName: 'El Rey del Conga',
    character: CHARACTERS_ROSTER[7] || DEFAULT_PLAYER_LEADER,
    score: 84,
    metricLabel: 'Dancers Conga Line',
    date: 'Today',
  },
  {
    rank: 2,
    playerId: '#CONGA-GLORIA',
    playerName: 'Golden Gloria',
    character: CHARACTERS_ROSTER[27] || DEFAULT_PLAYER_LEADER,
    score: 68,
    metricLabel: 'Dancers Conga Line',
    date: 'Yesterday',
  },
  {
    rank: 3,
    playerId: '#CONGA-DAVE',
    playerName: 'Disco Dave',
    character: CHARACTERS_ROSTER[2] || DEFAULT_PLAYER_LEADER,
    score: 55,
    metricLabel: 'Dancers Conga Line',
    date: '2 days ago',
  },
  {
    rank: 4,
    playerId: '#CONGA-CRUZ',
    playerName: 'Captain Cruz',
    character: CHARACTERS_ROSTER[13] || DEFAULT_PLAYER_LEADER,
    score: 42,
    metricLabel: 'Dancers Conga Line',
    date: '3 days ago',
  },
  {
    rank: 5,
    playerId: '#CONGA-CYNDI',
    playerName: 'Cyber Cyndi',
    character: CHARACTERS_ROSTER[12] || DEFAULT_PLAYER_LEADER,
    score: 36,
    metricLabel: 'Dancers Conga Line',
    date: '4 days ago',
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'msg_1',
    senderId: '#CONGA-SOFIA',
    senderName: 'Salsa Sofia',
    isGuest: false,
    text: 'Bienvenido al Conga Carnival! Link behind me if you dare! 💃',
    timestamp: Date.now() - 300000,
    isFriend: true,
  },
  {
    id: 'msg_2',
    senderId: '#CONGA-DAVE',
    senderName: 'Disco Dave',
    isGuest: false,
    text: 'Watch out for my scissors blitz under the mirror ball! 🪩',
    timestamp: Date.now() - 180000,
    isFriend: true,
  },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // User Account State
  const [user, setUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load user account:', e);
    }
    const guestName = generateGuestId();
    return {
      id: `guest_${Date.now()}`,
      isGuest: true,
      provider: 'guest',
      displayName: guestName,
      coins: 0,
      unlockedCharacterIds: [
        'player_leader', 'samba_sam', 'salsa_sofia', 'disco_dave',
        'maraca_maya', 'calypso_carl', 'chef_papito', 'rhythm_rita',
        'bongo_bruno', 'hula_hana'
      ],
      unlockedHats: ['sombrero', 'party_hat', 'feathers', 'flower_lei', 'sunglasses'],
      unlockedEmotes: ['emote_maraca', 'emote_clap'],
      selectedCharacterId: 'player_leader',
      selectedHat: 'sombrero',
      selectedShirtColor: '#f97316',
    };
  });

  // Registered Users Directory
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredDancer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REGISTERED_USERS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_REGISTERED_USERS;
  });

  // Friend Requests State
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_FRIEND_REQUESTS;
  });

  // Selected Map State (All 16 Maps supported)
  const [selectedMapId, setSelectedMapIdState] = useState<MapId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAP) as MapId;
      if (saved && ALL_16_MAPS.some((m) => m.id === saved)) return saved;
    } catch {
      // fallback
    }
    return DEFAULT_MAP_ID;
  });

  const setSelectedMapId = (id: MapId) => {
    setSelectedMapIdState(id);
    localStorage.setItem(STORAGE_KEY_MAP, id);
    audioSystem.playChime();
  };

  const currentMap = getMapById(selectedMapId);

  // Current Character Representation
  const [currentLeader, setCurrentLeaderState] = useState<Character>(() => {
    const base = CHARACTERS_ROSTER.find((c) => c.id === user.selectedCharacterId) || DEFAULT_PLAYER_LEADER;
    return {
      ...base,
      name: user.displayName,
      hat: user.selectedHat,
      shirtColor: user.selectedShirtColor,
    };
  });

  // Daily Missions
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MISSIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_DAILY_MISSIONS;
  });

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_LEADERBOARD;
  });

  // Friends
  const [friends, setFriends] = useState<FriendUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FRIENDS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_FRIENDS;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHAT);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_CHAT;
  });

  // Daily Streak State
  const [dailyStreak, setDailyStreak] = useState<DailyStreakData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STREAK);
      if (saved) return evaluateStreak(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load daily streak:', e);
    }
    return evaluateStreak(null);
  });

  // Auth Prompt Modal
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState('');

  const triggerAuthPrompt = (reason: string) => {
    setAuthPromptReason(reason);
    setShowAuthPrompt(true);
  };

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MISSIONS, JSON.stringify(dailyMissions));
  }, [dailyMissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(friendRequests));
  }, [friendRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REGISTERED_USERS, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STREAK, JSON.stringify(dailyStreak));
  }, [dailyStreak]);

  // Keep leader synced with user selections
  useEffect(() => {
    const base = CHARACTERS_ROSTER.find((c) => c.id === user.selectedCharacterId) || DEFAULT_PLAYER_LEADER;
    setCurrentLeaderState({
      ...base,
      name: user.displayName,
      hat: user.selectedHat,
      shirtColor: user.selectedShirtColor,
    });
  }, [user.selectedCharacterId, user.selectedHat, user.selectedShirtColor, user.displayName]);

  // ----------------------------------------------------
  // Sign Up & Sign In Logic
  // ----------------------------------------------------

  /**
   * Dedicated Sign Up System:
   * Sets a permanent, immutable Custom User ID (which cannot be changed)
   * while allowing the user's NickName to be freely edited anytime.
   */
  const signUpWithCustomId = (
    nickname: string,
    customUserId: string,
    email?: string,
    _password?: string
  ): { success: boolean; message: string } => {
    const cleanNick = nickname.trim().slice(0, 18);
    let cleanId = customUserId.trim().toUpperCase();

    if (!cleanNick) {
      return { success: false, message: 'Please provide a valid NickName (1-18 characters).' };
    }
    if (!cleanId) {
      return { success: false, message: 'Please provide a Custom User ID.' };
    }

    if (!cleanId.startsWith('#')) {
      cleanId = `#${cleanId}`;
    }

    // Check if ID is already claimed in the registered users directory
    const existing = registeredUsers.find(
      (u) => u.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (existing) {
      return { success: false, message: `User ID "${cleanId}" is already taken! Please choose another.` };
    }

    const defaultEmail = email?.trim() || `${cleanNick.toLowerCase().replace(/\s+/g, '')}@carnival.play`;

    const newUser: UserAccount = {
      ...user,
      id: cleanId,
      customUserId: cleanId, // PERMANENT: Cannot be changed!
      isGuest: false,
      provider: 'google', // Registered account
      displayName: cleanNick, // Editable NickName
      email: defaultEmail,
      coins: Math.max(500, user.coins + 500), // Sign Up Welcome Bonus!
    };

    // Register user so other dancers can find and friend them
    const newRegDancer: RegisteredDancer = {
      id: cleanId,
      displayName: cleanNick,
      character: currentLeader,
      isBot: false,
      congaScore: 10,
      status: 'online',
    };

    setUser(newUser);
    setRegisteredUsers((prev) => [newRegDancer, ...prev]);
    setShowAuthPrompt(false);
    audioSystem.playFanfare();

    return {
      success: true,
      message: `Account created successfully! Your permanent User ID is ${cleanId}.`,
    };
  };

  const loginWithCustomId = (
    userIdOrEmail: string,
    _password?: string
  ): { success: boolean; message: string } => {
    const term = userIdOrEmail.trim().toLowerCase();
    if (!term) return { success: false, message: 'Please enter your User ID or email.' };

    const match = registeredUsers.find(
      (u) => u.id.toLowerCase() === term || u.id.toLowerCase() === `#${term}` || u.displayName.toLowerCase() === term
    );

    if (match) {
      setUser((prev) => ({
        ...prev,
        id: match.id,
        customUserId: match.id,
        isGuest: false,
        displayName: match.displayName,
        coins: Math.max(250, prev.coins),
      }));
      setShowAuthPrompt(false);
      audioSystem.playCoinChime();
      return { success: true, message: `Welcome back, ${match.displayName}!` };
    }

    return { success: false, message: 'User ID not found in registry. Please check your ID or Sign Up.' };
  };

  const loginWithGoogle = (email?: string, name?: string) => {
    const defaultEmail = email || 'dancer@gmail.com';
    const chosenName = name || defaultEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const generatedPermanentId = generateCustomUserIdSuggestion('GOOGLE');

    setUser((prev) => ({
      ...prev,
      id: prev.customUserId || generatedPermanentId,
      customUserId: prev.customUserId || generatedPermanentId,
      isGuest: false,
      provider: 'google',
      displayName: chosenName,
      email: defaultEmail,
      coins: prev.isGuest ? Math.max(500, prev.coins + 500) : prev.coins,
    }));

    // Ensure registered
    const regId = user.customUserId || generatedPermanentId;
    if (!registeredUsers.some((u) => u.id === regId)) {
      setRegisteredUsers((prev) => [
        { id: regId, displayName: chosenName, character: currentLeader, status: 'online', congaScore: 25 },
        ...prev,
      ]);
    }

    setShowAuthPrompt(false);
    audioSystem.playCoinChime();
  };

  const loginWithMicrosoft = (email?: string, name?: string) => {
    const defaultEmail = email || 'dancer@outlook.com';
    const chosenName = name || defaultEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const generatedPermanentId = generateCustomUserIdSuggestion('MS');

    setUser((prev) => ({
      ...prev,
      id: prev.customUserId || generatedPermanentId,
      customUserId: prev.customUserId || generatedPermanentId,
      isGuest: false,
      provider: 'microsoft',
      displayName: chosenName,
      email: defaultEmail,
      coins: prev.isGuest ? Math.max(500, prev.coins + 500) : prev.coins,
    }));

    const regId = user.customUserId || generatedPermanentId;
    if (!registeredUsers.some((u) => u.id === regId)) {
      setRegisteredUsers((prev) => [
        { id: regId, displayName: chosenName, character: currentLeader, status: 'online', congaScore: 25 },
        ...prev,
      ]);
    }

    setShowAuthPrompt(false);
    audioSystem.playCoinChime();
  };

  const logoutToGuest = () => {
    const guestName = generateGuestId();
    setUser((prev) => ({
      ...prev,
      id: `guest_${Date.now()}`,
      customUserId: undefined,
      isGuest: true,
      provider: 'guest',
      displayName: guestName,
      email: undefined,
      coins: 0,
    }));
  };

  /**
   * User can freely change NickName anytime!
   * Notice: Custom User ID remains unchanged!
   */
  const updateNickname = (name: string): boolean => {
    const clean = name.trim().slice(0, 18);
    if (!clean) return false;
    setUser((prev) => ({ ...prev, displayName: clean }));

    // Also update in registeredUsers if present
    if (user.customUserId) {
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === user.customUserId ? { ...u, displayName: clean } : u))
      );
    }
    audioSystem.playPop();
    return true;
  };

  const updateCustomName = updateNickname;

  // Currency & Shop
  const addCoins = (amount: number, _reason?: string) => {
    if (user.isGuest) {
      return;
    }
    const mult = dailyStreak.multiplier || 1.0;
    const multipliedAmount = Math.max(1, Math.round(amount * mult));
    setUser((prev) => ({ ...prev, coins: prev.coins + multipliedAmount }));
    audioSystem.playCoinChime();
  };

  const claimDailyStreakReward = (): { coins: number; multiplier: number; day: number } | null => {
    if (dailyStreak.claimedToday) return null;
    const dayCycle = ((dailyStreak.currentStreak - 1) % 7) + 1;
    const rewardConfig = STREAK_DAY_REWARDS.find((r) => r.day === dayCycle) || STREAK_DAY_REWARDS[0];
    const mult = dailyStreak.multiplier || 1.0;
    const coinsAwarded = Math.round(rewardConfig.baseCoins * mult);

    setDailyStreak((prev) => ({
      ...prev,
      claimedToday: true,
      totalDaysClaimed: (prev.totalDaysClaimed || 0) + 1,
    }));

    if (!user.isGuest) {
      setUser((prev) => ({ ...prev, coins: prev.coins + coinsAwarded }));
    }
    audioSystem.playFanfare();
    return { coins: coinsAwarded, multiplier: mult, day: dayCycle };
  };

  const spendCoins = (amount: number): boolean => {
    if (user.isGuest) {
      triggerAuthPrompt('Sign in or Sign up to use Carnival Coins & the Shop!');
      return false;
    }
    if (user.coins < amount) {
      return false;
    }
    setUser((prev) => ({ ...prev, coins: prev.coins - amount }));
    return true;
  };

  const buyCharacter = (characterId: string, cost: number): boolean => {
    if (user.isGuest) {
      triggerAuthPrompt('Sign in or Sign up to unlock new characters in the Shop!');
      return false;
    }
    if (user.unlockedCharacterIds.includes(characterId)) return true;
    if (spendCoins(cost)) {
      setUser((prev) => ({
        ...prev,
        unlockedCharacterIds: [...prev.unlockedCharacterIds, characterId],
        selectedCharacterId: characterId,
      }));
      audioSystem.playFanfare();
      return true;
    }
    return false;
  };

  const buyHat = (hat: HatStyle, cost: number): boolean => {
    if (user.isGuest) {
      triggerAuthPrompt('Sign in or Sign up to unlock custom accessories!');
      return false;
    }
    if (user.unlockedHats.includes(hat)) return true;
    if (spendCoins(cost)) {
      setUser((prev) => ({
        ...prev,
        unlockedHats: [...prev.unlockedHats, hat],
        selectedHat: hat,
      }));
      audioSystem.playFanfare();
      return true;
    }
    return false;
  };

  const buyEmote = (emoteId: string, cost: number): boolean => {
    if (user.isGuest) {
      triggerAuthPrompt('Sign in or Sign up to unlock festive emotes!');
      return false;
    }
    if (user.unlockedEmotes.includes(emoteId)) return true;
    if (spendCoins(cost)) {
      setUser((prev) => ({
        ...prev,
        unlockedEmotes: [...prev.unlockedEmotes, emoteId],
      }));
      audioSystem.playFanfare();
      return true;
    }
    return false;
  };

  const selectHat = (hat: HatStyle) => {
    setUser((prev) => ({ ...prev, selectedHat: hat }));
  };

  const selectShirtColor = (color: string) => {
    setUser((prev) => ({ ...prev, selectedShirtColor: color }));
  };

  const selectCharacter = (characterId: string) => {
    setUser((prev) => ({ ...prev, selectedCharacterId: characterId }));
  };

  const setCurrentLeader = (c: Character) => {
    setCurrentLeaderState(c);
  };

  // Daily Missions Progression
  const incrementMissionProgress = (category: DailyMission['category'], amount = 1) => {
    setDailyMissions((prev) =>
      prev.map((m) => {
        if (m.category === category && !m.isClaimed) {
          const nextCount = Math.min(m.targetCount, m.currentCount + amount);
          return { ...m, currentCount: nextCount };
        }
        return m;
      })
    );
  };

  const claimMissionReward = (missionId: string): boolean => {
    if (user.isGuest) {
      triggerAuthPrompt('Sign in or Sign up to claim Daily Mission coin rewards!');
      return false;
    }
    const mission = dailyMissions.find((m) => m.id === missionId);
    if (!mission || mission.isClaimed || mission.currentCount < mission.targetCount) {
      return false;
    }
    setDailyMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, isClaimed: true } : m))
    );
    addCoins(mission.rewardCoins, `Mission Reward: ${mission.title}`);
    return true;
  };

  // Leaderboard Recording
  const recordHighScore = (score: number, metricLabel: string) => {
    setLeaderboard((prev) => {
      const myId = user.customUserId || user.id;
      const existingUserIdx = prev.findIndex((e) => e.playerId === myId);
      let updated = [...prev];
      if (existingUserIdx >= 0) {
        if (score > updated[existingUserIdx].score) {
          updated[existingUserIdx] = {
            ...updated[existingUserIdx],
            score,
            playerName: user.displayName,
            character: currentLeader,
            date: 'Just now',
          };
        }
      } else {
        updated.push({
          rank: 0,
          playerId: myId,
          playerName: user.displayName,
          isCurrentUser: true,
          character: currentLeader,
          score,
          metricLabel,
          date: 'Just now',
        });
      }
      updated.sort((a, b) => b.score - a.score);
      return updated.slice(0, 20).map((item, idx) => ({
        ...item,
        rank: idx + 1,
        isCurrentUser: item.playerId === myId,
      }));
    });
  };

  // ----------------------------------------------------
  // Working Friend Request System
  // ----------------------------------------------------

  /**
   * If the user's ID does NOT exist, you CANNOT friend them (returns failure).
   * If they have a valid User ID, it sends them a Friend Request!
   */
  const sendFriendRequest = (targetUserId: string): { success: boolean; message: string } => {
    const rawId = targetUserId.trim();
    if (!rawId) {
      return { success: false, message: 'Please enter a valid Dancer User ID.' };
    }

    const cleanId = rawId.startsWith('#') ? rawId.toUpperCase() : `#${rawId.toUpperCase()}`;
    const myId = (user.customUserId || user.id).toUpperCase();

    // Check if sending to yourself
    if (cleanId === myId || rawId.toLowerCase() === user.displayName.toLowerCase()) {
      return { success: false, message: 'You cannot send a friend request to yourself!' };
    }

    // Check if already friends
    const isAlreadyFriend = friends.some(
      (f) => f.id.toUpperCase() === cleanId || f.displayName.toLowerCase() === rawId.toLowerCase()
    );
    if (isAlreadyFriend) {
      return { success: false, message: 'You are already friends with this dancer!' };
    }

    // Check if request is already pending
    const isAlreadyPending = friendRequests.some(
      (r) => (r.targetId.toUpperCase() === cleanId || r.senderId.toUpperCase() === cleanId) && r.status === 'pending'
    );
    if (isAlreadyPending) {
      return { success: false, message: 'Friend request is already pending!' };
    }

    // Check if target User ID exists in registered users directory
    const targetUser = registeredUsers.find(
      (u) => u.id.toUpperCase() === cleanId || u.displayName.toLowerCase() === rawId.toLowerCase()
    );

    // CRITICAL REQUIREMENT: "if the user's id doesnt exist. Then you cant friend them"
    if (!targetUser) {
      return {
        success: false,
        message: `User ID "${rawId}" does not exist in the Carnival network! You cannot friend non-existent users.`,
      };
    }

    // CRITICAL REQUIREMENT: "but if they have a User ID and you friend them, then it sends them a friend request."
    const newRequest: FriendRequest = {
      id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: myId,
      senderDisplayName: user.displayName,
      senderCharacter: currentLeader,
      targetId: targetUser.id,
      targetDisplayName: targetUser.displayName,
      status: 'pending',
      timestamp: Date.now(),
      direction: 'outgoing',
    };

    setFriendRequests((prev) => [newRequest, ...prev]);
    audioSystem.playChime();

    // Simulate active dancer responding and accepting the friend request after 3 seconds
    setTimeout(() => {
      setFriendRequests((prev) =>
        prev.map((r) => (r.id === newRequest.id ? { ...r, status: 'accepted' } : r))
      );

      // Add to friends list!
      setFriends((prev) => {
        if (prev.some((f) => f.id === targetUser.id)) return prev;
        const acceptedFriend: FriendUser = {
          id: targetUser.id,
          displayName: targetUser.displayName,
          character: targetUser.character,
          status: 'online',
          congaScore: targetUser.congaScore || 35,
          lastSeen: 'Just connected with you!',
        };
        return [acceptedFriend, ...prev];
      });

      audioSystem.playFanfare();
    }, 3200);

    return {
      success: true,
      message: `Friend request sent to ${targetUser.displayName} (${targetUser.id})! Awaiting response...`,
    };
  };

  const acceptFriendRequest = (requestId: string) => {
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;

    // Add sender to friends
    const newFriend: FriendUser = {
      id: req.senderId,
      displayName: req.senderDisplayName,
      character: req.senderCharacter,
      status: 'online',
      congaScore: 40,
      lastSeen: 'Online in Ballroom',
    };

    setFriends((prev) => [newFriend, ...prev.filter((f) => f.id !== req.senderId)]);
    setFriendRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'accepted' } : r))
    );
    audioSystem.playFanfare();
  };

  const declineFriendRequest = (requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    audioSystem.playPop();
  };

  const cancelOutgoingRequest = (requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    audioSystem.playPop();
  };

  const addFriend = (nameOrId: string): boolean => {
    const res = sendFriendRequest(nameOrId);
    return res.success;
  };

  const removeFriend = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    audioSystem.playPop();
  };

  const sendChatMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: user.customUserId || user.id,
      senderName: user.displayName,
      isGuest: user.isGuest,
      text: trimmed,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev.slice(-49), msg]);
    incrementMissionProgress('social', 1);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentLeader,
        setCurrentLeader,
        signUpWithCustomId,
        loginWithCustomId,
        loginWithGoogle,
        loginWithMicrosoft,
        logoutToGuest,
        updateCustomName,
        updateNickname,
        addCoins,
        spendCoins,
        buyCharacter,
        buyHat,
        buyEmote,
        selectHat,
        selectShirtColor,
        selectCharacter,
        dailyMissions,
        incrementMissionProgress,
        claimMissionReward,
        leaderboard,
        recordHighScore,
        friends,
        registeredUsers,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        cancelOutgoingRequest,
        removeFriend,
        addFriend,
        chatMessages,
        sendChatMessage,
        dailyStreak,
        streakMultiplier: dailyStreak.multiplier || 1.0,
        claimDailyStreakReward,
        selectedMapId,
        setSelectedMapId,
        currentMap,
        showAuthPrompt,
        setShowAuthPrompt,
        authPromptReason,
        triggerAuthPrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
