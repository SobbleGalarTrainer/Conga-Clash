import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Character,
  PowerUp,
  PowerUpType,
  DuelResult,
} from '../types/game';
import { CHARACTERS_ROSTER, INITIAL_RIVALS } from '../data/characters';
import { DancerSprite } from './DancerSprite';
import { RPSDuelModal } from './RPSDuelModal';
import { audioSystem, soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';

interface ArenaModeProps {
  playerLeader: Character;
  onUpdateStats: (recruits: number, won: boolean, tied: boolean) => void;
  onBackToMenu: () => void;
}

interface RivalTrainState {
  id: string;
  name: string;
  leader: Character;
  followers: Character[];
  color: string;
  x: number;
  y: number;
  angle: number;
  trail: { x: number; y: number }[];
  vx: number;
  vy: number;
}

interface RoamingDancerState {
  id: string;
  character: Character;
  x: number;
  y: number;
  vx: number;
  vy: number;
  danceAngle: number;
}

export const ArenaMode: React.FC<ArenaModeProps> = ({
  playerLeader,
  onUpdateStats,
  onBackToMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [followers, setFollowers] = useState<Character[]>([]);
  const [activeDuel, setActiveDuel] = useState<{
    opponent: Character;
    opponentFollowers: Character[];
    rivalTrainId?: string;
    roamingDancerId?: string;
  } | null>(null);

  const [activePowerUp, setActivePowerUp] = useState<{
    type: PowerUpType;
    expiresAt: number;
  } | null>(null);

  const [isVictory, setIsVictory] = useState(false);
  const [targetRecruits] = useState(10); // Reach 10 followers for grand carnival victory!

  // Internal mutable state for 60fps loop
  const gameStateRef = useRef({
    player: {
      x: 450,
      y: 300,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 3.2,
      trail: [] as { x: number; y: number }[],
    },
    rivals: [] as RivalTrainState[],
    roamingDancers: [] as RoamingDancerState[],
    powerUps: [] as PowerUp[],
    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
    },
    touchJoystick: {
      active: false,
      dx: 0,
      dy: 0,
    },
    arenaWidth: 960,
    arenaHeight: 640,
    beatCounter: 0,
    lastPowerUpSpawn: Date.now(),
    inDuel: false,
  });

  // Initialize Arena World
  const initWorld = useCallback(() => {
    const s = gameStateRef.current;
    s.player.x = 480;
    s.player.y = 320;
    s.player.trail = [];
    s.inDuel = false;
    setFollowers([]);
    setIsVictory(false);
    setActiveDuel(null);

    // Setup initial rivals
    s.rivals = INITIAL_RIVALS.map((r, i) => {
      const startPositions = [
        { x: 180, y: 150, angle: 0 },
        { x: 780, y: 150, angle: Math.PI },
        { x: 480, y: 520, angle: -Math.PI / 2 },
      ];
      const pos = startPositions[i % startPositions.length];
      return {
        id: `rival_${r.leader.id}`,
        name: r.name,
        leader: r.leader,
        followers: [...r.followers],
        color: r.color,
        x: pos.x,
        y: pos.y,
        angle: pos.angle,
        trail: [],
        vx: Math.cos(pos.angle) * 2.2,
        vy: Math.sin(pos.angle) * 2.2,
      };
    });

    // Setup roaming single dancers from unused roster
    const usedIds = new Set<string>();
    usedIds.add(playerLeader.id);
    s.rivals.forEach((r) => {
      usedIds.add(r.leader.id);
      r.followers.forEach((f) => usedIds.add(f.id));
    });

    const availableCharacters = CHARACTERS_ROSTER.filter((c) => !usedIds.has(c.id));
    s.roamingDancers = availableCharacters.map((char) => ({
      id: `roamer_${char.id}`,
      character: char,
      x: 100 + Math.random() * (s.arenaWidth - 200),
      y: 100 + Math.random() * (s.arenaHeight - 200),
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      danceAngle: Math.random() * Math.PI * 2,
    }));

    // Initial power-up
    s.powerUps = [
      {
        id: 'pu_init_1',
        type: 'fever',
        x: 300,
        y: 250,
        label: 'Golden Maracas (Fever)',
        durationMs: 12000,
        expiresAt: Date.now() + 30000,
      },
    ];
  }, [playerLeader]);

  useEffect(() => {
    initWorld();
  }, [initWorld]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in gameStateRef.current.keys) {
        gameStateRef.current.keys[e.key as keyof typeof gameStateRef.current.keys] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in gameStateRef.current.keys) {
        gameStateRef.current.keys[e.key as keyof typeof gameStateRef.current.keys] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main 60fps Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const s = gameStateRef.current;

      if (!s.inDuel && !isVictory) {
        // --- 1. Player Movement & Speed Calculation ---
        let baseSpeed = 3.4;
        if (activePowerUp?.type === 'speed') baseSpeed = 5.2;

        let dx = 0;
        let dy = 0;
        if (s.keys.w || s.keys.ArrowUp) dy -= 1;
        if (s.keys.s || s.keys.ArrowDown) dy += 1;
        if (s.keys.a || s.keys.ArrowLeft) dx -= 1;
        if (s.keys.d || s.keys.ArrowRight) dx += 1;

        if (s.touchJoystick.active) {
          dx = s.touchJoystick.dx;
          dy = s.touchJoystick.dy;
        }

        const len = Math.hypot(dx, dy);
        if (len > 0.05) {
          const moveX = (dx / len) * baseSpeed;
          const moveY = (dy / len) * baseSpeed;
          s.player.x += moveX;
          s.player.y += moveY;
          s.player.angle = Math.atan2(moveY, moveX);

          // Record trail point if moved enough
          const lastPoint = s.player.trail[0];
          const distFromLast = lastPoint ? Math.hypot(s.player.x - lastPoint.x, s.player.y - lastPoint.y) : 999;
          if (distFromLast > 16) {
            s.player.trail.unshift({ x: s.player.x, y: s.player.y });
            // Cap trail history
            if (s.player.trail.length > 300) s.player.trail.pop();
          }
        }

        // Clamp player inside dance floor bounds
        s.player.x = Math.max(30, Math.min(s.arenaWidth - 30, s.player.x));
        s.player.y = Math.max(30, Math.min(s.arenaHeight - 30, s.player.y));

        // --- 2. Update Rivals AI & Trails ---
        s.rivals.forEach((rival) => {
          // Subtle wandering steer
          if (Math.random() < 0.03) {
            rival.angle += (Math.random() - 0.5) * 1.2;
            rival.vx = Math.cos(rival.angle) * 2.2;
            rival.vy = Math.sin(rival.angle) * 2.2;
          }

          rival.x += rival.vx;
          rival.y += rival.vy;

          // Bounce off arena walls
          if (rival.x < 40 || rival.x > s.arenaWidth - 40) {
            rival.vx *= -1;
            rival.angle = Math.atan2(rival.vy, rival.vx);
          }
          if (rival.y < 40 || rival.y > s.arenaHeight - 40) {
            rival.vy *= -1;
            rival.angle = Math.atan2(rival.vy, rival.vx);
          }

          const lastRivalPoint = rival.trail[0];
          const dist = lastRivalPoint ? Math.hypot(rival.x - lastRivalPoint.x, rival.y - lastRivalPoint.y) : 999;
          if (dist > 16) {
            rival.trail.unshift({ x: rival.x, y: rival.y });
            if (rival.trail.length > 200) rival.trail.pop();
          }
        });

        // --- 3. Update Roaming Dancers ---
        s.roamingDancers.forEach((dancer) => {
          dancer.x += dancer.vx;
          dancer.y += dancer.vy;
          dancer.danceAngle += 0.05;

          // If magnet is active, pull neutral dancers gently towards player!
          if (activePowerUp?.type === 'magnet') {
            const toPlayerX = s.player.x - dancer.x;
            const toPlayerY = s.player.y - dancer.y;
            const d = Math.hypot(toPlayerX, toPlayerY);
            if (d < 300 && d > 30) {
              dancer.x += (toPlayerX / d) * 1.8;
              dancer.y += (toPlayerY / d) * 1.8;
            }
          }

          if (dancer.x < 30 || dancer.x > s.arenaWidth - 30) dancer.vx *= -1;
          if (dancer.y < 30 || dancer.y > s.arenaHeight - 30) dancer.vy *= -1;
        });

        // --- 4. Spawn Power-ups ---
        if (Date.now() - s.lastPowerUpSpawn > 18000 && s.powerUps.length < 3) {
          s.lastPowerUpSpawn = Date.now();
          const types: PowerUpType[] = ['fever', 'glasses', 'magnet', 'speed'];
          const type = types[Math.floor(Math.random() * types.length)];
          const labels: Record<PowerUpType, string> = {
            fever: 'Golden Maracas (Fever)',
            glasses: 'Disco Shades (Hint)',
            magnet: 'Mirror Ball (Magnet)',
            speed: 'Salsa Spice (Turbo)',
          };
          s.powerUps.push({
            id: `pu_${Date.now()}`,
            type,
            x: 80 + Math.random() * (s.arenaWidth - 160),
            y: 80 + Math.random() * (s.arenaHeight - 160),
            label: labels[type],
            durationMs: 12000,
            expiresAt: Date.now() + 25000,
          });
        }

        // Clean expired powerups on floor
        s.powerUps = s.powerUps.filter((p) => p.expiresAt > Date.now());

        // Check powerup pickup
        s.powerUps.forEach((pu, idx) => {
          if (Math.hypot(s.player.x - pu.x, s.player.y - pu.y) < 32) {
            audioSystem.playPowerUpSound();
            setActivePowerUp({
              type: pu.type,
              expiresAt: Date.now() + pu.durationMs,
            });
            s.powerUps.splice(idx, 1);
          }
        });

        // Expire active powerup
        if (activePowerUp && activePowerUp.expiresAt <= Date.now()) {
          setActivePowerUp(null);
        }

        // --- 5. Collision Checks: Player meets Roaming Dancer ---
        for (let i = 0; i < s.roamingDancers.length; i++) {
          const dancer = s.roamingDancers[i];
          const dist = Math.hypot(s.player.x - dancer.x, s.player.y - dancer.y);
          if (dist < 34) {
            // Trigger RPS Duel!
            s.inDuel = true;
            setActiveDuel({
              opponent: dancer.character,
              opponentFollowers: [],
              roamingDancerId: dancer.id,
            });
            break;
          }
        }

        // --- 6. Collision Checks: Player meets Rival Conga Train Leader ---
        if (!s.inDuel) {
          for (let i = 0; i < s.rivals.length; i++) {
            const rival = s.rivals[i];
            const dist = Math.hypot(s.player.x - rival.x, s.player.y - rival.y);
            if (dist < 40) {
              s.inDuel = true;
              setActiveDuel({
                opponent: rival.leader,
                opponentFollowers: rival.followers,
                rivalTrainId: rival.id,
              });
              break;
            }
          }
        }
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, s.arenaWidth, s.arenaHeight);

      // 1. Dance Floor Parquet & Carnival Lighting
      ctx.fillStyle = '#140c06';
      ctx.fillRect(0, 0, s.arenaWidth, s.arenaHeight);

      // Wood plank pattern
      ctx.strokeStyle = 'rgba(255, 175, 50, 0.08)';
      ctx.lineWidth = 1;
      const tileSize = 48;
      for (let x = 0; x < s.arenaWidth; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s.arenaHeight);
        ctx.stroke();
      }
      for (let y = 0; y < s.arenaHeight; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s.arenaWidth, y);
        ctx.stroke();
      }

      // Moving party spotlights
      const timeSec = currentTime * 0.001;
      const spots = [
        { x: 300 + Math.sin(timeSec) * 150, y: 220 + Math.cos(timeSec * 0.8) * 90, color: 'rgba(236, 72, 153, 0.15)', r: 160 },
        { x: 650 + Math.cos(timeSec * 0.9) * 150, y: 380 + Math.sin(timeSec * 1.1) * 100, color: 'rgba(6, 182, 212, 0.15)', r: 180 },
        { x: 480 + Math.sin(timeSec * 1.2) * 180, y: 320 + Math.sin(timeSec * 0.7) * 120, color: 'rgba(245, 158, 11, 0.15)', r: 200 },
      ];
      spots.forEach((spot) => {
        const grad = ctx.createRadialGradient(spot.x, spot.y, 10, spot.x, spot.y, spot.r);
        grad.addColorStop(0, spot.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Power-Ups on Floor
      s.powerUps.forEach((pu) => {
        const bounce = Math.sin(currentTime * 0.006) * 4;
        ctx.save();
        ctx.translate(pu.x, pu.y + bounce);

        // Glow ring
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons: Record<PowerUpType, string> = {
          fever: '🪇',
          glasses: '🕶️',
          magnet: '🪩',
          speed: '🌶️',
        };
        ctx.fillText(icons[pu.type], 0, 0);

        ctx.font = '10px Outfit, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(pu.type.toUpperCase(), 0, 26);
        ctx.restore();
      });

      // 3. Draw Roaming Neutral Dancers
      s.roamingDancers.forEach((dancer) => {
        ctx.save();
        ctx.translate(dancer.x, dancer.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Grooving bob
        const bob = Math.sin(dancer.danceAngle) * 3;
        ctx.translate(0, bob);

        // Character circle base
        ctx.fillStyle = dancer.character.shirtColor;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Hat / Hair indicator
        ctx.fillStyle = dancer.character.skinTone;
        ctx.beginPath();
        ctx.arc(0, -2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Name tag
        ctx.font = '9px Outfit, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(dancer.character.name.split(' ')[0], 0, -18);

        // "Ready to Duel" icon
        ctx.font = '11px sans-serif';
        ctx.fillText('✊', 0, 2);

        ctx.restore();
      });

      // 4. Draw Rival Conga Trains
      s.rivals.forEach((rival) => {
        // Draw followers first
        rival.followers.forEach((f, idx) => {
          const trailIndex = (idx + 1) * 14;
          const pos = rival.trail[trailIndex] || { x: rival.x, y: rival.y };
          ctx.save();
          ctx.translate(pos.x, pos.y);

          // Connecting hands line to next dancer
          const nextPos = idx === 0 ? { x: rival.x, y: rival.y } : rival.trail[idx * 14] || pos;
          ctx.strokeStyle = rival.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(nextPos.x - pos.x, nextPos.y - pos.y);
          ctx.stroke();

          ctx.fillStyle = f.shirtColor;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        });

        // Rival Leader
        ctx.save();
        ctx.translate(rival.x, rival.y);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = rival.color;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', 0, -2);

        // Leader label
        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`${rival.leader.name} (${rival.followers.length + 1})`, 0, -22);

        ctx.restore();
      });

      // 5. Draw Player's Glorious Conga Line!
      // Draw followers from tail to head
      followers.forEach((f, idx) => {
        const trailIndex = (idx + 1) * 14;
        const pos = s.player.trail[trailIndex] || { x: s.player.x, y: s.player.y };
        const prevPos = idx === 0 ? { x: s.player.x, y: s.player.y } : s.player.trail[idx * 14] || pos;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Hands on hips connector line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(prevPos.x - pos.x, prevPos.y - pos.y);
        ctx.stroke();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kicking conga bob
        const followerBob = Math.sin(currentTime * 0.008 + idx * 0.4) * 3;
        ctx.translate(0, followerBob);

        // Dancer circle
        ctx.fillStyle = f.shirtColor;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Face
        ctx.fillStyle = f.skinTone;
        ctx.beginPath();
        ctx.arc(0, -2, 7, 0, Math.PI * 2);
        ctx.fill();

        // Name tag
        ctx.font = '9px Outfit, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(f.name.split(' ')[0], 0, -18);

        ctx.restore();
      });

      // Draw Player Leader
      ctx.save();
      ctx.translate(s.player.x, s.player.y);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 18, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Conga Fever aura if active
      if (activePowerUp?.type === 'fever') {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 24 + Math.sin(currentTime * 0.01) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Leader body
      ctx.fillStyle = playerLeader.shirtColor;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Head
      ctx.fillStyle = playerLeader.skinTone;
      ctx.beginPath();
      ctx.arc(0, -3, 9, 0, Math.PI * 2);
      ctx.fill();

      // Crown / Sombrero top mark
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', 0, -12);

      // Name & count banner
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`${playerLeader.name} (YOU · ${followers.length + 1})`, 0, -26);

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activePowerUp, followers, isVictory, playerLeader]);

  // Handle Duel Result
  const handleDuelComplete = (result: DuelResult, recruited: Character[]) => {
    gameStateRef.current.inDuel = false;
    const isWin = result === 'win';
    const isTie = result === 'tie';

    onUpdateStats(recruited.length, isWin, isTie);

    if (isWin) {
      // If conga fever is active, double recruit or add bonus dancer!
      let finalRecruits = [...recruited];
      if (activePowerUp?.type === 'fever') {
        // Add duplicate or bonus dancer
        const bonus = CHARACTERS_ROSTER[Math.floor(Math.random() * CHARACTERS_ROSTER.length)];
        finalRecruits.push({ ...bonus, id: `bonus_${Date.now()}` });
      }

      setFollowers((prev) => {
        const next = [...prev, ...finalRecruits];
        if (next.length >= targetRecruits) {
          setIsVictory(true);
          soundManager.playCrowdCheer(next.length + 1, 0, 1.25);
          try {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.5 },
            });
          } catch {
            // Ignore
          }
        }
        return next;
      });

      // Remove recruited dancers from the world
      if (activeDuel?.roamingDancerId) {
        gameStateRef.current.roamingDancers = gameStateRef.current.roamingDancers.filter(
          (d) => d.id !== activeDuel.roamingDancerId
        );
      }
      if (activeDuel?.rivalTrainId) {
        gameStateRef.current.rivals = gameStateRef.current.rivals.filter(
          (r) => r.id !== activeDuel.rivalTrainId
        );
      }
    } else if (result === 'lose') {
      // Defeat penalty: lose 1 follower if player has any
      setFollowers((prev) => {
        if (prev.length === 0) return prev;
        const lost = prev[prev.length - 1];
        // Released back to the floor!
        gameStateRef.current.roamingDancers.push({
          id: `released_${Date.now()}`,
          character: lost,
          x: gameStateRef.current.player.x + 40,
          y: gameStateRef.current.player.y + 40,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          danceAngle: 0,
        });
        return prev.slice(0, prev.length - 1);
      });
    }

    setActiveDuel(null);
  };

  // Touch virtual joystick handlers for mobile/tablets
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    gameStateRef.current.touchJoystick = {
      active: true,
      dx: dx / (rect.width / 2),
      dy: dy / (rect.height / 2),
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!gameStateRef.current.touchJoystick.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    gameStateRef.current.touchJoystick.dx = dx / (rect.width / 2);
    gameStateRef.current.touchJoystick.dy = dy / (rect.height / 2);
  };

  const handleTouchEnd = () => {
    gameStateRef.current.touchJoystick.active = false;
    gameStateRef.current.touchJoystick.dx = 0;
    gameStateRef.current.touchJoystick.dy = 0;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top HUD Bar */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 mb-3 shadow-lg">
        {/* Left: Conga Length Meter */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
            🪇
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Conga Line Size</div>
            <div className="font-display font-extrabold text-white text-lg tabular-nums">
              {followers.length + 1} / {targetRecruits + 1}{' '}
              <span className="text-xs font-normal text-amber-400 ml-1">
                ({targetRecruits - followers.length > 0 ? `${targetRecruits - followers.length} to Win` : 'Carnival Won!'})
              </span>
            </div>
          </div>
        </div>

        {/* Center: Power-up Status */}
        <div className="flex items-center gap-3">
          {activePowerUp ? (
            <div className="bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 animate-pulse">
              <span className="text-sm">
                {activePowerUp.type === 'fever' && '🪇'}
                {activePowerUp.type === 'glasses' && '🕶️'}
                {activePowerUp.type === 'magnet' && '🪩'}
                {activePowerUp.type === 'speed' && '🌶️'}
              </span>
              <span className="font-semibold uppercase tracking-wider">{activePowerUp.type} Active</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 hidden sm:block">
              Controls: <strong>WASD</strong> or <strong>Arrow Keys</strong> to move conga train
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={initWorld}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Reset Arena
          </button>
          <button
            onClick={onBackToMenu}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Main Dance Floor Arena Container */}
      <div className="relative w-full max-w-5xl aspect-[3/2] max-h-[640px] rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={960}
          height={640}
          className="w-full h-full object-contain block bg-dance-floor cursor-crosshair"
        />

        {/* Mobile / Touch On-Screen Controls */}
        <div className="md:hidden absolute bottom-4 left-4 z-20">
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-24 h-24 rounded-full bg-slate-800/80 border-2 border-amber-400/50 backdrop-blur-md flex items-center justify-center touch-none select-none shadow-xl active:bg-slate-700/80"
          >
            <div className="w-10 h-10 rounded-full bg-amber-400/80 pointer-events-none" />
          </div>
          <span className="text-[10px] text-slate-400 text-center block mt-1">Touch & Drag</span>
        </div>

        {/* Mobile Quick Direction Buttons for tablet/phone */}
        <div className="md:hidden absolute bottom-4 right-4 z-20 grid grid-cols-3 gap-1">
          <div />
          <button
            onTouchStart={() => (gameStateRef.current.keys.w = true)}
            onTouchEnd={() => (gameStateRef.current.keys.w = false)}
            className="w-10 h-10 bg-slate-800/90 text-white border border-slate-600 rounded-lg flex items-center justify-center font-bold text-lg active:bg-amber-500 active:text-slate-950"
          >
            ↑
          </button>
          <div />
          <button
            onTouchStart={() => (gameStateRef.current.keys.a = true)}
            onTouchEnd={() => (gameStateRef.current.keys.a = false)}
            className="w-10 h-10 bg-slate-800/90 text-white border border-slate-600 rounded-lg flex items-center justify-center font-bold text-lg active:bg-amber-500 active:text-slate-950"
          >
            ←
          </button>
          <button
            onTouchStart={() => (gameStateRef.current.keys.s = true)}
            onTouchEnd={() => (gameStateRef.current.keys.s = false)}
            className="w-10 h-10 bg-slate-800/90 text-white border border-slate-600 rounded-lg flex items-center justify-center font-bold text-lg active:bg-amber-500 active:text-slate-950"
          >
            ↓
          </button>
          <button
            onTouchStart={() => (gameStateRef.current.keys.d = true)}
            onTouchEnd={() => (gameStateRef.current.keys.d = false)}
            className="w-10 h-10 bg-slate-800/90 text-white border border-slate-600 rounded-lg flex items-center justify-center font-bold text-lg active:bg-amber-500 active:text-slate-950"
          >
            →
          </button>
        </div>
      </div>

      {/* Duel Modal Overlay when colliding */}
      {activeDuel && (
        <RPSDuelModal
          playerLeader={playerLeader}
          playerFollowerCount={followers.length}
          opponent={activeDuel.opponent}
          opponentFollowers={activeDuel.opponentFollowers}
          hasMirrorGlasses={activePowerUp?.type === 'glasses'}
          hasCongaFever={activePowerUp?.type === 'fever'}
          onDuelComplete={handleDuelComplete}
        />
      )}

      {/* Victory Celebration Modal */}
      {isVictory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-400 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95">
            <div className="text-5xl sm:text-6xl mb-3 animate-bounce">👑🎉</div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-amber-400 mb-2">
              CONGA CARNIVAL CHAMPION!
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              You built a legendary conga line of{' '}
              <strong className="text-white font-bold">{followers.length + 1} dancers</strong>!
              The entire carnival is dancing the 1-2-3-KICK behind your lead!
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={initWorld}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-sm sm:text-base cursor-pointer"
              >
                Dance Again!
              </button>
              <button
                onClick={onBackToMenu}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-display font-bold rounded-xl border border-slate-700 shadow-lg transition-transform hover:scale-105 active:scale-95 text-sm sm:text-base cursor-pointer"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
