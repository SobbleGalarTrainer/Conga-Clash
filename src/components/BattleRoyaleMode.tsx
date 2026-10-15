import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Character,
  Move,
  DuelResult,
  BattleRoyaleParticipant,
  StormCircle,
  EliminationFeedItem,
  HatStyle,
} from '../types/game';
import { CHARACTERS_ROSTER, DEFAULT_PLAYER_LEADER } from '../data/characters';
import { DancerSprite } from './DancerSprite';
import { audioSystem } from '../utils/audio';
import { getDuelResult, getOpponentMove, getOutcomeExplanation } from '../utils/rpsLogic';

interface BattleRoyaleModeProps {
  playerLeader: Character;
  onBackToMenu: () => void;
  onUpdateStats: (recruits: number, won: boolean, tied: boolean, placement?: number) => void;
}

const MOVE_ICONS: Record<Move, { emoji: string; name: string; key: string }> = {
  rock: { emoji: '✊', name: 'Rock', key: '1' },
  paper: { emoji: '✋', name: 'Paper', key: '2' },
  scissors: { emoji: '✌️', name: 'Scissors', key: '3' },
};

const LANDMARKS = [
  { name: 'Tilted Tambourines', x: 600, y: 600 },
  { name: 'Pleasant Parquet', x: 1800, y: 600 },
  { name: 'Salty Salsa Palms', x: 600, y: 1800 },
  { name: 'Boogie Ballroom', x: 1800, y: 1800 },
  { name: 'Carnival Center Stage', x: 1200, y: 1200 },
];

const BOT_NAMES = [
  'BoogieBrawler', 'CongaKing99', 'SalsaSniper', 'TiltedTango', 'MaracaMaster',
  'DiscoDestroyer', 'ChugJugCharlie', 'LlamaLover', 'VictoryVince', 'RhythmRider',
  'PaperPugilist', 'ScissorsSurgeon', 'RockRoller', 'CarnivalCrusher', 'FiestaFury',
  'SambaStriker', 'TambourineTitan', 'DropZoneDan', 'StormRunner', 'BushCamperBob',
  'ApexAfro', 'SombreroSammy', 'CrownCollector', 'GoldenGroover', 'BopBoss',
  'StepKickPro', 'LineLeaderLeo', 'FollowerFred', 'HipsHero', 'BeatDropper'
];

export const BattleRoyaleMode: React.FC<BattleRoyaleModeProps> = ({
  playerLeader,
  onBackToMenu,
  onUpdateStats,
}) => {
  // Lobby Setup
  const [totalPlayersChoice, setTotalPlayersChoice] = useState<100 | 150 | 256>(100);
  const [gameState, setGameState] = useState<'LOBBY' | 'DROPPING' | 'ALIVE' | 'SPECTATING' | 'VICTORY'>('LOBBY');

  // Live match state
  const [remainingCount, setRemainingCount] = useState<number>(100);
  const [myPlacement, setMyPlacement] = useState<number | null>(null);
  const [captorName, setCaptorName] = useState<string>('');
  const [eliminationFeed, setEliminationFeed] = useState<EliminationFeedItem[]>([]);
  const [spectatingTargetId, setSpectatingTargetId] = useState<string>('player');
  const [spectatorCheer, setSpectatorCheer] = useState<{ emoji: string; text: string; expiresAt: number } | null>(null);

  // Active RPS Duel state
  const [activeDuel, setActiveDuel] = useState<{
    opponent: BattleRoyaleParticipant;
    p1Choice: Move | null;
    p2Choice: Move | null;
    status: 'countdown' | 'revealed' | 'complete';
    result: DuelResult | null;
    countdown: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  // Big Island Dimensions
  const mapSize = 2400;

  // Mutable Game Loop Ref
  const worldRef = useRef({
    participants: [] as BattleRoyaleParticipant[],
    storm: {
      x: 1200,
      y: 1200,
      radius: 1100,
      targetRadius: 750,
      phase: 1,
      timer: 30, // seconds until next shrink
      isShrinking: false,
    } as StormCircle,
    camera: { x: 1200, y: 1200 },
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
    touchJoystick: { active: false, dx: 0, dy: 0 },
    inDuel: false,
    lastAiBattleTime: 0,
    spectateId: 'player',
  });

  // Generate 100-256 Participants
  const initMatch = useCallback((playerCount: 100 | 150 | 256) => {
    const list: BattleRoyaleParticipant[] = [];

    // 1. Human Player Leader
    list.push({
      id: 'player',
      name: playerLeader.name || 'Fiesta Felix',
      character: { ...playerLeader, id: 'player' },
      isHuman: true,
      isAlive: true,
      absorbedBy: null,
      followers: [],
      x: 1200 + (Math.random() - 0.5) * 400,
      y: 1200 + (Math.random() - 0.5) * 400,
      vx: 0,
      vy: 0,
      angle: 0,
      trail: [],
      kills: 0,
      placement: null,
      personality: 'balanced',
      shield: false,
      speedBoostExpires: 0,
    });

    const hats: HatStyle[] = [
      'sombrero', 'feathers', 'party_hat', 'disco_afro', 'flower_lei',
      'chef_hat', 'sunglasses', 'carnival_mask', 'crown', 'headband'
    ];
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
      '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16'
    ];
    const personalities = [
      'rock_heavy', 'paper_tactician', 'scissors_blitz', 'balanced', 'mimic', 'random'
    ] as const;

    // 2. Generate Bot Dancers to reach count
    for (let i = 1; i < playerCount; i++) {
      const baseName = BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? `_${i}` : '');
      const hat = hats[i % hats.length];
      const shirt = colors[i % colors.length];
      const personality = personalities[i % personalities.length];

      // Spawn inside island radius
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 950;
      const x = 1200 + Math.cos(angle) * dist;
      const y = 1200 + Math.sin(angle) * dist;

      list.push({
        id: `bot_${i}`,
        name: baseName,
        character: {
          id: `bot_${i}`,
          name: baseName,
          title: 'Battle Royale Dancer',
          hat,
          hairColor: '#1e1b4b',
          shirtColor: shirt,
          pantsColor: '#1e293b',
          skinTone: '#deb887',
          accessoryColor: '#facc15',
          personality,
          bio: 'Challenger for the #1 Conga Victory Royale.',
          quote: "I'll make you dance in my line!",
          danceStyle: 'Battle Stride',
        },
        isHuman: false,
        isAlive: true,
        absorbedBy: null,
        followers: [],
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        angle: Math.random() * Math.PI * 2,
        trail: [],
        kills: 0,
        placement: null,
        personality,
        shield: false,
        speedBoostExpires: 0,
      });
    }

    worldRef.current.participants = list;
    worldRef.current.storm = {
      x: 1200,
      y: 1200,
      radius: 1100,
      targetRadius: 750,
      phase: 1,
      timer: 30,
      isShrinking: false,
    };
    worldRef.current.spectateId = 'player';
    worldRef.current.inDuel = false;

    setRemainingCount(playerCount);
    setMyPlacement(null);
    setCaptorName('');
    setEliminationFeed([]);
    setActiveDuel(null);
    setSpectatingTargetId('player');
    setGameState('ALIVE');
    audioSystem.playWhistle();
  }, [playerLeader]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in worldRef.current.keys) {
        worldRef.current.keys[e.key as keyof typeof worldRef.current.keys] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in worldRef.current.keys) {
        worldRef.current.keys[e.key as keyof typeof worldRef.current.keys] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Storm countdown timer
  useEffect(() => {
    if (gameState !== 'ALIVE' && gameState !== 'SPECTATING') return;

    const interval = setInterval(() => {
      const storm = worldRef.current.storm;
      if (storm.timer > 0) {
        storm.timer -= 1;
      } else {
        // Trigger shrink
        storm.isShrinking = true;
        storm.timer = 25; // shrink duration
        storm.phase += 1;
        storm.targetRadius = Math.max(120, storm.radius - 220);
        // Slightly re-center storm circle towards random active leader
        const aliveLeaders = worldRef.current.participants.filter((p) => p.isAlive);
        if (aliveLeaders.length > 0) {
          const lucky = aliveLeaders[Math.floor(Math.random() * aliveLeaders.length)];
          storm.x = storm.x * 0.7 + lucky.x * 0.3;
          storm.y = storm.y * 0.7 + lucky.y * 0.3;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // 60FPS Main Game Simulation & Viewport Engine
  useEffect(() => {
    if (gameState === 'LOBBY') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const w = worldRef.current;
      const player = w.participants.find((p) => p.id === 'player');
      const isPlayerAlive = player && player.isAlive;

      // 1. Storm Shrink Animation
      if (w.storm.isShrinking) {
        w.storm.radius += (w.storm.targetRadius - w.storm.radius) * 0.005;
        if (Math.abs(w.storm.radius - w.storm.targetRadius) < 5) {
          w.storm.radius = w.storm.targetRadius;
          w.storm.isShrinking = false;
        }
      }

      // 2. Human Player Controls (if Alive and not in duel)
      if (isPlayerAlive && !w.inDuel) {
        let dx = 0;
        let dy = 0;
        if (w.keys.w || w.keys.ArrowUp) dy -= 1;
        if (w.keys.s || w.keys.ArrowDown) dy += 1;
        if (w.keys.a || w.keys.ArrowLeft) dx -= 1;
        if (w.keys.d || w.keys.ArrowRight) dx += 1;

        if (w.touchJoystick.active) {
          dx = w.touchJoystick.dx;
          dy = w.touchJoystick.dy;
        }

        const len = Math.hypot(dx, dy);
        if (len > 0.05) {
          const speed = 4.2;
          const moveX = (dx / len) * speed;
          const moveY = (dy / len) * speed;
          player.x += moveX;
          player.y += moveY;
          player.angle = Math.atan2(moveY, moveX);

          // Update trail
          const lastPoint = player.trail[0];
          const dist = lastPoint ? Math.hypot(player.x - lastPoint.x, player.y - lastPoint.y) : 999;
          if (dist > 16) {
            player.trail.unshift({ x: player.x, y: player.y });
            if (player.trail.length > 350) player.trail.pop();
          }
        }

        // Clamp to map bounds
        player.x = Math.max(50, Math.min(mapSize - 50, player.x));
        player.y = Math.max(50, Math.min(mapSize - 50, player.y));

        // Storm push on player if outside
        const distFromStorm = Math.hypot(player.x - w.storm.x, player.y - w.storm.y);
        if (distFromStorm > w.storm.radius) {
          // Push gently toward safe center
          const angleToCenter = Math.atan2(w.storm.y - player.y, w.storm.x - player.x);
          player.x += Math.cos(angleToCenter) * 1.5;
          player.y += Math.sin(angleToCenter) * 1.5;
        }
      }

      // 3. AI Dancers Simulation (Only active leaders move on their own)
      const aliveParticipants = w.participants.filter((p) => p.isAlive);

      aliveParticipants.forEach((bot) => {
        if (bot.isHuman) return;

        // Roam toward center or wander
        if (Math.random() < 0.02) {
          bot.angle += (Math.random() - 0.5) * 1.5;
        }

        // If outside storm, steer heavily inward
        const distFromCenter = Math.hypot(bot.x - w.storm.x, bot.y - w.storm.y);
        if (distFromCenter > w.storm.radius - 80) {
          const steerIn = Math.atan2(w.storm.y - bot.y, w.storm.x - bot.x);
          bot.angle = steerIn + (Math.random() - 0.5) * 0.5;
        }

        bot.vx = Math.cos(bot.angle) * 2.8;
        bot.vy = Math.sin(bot.angle) * 2.8;
        bot.x += bot.vx;
        bot.y += bot.vy;

        bot.x = Math.max(60, Math.min(mapSize - 60, bot.x));
        bot.y = Math.max(60, Math.min(mapSize - 60, bot.y));

        // Update trail for conga line followers
        const lastPt = bot.trail[0];
        const dist = lastPt ? Math.hypot(bot.x - lastPt.x, bot.y - lastPt.y) : 999;
        if (dist > 16) {
          bot.trail.unshift({ x: bot.x, y: bot.y });
          if (bot.trail.length > 350) bot.trail.pop();
        }
      });

      // 4. Background AI vs AI Conga Clashes (Fortnite Battle Royale Kill Feed Simulation)
      if (currentTime - w.lastAiBattleTime > 1800 && aliveParticipants.length > 2) {
        w.lastAiBattleTime = currentTime;

        // Check if two AI leaders are near each other
        for (let i = 0; i < aliveParticipants.length; i++) {
          const p1 = aliveParticipants[i];
          if (p1.isHuman) continue;

          for (let j = i + 1; j < aliveParticipants.length; j++) {
            const p2 = aliveParticipants[j];
            if (p2.isHuman) continue;

            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist < 60) {
              // Duel between AI bots!
              const winner = Math.random() < 0.5 ? p1 : p2;
              const loser = winner === p1 ? p2 : p1;

              // Loser and all their followers join the winner!
              loser.isAlive = false;
              loser.absorbedBy = winner.id;
              const absorbedCount = 1 + loser.followers.length;

              winner.followers.push(loser.character, ...loser.followers);
              loser.followers = [];
              winner.kills += 1;

              const newRemaining = w.participants.filter((p) => p.isAlive).length;
              loser.placement = newRemaining + 1;

              // Record in elimination feed
              const feedItem: EliminationFeedItem = {
                id: `feed_${Date.now()}_${Math.random()}`,
                winnerName: winner.name,
                loserName: loser.name,
                absorbedCount,
                timestamp: Date.now(),
                remainingCount: newRemaining,
              };
              setEliminationFeed((prev) => [feedItem, ...prev.slice(0, 7)]);
              setRemainingCount(newRemaining);

              // Localized crowd cheering for background clash
              const camDist = Math.hypot(winner.x - w.camera.x, winner.y - w.camera.y);
              if (camDist < 1100) {
                const pan = Math.max(-1, Math.min(1, (winner.x - w.camera.x) / 450));
                const distVol = Math.max(0.15, 1 - camDist / 1100) * 0.75;
                audioSystem.playCrowdCheer(winner.followers.length + 1, pan, distVol);
              }

              // Check if only 1 leader left (AI won or Player won)
              if (newRemaining === 1) {
                if (winner.isHuman) {
                  setGameState('VICTORY');
                  audioSystem.playWinRecruit();
                  audioSystem.playCrowdCheer(totalPlayersChoice, 0, 1.4);
                  confetti({ particleCount: 200, spread: 120 });
                }
              }
              break;
            }
          }
        }
      }

      // 5. Human Player Collision with Other Alive Leaders
      if (isPlayerAlive && !w.inDuel) {
        for (const rival of aliveParticipants) {
          if (rival.id === 'player') continue;
          const dist = Math.hypot(player.x - rival.x, player.y - rival.y);
          if (dist < 46) {
            // Initiate RPS Battle Royale Showdown!
            w.inDuel = true;
            setActiveDuel({
              opponent: rival,
              p1Choice: null,
              p2Choice: null,
              status: 'countdown',
              result: null,
              countdown: 3,
            });
            audioSystem.playCountdownTick(1);
            break;
          }
        }
      }

      // 6. Camera Tracking: Focus on spectated leader or player
      let focusTarget = w.participants.find((p) => p.id === w.spectateId && p.isAlive);
      if (!focusTarget) {
        const currentTarget = w.participants.find((p) => p.id === w.spectateId);
        if (currentTarget?.absorbedBy) {
          const captor = w.participants.find((p) => p.id === currentTarget.absorbedBy && p.isAlive);
          if (captor) {
            focusTarget = captor;
            w.spectateId = captor.id;
            setSpectatingTargetId(captor.id);
          }
        }
      }
      if (!focusTarget) {
        focusTarget = w.participants.find((p) => p.isAlive);
        if (focusTarget) {
          w.spectateId = focusTarget.id;
          setSpectatingTargetId(focusTarget.id);
        }
      }

      if (focusTarget) {
        // Smooth camera lerp
        w.camera.x += (focusTarget.x - w.camera.x) * 0.1;
        w.camera.y += (focusTarget.y - w.camera.y) * 0.1;
      }

      // --- RENDERING CANVAS ---
      const viewW = canvas.width;
      const viewH = canvas.height;
      const camX = w.camera.x - viewW / 2;
      const camY = w.camera.y - viewH / 2;

      ctx.clearRect(0, 0, viewW, viewH);

      ctx.save();
      ctx.translate(-camX, -camY);

      // A. Island Grass & Wood Floor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, mapSize, mapSize);

      // Carnival parquet grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.06)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < mapSize; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapSize);
        ctx.stroke();
      }
      for (let y = 0; y < mapSize; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapSize, y);
        ctx.stroke();
      }

      // Landmarks
      LANDMARKS.forEach((lm) => {
        ctx.save();
        ctx.translate(lm.x, lm.y);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name, 0, -5);
        ctx.font = '11px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Party Drop Zone', 0, 14);
        ctx.restore();
      });

      // B. The Dance Storm (Beat Ring)
      ctx.save();
      // Outer storm fill
      ctx.fillStyle = 'rgba(147, 51, 234, 0.18)';
      ctx.beginPath();
      ctx.rect(0, 0, mapSize, mapSize);
      ctx.arc(w.storm.x, w.storm.y, w.storm.radius, 0, Math.PI * 2, true);
      ctx.fill();

      // Storm wall perimeter glow
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 8]);
      ctx.beginPath();
      ctx.arc(w.storm.x, w.storm.y, w.storm.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // C. Draw All Conga Trains (Only alive leaders draw their full train)
      aliveParticipants.forEach((leader) => {
        const isMyTrain = leader.id === 'player' || leader.followers.some((f) => f.id === 'player');

        // Draw Followers from tail to head
        leader.followers.forEach((f, idx) => {
          const trailIdx = (idx + 1) * 14;
          const pos = leader.trail[trailIdx] || { x: leader.x, y: leader.y };
          const prev = idx === 0 ? { x: leader.x, y: leader.y } : leader.trail[idx * 14] || pos;

          // Connective arm hands-on-hips line
          ctx.strokeStyle = leader.isHuman ? '#f59e0b' : '#38bdf8';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(prev.x, prev.y);
          ctx.stroke();

          // Follower body
          ctx.fillStyle = f.shirtColor;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = f.id === 'player' ? '#fde047' : '#ffffff';
          ctx.lineWidth = f.id === 'player' ? 3 : 1.2;
          ctx.stroke();

          // Highlight YOU if you are in this conga train!
          if (f.id === 'player') {
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 11px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOU (IN CONGA LINE!)', pos.x, pos.y - 20);

            // If spectator cheer active, render emote bubble!
            if (spectatorCheer && spectatorCheer.expiresAt > Date.now()) {
              ctx.save();
              ctx.translate(pos.x, pos.y - 42);
              ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 1.5;
              const text = `${spectatorCheer.emoji} ${spectatorCheer.text}`;
              ctx.font = 'bold 11px Outfit, sans-serif';
              const textW = ctx.measureText(text).width;
              ctx.beginPath();
              ctx.roundRect(-textW / 2 - 8, -12, textW + 16, 22, 6);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#fef08a';
              ctx.fillText(text, 0, 2);
              ctx.restore();
            }
          }
        });

        // Draw Leader
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(leader.x, leader.y + 16, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = leader.character.shirtColor;
        ctx.beginPath();
        ctx.arc(leader.x, leader.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = leader.isHuman ? '#fbbf24' : '#ffffff';
        ctx.lineWidth = leader.isHuman ? 3.5 : 2;
        ctx.stroke();

        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', leader.x, leader.y - 3);

        // Leader Name & Conga Train Length
        ctx.font = `bold ${leader.isHuman ? '12px' : '10px'} Outfit, sans-serif`;
        ctx.fillStyle = leader.isHuman ? '#fde047' : '#ffffff';
        ctx.fillText(`${leader.name} (${leader.followers.length + 1})`, leader.x, leader.y - 24);
      });

      ctx.restore();

      // --- MINIMAP RENDERING ---
      const mmCanvas = minimapRef.current;
      if (mmCanvas) {
        const mmCtx = mmCanvas.getContext('2d');
        if (mmCtx) {
          const mmW = mmCanvas.width;
          const mmH = mmCanvas.height;
          mmCtx.clearRect(0, 0, mmW, mmH);

          // Minimap background
          mmCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          mmCtx.fillRect(0, 0, mmW, mmH);

          const scale = mmW / mapSize;

          // Storm on minimap
          mmCtx.strokeStyle = '#c084fc';
          mmCtx.lineWidth = 1.5;
          mmCtx.beginPath();
          mmCtx.arc(w.storm.x * scale, w.storm.y * scale, w.storm.radius * scale, 0, Math.PI * 2);
          mmCtx.stroke();

          // Alive Leaders on minimap
          aliveParticipants.forEach((p) => {
            mmCtx.fillStyle = p.isHuman ? '#fde047' : '#38bdf8';
            mmCtx.beginPath();
            mmCtx.arc(p.x * scale, p.y * scale, p.isHuman ? 3.5 : 2, 0, Math.PI * 2);
            mmCtx.fill();
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, mapSize, spectatorCheer]);

  // Handle Move Submission in RPS Duel
  const handleSelectDuelMove = (move: Move) => {
    if (!activeDuel || activeDuel.p1Choice !== null) return;
    audioSystem.playSelectSound();

    const opp = activeDuel.opponent;
    const oppMove = getOpponentMove(opp.character);
    const result = getDuelResult(move, oppMove);

    setActiveDuel({
      ...activeDuel,
      p1Choice: move,
      p2Choice: oppMove,
      status: 'revealed',
      result,
    });

    const w = worldRef.current;
    const player = w.participants.find((p) => p.id === 'player');

    if (result === 'win') {
      audioSystem.playWinRecruit();
      // Player absorbs opponent and their followers!
      opp.isAlive = false;
      opp.absorbedBy = 'player';
      const absorbedCount = 1 + opp.followers.length;
      if (player) {
        player.followers.push(opp.character, ...opp.followers);
        player.kills += 1;
      }
      opp.followers = [];

      // Localized crowd cheering scaled dynamically to the new conga line size!
      const currentCongaSize = (player?.followers.length || 0) + 1;
      audioSystem.playCrowdCheer(currentCongaSize, 0, 1.0);

      const newRemaining = w.participants.filter((p) => p.isAlive).length;
      opp.placement = newRemaining + 1;

      // Kill feed
      const feedItem: EliminationFeedItem = {
        id: `feed_${Date.now()}`,
        winnerName: player?.name || 'You',
        loserName: opp.name,
        absorbedCount,
        timestamp: Date.now(),
        remainingCount: newRemaining,
      };
      setEliminationFeed((prev) => [feedItem, ...prev.slice(0, 7)]);
      setRemainingCount(newRemaining);
      onUpdateStats(absorbedCount, true, false);

      if (newRemaining === 1) {
        setGameState('VICTORY');
        audioSystem.playWinRecruit();
        audioSystem.playCrowdCheer(totalPlayersChoice, 0, 1.4);
        confetti({ particleCount: 200, spread: 100 });
      } else {
        setTimeout(() => {
          w.inDuel = false;
          setActiveDuel(null);
        }, 2500);
      }
    } else if (result === 'lose') {
      audioSystem.playLoseSound();
      // CRITICAL FORCED CONGA ABSORPTION RULE:
      // If player loses: player's conga line is forced to join opponent's conga line,
      // AND player is FORCED to also join the conga line as a follower!
      // This is GAME OVER and transitions to SPECTATOR MODE!
      if (player) {
        player.isAlive = false;
        player.absorbedBy = opp.id;
        const totalLost = 1 + player.followers.length;

        // Opponent absorbs player's entire conga line PLUS player themselves!
        opp.followers.push(player.character, ...player.followers);
        player.followers = [];
        opp.kills += 1;

        const newRemaining = w.participants.filter((p) => p.isAlive).length;
        const finalPlacement = newRemaining + 1;
        player.placement = finalPlacement;

        setMyPlacement(finalPlacement);
        setCaptorName(opp.name);
        setRemainingCount(newRemaining);

        const feedItem: EliminationFeedItem = {
          id: `feed_player_out_${Date.now()}`,
          winnerName: opp.name,
          loserName: player.name,
          absorbedCount: totalLost,
          timestamp: Date.now(),
          remainingCount: newRemaining,
        };
        setEliminationFeed((prev) => [feedItem, ...prev.slice(0, 7)]);
        onUpdateStats(0, false, false, finalPlacement);

        // Transition to Spectator Mode following your captor!
        setTimeout(() => {
          w.inDuel = false;
          setActiveDuel(null);
          w.spectateId = opp.id;
          setSpectatingTargetId(opp.id);
          setGameState('SPECTATING');
        }, 2800);
      }
    } else {
      // Tie! Double shake rematch!
      audioSystem.playTieSound();
      setTimeout(() => {
        setActiveDuel((prev) => (prev ? { ...prev, p1Choice: null, p2Choice: null, status: 'countdown' } : null));
      }, 1500);
    }
  };

  // Keyboard shortcut for duel
  useEffect(() => {
    if (!activeDuel || activeDuel.p1Choice !== null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === 'r' || e.key === 'R') handleSelectDuelMove('rock');
      if (e.key === '2' || e.key === 'p' || e.key === 'P') handleSelectDuelMove('paper');
      if (e.key === '3' || e.key === 's' || e.key === 'S') handleSelectDuelMove('scissors');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDuel]);

  // Spectator mode navigation between remaining alive leaders
  const cycleSpectatorTarget = (direction: 'next' | 'prev') => {
    const alive = worldRef.current.participants.filter((p) => p.isAlive);
    if (alive.length === 0) return;
    const currentIdx = alive.findIndex((p) => p.id === worldRef.current.spectateId);
    let nextIdx = 0;
    if (direction === 'next') {
      nextIdx = (currentIdx + 1) % alive.length;
    } else {
      nextIdx = (currentIdx - 1 + alive.length) % alive.length;
    }
    const nextTarget = alive[nextIdx];
    worldRef.current.spectateId = nextTarget.id;
    setSpectatingTargetId(nextTarget.id);
  };

  // Spectator Cheer
  const triggerSpectatorCheer = (emoji: string, text: string) => {
    setSpectatorCheer({ emoji, text, expiresAt: Date.now() + 3500 });
    audioSystem.playPowerUpSound();
  };

  // Touch joystick handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    worldRef.current.touchJoystick = {
      active: true,
      dx: (touch.clientX - centerX) / (rect.width / 2),
      dy: (touch.clientY - centerY) / (rect.height / 2),
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!worldRef.current.touchJoystick.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    worldRef.current.touchJoystick.dx = (touch.clientX - centerX) / (rect.width / 2);
    worldRef.current.touchJoystick.dy = (touch.clientY - centerY) / (rect.height / 2);
  };

  const handleTouchEnd = () => {
    worldRef.current.touchJoystick.active = false;
    worldRef.current.touchJoystick.dx = 0;
    worldRef.current.touchJoystick.dy = 0;
  };

  const spectatingLeader = worldRef.current.participants.find((p) => p.id === spectatingTargetId);
  const myPlayer = worldRef.current.participants.find((p) => p.id === 'player');

  return (
    <div className="w-full max-w-6xl flex flex-col items-center gap-4">
      {/* Lobby Setup Screen */}
      {gameState === 'LOBBY' && (
        <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
          <div className="text-5xl sm:text-6xl mb-3">🪂🪇</div>
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            Battle Royale Mode
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">
            CONGA ROYALE: 100–256 DANCERS
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mb-6">
            Drop into the massive Carnival Island! Duel other dancers in Rock-Paper-Scissors. If you lose,{' '}
            <strong className="text-amber-300">your entire line is absorbed and you are forced to join their conga line in spectator mode</strong>!
          </p>

          <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-5 mb-6 text-left">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Select Match Lobby Size:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[100, 150, 256].map((count) => (
                <button
                  key={count}
                  onClick={() => setTotalPlayersChoice(count as 100 | 150 | 256)}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    totalPlayersChoice === count
                      ? 'bg-amber-500 text-slate-950 border-white font-black scale-105 shadow-lg'
                      : 'bg-slate-800 text-white border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <span className="text-xl sm:text-2xl font-black">{count}</span>
                  <span className="text-[11px] font-semibold mt-0.5">Players</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => initMatch(totalPlayersChoice)}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-lg rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>Drop Into Carnival Island!</span>
              <span>🪂</span>
            </button>
            <button
              onClick={onBackToMenu}
              className="px-5 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Active Battle Royale Match & Spectator View */}
      {gameState !== 'LOBBY' && (
        <div className="w-full flex flex-col items-center gap-3">
          {/* Top Battle Royale HUD */}
          <div className="w-full flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 shadow-lg">
            {/* Left: Players Remaining & Placement */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dancers Alive</div>
                  <div className="font-display font-black text-xl text-white tabular-nums">
                    {remainingCount} / {totalPlayersChoice}
                  </div>
                </div>
              </div>

              <span className="text-slate-700">|</span>

              {gameState === 'SPECTATING' ? (
                <div className="bg-rose-950/70 border border-rose-500/50 text-rose-300 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
                  <span>💀 ELIMINATED (#{myPlacement})</span>
                  <span>· In {captorName}'s Conga Line</span>
                </div>
              ) : (
                <div className="text-xs">
                  <span className="text-slate-400">Your Conga Size: </span>
                  <strong className="text-amber-400 tabular-nums">
                    {(myPlayer?.followers.length || 0) + 1} Dancers
                  </strong>
                </div>
              )}
            </div>

            {/* Center: Storm Timer */}
            <div className="flex items-center gap-2 text-xs bg-purple-950/60 border border-purple-500/40 text-purple-200 px-3 py-1.5 rounded-lg">
              <span>🌪️</span>
              <span>
                Dance Storm Phase {worldRef.current.storm.phase}:{' '}
                <strong className="text-purple-300 tabular-nums">
                  {worldRef.current.storm.isShrinking ? 'Shrinking Now!' : `${worldRef.current.storm.timer}s`}
                </strong>
              </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => initMatch(totalPlayersChoice)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Restart Match
              </button>
              <button
                onClick={onBackToMenu}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Menu
              </button>
            </div>
          </div>

          {/* Main Battle Royale Canvas & Overlays */}
          <div className="relative w-full aspect-[16/9] max-h-[640px] rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl bg-black">
            <canvas
              ref={canvasRef}
              width={1024}
              height={576}
              className="w-full h-full object-contain block bg-dance-floor cursor-crosshair"
            />

            {/* Minimap (Radar) in Top Right */}
            <div className="absolute top-4 right-4 z-20 flex flex-col items-end">
              <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-xl bg-slate-950/90 backdrop-blur-sm">
                <canvas ref={minimapRef} width={128} height={128} className="w-full h-full block" />
              </div>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 bg-slate-900/80 px-1.5 py-0.5 rounded">
                Carnival Radar
              </span>
            </div>

            {/* Elimination Feed Ticker in Top Left */}
            <div className="absolute top-4 left-4 z-20 max-w-xs space-y-1 pointer-events-none">
              {eliminationFeed.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/85 border border-slate-800 text-[11px] px-2.5 py-1 rounded-lg text-slate-200 shadow-md animate-in slide-in-from-left duration-200"
                >
                  <span className="font-bold text-amber-400">{item.winnerName}</span> absorbed{' '}
                  <span className="font-semibold text-rose-300">{item.loserName}</span> (+{item.absorbedCount})
                </div>
              ))}
            </div>

            {/* Mobile Touch Joystick */}
            {gameState === 'ALIVE' && (
              <div className="md:hidden absolute bottom-4 left-4 z-20">
                <div
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="w-24 h-24 rounded-full bg-slate-800/80 border-2 border-amber-400/50 backdrop-blur-md flex items-center justify-center touch-none select-none shadow-xl active:bg-slate-700/80"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-400/80 pointer-events-none" />
                </div>
              </div>
            )}

            {/* SPECTATOR MODE FLOATING CONTROLS */}
            {gameState === 'SPECTATING' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-900/90 border border-amber-500/50 rounded-2xl p-3 backdrop-blur-md shadow-2xl flex flex-col items-center gap-2 text-center">
                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="text-base">👀</span>
                    <span>
                      Spectating Conga Leader:{' '}
                      <strong className="text-amber-400 font-bold">{spectatingLeader?.name}</strong>{' '}
                      ({(spectatingLeader?.followers.length || 0) + 1} Dancers)
                    </span>
                  </div>

                  {/* Switch Spectated Leader */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cycleSpectatorTarget('prev')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      ← Prev Leader
                    </button>
                    <button
                      onClick={() => {
                        if (myPlayer?.absorbedBy) {
                          worldRef.current.spectateId = myPlayer.absorbedBy;
                          setSpectatingTargetId(myPlayer.absorbedBy);
                        }
                      }}
                      className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/40 transition-colors cursor-pointer"
                    >
                      Focus My Captor
                    </button>
                    <button
                      onClick={() => cycleSpectatorTarget('next')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      Next Leader →
                    </button>
                  </div>

                  {/* Spectator Conga Cheers */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Cheer in Line:</span>
                    {['🪇 CONGA!', '💃 1-2-3-KICK!', '🎉 HEY!', '🔥 SPICY!', '👑 BOW!'].map((msg) => {
                      const [emoji, ...rest] = msg.split(' ');
                      return (
                        <button
                          key={msg}
                          onClick={() => triggerSpectatorCheer(emoji, rest.join(' '))}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded border border-slate-700 text-slate-200 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        >
                          {msg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rock Paper Scissors Battle Royale Clash Modal */}
      {activeDuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center animate-in zoom-in-95">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💥</span>
                <span className="font-display font-extrabold text-amber-400 uppercase tracking-wide">
                  Battle Royale Showdown!
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Prize: +{activeDuel.opponent.followers.length + 1} Dancers
              </span>
            </div>

            {/* Duelists */}
            <div className="w-full grid grid-cols-2 gap-4 items-center justify-items-center my-4 py-4 bg-slate-950/70 rounded-xl border border-slate-800 px-4">
              {/* You */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <DancerSprite
                    character={playerLeader}
                    size={76}
                    isDancing={activeDuel.status !== 'revealed'}
                    isLeader={true}
                    facing="right"
                  />
                  {activeDuel.p1Choice && (
                    <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 font-bold w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 border-white shadow">
                      {MOVE_ICONS[activeDuel.p1Choice].emoji}
                    </div>
                  )}
                </div>
                <div className="font-bold text-white text-sm">{playerLeader.name}</div>
                <div className="text-[11px] text-amber-400 font-semibold">You</div>
              </div>

              {/* Opponent */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <DancerSprite
                    character={activeDuel.opponent.character}
                    size={76}
                    isDancing={activeDuel.status !== 'revealed'}
                    isLeader={true}
                    facing="left"
                  />
                  {activeDuel.p2Choice && (
                    <div className="absolute -top-3 -left-3 bg-indigo-500 text-white font-bold w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 border-white shadow">
                      {MOVE_ICONS[activeDuel.p2Choice].emoji}
                    </div>
                  )}
                </div>
                <div className="font-bold text-white text-sm">{activeDuel.opponent.name}</div>
                <div className="text-[11px] text-indigo-400 font-semibold">
                  Rival Leader ({activeDuel.opponent.followers.length + 1})
                </div>
              </div>
            </div>

            {/* Result Announcement */}
            <div className="my-2 text-center min-h-[3rem] flex flex-col items-center justify-center">
              {activeDuel.status === 'revealed' ? (
                <div>
                  <div
                    className={`font-display text-2xl font-black uppercase ${
                      activeDuel.result === 'win'
                        ? 'text-emerald-400'
                        : activeDuel.result === 'tie'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {activeDuel.result === 'win' && '🎉 VICTORY! CONGA LINE ABSORBED! 🎉'}
                    {activeDuel.result === 'tie' && '🤝 DRAW! DOUBLE SHAKE! 🤝'}
                    {activeDuel.result === 'lose' && '💀 DEFEAT! YOU MUST JOIN THEIR CONGA LINE! 💀'}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {activeDuel.p1Choice && activeDuel.p2Choice && getOutcomeExplanation(activeDuel.p1Choice, activeDuel.p2Choice)}
                  </p>
                </div>
              ) : (
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Pick Rock, Paper, or Scissors!
                </div>
              )}
            </div>

            {/* RPS Choices */}
            {activeDuel.status !== 'revealed' && (
              <div className="w-full grid grid-cols-3 gap-3 mt-2">
                {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
                  <button
                    key={move}
                    onClick={() => handleSelectDuelMove(move)}
                    className="p-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 hover:border-amber-400 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer"
                  >
                    <span className="text-3xl mb-1">{MOVE_ICONS[move].emoji}</span>
                    <span className="font-display font-bold text-xs">{MOVE_ICONS[move].name}</span>
                    <span className="text-[10px] text-slate-400">[{MOVE_ICONS[move].key}]</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VICTORY ROYALE CELEBRATION (#1) */}
      {gameState === 'VICTORY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border-4 border-amber-400 rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95">
            <div className="text-6xl mb-2 animate-bounce">👑🎉🕺</div>
            <div className="bg-amber-500 text-slate-950 font-display font-black text-xs uppercase px-3 py-1 rounded-full inline-block mb-3">
              #1 Victory Royale
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-amber-400 mb-2">
              CONGA EMPEROR!
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              You defeated all rivals and absorbed every single dancer on the island! The entire island is now following your lead in one mega conga train!
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => initMatch(totalPlayersChoice)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer text-sm"
              >
                Drop In Again! 🪂
              </button>
              <button
                onClick={onBackToMenu}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer text-sm"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
