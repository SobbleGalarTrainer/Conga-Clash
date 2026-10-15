import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Character,
  Move,
  DuelResult,
  MultiplayerPlayer,
  ClientToServerMsg,
  ServerToClientMsg,
  ChatMessage,
  PowerUp,
} from '../types/game';
import { CHARACTERS_ROSTER } from '../data/characters';
import {
  create3DDancer,
  updateDancerAnimation,
  setupStudioEnvironment,
  createParquetFloorTexture,
} from '../utils/threeDancer';
import { audioSystem } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

interface ThreeMultiplayerModeProps {
  playerLeader: Character;
  onBackToMenu: () => void;
  onUpdateStats?: (recruits: number, won: boolean, tied: boolean, placement?: number) => void;
}

interface Dancer3DVisual {
  group: THREE.Group;
  trail: { x: number; z: number; angle: number }[];
  speechBubble?: THREE.Sprite;
  speechText?: string;
  speechExpiresAt?: number;
}

export const ThreeMultiplayerMode: React.FC<ThreeMultiplayerModeProps> = ({
  playerLeader,
  onBackToMenu,
  onUpdateStats,
}) => {
  const { user, addCoins, incrementMissionProgress, recordHighScore } = useAuth();
  const mountRef = useRef<HTMLDivElement>(null);

  // Network State
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [roomName, setRoomName] = useState<string>('grand_ballroom_3d');
  const [myId, setMyId] = useState<string>('');
  const [players, setPlayers] = useState<Record<string, MultiplayerPlayer>>({});
  const [activeDuel, setActiveDuel] = useState<{
    duelId: string;
    challengerId: string;
    opponentId: string;
    round: number;
    choice: Move | null;
    opponentChoice: Move | null;
    result: DuelResult | null;
    status: 'choosing' | 'revealed';
    expiresAt: number;
  } | null>(null);

  // In-Game Ballroom Chat State
  const [chatMessages, setChatMessages] = useState<{ id: string; senderId: string; senderName: string; text: string; timestamp: number; isEmote?: boolean }[]>([
    { id: 'm1', senderId: 'sys', senderName: 'Carnival Host', text: 'Welcome to the 3D Live Ballroom! Steer with WASD / Arrows or mouse.', timestamp: Date.now() },
  ]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Break free state
  const [breakFreeTaps, setBreakFreeTaps] = useState(0);

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const discoBallRef = useRef<THREE.Group | null>(null);

  // Dancer 3D Object Cache (id -> Dancer3DVisual)
  const dancerVisualsRef = useRef<Map<string, Dancer3DVisual>>(new Map());
  const followerVisualsRef = useRef<Map<string, THREE.Group[]>>(new Map());
  const soloVisualsRef = useRef<Map<string, THREE.Group>>(new Map());

  // WebSocket & Physics State
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string>('');
  const localPlayerStateRef = useRef<{ x: number; z: number; angle: number; speed: number }>({
    x: 0,
    z: 0,
    angle: 0,
    speed: 0,
  });
  const keysRef = useRef<{ [k: string]: boolean }>({});
  const cameraModeRef = useRef<'third_person' | 'birds_eye'>('third_person');
  const [cameraMode, setCameraMode] = useState<'third_person' | 'birds_eye'>('third_person');

  // Quick Emotes
  const QUICK_EMOTES = ['🎉', '🪇', '👑', '🔥', '💃', '🎺', '👏', '🥳', '😎', '⚡'];

  // Send message helper
  const sendMsg = useCallback((msg: ClientToServerMsg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Send Chat or Emote
  const handleSendChat = (textToSend?: string) => {
    const raw = textToSend !== undefined ? textToSend : chatInputText;
    const trimmed = raw.trim();
    if (!trimmed) return;

    sendMsg({
      type: 'chat',
      text: trimmed,
      senderName: user.displayName,
    });

    if (textToSend === undefined) {
      setChatInputText('');
    }
  };

  const handleSendEmote = (emote: string) => {
    sendMsg({ type: 'send_emote', emoji: emote, text: emote });
    sendMsg({ type: 'chat', text: emote, senderName: user.displayName });
  };

  // Connect to WebSocket Server
  useEffect(() => {
    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      sendMsg({
        type: 'join',
        roomId: roomName,
        player: {
          name: user.displayName,
          hat: playerLeader.hat,
          hairColor: playerLeader.hairColor,
          shirtColor: playerLeader.shirtColor,
          pantsColor: playerLeader.pantsColor,
          skinTone: playerLeader.skinTone,
          x: (Math.random() - 0.5) * 300,
          y: (Math.random() - 0.5) * 300,
          angle: 0,
        },
      });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerToClientMsg;
        switch (msg.type) {
          case 'init':
            setMyId(msg.yourId);
            myIdRef.current = msg.yourId;
            setPlayers(msg.state.players);
            if (msg.state.players[msg.yourId]) {
              localPlayerStateRef.current.x = (msg.state.players[msg.yourId].x - 480) * 0.05;
              localPlayerStateRef.current.z = (msg.state.players[msg.yourId].y - 320) * 0.05;
            }
            break;

          case 'state_sync':
            setPlayers((prev) => ({ ...prev, ...msg.players }));
            break;

          case 'player_joined':
            setPlayers((prev) => ({ ...prev, [msg.player.id]: msg.player }));
            setChatMessages((prev) => [
              ...prev.slice(-40),
              { id: 'join_' + Date.now(), senderId: 'sys', senderName: 'Ballroom', text: `${msg.player.name} joined the 3D dance floor!`, timestamp: Date.now() },
            ]);
            break;

          case 'player_left':
            setPlayers((prev) => {
              const copy = { ...prev };
              delete copy[msg.playerId];
              return copy;
            });
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

          case 'chat_message':
            setChatMessages((prev) => [
              ...prev.slice(-40),
              {
                id: msg.message.id,
                senderId: msg.message.senderId,
                senderName: msg.message.senderName,
                text: msg.message.text,
                timestamp: msg.message.timestamp,
              },
            ]);
            audioSystem.playMoveHover();
            break;

          case 'player_emote':
            setChatMessages((prev) => [
              ...prev.slice(-40),
              {
                id: 'emote_' + Math.random(),
                senderId: msg.playerId,
                senderName: players[msg.playerId]?.name || 'Dancer',
                text: msg.emote?.emoji || msg.emote?.text || '💃',
                timestamp: Date.now(),
                isEmote: true,
              },
            ]);
            audioSystem.playMoveHover();
            break;

          case 'duel_started':
            if (msg.duel.player1Id === myIdRef.current || msg.duel.player2Id === myIdRef.current) {
              setActiveDuel({
                duelId: msg.duel.id,
                challengerId: msg.duel.player1Id,
                opponentId: msg.duel.player2Id || 'rival',
                round: 1,
                choice: null,
                opponentChoice: null,
                result: null,
                status: 'choosing',
                expiresAt: Date.now() + 6000,
              });
              audioSystem.playDuelStart();
            }
            break;

          case 'duel_resolved':
            if (activeDuel && activeDuel.duelId === msg.duel.id) {
              const won = msg.duel.winnerId === myIdRef.current;
              const tied = msg.duel.winnerId === 'tie';
              const isP1 = msg.duel.player1Id === myIdRef.current;
              const myMove = isP1 ? msg.duel.p1Choice : msg.duel.p2Choice;
              const opMove = isP1 ? msg.duel.p2Choice : msg.duel.p1Choice;

              setActiveDuel((prev) =>
                prev
                  ? {
                      ...prev,
                      choice: myMove,
                      opponentChoice: opMove,
                      result: tied ? 'tie' : won ? 'win' : 'lose',
                      status: 'revealed',
                    }
                  : null
              );

              if (won) {
                audioSystem.playWinRecruit();
                audioSystem.playFanfare();
                addCoins(25, '3D Multiplayer Duel Win');
                incrementMissionProgress('duels', 1);
              } else if (!tied) {
                audioSystem.playLoseCrash();
              }

              setTimeout(() => {
                setActiveDuel(null);
              }, 2500);
            }
            break;
        }
      } catch (e) {
        console.warn('Error parsing WS frame:', e);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [roomName, user.displayName, playerLeader, sendMsg, addCoins, incrementMissionProgress]);

  // Handle Movement Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      keysRef.current[e.key] = true;
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize Three.js 3D Ballroom
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.015);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 9, 14);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    setupStudioEnvironment(renderer, scene);

    // 4. Lighting & Ambience
    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x080820, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
    dirLight.position.set(8, 18, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Dynamic Colored Ballroom Spotlights
    const spotMagenta = new THREE.SpotLight(0xf43f5e, 5, 30, Math.PI / 4, 0.4);
    spotMagenta.position.set(-12, 12, -12);
    scene.add(spotMagenta);

    const spotCyan = new THREE.SpotLight(0x06b6d4, 5, 30, Math.PI / 4, 0.4);
    spotCyan.position.set(12, 12, -12);
    scene.add(spotCyan);

    const spotGold = new THREE.SpotLight(0xf59e0b, 5, 30, Math.PI / 4, 0.4);
    spotGold.position.set(0, 14, 12);
    scene.add(spotGold);

    // 5. Parquet Floor
    const floorTexture = createParquetFloorTexture();
    floorTexture.repeat.set(16, 16);
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.35,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Glowing Ballroom Border Railing
    const railingGeo = new THREE.BoxGeometry(60, 0.8, 0.4);
    const railingMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    const r1 = new THREE.Mesh(railingGeo, railingMat);
    r1.position.set(0, 0.4, -30);
    scene.add(r1);
    const r2 = new THREE.Mesh(railingGeo, railingMat);
    r2.position.set(0, 0.4, 30);
    scene.add(r2);
    const rSideGeo = new THREE.BoxGeometry(0.4, 0.8, 60);
    const r3 = new THREE.Mesh(rSideGeo, railingMat);
    r3.position.set(-30, 0.4, 0);
    scene.add(r3);
    const r4 = new THREE.Mesh(rSideGeo, railingMat);
    r4.position.set(30, 0.4, 0);
    scene.add(r4);

    // 6. Centerpiece Disco Ball
    const discoGroup = new THREE.Group();
    const ballGeo = new THREE.DodecahedronGeometry(1.2, 3);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.05,
    });
    const discoBall = new THREE.Mesh(ballGeo, ballMat);
    discoBall.position.y = 8;
    discoGroup.add(discoBall);

    const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 6, 8);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.y = 11;
    discoGroup.add(rod);
    scene.add(discoGroup);
    discoBallRef.current = discoGroup;

    // 7. Confetti Sparkles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const palette = [
      new THREE.Color(0xf59e0b),
      new THREE.Color(0xec4899),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x10b981),
      new THREE.Color(0xa855f7),
    ];

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 50;
      particlePos[i * 3 + 1] = Math.random() * 10;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      const c = palette[i % palette.length];
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 8. Main Render & Simulation Loop
    let lastTime = performance.now();
    let animFrameId: number;

    const animate = (timeNow: number) => {
      animFrameId = requestAnimationFrame(animate);
      const delta = Math.min((timeNow - lastTime) / 1000, 0.1);
      lastTime = timeNow;
      const timeSec = timeNow * 0.001;

      // Rotate Disco Ball
      if (discoBallRef.current) {
        discoBallRef.current.rotation.y += delta * 0.4;
      }

      // Rotate Spotlights
      spotMagenta.position.x = Math.sin(timeSec * 0.8) * 14;
      spotMagenta.position.z = Math.cos(timeSec * 0.8) * 14;
      spotCyan.position.x = -Math.sin(timeSec * 0.7) * 14;
      spotCyan.position.z = -Math.cos(timeSec * 0.7) * 14;

      // Animate floating confetti
      const posAttr = particleGeo.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3 + 1] -= delta * 0.6;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 10;
        }
      }
      posAttr.needsUpdate = true;

      // Local Player Movement Physics
      const lp = localPlayerStateRef.current;
      const keys = keysRef.current;
      let moveX = 0;
      let moveZ = 0;

      if (keys['w'] || keys['W'] || keys['ArrowUp']) moveZ -= 1;
      if (keys['s'] || keys['S'] || keys['ArrowDown']) moveZ += 1;
      if (keys['a'] || keys['A'] || keys['ArrowLeft']) moveX -= 1;
      if (keys['d'] || keys['D'] || keys['ArrowRight']) moveX += 1;

      const len = Math.hypot(moveX, moveZ);
      if (len > 0) {
        const speed = 7.5;
        lp.x += (moveX / len) * speed * delta;
        lp.z += (moveZ / len) * speed * delta;
        lp.angle = Math.atan2(moveX, moveZ);

        // Bound to dance floor
        lp.x = Math.max(-28, Math.min(28, lp.x));
        lp.z = Math.max(-28, Math.min(28, lp.z));

        // Transmit coordinates to server periodically
        sendMsg({
          type: 'move',
          x: lp.x * 20 + 480,
          y: lp.z * 20 + 320,
          angle: lp.angle,
          trail: [{ x: lp.x * 20 + 480, y: lp.z * 20 + 320 }],
        });
      }

      // Smooth Camera Follow
      if (cameraRef.current) {
        if (cameraModeRef.current === 'third_person') {
          const targetCamX = lp.x - Math.sin(lp.angle) * 7;
          const targetCamZ = lp.z - Math.cos(lp.angle) * 7;
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, targetCamX, 5, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 6.5, 4, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, targetCamZ, 5, delta);
          cameraRef.current.lookAt(lp.x, 1.2, lp.z);
        } else {
          // Bird's Eye view
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, lp.x, 4, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 18, 4, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, lp.z + 10, 4, delta);
          cameraRef.current.lookAt(lp.x, 0, lp.z);
        }
      }

      // Render & Animate all 3D Dancers in scene
      dancerVisualsRef.current.forEach((vis, id) => {
        const isMe = id === myIdRef.current;
        if (isMe) {
          vis.group.position.x = lp.x;
          vis.group.position.z = lp.z;
          vis.group.rotation.y = lp.angle;
        }
        updateDancerAnimation(vis.group, timeSec, true, len > 0 || !isMe ? 1.0 : 0.6);
      });

      // Animate follower trains
      followerVisualsRef.current.forEach((followersList) => {
        followersList.forEach((fGroup, idx) => {
          updateDancerAnimation(fGroup, timeSec + idx * 0.15, true, 1.0);
        });
      });

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    // Handle Resize
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [sendMsg]);

  // Sync 3D Dancer Models with Players state
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMap = dancerVisualsRef.current;
    const playerKeys = Object.keys(players);

    // 1. Remove dancers who left
    currentMap.forEach((vis, id) => {
      if (!players[id]) {
        scene.remove(vis.group);
        currentMap.delete(id);
      }
    });

    // 2. Add or update active players
    playerKeys.forEach((pid) => {
      const p = players[pid];
      let vis = currentMap.get(pid);

      if (!vis) {
        // Create 3D dancer composite
        const dummyChar: Character = {
          id: pid,
          name: p.name,
          title: '3D Dancer',
          hat: p.hat,
          hairColor: p.hairColor,
          shirtColor: p.shirtColor,
          pantsColor: p.pantsColor,
          skinTone: p.skinTone,
          accessoryColor: '#f59e0b',
          personality: 'balanced',
          bio: '',
          quote: '',
          danceStyle: 'Salsa Conga',
        };

        const mesh = create3DDancer(dummyChar, true);
        scene.add(mesh);
        vis = { group: mesh, trail: [] };
        currentMap.set(pid, vis);
      }

      // Update position for non-local players
      if (pid !== myIdRef.current) {
        const targetX = (p.x - 480) * 0.05;
        const targetZ = (p.y - 320) * 0.05;
        vis.group.position.x = THREE.MathUtils.damp(vis.group.position.x, targetX, 10, 0.05);
        vis.group.position.z = THREE.MathUtils.damp(vis.group.position.z, targetZ, 10, 0.05);
        vis.group.rotation.y = p.angle;
      }
    });
  }, [players]);

  // Handle RPS Duel Choice
  const handleSelectDuelMove = (move: Move) => {
    if (!activeDuel || activeDuel.status !== 'choosing') return;
    sendMsg({
      type: 'duel:submit_move',
      duelId: activeDuel.duelId,
      move,
    });
    setActiveDuel((prev) => (prev ? { ...prev, choice: move } : null));
    audioSystem.playMoveSelect();
  };

  // Handle Break Free Tap
  const handleBreakFreeTap = () => {
    const next = breakFreeTaps + 1;
    setBreakFreeTaps(next);
    audioSystem.playCoinChime();
    if (next >= 5) {
      sendMsg({ type: 'break_free' });
      setBreakFreeTaps(0);
      audioSystem.playWinRecruit();
    }
  };

  const myPlayer = myId ? players[myId] : null;
  const isAbsorbed = !!myPlayer?.isFollowerOf;
  const myTrainLength = (myPlayer?.followers?.length || 0) + 1;

  return (
    <div className="w-full flex-1 flex flex-col items-center relative overflow-hidden bg-slate-950">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-[650px] sm:h-[720px] relative cursor-grab active:cursor-grabbing select-none" />

      {/* Top HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="pointer-events-auto px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
          >
            <span>←</span>
            <span>Menu</span>
          </button>

          {/* Connection Status Pill */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-white">Multiplayer 3D Ballroom</span>
            <span className="text-slate-400 font-mono text-[11px]">({Object.keys(players).length} Dancers)</span>
          </div>
        </div>

        {/* Camera Toggle & Line Length */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => {
              const next = cameraMode === 'third_person' ? 'birds_eye' : 'third_person';
              setCameraMode(next);
              cameraModeRef.current = next;
            }}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 shadow-lg cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
          >
            <span>🎥</span>
            <span>{cameraMode === 'third_person' ? '3rd Person' : "Bird's Eye"}</span>
          </button>

          <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-amber-400 flex items-center gap-1.5 shadow-lg">
            <span>🪇</span>
            <span>Line: {myTrainLength}</span>
          </div>
        </div>
      </div>

      {/* Floating In-Game Ballroom Chat Drawer / Side Card */}
      <div
        className={`absolute bottom-4 left-4 z-20 transition-all duration-300 w-80 sm:w-96 ${
          isChatOpen ? 'translate-y-0 opacity-100' : 'translate-y-[85%] opacity-90'
        }`}
      >
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">💬</span>
              <h4 className="font-display font-black text-xs text-white">Ballroom Live Chat</h4>
            </div>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer px-1.5 py-0.5 rounded"
            >
              {isChatOpen ? '▼ Hide' : '▲ Show'}
            </button>
          </div>

          {/* Chat Messages Log */}
          {isChatOpen && (
            <>
              <div className="h-36 overflow-y-auto space-y-1.5 text-xs pr-1 font-sans">
                {chatMessages.map((m) => (
                  <div key={m.id} className="leading-tight">
                    <span className={`font-bold ${m.senderId === 'sys' ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {m.senderName}:
                    </span>{' '}
                    <span className={m.isEmote ? 'text-lg' : 'text-slate-200'}>{m.text}</span>
                  </div>
                ))}
              </div>

              {/* Quick Emotes Bar */}
              <div className="flex items-center gap-1 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/60 mt-2">
                {QUICK_EMOTES.map((emo) => (
                  <button
                    key={emo}
                    onClick={() => handleSendEmote(emo)}
                    className="p-1 hover:bg-slate-800 rounded text-base cursor-pointer hover:scale-125 transition-transform"
                    title={`Send ${emo}`}
                  >
                    {emo}
                  </button>
                ))}
              </div>

              {/* Text Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-1.5 mt-1"
              >
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Chat with dancers..."
                  maxLength={100}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Active 3D Rock-Paper-Scissors Duel Modal */}
      {activeDuel && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <span className="text-4xl mb-2 inline-block animate-bounce">⚡</span>
            <h3 className="font-display font-black text-xl text-white">3D Conga Clash Duel!</h3>
            <p className="text-xs text-slate-300 mt-1">
              Choose your move! The loser links behind the winner&apos;s conga train!
            </p>

            {activeDuel.status === 'choosing' && (
              <div className="grid grid-cols-3 gap-3 my-6">
                {(['rock', 'paper', 'scissors'] as Move[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSelectDuelMove(m)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                      activeDuel.choice === m
                        ? 'bg-amber-500 border-amber-300 text-slate-950 font-black scale-105'
                        : 'bg-slate-800 border-slate-700 hover:border-amber-400 text-white'
                    }`}
                  >
                    <span className="text-3xl">
                      {m === 'rock' ? '✊' : m === 'paper' ? '✋' : '✌️'}
                    </span>
                    <span className="text-xs font-bold uppercase">{m}</span>
                  </button>
                ))}
              </div>
            )}

            {activeDuel.status === 'revealed' && (
              <div className="my-6">
                <div className="flex items-center justify-center gap-6 text-3xl">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1">You</span>
                    <span>{activeDuel.choice === 'rock' ? '✊' : activeDuel.choice === 'paper' ? '✋' : '✌️'}</span>
                  </div>
                  <span className="text-xl font-black text-amber-400">VS</span>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1">Rival</span>
                    <span>{activeDuel.opponentChoice === 'rock' ? '✊' : activeDuel.opponentChoice === 'paper' ? '✋' : '✌️'}</span>
                  </div>
                </div>

                <div className="mt-4">
                  {activeDuel.result === 'win' && (
                    <span className="font-display font-black text-xl text-emerald-400 animate-pulse">
                      VICTORY! Line Absorbed! 🎉
                    </span>
                  )}
                  {activeDuel.result === 'lose' && (
                    <span className="font-display font-black text-xl text-rose-400">
                      DEFEATED! Linked to train! 🔗
                    </span>
                  )}
                  {activeDuel.result === 'tie' && (
                    <span className="font-display font-black text-lg text-amber-400">
                      TIE! Keep dancing! 🪇
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Absorbed Spectator / Break Free Tap Screen */}
      {isAbsorbed && (
        <div className="absolute bottom-20 z-20 bg-slate-900/90 border border-amber-500/50 backdrop-blur-md rounded-2xl p-4 shadow-xl text-center max-w-sm">
          <p className="text-xs font-bold text-amber-300 mb-2">
            You are currently dancing as a follower in another player&apos;s conga train!
          </p>
          <button
            onClick={handleBreakFreeTap}
            className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm rounded-xl cursor-pointer shadow-lg active:scale-95 transition-transform"
          >
            Tap to Break Free! ({breakFreeTaps}/5) 💃
          </button>
        </div>
      )}
    </div>
  );
};
