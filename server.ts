import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  Character,
  ClientToServerMsg,
  Move,
  MultiplayerDuel,
  MultiplayerPlayer,
  MultiplayerRoomState,
  PowerUp,
  RoomFeedEvent,
  ServerToClientMsg,
} from './src/types/game.ts';
import { CHARACTERS_ROSTER } from './src/data/characters.ts';

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// WebSocket Server attached to HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

interface RoomData {
  id: string;
  players: Map<WebSocket, MultiplayerPlayer>;
  roamingDancers: {
    id: string;
    character: Character;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }[];
  powerUps: PowerUp[];
  activeDuels: Map<string, MultiplayerDuel>;
  events: RoomFeedEvent[];
  lastPowerUpSpawn: number;
}

const rooms = new Map<string, RoomData>();

function getOrCreateRoom(roomId: string): RoomData {
  let room = rooms.get(roomId);
  if (!room) {
    // Generate initial roaming dancers
    const roaming = CHARACTERS_ROSTER.slice(0, 10).map((char, i) => ({
      id: `roamer_${char.id}_${i}`,
      character: char,
      x: 120 + Math.random() * 700,
      y: 100 + Math.random() * 440,
      vx: (Math.random() - 0.5) * 1.6,
      vy: (Math.random() - 0.5) * 1.6,
    }));

    room = {
      id: roomId,
      players: new Map(),
      roamingDancers: roaming,
      powerUps: [
        {
          id: `pu_init_${Date.now()}`,
          type: 'fever',
          x: 350,
          y: 280,
          label: 'Golden Maracas',
          durationMs: 12000,
          expiresAt: Date.now() + 60000,
        },
      ],
      activeDuels: new Map(),
      events: [
        {
          id: `ev_welcome_${Date.now()}`,
          text: `Carnival Ballroom ${roomId} is open! Form the longest Conga Line!`,
          type: 'join',
          timestamp: Date.now(),
        },
      ],
      lastPowerUpSpawn: Date.now(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(room: RoomData, msg: ServerToClientMsg, exceptWs?: WebSocket) {
  const data = JSON.stringify(msg);
  room.players.forEach((_, ws) => {
    if (ws !== exceptWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function getRoomState(room: RoomData): MultiplayerRoomState {
  const playersObj: Record<string, MultiplayerPlayer> = {};
  room.players.forEach((p) => {
    playersObj[p.id] = p;
  });

  const duelsObj: Record<string, MultiplayerDuel> = {};
  room.activeDuels.forEach((d) => {
    duelsObj[d.id] = d;
  });

  return {
    roomId: room.id,
    players: playersObj,
    roamingDancers: room.roamingDancers,
    powerUps: room.powerUps,
    activeDuels: duelsObj,
    events: room.events.slice(-15),
  };
}

function resolveRPS(move1: Move, move2: Move): 'win' | 'lose' | 'tie' {
  if (move1 === move2) return 'tie';
  if (
    (move1 === 'rock' && move2 === 'scissors') ||
    (move1 === 'scissors' && move2 === 'paper') ||
    (move1 === 'paper' && move2 === 'rock')
  ) {
    return 'win';
  }
  return 'lose';
}

// Room Simulation & Tick Loop
setInterval(() => {
  rooms.forEach((room) => {
    // 1. Move roaming dancers
    room.roamingDancers.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 40 || d.x > 920) d.vx *= -1;
      if (d.y < 40 || d.y > 600) d.vy *= -1;
    });

    // 2. Spawn Power-Ups if needed
    if (Date.now() - room.lastPowerUpSpawn > 20000 && room.powerUps.length < 3) {
      room.lastPowerUpSpawn = Date.now();
      const types = ['fever', 'glasses', 'magnet', 'speed'] as const;
      const type = types[Math.floor(Math.random() * types.length)];
      room.powerUps.push({
        id: `pu_${Date.now()}`,
        type,
        x: 100 + Math.random() * 760,
        y: 100 + Math.random() * 440,
        label: type.toUpperCase(),
        durationMs: 12000,
        expiresAt: Date.now() + 30000,
      });
    }

    // Clean expired powerups
    room.powerUps = room.powerUps.filter((p) => p.expiresAt > Date.now());

    // 3. Periodic Sync to all clients in room
    const playersObj: Record<string, MultiplayerPlayer> = {};
    room.players.forEach((p) => {
      playersObj[p.id] = p;
    });

    broadcastToRoom(room, {
      type: 'state_sync',
      players: playersObj,
      roamingDancers: room.roamingDancers,
      powerUps: room.powerUps,
    });
  });
}, 250);

// WebSocket Connection handling
wss.on('connection', (ws: WebSocket) => {
  let currentRoom: RoomData | null = null;
  let playerId: string | null = null;

  ws.on('message', (raw: string) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientToServerMsg;

      switch (msg.type) {
        case 'join': {
          const roomId = msg.roomId || 'carnival-main';
          currentRoom = getOrCreateRoom(roomId);
          playerId = `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

          const newPlayer: MultiplayerPlayer = {
            ...msg.player,
            id: playerId,
            followers: [],
            inDuelId: null,
            isFollowerOf: null,
            trail: [],
            lastActive: Date.now(),
          };

          currentRoom.players.set(ws, newPlayer);

          const joinEvent: RoomFeedEvent = {
            id: `ev_${Date.now()}`,
            text: `${newPlayer.name} joined the dance floor!`,
            type: 'join',
            timestamp: Date.now(),
          };
          currentRoom.events.push(joinEvent);

          // Send init state to the joining player
          ws.send(
            JSON.stringify({
              type: 'init',
              yourId: playerId,
              state: getRoomState(currentRoom),
            } satisfies ServerToClientMsg)
          );

          // Broadcast to everyone else
          broadcastToRoom(
            currentRoom,
            {
              type: 'player_joined',
              player: newPlayer,
              event: joinEvent,
            },
            ws
          );
          break;
        }

        case 'move': {
          if (!currentRoom || !playerId) return;
          const player = currentRoom.players.get(ws);
          if (!player) return;

          player.x = msg.x;
          player.y = msg.y;
          player.angle = msg.angle;
          player.trail = msg.trail;
          player.lastActive = Date.now();

          // Broadcast movement delta
          broadcastToRoom(
            currentRoom,
            {
              type: 'player_moved',
              playerId,
              x: msg.x,
              y: msg.y,
              angle: msg.angle,
              trail: msg.trail,
            },
            ws
          );
          break;
        }

        case 'duel:init_pve': {
          if (!currentRoom || !playerId) return;
          const player = currentRoom.players.get(ws);
          if (!player || player.inDuelId) return;

          const dancer = currentRoom.roamingDancers.find((d) => d.id === msg.dancerId);
          if (!dancer) return;

          const duelId = `duel_${Date.now()}_${playerId}`;
          const duel: MultiplayerDuel = {
            id: duelId,
            type: 'pve',
            player1Id: playerId,
            opponentCharacter: dancer.character,
            p1Choice: null,
            p2Choice: null,
            status: 'countdown',
            countdown: 3,
            expiresAt: Date.now() + 15000,
          };

          currentRoom.activeDuels.set(duelId, duel);
          player.inDuelId = duelId;

          ws.send(JSON.stringify({ type: 'duel_started', duel } satisfies ServerToClientMsg));
          break;
        }

        case 'duel:init_pvp': {
          if (!currentRoom || !playerId) return;
          const player1 = currentRoom.players.get(ws);
          if (!player1 || player1.inDuelId) return;

          // Find target player
          let targetWs: WebSocket | null = null;
          let targetPlayer: MultiplayerPlayer | null = null;
          for (const [w, p] of currentRoom.players.entries()) {
            if (p.id === msg.targetPlayerId) {
              targetWs = w;
              targetPlayer = p;
              break;
            }
          }

          if (!targetPlayer || !targetWs || targetPlayer.inDuelId) return;

          const duelId = `pvp_${Date.now()}_${playerId}_${targetPlayer.id}`;
          const duel: MultiplayerDuel = {
            id: duelId,
            type: 'pvp',
            player1Id: playerId,
            player2Id: targetPlayer.id,
            opponentCharacter: {
              id: targetPlayer.id,
              name: targetPlayer.name,
              title: `${targetPlayer.followers.length + 1}-Dancer Leader`,
              hat: targetPlayer.hat,
              hairColor: targetPlayer.hairColor,
              shirtColor: targetPlayer.shirtColor,
              pantsColor: targetPlayer.pantsColor,
              skinTone: targetPlayer.skinTone,
              accessoryColor: '#facc15',
              personality: 'balanced',
              bio: `Challenged in live multiplayer!`,
              quote: `My conga line won't bow to yours!`,
              danceStyle: 'Carnival Stomp',
            },
            p1Choice: null,
            p2Choice: null,
            status: 'countdown',
            countdown: 3,
            expiresAt: Date.now() + 18000,
          };

          currentRoom.activeDuels.set(duelId, duel);
          player1.inDuelId = duelId;
          targetPlayer.inDuelId = duelId;

          const duelMsg = JSON.stringify({ type: 'duel_started', duel } satisfies ServerToClientMsg);
          ws.send(duelMsg);
          (targetWs as WebSocket).send(duelMsg);

          const clashEvent: RoomFeedEvent = {
            id: `ev_${Date.now()}`,
            text: `💥 CLASH: ${player1.name} and ${targetPlayer.name} entered an RPS Duel!`,
            type: 'duel',
            timestamp: Date.now(),
          };
          currentRoom.events.push(clashEvent);
          broadcastToRoom(currentRoom, { type: 'event_feed', event: clashEvent });
          break;
        }

        case 'duel:submit_move': {
          if (!currentRoom || !playerId) return;
          const duel = currentRoom.activeDuels.get(msg.duelId);
          if (!duel) return;

          if (duel.type === 'pve') {
            duel.p1Choice = msg.move;
            // AI moves
            const moves: Move[] = ['rock', 'paper', 'scissors'];
            duel.p2Choice = moves[Math.floor(Math.random() * moves.length)];
            duel.status = 'revealed';

            const res = resolveRPS(duel.p1Choice, duel.p2Choice);
            const p1 = currentRoom.players.get(ws);

            if (res === 'win') {
              duel.winnerId = playerId;
              duel.explanation = `${duel.p1Choice.toUpperCase()} beats ${duel.p2Choice.toUpperCase()}! Opponent recruited!`;
              if (p1) {
                p1.followers.push(duel.opponentCharacter);
                // Remove from roaming dancers
                currentRoom.roamingDancers = currentRoom.roamingDancers.filter(
                  (d) => d.character.id !== duel.opponentCharacter.id
                );
              }
            } else if (res === 'lose') {
              duel.winnerId = 'opponent';
              duel.explanation = `${duel.p2Choice.toUpperCase()} beats ${duel.p1Choice.toUpperCase()}! Dancer escaped!`;
              // Penalty: lose a follower if any
              if (p1 && p1.followers.length > 0) {
                const released = p1.followers.pop()!;
                currentRoom.roamingDancers.push({
                  id: `roamer_${released.id}_${Date.now()}`,
                  character: released,
                  x: p1.x + 30,
                  y: p1.y + 30,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: (Math.random() - 0.5) * 1.5,
                });
              }
            } else {
              duel.winnerId = 'tie';
              duel.explanation = `Both played ${duel.p1Choice.toUpperCase()}! Draw!`;
            }

            if (p1) p1.inDuelId = null;
            currentRoom.activeDuels.delete(duel.id);

            const updatedPlayers: Record<string, MultiplayerPlayer> = {};
            currentRoom.players.forEach((p) => {
              updatedPlayers[p.id] = p;
            });

            const event: RoomFeedEvent = {
              id: `ev_${Date.now()}`,
              text: res === 'win'
                ? `🎉 ${p1?.name} recruited ${duel.opponentCharacter.name}! Conga line is now ${p1 ? p1.followers.length + 1 : 1} long!`
                : `${p1?.name} tied or lost to ${duel.opponentCharacter.name}!`,
              type: 'recruit',
              timestamp: Date.now(),
            };
            currentRoom.events.push(event);

            ws.send(
              JSON.stringify({
                type: 'duel_resolved',
                duel,
                event,
                updatedPlayers,
              } satisfies ServerToClientMsg)
            );
          } else if (duel.type === 'pvp') {
            // PvP duel logic
            if (playerId === duel.player1Id) {
              duel.p1Choice = msg.move;
            } else if (playerId === duel.player2Id) {
              duel.p2Choice = msg.move;
            }

            // If both players have made their choice
            if (duel.p1Choice && duel.p2Choice) {
              duel.status = 'revealed';
              const p1 = [...currentRoom.players.values()].find((p) => p.id === duel.player1Id);
              const p2 = [...currentRoom.players.values()].find((p) => p.id === duel.player2Id);

              const outcome = resolveRPS(duel.p1Choice, duel.p2Choice);
              let winnerPlayer: MultiplayerPlayer | null = null;
              let loserPlayer: MultiplayerPlayer | null = null;

              if (outcome === 'win') {
                duel.winnerId = duel.player1Id;
                winnerPlayer = p1 || null;
                loserPlayer = p2 || null;
              } else if (outcome === 'lose') {
                duel.winnerId = duel.player2Id;
                winnerPlayer = p2 || null;
                loserPlayer = p1 || null;
              } else {
                duel.winnerId = 'tie';
              }

              if (winnerPlayer && loserPlayer) {
                // The winner absorbs the loser's dancers!
                const stolen = [...loserPlayer.followers];
                loserPlayer.followers = [];
                winnerPlayer.followers.push(...stolen);

                // Plus, the loser character themselves follows the winner in the conga line!
                winnerPlayer.followers.push({
                  id: `dancer_rep_${loserPlayer.id}_${Date.now()}`,
                  name: loserPlayer.name,
                  title: 'Defeated Rival',
                  hat: loserPlayer.hat,
                  hairColor: loserPlayer.hairColor,
                  shirtColor: loserPlayer.shirtColor,
                  pantsColor: loserPlayer.pantsColor,
                  skinTone: loserPlayer.skinTone,
                  accessoryColor: '#facc15',
                  personality: 'balanced',
                  bio: `Recruited after an epic RPS PvP clash!`,
                  quote: `Leading the conga was fun while it lasted!`,
                  danceStyle: 'Follower Shuffle',
                });
              }

              if (p1) p1.inDuelId = null;
              if (p2) p2.inDuelId = null;
              currentRoom.activeDuels.delete(duel.id);

              const updatedPlayers: Record<string, MultiplayerPlayer> = {};
              currentRoom.players.forEach((p) => {
                updatedPlayers[p.id] = p;
              });

              const winEvent: RoomFeedEvent = {
                id: `ev_${Date.now()}`,
                text: duel.winnerId === 'tie'
                  ? `🤝 ${p1?.name} and ${p2?.name} tied with ${duel.p1Choice.toUpperCase()}!`
                  : `🏆 ${winnerPlayer?.name} DEFEATED ${loserPlayer?.name} and absorbed their conga line! Total line: ${winnerPlayer?.followers.length! + 1}!`,
                type: 'duel',
                timestamp: Date.now(),
              };
              currentRoom.events.push(winEvent);

              broadcastToRoom(currentRoom, {
                type: 'duel_resolved',
                duel,
                event: winEvent,
                updatedPlayers,
              });
            } else {
              // Broadcast progress (one player has locked in!)
              broadcastToRoom(currentRoom, {
                type: 'duel_progress',
                duel,
              });
            }
          }
          break;
        }

        case 'pickup_powerup': {
          if (!currentRoom) return;
          const idx = currentRoom.powerUps.findIndex((p) => p.id === msg.powerUpId);
          if (idx !== -1) {
            currentRoom.powerUps.splice(idx, 1);
          }
          break;
        }

        case 'send_emote': {
          if (!currentRoom || !playerId) return;
          const player = currentRoom.players.get(ws);
          if (!player) return;

          const emote = {
            emoji: msg.emoji,
            text: msg.text,
            expiresAt: Date.now() + 4000,
          };
          player.activeEmote = emote;

          broadcastToRoom(currentRoom, {
            type: 'player_emote',
            playerId,
            emote,
          });
          break;
        }

        case 'chat': {
          if (!currentRoom || !playerId) return;
          const player = currentRoom.players.get(ws);
          const senderName = msg.senderName || (player ? player.name : 'Dancer');
          const cleanText = (msg.text || '').trim().slice(0, 140);
          if (!cleanText) return;

          const chatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            senderId: playerId,
            senderName,
            text: cleanText,
            timestamp: Date.now(),
          };

          broadcastToRoom(currentRoom, {
            type: 'chat_message',
            message: chatMessage,
          });
          break;
        }

        case 'break_free': {
          if (!currentRoom || !playerId) return;
          const player = currentRoom.players.get(ws);
          if (!player) return;

          // If was a follower of another player, remove from their conga train
          if (player.isFollowerOf) {
            for (const other of currentRoom.players.values()) {
              if (other.id === player.isFollowerOf) {
                other.followers = other.followers.filter((f) => !f.id.includes(player.id));
              }
            }
          }

          player.isFollowerOf = null;
          player.followers = [];
          player.inDuelId = null;
          player.x = 100 + Math.random() * 760;
          player.y = 100 + Math.random() * 440;
          player.trail = [];

          const respawnEvent: RoomFeedEvent = {
            id: `ev_respawn_${Date.now()}`,
            text: `⚡ ${player.name} broke free from the conga line and is now leading a new dance train!`,
            type: 'join',
            timestamp: Date.now(),
          };
          currentRoom.events.push(respawnEvent);

          const updatedPlayers: Record<string, MultiplayerPlayer> = {};
          currentRoom.players.forEach((p) => {
            updatedPlayers[p.id] = p;
          });

          broadcastToRoom(currentRoom, {
            type: 'state_sync',
            players: updatedPlayers,
            roamingDancers: currentRoom.roamingDancers,
            powerUps: currentRoom.powerUps,
          });
          broadcastToRoom(currentRoom, {
            type: 'event_feed',
            event: respawnEvent,
          });
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && playerId) {
      const leavingPlayer = currentRoom.players.get(ws);
      currentRoom.players.delete(ws);

      const leaveEvent: RoomFeedEvent = {
        id: `ev_${Date.now()}`,
        text: `${leavingPlayer?.name || 'A dancer'} stepped off the floor.`,
        type: 'leave',
        timestamp: Date.now(),
      };
      currentRoom.events.push(leaveEvent);

      broadcastToRoom(currentRoom, {
        type: 'player_left',
        playerId,
        event: leaveEvent,
      });

      if (currentRoom.players.size === 0) {
        // Clean room after some time if empty
      }
    }
  });
});

// Configure Vite middleware in development or Express static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Conga Clash Server with WebSockets listening on port ${PORT}`);
  });
}

startServer();
