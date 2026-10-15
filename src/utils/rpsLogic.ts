import { Character, DuelResult, Move } from '../types/game';

export const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export function getDuelResult(playerMove: Move, opponentMove: Move): DuelResult {
  if (playerMove === opponentMove) return 'tie';
  if (
    (playerMove === 'rock' && opponentMove === 'scissors') ||
    (playerMove === 'scissors' && opponentMove === 'paper') ||
    (playerMove === 'paper' && opponentMove === 'rock')
  ) {
    return 'win';
  }
  return 'lose';
}

export function getOutcomeExplanation(winnerMove: Move, loserMove: Move): string {
  if (winnerMove === 'rock' && loserMove === 'scissors') return 'Rock crushes Scissors!';
  if (winnerMove === 'scissors' && loserMove === 'paper') return 'Scissors slice Paper!';
  if (winnerMove === 'paper' && loserMove === 'rock') return 'Paper wraps Rock!';
  return "It's a draw!";
}

/**
 * Predicts or chooses opponent move based on their personality and match history
 */
export function getOpponentMove(
  opponent: Character,
  playerMoveHistory: Move[] = [],
  lastOpponentMove?: Move
): Move {
  const rand = Math.random();

  switch (opponent.personality) {
    case 'rock_heavy':
      // 60% rock, 20% scissors, 20% paper
      if (rand < 0.6) return 'rock';
      return rand < 0.8 ? 'scissors' : 'paper';

    case 'paper_tactician':
      // Looks at player's most frequent move and counters it
      if (playerMoveHistory.length > 0) {
        const counts = { rock: 0, paper: 0, scissors: 0 };
        playerMoveHistory.forEach((m) => counts[m]++);
        let mostFrequent: Move = 'rock';
        if (counts.paper > counts[mostFrequent]) mostFrequent = 'paper';
        if (counts.scissors > counts[mostFrequent]) mostFrequent = 'scissors';

        // 60% chance to counter player's favorite move
        if (rand < 0.6) {
          if (mostFrequent === 'rock') return 'paper';
          if (mostFrequent === 'paper') return 'scissors';
          if (mostFrequent === 'scissors') return 'rock';
        }
      }
      return rand < 0.5 ? 'paper' : rand < 0.75 ? 'scissors' : 'rock';

    case 'scissors_blitz':
      // 55% scissors, 25% rock, 20% paper
      if (rand < 0.55) return 'scissors';
      return rand < 0.8 ? 'rock' : 'paper';

    case 'mimic':
      // Copies the player's last move with 70% probability
      if (playerMoveHistory.length > 0 && rand < 0.7) {
        return playerMoveHistory[playerMoveHistory.length - 1];
      }
      return MOVES[Math.floor(Math.random() * MOVES.length)];

    case 'balanced':
    default:
      return MOVES[Math.floor(Math.random() * MOVES.length)];
  }
}

/**
 * For the 'Disco Shades' powerup: returns the predicted move or top 2 probable moves
 */
export function getPsychicHint(opponent: Character, playerHistory: Move[]): Move {
  return getOpponentMove(opponent, playerHistory);
}
