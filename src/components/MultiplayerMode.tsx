import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Character,
  ClientToServerMsg,
  Move,
  MultiplayerDuel,
  MultiplayerPlayer,
  PowerUp,
  RoomFeedEvent,
  ServerToClientMsg,
} from '../types/game';
import { DancerSprite } from './DancerSprite';
import { audioSystem, soundManager } from '../utils/audio';

interface MultiplayerModeProps {
  playerLeader: Character;
  onBackToMenu: () => void;
  onUpdateStats: (recruits: number, won: boolean, tied: boolean) => void;
}

const MOVE_ICONS: Record<Move, { emoji: string; name: string; key: string }> = {
  rock: { emoji: '✊', name: 'Rock', key: '1' },
  paper: { emoji: '✋', name: 'Paper', key: '2' },
  scissors: { emoji: '✌️', name: 'Scissors', key: '3' },
};

const EMOTE_OPTIONS = [
  { emoji: '🪇', text: 'CONGA!' },
  { emoji: '💃', text: '1-2-3-KICK!' },
  { emoji: '🎉', text: 'HEYYY!' },
  { emoji: '👑', text: 'BOW TO THE LINE!' },
  { emoji: '🤝', text: 'GOOD DUEL!' },
  { emoji: '🌶️', text: 'SPICY MOVES!' },
];

export const MultiplayerMode: React.FC<MultiplayerModeProps> = ({
  playerLeader,
  onBackToMenu,
  onUpdateStats,
}) => {
  const [roomId, setRoomId] = useState('carnival-main');
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [myId, setMyId] = useState<string | null>(null);

  // Spectator mode states
  const [isSpectating, setIsSpectating] = useState<boolean>(false);
  const [spectatingTargetId, setSpectatingTargetId] = useState<string | null>(null);
  const [captorName, setCaptorName] = useState<string>('');

  // Synced state
  const [players, setPlayers] = useState<Record<string, MultiplayerPlayer>>({});
  const [roamingDancers, setRoamingDancers] = useState<
    { id: string; character: Character; x: number; y: number; vx: number; vy: number }[]
  >([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [events, setEvents] = useState<RoomFeedEvent[]>([]);
  const [activeDuel, setActiveDuel] = useState<MultiplayerDuel | null>(null);

  // Duel local choice
  const [myDuelChoice, setMyDuelChoice] = useState<Move | null>(null);

  // In-game ballroom chat
  const [chatMessages, setChatMessages] = useState<{ id: string; senderId: string; senderName: string; text: string; timestamp: number }[]>([
    { id: 'welcome', senderId: 'system', senderName: 'Ballroom Host', text: 'Welcome to the Live Conga Ballroom! Type or send quick emotes to chat.', timestamp: Date.now() },
  ]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string | null>(null);
  const onUpdateStatsRef = useRef(onUpdateStats);
  const playerLeaderRef = useRef(playerLeader);
  const activeDuelRef = useRef<MultiplayerDuel | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const lastCollisionDuelTimeRef = useRef<number>(0);
  const pendingMessagesRef = useRef<ClientToServerMsg[]>([]);
  const isSpectatingRef = useRef<boolean>(false);
  const spectatingTargetIdRef = useRef<string | null>(null);

  // Keep refs up-to-date
  onUpdateStatsRef.current = onUpdateStats;
  playerLeaderRef.current = playerLeader;
  myIdRef.current = myId;
  activeDuelRef.current = activeDuel;
  isSpectatingRef.current = isSpectating;
  spectatingTargetIdRef.current = spectatingTargetId;

  // Position and controls ref for 60fps smooth loop
  const localPlayerRef = useRef({
    x: 480,
    y: 320,
    angle: 0,
    speed: 3.4,
    trail: [] as { x: number; y: number }[],
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
    lastSentMove: 0,
    arenaWidth: 960,
    arenaHeight: 640,
  });

  // Safe message sender to prevent InvalidStateError
  const sendMsg = useCallback((msg: ClientToServerMsg): boolean => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
        return true;
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        pendingMessagesRef.current.push(msg);
        return false;
      }
    } catch (err) {
      console.warn('Failed to send WebSocket message safely:', err);
    }
    return false;
  }, []);

  // Connect to WebSocket Server
  const connectWs = useCallback((targetRoom: string) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        const currentLeader = playerLeaderRef.current;
        // Send join message safely
        sendMsg({
          type: 'join',
          roomId: targetRoom,
          player: {
            name: currentLeader.name,
            hat: currentLeader.hat,
            hairColor: currentLeader.hairColor,
            shirtColor: currentLeader.shirtColor,
            pantsColor: currentLeader.pantsColor,
            skinTone: currentLeader.skinTone,
            x: 200 + Math.random() * 560,
            y: 150 + Math.random() * 340,
            angle: 0,
          },
        });

        // Flush any queued messages
        while (pendingMessagesRef.current.length > 0) {
          const queued = pendingMessagesRef.current.shift();
          if (queued) sendMsg(queued);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerToClientMsg;
          switch (msg.type) {
            case 'init':
              setMyId(msg.yourId);
              myIdRef.current = msg.yourId;
              setPlayers(msg.state.players);
              setRoamingDancers(msg.state.roamingDancers);
              setPowerUps(msg.state.powerUps);
              setEvents(msg.state.events);
              if (msg.state.players[msg.yourId]) {
                localPlayerRef.current.x = msg.state.players[msg.yourId].x;
                localPlayerRef.current.y = msg.state.players[msg.yourId].y;
              }
              break;

            case 'state_sync':
              setPlayers((prev) => ({ ...prev, ...msg.players }));
              setRoamingDancers(msg.roamingDancers);
              setPowerUps(msg.powerUps);
              break;

            case 'player_joined':
              setPlayers((prev) => ({ ...prev, [msg.player.id]: msg.player }));
              setEvents((prev) => [...prev.slice(-14), msg.event]);
              break;

            case 'player_left':
              setPlayers((prev) => {
                const copy = { ...prev };
                delete copy[msg.playerId];
                return copy;
              });
              setEvents((prev) => [...prev.slice(-14), msg.event]);
              break;

            case 'player_moved':
              setPlayers((prev) => {
                const p = prev[msg.playerId];
                if (!p) return prev;
                return {
                  ...prev,
                  [msg.playerId]: {
                    ...p,
                    x: msg.x,
                    y: msg.y,
                    angle: msg.angle,
                    trail: msg.trail,
                  },
                };
              });
              break;

            case 'duel_started':
              audioSystem.playCountdownTick(1);
              setMyDuelChoice(null);
              setActiveDuel(msg.duel);
              break;

            case 'duel_progress':
              setActiveDuel(msg.duel);
              break;

            case 'duel_resolved': {
              setActiveDuel(msg.duel);
              setPlayers(msg.updatedPlayers);
              setEvents((prev) => [...prev.slice(-14), msg.event]);

              const currentMyId = myIdRef.current;
              const isParticipant =
                msg.duel.player1Id === currentMyId ||
                msg.duel.player2Id === currentMyId ||
                msg.duel.winnerId === currentMyId;

              if (isParticipant) {
                if (msg.duel.winnerId === currentMyId) {
                  audioSystem.playWinRecruit();
                  const myCongaSize = (msg.updatedPlayers[currentMyId]?.followers?.length || 0) + 1;
                  // Localized crowd cheering sound scaled dynamically based on size of current conga line!
                  soundManager.playCrowdCheer(myCongaSize, 0, 1.0);
                  onUpdateStatsRef.current(1, true, false);
                  try {
                    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
                  } catch {
                    // ignore
                  }
                } else if (msg.duel.winnerId === 'tie') {
                  audioSystem.playTieSound();
                  onUpdateStatsRef.current(0, false, true);
                } else {
                  // LOST DUEL! Forced to join opponent's conga line + GAME OVER / SPECTATOR MODE
                  audioSystem.playLoseSound();
                  onUpdateStatsRef.current(0, false, false);

                  const winnerId = msg.duel.winnerId;
                  const winnerP = winnerId ? msg.updatedPlayers[winnerId] : null;
                  const cName = winnerP ? winnerP.name : msg.duel.opponentCharacter?.name || 'Rival Leader';
                  setCaptorName(cName);

                  // Transition to Spectator Mode following your captor
                  setTimeout(() => {
                    setIsSpectating(true);
                    setSpectatingTargetId(winnerId || null);
                  }, 2400);
                }
              } else {
                // Background clash between other dancers in the ballroom: localized crowd cheer
                if (msg.duel.winnerId && msg.duel.winnerId !== 'tie') {
                  const winnerP = msg.updatedPlayers[msg.duel.winnerId];
                  if (winnerP) {
                    const pan = Math.max(-1, Math.min(1, (winnerP.x - localPlayerRef.current.x) / 450));
                    const congaSize = (winnerP.followers?.length || 0) + 1;
                    soundManager.playCrowdCheer(congaSize, pan, 0.7);
                  }
                }
              }

              // Auto close resolved duel after 3.2 seconds
              setTimeout(() => {
                setActiveDuel(null);
                setMyDuelChoice(null);
              }, 3200);
              break;
            }

            case 'event_feed':
              setEvents((prev) => [...prev.slice(-14), msg.event]);
              break;

            case 'player_emote':
              setPlayers((prev) => {
                const p = prev[msg.playerId];
                if (!p) return prev;
                return {
                  ...prev,
                  [msg.playerId]: {
                    ...p,
                    activeEmote: msg.emote,
                  },
                };
              });
              break;

            case 'chat_message':
              setChatMessages((prev) => [...prev.slice(-30), msg.message]);
              audioSystem.playCongaLow();
              break;
          }
        } catch (err) {
          console.error('Failed to parse WS msg:', err);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Schedule auto-reconnect
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWs(targetRoom);
        }, 3000);
      };

      ws.onerror = () => {
        setConnectionStatus('disconnected');
      };
    } catch (err) {
      console.error('Error instantiating WebSocket:', err);
      setConnectionStatus('disconnected');
    }
  }, [sendMsg]);

  // Connect on room change or mount
  useEffect(() => {
    connectWs(roomId);
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [connectWs, roomId]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in localPlayerRef.current.keys) {
        localPlayerRef.current.keys[e.key as keyof typeof localPlayerRef.current.keys] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in localPlayerRef.current.keys) {
        localPlayerRef.current.keys[e.key as keyof typeof localPlayerRef.current.keys] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 60FPS Render & Game Loop
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

      const lp = localPlayerRef.current;
      const currentDuel = activeDuelRef.current;

      // 1. Move local player if not in duel and not spectating
      if (!currentDuel && !isSpectatingRef.current) {
        let dx = 0;
        let dy = 0;
        if (lp.keys.w || lp.keys.ArrowUp) dy -= 1;
        if (lp.keys.s || lp.keys.ArrowDown) dy += 1;
        if (lp.keys.a || lp.keys.ArrowLeft) dx -= 1;
        if (lp.keys.d || lp.keys.ArrowRight) dx += 1;

        if (lp.touchJoystick.active) {
          dx = lp.touchJoystick.dx;
          dy = lp.touchJoystick.dy;
        }

        const len = Math.hypot(dx, dy);
        if (len > 0.05) {
          const moveX = (dx / len) * lp.speed;
          const moveY = (dy / len) * lp.speed;
          lp.x += moveX;
          lp.y += moveY;
          lp.angle = Math.atan2(moveY, moveX);

          // Trail update
          const lastPoint = lp.trail[0];
          const dist = lastPoint ? Math.hypot(lp.x - lastPoint.x, lp.y - lastPoint.y) : 999;
          if (dist > 16) {
            lp.trail.unshift({ x: lp.x, y: lp.y });
            if (lp.trail.length > 250) lp.trail.pop();
          }

          // Throttle socket move emission (15Hz)
          if (Date.now() - lp.lastSentMove > 65) {
            lp.lastSentMove = Date.now();
            sendMsg({
              type: 'move',
              x: lp.x,
              y: lp.y,
              angle: lp.angle,
              trail: lp.trail,
            });
          }
        }

        // Keep inside bounds
        lp.x = Math.max(30, Math.min(lp.arenaWidth - 30, lp.x));
        lp.y = Math.max(30, Math.min(lp.arenaHeight - 30, lp.y));

        // Cooldown between initiating collision duels (at least 2 seconds)
        const canInitiateDuel = Date.now() - lastCollisionDuelTimeRef.current > 2000;

        if (canInitiateDuel) {
          // Client-side collision trigger: check neutral dancers
          for (const dancer of roamingDancers) {
            if (Math.hypot(lp.x - dancer.x, lp.y - dancer.y) < 36) {
              lastCollisionDuelTimeRef.current = Date.now();
              sendMsg({
                type: 'duel:init_pve',
                dancerId: dancer.id,
              });
              break;
            }
          }

          // Check PvP collisions with other real human players
          const currentMyId = myIdRef.current;
          if (currentMyId) {
            Object.values(players).forEach((otherPlayer) => {
              if (otherPlayer.id !== currentMyId && !otherPlayer.inDuelId) {
                if (Math.hypot(lp.x - otherPlayer.x, lp.y - otherPlayer.y) < 40) {
                  lastCollisionDuelTimeRef.current = Date.now();
                  sendMsg({
                    type: 'duel:init_pvp',
                    targetPlayerId: otherPlayer.id,
                  });
                }
              }
            });
          }
        }
      }

      // --- RENDERING CANVAS ---
      ctx.clearRect(0, 0, lp.arenaWidth, lp.arenaHeight);

      // Floor grid & festive ambient
      ctx.fillStyle = '#140c06';
      ctx.fillRect(0, 0, lp.arenaWidth, lp.arenaHeight);

      // Parquet lines
      ctx.strokeStyle = 'rgba(255, 175, 50, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < lp.arenaWidth; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, lp.arenaHeight);
        ctx.stroke();
      }
      for (let y = 0; y < lp.arenaHeight; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(lp.arenaWidth, y);
        ctx.stroke();
      }

      // Spotlights
      const timeSec = currentTime * 0.001;
      const spots = [
        { x: 280 + Math.sin(timeSec * 0.8) * 140, y: 200 + Math.cos(timeSec * 0.6) * 100, color: 'rgba(236, 72, 153, 0.15)', r: 180 },
        { x: 680 + Math.cos(timeSec * 0.7) * 150, y: 380 + Math.sin(timeSec * 0.9) * 110, color: 'rgba(6, 182, 212, 0.15)', r: 190 },
      ];
      spots.forEach((sp) => {
        const grad = ctx.createRadialGradient(sp.x, sp.y, 10, sp.x, sp.y, sp.r);
        grad.addColorStop(0, sp.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Power-ups
      powerUps.forEach((pu) => {
        const bounce = Math.sin(currentTime * 0.006) * 4;
        ctx.save();
        ctx.translate(pu.x, pu.y + bounce);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.type === 'fever' ? '🪇' : pu.type === 'glasses' ? '🕶️' : '🌶️', 0, 0);
        ctx.restore();
      });

      // Draw Roaming Neutral Dancers
      roamingDancers.forEach((dancer) => {
        ctx.save();
        ctx.translate(dancer.x, dancer.y);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 11, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dancer.character.shirtColor;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '9px Outfit, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(dancer.character.name.split(' ')[0], 0, -18);

        ctx.font = '10px sans-serif';
        ctx.fillText('✊', 0, 2);
        ctx.restore();
      });

      // Draw All Connected Players & Their Conga Lines!
      const currentMyId = myIdRef.current;
      Object.values(players).forEach((p) => {
        // Absorbed followers are rendered inside their captor's train, not as separate roaming leaders
        if (p.isFollowerOf) return;

        const isMe = p.id === currentMyId && !isSpectatingRef.current;
        const posX = isMe ? lp.x : p.x;
        const posY = isMe ? lp.y : p.y;
        const trail = isMe ? lp.trail : p.trail;

        // Draw Followers (Conga Line!)
        p.followers.forEach((f, idx) => {
          const trailIdx = (idx + 1) * 14;
          const pos = trail[trailIdx] || { x: posX, y: posY };
          const prev = idx === 0 ? { x: posX, y: posY } : trail[idx * 14] || pos;
          const isMyDancerRep = isSpectatingRef.current && (f.id.includes(currentMyId || '') || f.name === playerLeaderRef.current.name);

          ctx.save();
          ctx.translate(pos.x, pos.y);

          // Connector line
          ctx.strokeStyle = p.shirtColor;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(prev.x - pos.x, prev.y - pos.y);
          ctx.stroke();

          // Follower body
          ctx.fillStyle = f.shirtColor;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isMyDancerRep ? '#facc15' : '#ffffff';
          ctx.lineWidth = isMyDancerRep ? 2.5 : 1.2;
          ctx.stroke();

          // If this follower is YOU following your opponent, draw a clear badge!
          if (isMyDancerRep) {
            ctx.font = 'bold 9px Outfit, sans-serif';
            ctx.fillStyle = '#fde047';
            ctx.textAlign = 'center';
            ctx.fillText('YOU (FOLLOWER)', 0, -15);
          }

          ctx.restore();
        });

        // Draw Player Leader
        ctx.save();
        ctx.translate(posX, posY);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Leader body
        ctx.fillStyle = p.shirtColor;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isMe ? '#fbbf24' : '#ffffff';
        ctx.lineWidth = isMe ? 3 : 2;
        ctx.stroke();

        // Crown / Sombrero indicator
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', 0, -3);

        // Name Tag & Conga Count
        ctx.font = `bold ${isMe ? '11px' : '10px'} Outfit, sans-serif`;
        ctx.fillStyle = isMe ? '#fde047' : '#ffffff';
        ctx.fillText(`${p.name} (${p.followers.length + 1})`, 0, -22);

        // Active Emote Speech Bubble
        if (p.activeEmote && p.activeEmote.expiresAt > Date.now()) {
          ctx.save();
          ctx.translate(0, -42);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          const text = `${p.activeEmote.emoji} ${p.activeEmote.text}`;
          ctx.font = 'bold 11px Outfit, sans-serif';
          const textWidth = ctx.measureText(text).width;
          ctx.beginPath();
          ctx.roundRect(-textWidth / 2 - 8, -12, textWidth + 16, 22, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.fillText(text, 0, 2);
          ctx.restore();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [players, powerUps, roamingDancers, sendMsg]);

  // Handle move selection in duel safely without throwing
  const handleSelectDuelMove = (move: Move) => {
    if (!activeDuel || myDuelChoice !== null) return;
    audioSystem.playSelectSound();
    setMyDuelChoice(move);

    try {
      const sent = sendMsg({
        type: 'duel:submit_move',
        duelId: activeDuel.id,
        move,
      });

      if (!sent) {
        console.warn('Socket was not in OPEN state when submitting move. Reconnecting or queued...');
        if (!wsRef.current || wsRef.current.readyState > WebSocket.OPEN) {
          connectWs(roomId);
        }
      }
    } catch (err) {
      console.warn('Exception during duel move submission:', err);
    }
  };

  // Break free from opponent's conga line and rejoin as new leader
  const handleBreakFree = () => {
    sendMsg({ type: 'break_free' });
    setIsSpectating(false);
    setSpectatingTargetId(null);
    setCaptorName('');
    audioSystem.playWhistle();
  };

  // Cycle spectator target
  const cycleSpectatorTarget = (direction: 'next' | 'prev') => {
    const aliveLeaders = Object.values(players).filter((p) => !p.isFollowerOf);
    if (aliveLeaders.length === 0) return;
    const currentIndex = aliveLeaders.findIndex((p) => p.id === spectatingTargetId);
    let nextIndex = 0;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % aliveLeaders.length;
    } else {
      nextIndex = (currentIndex - 1 + aliveLeaders.length) % aliveLeaders.length;
    }
    setSpectatingTargetId(aliveLeaders[nextIndex].id);
  };

  // Send festive quick emote
  const handleSendEmote = (emoji: string, text: string) => {
    sendMsg({
      type: 'send_emote',
      emoji,
      text,
    });
  };

  // Keyboard shortcut listener for duel
  useEffect(() => {
    if (!activeDuel || myDuelChoice !== null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === 'r' || e.key === 'R') handleSelectDuelMove('rock');
      if (e.key === '2' || e.key === 'p' || e.key === 'P') handleSelectDuelMove('paper');
      if (e.key === '3' || e.key === 's' || e.key === 'S') handleSelectDuelMove('scissors');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDuel, myDuelChoice]);

  // Touch joystick
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    localPlayerRef.current.touchJoystick = {
      active: true,
      dx: (touch.clientX - centerX) / (rect.width / 2),
      dy: (touch.clientY - centerY) / (rect.height / 2),
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!localPlayerRef.current.touchJoystick.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    localPlayerRef.current.touchJoystick.dx = (touch.clientX - centerX) / (rect.width / 2);
    localPlayerRef.current.touchJoystick.dy = (touch.clientY - centerY) / (rect.height / 2);
  };

  const handleTouchEnd = () => {
    localPlayerRef.current.touchJoystick.active = false;
    localPlayerRef.current.touchJoystick.dx = 0;
    localPlayerRef.current.touchJoystick.dy = 0;
  };

  // Leaderboard sorted by followers count
  const sortedLeaderboard = Object.values(players).sort(
    (a, b) => b.followers.length - a.followers.length
  );

  const myPlayer = myId ? players[myId] : null;

  return (
    <div className="w-full max-w-6xl flex flex-col items-center gap-4">
      {/* Top Multiplayer HUD */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 shadow-lg">
        {/* Left: Connection Status & Room Code */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-300">
              {connectionStatus === 'connected'
                ? 'Live Online'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Disconnected'}
            </span>
          </div>

          <span className="text-slate-600">·</span>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Room:</span>
            <span className="font-display font-bold text-amber-400 uppercase tracking-wide">
              {roomId}
            </span>
          </div>

          <span className="text-slate-600">·</span>

          <div className="text-xs text-slate-400">
            Dancers in Ballroom:{' '}
            <strong className="text-white tabular-nums">{Object.keys(players).length}</strong>
          </div>
        </div>

        {/* Center: Quick Room Switcher */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Custom Room Code"
            value={customRoomInput}
            onChange={(e) => setCustomRoomInput(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-36 sm:w-44"
          />
          <button
            onClick={() => {
              if (customRoomInput.trim()) {
                const nextRoom = customRoomInput.trim().toLowerCase();
                setRoomId(nextRoom);
                setCustomRoomInput('');
              }
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white border border-slate-700 transition-colors cursor-pointer"
          >
            Join
          </button>
        </div>

        {/* Right: Reconnect & Menu Buttons */}
        <div className="flex items-center gap-2">
          {connectionStatus !== 'connected' && (
            <button
              onClick={() => connectWs(roomId)}
              className="px-3 py-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/50 rounded-lg transition-colors cursor-pointer"
            >
              Reconnect
            </button>
          )}
          <button
            onClick={onBackToMenu}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Back to Menu
          </button>
        </div>
      </div>

      {/* Connection Warning Banner if not connected */}
      {connectionStatus === 'disconnected' && (
        <div className="w-full bg-rose-950/60 border border-rose-500/40 text-rose-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <span>⚠️ Connection lost to ballroom server. Reconnecting automatically...</span>
          <button
            onClick={() => connectWs(roomId)}
            className="underline font-bold text-white hover:text-amber-300 cursor-pointer"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Main Floor + Live Sidebar Grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column (3/4): Dance Floor Canvas */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          {/* Spectator Mode Banner & Controls */}
          {isSpectating && (
            <div className="w-full bg-rose-950/80 border-2 border-rose-500/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-bounce">💀</span>
                <div>
                  <div className="font-display font-black text-rose-300 text-sm uppercase tracking-wide flex items-center gap-2">
                    <span>Game Over · Absorbed Into Conga Line!</span>
                    <span className="bg-rose-900/80 text-rose-200 text-[10px] px-2 py-0.5 rounded-full border border-rose-700">
                      Spectator Mode
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    You lost the duel! You and your conga line are now forced to dance behind{' '}
                    <strong className="text-amber-400 font-bold">{captorName || 'your rival'}</strong>.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => cycleSpectatorTarget('prev')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-slate-400 px-2 font-mono">
                    Spectating: <strong className="text-white">{spectatingTargetId ? players[spectatingTargetId]?.name || 'Leader' : captorName || 'Leader'}</strong>
                  </span>
                  <button
                    onClick={() => cycleSpectatorTarget('next')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors cursor-pointer"
                  >
                    Next →
                  </button>
                </div>

                <button
                  onClick={handleBreakFree}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-extrabold text-xs rounded-lg shadow transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Break Free & Start New Conga!</span>
                </button>
              </div>
            </div>
          )}

          <div className="relative w-full aspect-[3/2] max-h-[600px] rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl bg-black">
            <canvas
              ref={canvasRef}
              width={960}
              height={640}
              className="w-full h-full object-contain block bg-dance-floor cursor-crosshair"
            />

            {/* Mobile Touch Joystick */}
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
          </div>

          {/* Quick Festival Emote Bar */}
          <div className="w-full flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2 px-3 overflow-x-auto">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
              Dance Emotes:
            </span>
            <div className="flex items-center gap-1.5">
              {EMOTE_OPTIONS.map((em) => (
                <button
                  key={em.text}
                  onClick={() => handleSendEmote(em.emoji, em.text)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap hover:scale-105 active:scale-95"
                >
                  <span>{em.emoji}</span>
                  <span className="hidden sm:inline">{em.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/4): Live Leaderboard & Activity Feed */}
        <div className="flex flex-col gap-4">
          {/* Room Conga Line Leaderboard */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
            <h3 className="font-display font-bold text-white text-sm flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5">
                <span>👑</span>
                <span>Conga Leaderboard</span>
              </span>
              <span className="text-[11px] text-amber-400 font-normal">Train Size</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {sortedLeaderboard.map((p, idx) => {
                const isMe = p.id === myId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                      isMe
                        ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200'
                        : 'bg-slate-950/40 border border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                      <span className="truncate">{p.name}</span>
                      {isMe && <span className="text-[10px] text-amber-400 font-semibold">(You)</span>}
                    </div>
                    <span className="font-display font-extrabold text-white tabular-nums shrink-0">
                      {p.followers.length + 1} Dancers
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col">
            <h3 className="font-display font-bold text-white text-xs flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <span>🎉</span>
                <span>Ballroom Live Feed</span>
              </span>
              <span className="text-[10px] text-slate-500">Real-time</span>
            </h3>

            <div className="space-y-1.5 overflow-y-auto max-h-32 pr-1 scrollbar-thin text-xs">
              {events.length === 0 ? (
                <div className="text-slate-500 italic text-[11px]">No duels yet. Bump into a dancer to start!</div>
              ) : (
                [...events].reverse().slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-1.5 rounded-lg border text-[10px] leading-relaxed ${
                      ev.type === 'duel'
                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                        : ev.type === 'recruit'
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-950/30 border-slate-800 text-slate-300'
                    }`}
                  >
                    {ev.text}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* In-Game Live Ballroom Chat Window (Quick Emotes & Text Messages) */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3 shadow-xl flex flex-col flex-1">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <h3 className="font-display font-bold text-white text-xs flex items-center gap-1.5">
                <span>💬</span>
                <span>Ballroom Chat</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </h3>

              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="text-[10px] text-slate-400 hover:text-amber-400 cursor-pointer font-bold"
              >
                {isChatOpen ? 'Collapse ▾' : 'Expand ▴'}
              </button>
            </div>

            {isChatOpen && (
              <div className="flex flex-col flex-1">
                {/* Chat Messages */}
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40 min-h-[100px] pr-1 mb-2 scrollbar-thin text-xs">
                  {chatMessages.map((msg) => {
                    const isMe = msg.senderId === myId;
                    return (
                      <div
                        key={msg.id}
                        className={`p-1.5 rounded-lg text-[11px] leading-tight ${
                          isMe
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-100 ml-3'
                            : msg.senderId === 'system'
                            ? 'bg-slate-800/60 text-slate-400 italic text-[10px]'
                            : 'bg-slate-950 border border-slate-800 text-slate-200 mr-3'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                          <strong className={isMe ? 'text-amber-300' : 'text-slate-300'}>
                            {msg.senderName} {isMe && '(You)'}
                          </strong>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="break-words font-sans">{msg.text}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Emote chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 scrollbar-none">
                  {[
                    { e: '🪇', t: 'Shake!' },
                    { e: '💃', t: 'Conga!' },
                    { e: '🔥', t: 'Fire!' },
                    { e: '👑', t: 'Emperor!' },
                    { e: '🎉', t: 'GG!' },
                  ].map((chip) => (
                    <button
                      key={chip.t}
                      onClick={() => {
                        sendMsg({
                          type: 'chat',
                          text: `${chip.e} ${chip.t}`,
                          senderName: playerLeader.name,
                        });
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-bold border border-slate-700 flex items-center gap-0.5 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <span>{chip.e}</span>
                      <span>{chip.t}</span>
                    </button>
                  ))}
                </div>

                {/* Text Message Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatInputText.trim()) return;
                    sendMsg({
                      type: 'chat',
                      text: chatInputText.trim(),
                      senderName: playerLeader.name,
                    });
                    setChatInputText('');
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Type ballroom message..."
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    maxLength={100}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs rounded-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Real-Time Multiplayer Duel Modal */}
      {activeDuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center animate-in zoom-in-95">
            {/* Duel Header */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💥</span>
                <span className="font-display font-extrabold text-amber-400 uppercase tracking-wide">
                  {activeDuel.type === 'pvp' ? 'Live Player vs Player Duel!' : 'Recruitment Duel!'}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {activeDuel.status === 'revealed' ? 'Duel Resolved' : 'Rock Paper Scissors'}
              </span>
            </div>

            {/* Duelists Stage */}
            <div className="w-full grid grid-cols-2 gap-4 items-center justify-items-center my-4 py-4 bg-slate-950/70 rounded-xl border border-slate-800 px-4">
              {/* You */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  {myPlayer && (
                    <DancerSprite
                      character={{
                        id: myPlayer.id,
                        name: myPlayer.name,
                        title: 'You',
                        hat: myPlayer.hat,
                        hairColor: myPlayer.hairColor,
                        shirtColor: myPlayer.shirtColor,
                        pantsColor: myPlayer.pantsColor,
                        skinTone: myPlayer.skinTone,
                        accessoryColor: '#facc15',
                        personality: 'balanced',
                        bio: '',
                        quote: '',
                        danceStyle: '',
                      }}
                      size={76}
                      isDancing={activeDuel.status !== 'revealed'}
                      isLeader={true}
                      facing="right"
                    />
                  )}
                  {myDuelChoice && (
                    <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 font-bold w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 border-white shadow">
                      {activeDuel.status === 'revealed' ? MOVE_ICONS[myDuelChoice].emoji : '🔒'}
                    </div>
                  )}
                </div>
                <div className="font-bold text-white text-sm">{myPlayer?.name || 'You'}</div>
                <div className="text-[11px] text-amber-400">Your Conga ({myPlayer?.followers.length || 0})</div>
              </div>

              {/* Opponent */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <DancerSprite
                    character={activeDuel.opponentCharacter}
                    size={76}
                    isDancing={activeDuel.status !== 'revealed' || activeDuel.winnerId === myId}
                    isLeader={true}
                    facing="left"
                  />
                  {activeDuel.status === 'revealed' && activeDuel.p2Choice && (
                    <div className="absolute -top-3 -left-3 bg-indigo-500 text-white font-bold w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 border-white shadow">
                      {MOVE_ICONS[activeDuel.p2Choice].emoji}
                    </div>
                  )}
                  {activeDuel.status !== 'revealed' && activeDuel.p2Choice && (
                    <div className="absolute -top-3 -left-3 bg-indigo-500 text-white font-bold w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 border-white shadow">
                      🔒
                    </div>
                  )}
                </div>
                <div className="font-bold text-white text-sm">{activeDuel.opponentCharacter.name}</div>
                <div className="text-[11px] text-indigo-400">{activeDuel.opponentCharacter.title}</div>
              </div>
            </div>

            {/* Duel Result or Prompt */}
            <div className="my-3 text-center min-h-[3.5rem] flex flex-col items-center justify-center">
              {activeDuel.status === 'revealed' ? (
                <div className="space-y-1">
                  <div
                    className={`font-display text-2xl font-black uppercase ${
                      activeDuel.winnerId === myId
                        ? 'text-emerald-400'
                        : activeDuel.winnerId === 'tie'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {activeDuel.winnerId === myId && '🎉 VICTORY! CONGA RECRUITED! 🎉'}
                    {activeDuel.winnerId === 'tie' && '🤝 DRAW! IT WAS A TIE! 🤝'}
                    {activeDuel.winnerId !== myId && activeDuel.winnerId !== 'tie' && '💀 DEFEAT! FORCED TO JOIN THEIR CONGA LINE! 💀'}
                  </div>
                  <p className="text-xs text-slate-300">
                    {activeDuel.winnerId !== myId && activeDuel.winnerId !== 'tie'
                      ? `You lost the duel! Your line was absorbed and you are forced to dance behind ${activeDuel.opponentCharacter.name}!`
                      : activeDuel.explanation}
                  </p>
                </div>
              ) : myDuelChoice === null ? (
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Select your move before the beat!
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold animate-pulse">
                  <span>🔒 Move locked! Waiting for opponent to reveal...</span>
                </div>
              )}
            </div>

            {/* RPS Selection Buttons */}
            {activeDuel.status !== 'revealed' && (
              <div className="w-full grid grid-cols-3 gap-3 mt-2">
                {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
                  <button
                    key={move}
                    disabled={myDuelChoice !== null}
                    onClick={() => handleSelectDuelMove(move)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      myDuelChoice === move
                        ? 'bg-amber-500 text-slate-950 border-white font-bold scale-105'
                        : 'bg-slate-800 text-white border-slate-700 hover:border-amber-400'
                    } disabled:opacity-50 cursor-pointer`}
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
    </div>
  );
};
