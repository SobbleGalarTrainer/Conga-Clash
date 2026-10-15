import { DailyStreakData } from '../types/game';

export interface StreakDayReward {
  day: number;
  baseCoins: number;
  multiplier: number;
  title: string;
  subtitle: string;
  icon: string;
  perk: string;
}

export const STREAK_DAY_REWARDS: StreakDayReward[] = [
  {
    day: 1,
    baseCoins: 50,
    multiplier: 1.0,
    title: 'Salsa Starter',
    subtitle: 'Kick off your carnival journey',
    icon: '🪇',
    perk: '1.0x Coin Multiplier',
  },
  {
    day: 2,
    baseCoins: 100,
    multiplier: 1.25,
    title: 'Samba Stride',
    subtitle: 'Feel the carnival rhythm',
    icon: '🥁',
    perk: '+25% Coins on All Duels & Modes',
  },
  {
    day: 3,
    baseCoins: 175,
    multiplier: 1.5,
    title: 'Merengue Momentum',
    subtitle: 'The crowd is cheering for you',
    icon: '💃',
    perk: '+50% Coins on All Duels & Modes',
  },
  {
    day: 4,
    baseCoins: 250,
    multiplier: 1.75,
    title: 'Carnival Cadence',
    subtitle: 'Brass section playing your tune',
    icon: '🎺',
    perk: '+75% Coins on All Duels & Modes',
  },
  {
    day: 5,
    baseCoins: 350,
    multiplier: 2.0,
    title: 'Disco Dynamo',
    subtitle: 'DOUBLE COINS unlocked!',
    icon: '🪩',
    perk: '2.0x DOUBLE COINS on Everything!',
  },
  {
    day: 6,
    baseCoins: 500,
    multiplier: 2.25,
    title: 'Calypso Comet',
    subtitle: 'Supercharged conga frenzy',
    icon: '🔥',
    perk: '2.25x Coins on All Duels & Modes',
  },
  {
    day: 7,
    baseCoins: 800,
    multiplier: 2.5,
    title: 'Fiesta Crown Champion',
    subtitle: 'Grand Carnival Mastery streak!',
    icon: '👑',
    perk: '2.5x MAXIMUM COIN MULTIPLIER + Crown Bonus',
  },
];

/** Return multiplier based on streak count */
export function getStreakMultiplier(streak: number): number {
  if (streak <= 1) return 1.0;
  if (streak === 2) return 1.25;
  if (streak === 3) return 1.5;
  if (streak === 4) return 1.75;
  if (streak === 5) return 2.0;
  if (streak === 6) return 2.25;
  return 2.5; // Day 7+ max
}

/** Get local date string YYYY-MM-DD */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Days difference between two YYYY-MM-DD dates */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/** Evaluate or initialize streak data based on today's date */
export function evaluateStreak(existing?: DailyStreakData | null): DailyStreakData {
  const today = getLocalDateString();

  if (!existing || !existing.lastPlayedDate) {
    return {
      currentStreak: 1,
      highestStreak: 1,
      lastPlayedDate: today,
      claimedToday: false,
      multiplier: 1.0,
      totalDaysClaimed: 0,
    };
  }

  const daysDiff = getDaysDifference(existing.lastPlayedDate, today);

  if (daysDiff === 0) {
    // Same day: streak is intact
    return {
      ...existing,
      multiplier: getStreakMultiplier(existing.currentStreak),
    };
  } else if (daysDiff === 1) {
    // Consecutive day: advance streak!
    const nextStreak = existing.currentStreak + 1;
    return {
      currentStreak: nextStreak,
      highestStreak: Math.max(existing.highestStreak, nextStreak),
      lastPlayedDate: today,
      claimedToday: false,
      multiplier: getStreakMultiplier(nextStreak),
      totalDaysClaimed: existing.totalDaysClaimed || 0,
    };
  } else {
    // Missed one or more days: reset to Day 1
    return {
      currentStreak: 1,
      highestStreak: existing.highestStreak || 1,
      lastPlayedDate: today,
      claimedToday: false,
      multiplier: 1.0,
      totalDaysClaimed: existing.totalDaysClaimed || 0,
    };
  }
}
