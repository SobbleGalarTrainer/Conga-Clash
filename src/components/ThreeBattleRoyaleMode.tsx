import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  Character,
  Move,
  DuelResult,
  BattleRoyaleParticipant,
  EliminationFeedItem,
} from '../types/game';
import { CHARACTERS_ROSTER } from '../data/characters';
import {
  create3DDancer,
  updateDancerAnimation,
  setupStudioEnvironment,
} from '../utils/threeDancer';
import { createMapCenterpieceMesh } from '../utils/mapRenderer3D';
import { audioSystem } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { MapSelectorModal } from './MapSelectorModal';

interface ThreeBattleRoyaleModeProps {
  playerLeader: Character;
  onBackToMenu: () => void;
  onUpdateStats?: (recruits: number, won: boolean, tied: boolean, placement?: number) => void;
}

interface Bot3DEntity {
  id: string;
  name: string;
  char: Character;
  group: THREE.Group;
  followers: THREE.Group[];
  followerCount: number;
  x: number;
  z: number;
  angle: number;
  targetX: number;
  targetZ: number;
  speed: number;
  isAlive: boolean;
  absorbedBy: string | null;
  duelCooldown: number;
  trail: { x: number; z: number; angle: number }[];
}

const LANDMARKS = [
  { name: 'Tilted Tambourines', x: -60, z: -60 },
  { name: 'Pleasant Parquet', x: 60, z: -60 },
  { name: 'Salty Salsa Palms', x: -60, z: 60 },
  { name: 'Boogie Ballroom', x: 60, z: 60 },
  { name: 'Carnival Center Stage', x: 0, z: 0 },
];

const BOT_NAMES = [
  'BoogieBrawler', 'CongaKing99', 'SalsaSniper', 'TiltedTango', 'MaracaMaster',
  'DiscoDestroyer', 'VictoryVince', 'RhythmRider', 'PaperPugilist', 'ScissorsSurgeon',
  'RockRoller', 'CarnivalCrusher', 'FiestaFury', 'SambaStriker', 'TambourineTitan',
  'DropZoneDan', 'StormRunner', 'ApexAfro', 'CrownCollector', 'GoldenGroover',
  'BopBoss', 'StepKickPro', 'LineLeaderLeo', 'FollowerFred', 'HipsHero', 'BeatDropper'
];

export const ThreeBattleRoyaleMode: React.FC<ThreeBattleRoyaleModeProps> = ({
  playerLeader,
  onBackToMenu,
  onUpdateStats,
}) => {
  const { user, addCoins, incrementMissionProgress, recordHighScore, currentMap } = useAuth();
  const mountRef = useRef<HTMLDivElement>(null);

  // Match State
  const [playerCountChoice, setPlayerCountChoice] = useState<100 | 150 | 256>(100);
  const [matchState, setMatchState] = useState<'LOBBY' | 'PLAYING' | 'SPECTATING' | 'VICTORY'>('LOBBY');
  const [aliveCount, setAliveCount] = useState<number>(100);
  const [placement, setPlacement] = useState<number | null>(null);
  const [myTrainLength, setMyTrainLength] = useState<number>(1);
  const [eliminationFeed, setEliminationFeed] = useState<EliminationFeedItem[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [spectatingTargetName, setSpectatingTargetName] = useState<string>('');

  // Active RPS Duel
  const [activeDuel, setActiveDuel] = useState<{
    bot: Bot3DEntity;
    status: 'choosing' | 'revealed';
    playerMove: Move | null;
    botMove: Move | null;
    result: DuelResult | null;
  } | null>(null);

  // Storm State
  const [stormPhase, setStormPhase] = useState<number>(1);
  const [stormTimer, setStormTimer] = useState<number>(30);
  const stormRadiusRef = useRef<number>(110);
  const stormCenterRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const targetStormRadiusRef = useRef<number>(75);
  const targetStormCenterRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stormMeshRef = useRef<THREE.Mesh | null>(null);

  // Entities Ref
  const playerEntityRef = useRef<{
    group: THREE.Group;
    followers: THREE.Group[];
    followerCount: number;
    x: number;
    z: number;
    angle: number;
    speed: number;
    isAlive: boolean;
    absorbedBy: string | null;
    trail: { x: number; z: number; angle: number }[];
  } | null>(null);

  const botsRef = useRef<Bot3DEntity[]>([]);
  const keysRef = useRef<{ [k: string]: boolean }>({});
  const spectatingBotIndexRef = useRef<number>(0);

  // Sound effects: Cheering
  const triggerCheer = (length: number) => {
    audioSystem.playCrowdCheer(length, 0, 1.2);
  };

  // Start the 3D Royale Match
  const handleStartMatch = (count: 100 | 150 | 256) => {
    setPlayerCountChoice(count);
    setAliveCount(count);
    setMatchState('PLAYING');
    setMyTrainLength(1);
    stormRadiusRef.current = 110;
    stormCenterRef.current = { x: 0, z: 0 };
    targetStormRadiusRef.current = 70;
    targetStormCenterRef.current = { x: (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 20 };
    setStormPhase(1);
    setStormTimer(30);

    audioSystem.playDuelStart();
    init3DWorld(count);
  };

  // Initialize Three.js 3D Island & Entities
  const init3DWorld = useCallback((totalPlayers: number) => {
    const container = mountRef.current;
    if (!container) return;

    // Clear previous elements
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050c18);
    scene.fog = new THREE.FogExp2(0x050c18, 0.008);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 300);
    camera.position.set(0, 12, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    setupStudioEnvironment(renderer, scene);

    // Island Lighting
    const hemiLight = new THREE.HemisphereLight(0xfff1e6, 0x091428, 0.9);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xffedd5, 1.8);
    sun.position.set(40, 60, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    // 1. Island Terrain Disc
    const islandRadius = 120;
    const terrainGeo = new THREE.CylinderGeometry(islandRadius, islandRadius + 5, 2, 64);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a1f, // Lush tropical green
      roughness: 0.8,
    });
    const islandMesh = new THREE.Mesh(terrainGeo, terrainMat);
    islandMesh.position.y = -1;
    islandMesh.receiveShadow = true;
    scene.add(islandMesh);

    // Sandy Shore Border
    const beachGeo = new THREE.RingGeometry(islandRadius - 2, islandRadius + 8, 48);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xe2c17c,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = 0.01;
    scene.add(beach);

    // Ocean Floor
    const oceanGeo = new THREE.PlaneGeometry(500, 500);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x075985,
      roughness: 0.2,
      metalness: 0.5,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.2;
    scene.add(ocean);

    // 2. 3D Landmarks & Venues matching active map
    currentMap.landmarks.forEach((lm) => {
      const lmGroup = new THREE.Group();
      lmGroup.position.set(lm.x, 0, lm.z);

      // Stage platform
      const stageGeo = new THREE.CylinderGeometry(8, 8.5, 0.4, 24);
      const stageMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.4 });
      const stage = new THREE.Mesh(stageGeo, stageMat);
      stage.position.y = 0.2;
      stage.receiveShadow = true;
      lmGroup.add(stage);

      // Festive light pillars
      for (let i = 0; i < 4; i++) {
        const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 5, 8);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        const ang = (i / 4) * Math.PI * 2;
        pillar.position.set(Math.cos(ang) * 6.5, 2.5, Math.sin(ang) * 6.5);
        lmGroup.add(pillar);

        const orbGeo = new THREE.SphereGeometry(0.35, 12, 12);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(Math.cos(ang) * 6.5, 5.1, Math.sin(ang) * 6.5);
        lmGroup.add(orb);
      }

      scene.add(lmGroup);
    });

    // 3D Map Centerpiece at center
    const centerpiece = createMapCenterpieceMesh(currentMap);
    centerpiece.position.set(0, 0, 0);
    scene.add(centerpiece);

    // 3. 3D Shrinking Storm Wall (Translucent Glowing Cylinder)
    const stormGeo = new THREE.CylinderGeometry(110, 110, 30, 48, 1, true);
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const stormMesh = new THREE.Mesh(stormGeo, stormMat);
    stormMesh.position.y = 15;
    scene.add(stormMesh);
    stormMeshRef.current = stormMesh;

    // 4. Create Player 3D Entity
    const playerMesh = create3DDancer(playerLeader, true);
    playerMesh.position.set(0, 0, 0);
    scene.add(playerMesh);

    playerEntityRef.current = {
      group: playerMesh,
      followers: [],
      followerCount: 0,
      x: 0,
      z: 0,
      angle: 0,
      speed: 8.5,
      isAlive: true,
      absorbedBy: null,
      trail: [{ x: 0, z: 0, angle: 0 }],
    };

    // 5. Spawn 3D AI Bots across Island
    const bots: Bot3DEntity[] = [];
    const botCount = totalPlayers - 1;

    for (let i = 0; i < botCount; i++) {
      const char = CHARACTERS_ROSTER[i % CHARACTERS_ROSTER.length];
      const botName = `${BOT_NAMES[i % BOT_NAMES.length]}_${i + 1}`;
      const ang = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 85;
      const bx = Math.cos(ang) * dist;
      const bz = Math.sin(ang) * dist;

      const botMesh = create3DDancer(char, true);
      botMesh.position.set(bx, 0, bz);
      scene.add(botMesh);

      bots.push({
        id: `bot_${i}`,
        name: botName,
        char,
        group: botMesh,
        followers: [],
        followerCount: 0,
        x: bx,
        z: bz,
        angle: Math.random() * Math.PI * 2,
        targetX: bx + (Math.random() - 0.5) * 30,
        targetZ: bz + (Math.random() - 0.5) * 30,
        speed: 5.5 + Math.random() * 2,
        isAlive: true,
        absorbedBy: null,
        duelCooldown: 2.0,
        trail: [{ x: bx, z: bz, angle: 0 }],
      });
    }

    botsRef.current = bots;

    // 6. Animation and Simulation Loop
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const timeSec = now * 0.001;

      // Update Storm Wall
      stormRadiusRef.current = THREE.MathUtils.damp(
        stormRadiusRef.current,
        targetStormRadiusRef.current,
        0.4,
        delta
      );
      stormCenterRef.current.x = THREE.MathUtils.damp(
        stormCenterRef.current.x,
        targetStormCenterRef.current.x,
        0.4,
        delta
      );
      stormCenterRef.current.z = THREE.MathUtils.damp(
        stormCenterRef.current.z,
        targetStormCenterRef.current.z,
        0.4,
        delta
      );

      if (stormMeshRef.current) {
        const rad = stormRadiusRef.current;
        stormMeshRef.current.scale.set(rad / 110, 1, rad / 110);
        stormMeshRef.current.position.x = stormCenterRef.current.x;
        stormMeshRef.current.position.z = stormCenterRef.current.z;
        stormMeshRef.current.rotation.y += delta * 0.1;
      }

      // Player Movement Logic
      const p = playerEntityRef.current;
      if (p && p.isAlive) {
        const keys = keysRef.current;
        let mx = 0;
        let mz = 0;

        if (keys['w'] || keys['W'] || keys['ArrowUp']) mz -= 1;
        if (keys['s'] || keys['S'] || keys['ArrowDown']) mz += 1;
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) mx -= 1;
        if (keys['d'] || keys['D'] || keys['ArrowRight']) mx += 1;

        const len = Math.hypot(mx, mz);
        if (len > 0) {
          p.x += (mx / len) * p.speed * delta;
          p.z += (mz / len) * p.speed * delta;
          p.angle = Math.atan2(mx, mz);

          // Island boundary clamping
          const pDist = Math.hypot(p.x, p.z);
          if (pDist > 115) {
            p.x = (p.x / pDist) * 115;
            p.z = (p.z / pDist) * 115;
          }

          p.trail.unshift({ x: p.x, z: p.z, angle: p.angle });
          if (p.trail.length > 200) p.trail.pop();
        }

        p.group.position.x = p.x;
        p.group.position.z = p.z;
        p.group.rotation.y = p.angle;
        updateDancerAnimation(p.group, timeSec, true, len > 0 ? 1.0 : 0.6);

        // Update player followers positions in 3D
        p.followers.forEach((fGroup, idx) => {
          const stepDist = 8;
          const trailIdx = (idx + 1) * stepDist;
          if (p.trail[trailIdx]) {
            const pt = p.trail[trailIdx];
            fGroup.position.x = THREE.MathUtils.damp(fGroup.position.x, pt.x, 15, delta);
            fGroup.position.z = THREE.MathUtils.damp(fGroup.position.z, pt.z, 15, delta);
            fGroup.rotation.y = pt.angle;
          }
          updateDancerAnimation(fGroup, timeSec + idx * 0.15, true, 1.0);
        });

        // Storm Damage check
        const distToStormCenter = Math.hypot(p.x - stormCenterRef.current.x, p.z - stormCenterRef.current.z);
        if (distToStormCenter > stormRadiusRef.current + 2) {
          if (Math.random() < 0.03 && p.followers.length > 0) {
            // Lose follower to storm
            const dropped = p.followers.pop();
            if (dropped) scene.remove(dropped);
            setMyTrainLength(p.followers.length + 1);
            audioSystem.playLoseCrash();
          }
        }
      }

      // Simulate AI Bots
      const activeBots = botsRef.current;
      for (let i = 0; i < activeBots.length; i++) {
        const b = activeBots[i];
        if (!b.isAlive) continue;

        b.duelCooldown = Math.max(0, b.duelCooldown - delta);

        // Wandering / pathing toward safe center
        const dx = b.targetX - b.x;
        const dz = b.targetZ - b.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 3) {
          // Pick new target biased toward storm center
          const biasX = stormCenterRef.current.x;
          const biasZ = stormCenterRef.current.z;
          b.targetX = THREE.MathUtils.clamp(biasX + (Math.random() - 0.5) * stormRadiusRef.current * 1.4, -110, 110);
          b.targetZ = THREE.MathUtils.clamp(biasZ + (Math.random() - 0.5) * stormRadiusRef.current * 1.4, -110, 110);
        } else {
          b.x += (dx / dist) * b.speed * delta;
          b.z += (dz / dist) * b.speed * delta;
          b.angle = Math.atan2(dx, dz);
          b.trail.unshift({ x: b.x, z: b.z, angle: b.angle });
          if (b.trail.length > 150) b.trail.pop();
        }

        b.group.position.x = b.x;
        b.group.position.z = b.z;
        b.group.rotation.y = b.angle;
        updateDancerAnimation(b.group, timeSec + i * 0.05, true, 0.8);

        // Update bot followers in 3D
        b.followers.forEach((fGroup, fIdx) => {
          const stepDist = 8;
          const trailIdx = (fIdx + 1) * stepDist;
          if (b.trail[trailIdx]) {
            const pt = b.trail[trailIdx];
            fGroup.position.x = THREE.MathUtils.damp(fGroup.position.x, pt.x, 15, delta);
            fGroup.position.z = THREE.MathUtils.damp(fGroup.position.z, pt.z, 15, delta);
            fGroup.rotation.y = pt.angle;
          }
          updateDancerAnimation(fGroup, timeSec + fIdx * 0.15, true, 0.8);
        });

        // Check clash with Player
        if (p && p.isAlive && b.duelCooldown <= 0) {
          const distToPlayer = Math.hypot(p.x - b.x, p.z - b.z);
          if (distToPlayer < 2.2) {
            b.duelCooldown = 5.0;
            setActiveDuel({
              bot: b,
              status: 'choosing',
              playerMove: null,
              botMove: null,
              result: null,
            });
            audioSystem.playDuelStart();
          }
        }

        // Check clash between bots
        if (b.duelCooldown <= 0 && Math.random() < 0.02) {
          for (let j = i + 1; j < activeBots.length; j++) {
            const b2 = activeBots[j];
            if (b2.isAlive && b2.duelCooldown <= 0) {
              const d2 = Math.hypot(b.x - b2.x, b.z - b2.z);
              if (d2 < 2.5) {
                b.duelCooldown = 4.0;
                b2.duelCooldown = 4.0;
                // Resolve bot vs bot duel
                const winner = Math.random() < 0.5 ? b : b2;
                const loser = winner === b ? b2 : b;
                loser.isAlive = false;
                loser.absorbedBy = winner.id;
                winner.followerCount += 1 + loser.followerCount;

                // Move loser mesh to winner train
                winner.followers.push(loser.group);
                loser.followers.forEach((f) => winner.followers.push(f));
                loser.followers = [];

                setAliveCount((prev) => {
                  const nextCount = prev - 1;
                  if (nextCount === 1 && p && p.isAlive) {
                    setMatchState('VICTORY');
                    confetti();
                    audioSystem.playFanfare();
                  }
                  return nextCount;
                });

                setEliminationFeed((prev) => [
                  ...prev.slice(-6),
                  {
                    id: 'bot_elim_' + Date.now(),
                    winnerName: winner.name,
                    loserName: loser.name,
                    absorbedCount: 1 + loser.followerCount,
                    timestamp: Date.now(),
                    remainingCount: Math.max(1, activeBots.filter((x) => x.isAlive).length),
                  },
                ]);
                break;
              }
            }
          }
        }
      }

      // Camera Tracking
      if (cameraRef.current) {
        if (p && p.isAlive) {
          const camTargetX = p.x - Math.sin(p.angle) * 11;
          const camTargetZ = p.z - Math.cos(p.angle) * 11;
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, camTargetX, 4, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 8, 3, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, camTargetZ, 4, delta);
          cameraRef.current.lookAt(p.x, 1.5, p.z);
        } else {
          // Spectator Camera on alive bot
          const aliveBots = botsRef.current.filter((b) => b.isAlive);
          if (aliveBots.length > 0) {
            const targetIdx = spectatingBotIndexRef.current % aliveBots.length;
            const targetBot = aliveBots[targetIdx];
            setSpectatingTargetName(targetBot.name);

            const camTargetX = targetBot.x - Math.sin(targetBot.angle) * 12;
            const camTargetZ = targetBot.z - Math.cos(targetBot.angle) * 12;
            cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, camTargetX, 4, delta);
            cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 9, 3, delta);
            cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, camTargetZ, 4, delta);
            cameraRef.current.lookAt(targetBot.x, 1.5, targetBot.z);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [playerLeader]);

  // Handle Player RPS Duel Choice
  const handleSelectMove = (move: Move) => {
    if (!activeDuel || activeDuel.status !== 'choosing') return;

    const moves: Move[] = ['rock', 'paper', 'scissors'];
    const botMove: Move = moves[Math.floor(Math.random() * 3)];

    let result: DuelResult = 'tie';
    if (move === botMove) result = 'tie';
    else if (
      (move === 'rock' && botMove === 'scissors') ||
      (move === 'paper' && botMove === 'rock') ||
      (move === 'scissors' && botMove === 'paper')
    ) {
      result = 'win';
    } else {
      result = 'lose';
    }

    setActiveDuel((prev) => (prev ? { ...prev, playerMove: move, botMove, result, status: 'revealed' } : null));

    setTimeout(() => {
      const p = playerEntityRef.current;
      const b = activeDuel.bot;

      if (result === 'win' && p) {
        // Player absorbs bot leader and all followers!
        b.isAlive = false;
        b.absorbedBy = 'player';
        const absorbedNum = 1 + b.followers.length;
        p.followers.push(b.group);
        b.followers.forEach((f) => p.followers.push(f));
        b.followers = [];

        const newTrainLen = 1 + p.followers.length;
        setMyTrainLength(newTrainLen);
        triggerCheer(newTrainLen);
        audioSystem.playWinRecruit();
        addCoins(20, 'Royale Duel Victory');
        incrementMissionProgress('duels', 1);
        incrementMissionProgress('recruits', absorbedNum);

        setAliveCount((prev) => {
          const nextCount = prev - 1;
          if (nextCount === 1) {
            setMatchState('VICTORY');
            confetti();
            audioSystem.playFanfare();
            addCoins(300, '#1 Victory Conga Royale');
            if (onUpdateStats) onUpdateStats(p.followers.length, true, false, 1);
          }
          return nextCount;
        });

        setEliminationFeed((prev) => [
          ...prev.slice(-6),
          {
            id: 'player_elim_' + Date.now(),
            winnerName: user.displayName,
            loserName: b.name,
            absorbedCount: absorbedNum,
            timestamp: Date.now(),
            remainingCount: Math.max(1, aliveCount - 1),
          },
        ]);
      } else if (result === 'lose' && p) {
        // Player is absorbed into bot line!
        p.isAlive = false;
        p.absorbedBy = b.id;
        b.followers.push(p.group);
        p.followers.forEach((f) => b.followers.push(f));
        b.followerCount += 1 + p.followers.length;
        p.followers = [];

        setPlacement(aliveCount);
        setMatchState('SPECTATING');
        audioSystem.playLoseCrash();
        if (onUpdateStats) onUpdateStats(0, false, false, aliveCount);
      } else {
        // Tie
        audioSystem.playMoveSelect();
      }

      setActiveDuel(null);
    }, 2000);
  };

  // Keyboard controls
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Storm countdown timer
  useEffect(() => {
    if (matchState !== 'PLAYING') return;

    const interval = setInterval(() => {
      setStormTimer((prev) => {
        if (prev <= 1) {
          // Advance storm phase
          setStormPhase((curPhase) => {
            const nextPhase = curPhase + 1;
            if (nextPhase === 2) {
              targetStormRadiusRef.current = 45;
              targetStormCenterRef.current = { x: (Math.random() - 0.5) * 15, z: (Math.random() - 0.5) * 15 };
            } else if (nextPhase === 3) {
              targetStormRadiusRef.current = 22;
              targetStormCenterRef.current = { x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 };
            } else if (nextPhase >= 4) {
              targetStormRadiusRef.current = 10;
            }
            return nextPhase;
          });
          return 35;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [matchState]);

  return (
    <div className="w-full flex-1 flex flex-col items-center relative overflow-hidden bg-slate-950">
      {/* Lobby Setup Screen */}
      {matchState === 'LOBBY' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center">
            <span className="text-5xl mb-3">🪂👑</span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
              100–256 Conga Royale 3D
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Drop onto Carnival Island in full 3D! Win Rock-Paper-Scissors duels to absorb entire rival conga trains into your line.
            </p>

            <div className="w-full my-6">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Select Island Participant Count
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {([100, 150, 256] as const).map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setPlayerCountChoice(cnt)}
                    className={`py-3 rounded-2xl border-2 font-display font-black text-sm transition-all cursor-pointer ${
                      playerCountChoice === cnt
                        ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg scale-105'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    {cnt} Dancers
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartMatch(playerCountChoice)}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-black text-base rounded-2xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Drop Into 3D Royale ({playerCountChoice} Players) 🚀
            </button>

            <button
              onClick={onBackToMenu}
              className="mt-3 text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ← Back to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Three.js 3D Viewport */}
      <div ref={mountRef} className="w-full h-[650px] sm:h-[720px] relative select-none" />

      {/* Top HUD Overlay during Match */}
      {matchState !== 'LOBBY' && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMenu}
              className="pointer-events-auto px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
            >
              <span>←</span>
              <span>Menu</span>
            </button>

            {/* Alive Counter */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-white font-mono text-sm">{aliveCount} ALIVE</span>
            </div>
          </div>

          {/* Storm Timer & Line Length */}
          <div className="flex items-center gap-3">
            <div className="bg-rose-950/80 backdrop-blur-md border border-rose-500/50 px-3.5 py-1.5 rounded-xl text-xs font-black text-rose-300 flex items-center gap-2 shadow-lg">
              <span>🌪️ Phase {stormPhase}</span>
              <span className="font-mono text-white text-sm">{stormTimer}s</span>
            </div>

            <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-amber-400 flex items-center gap-1.5 shadow-lg">
              <span>🪇</span>
              <span>Line: {myTrainLength}</span>
            </div>
          </div>
        </div>
      )}

      {/* Elimination Feed (Top Right) */}
      {matchState !== 'LOBBY' && (
        <div className="absolute top-16 right-4 z-20 pointer-events-none max-w-xs space-y-1">
          {eliminationFeed.map((e) => (
            <div
              key={e.id}
              className="bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-3 py-1 rounded-lg text-[11px] text-white flex items-center gap-1.5 animate-in slide-in-from-right-4"
            >
              <span className="font-bold text-amber-400">{e.winnerName}</span>
              <span className="text-slate-400">absorbed</span>
              <span className="font-bold text-rose-300">{e.loserName}</span>
              <span className="text-emerald-400 font-mono">(+{e.absorbedCount})</span>
            </div>
          ))}
        </div>
      )}

      {/* Active 3D Rock Paper Scissors Duel Modal */}
      {activeDuel && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <span className="text-4xl mb-2 inline-block animate-bounce">⚡</span>
            <h3 className="font-display font-black text-xl text-white">3D Royale Duel!</h3>
            <p className="text-xs text-slate-300 mt-1">
              Clashing with <span className="font-bold text-amber-400">{activeDuel.bot.name}</span>!
            </p>

            {activeDuel.status === 'choosing' && (
              <div className="grid grid-cols-3 gap-3 my-6">
                {(['rock', 'paper', 'scissors'] as Move[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSelectMove(m)}
                    className="p-4 bg-slate-800 hover:bg-amber-500 border-2 border-slate-700 hover:border-amber-300 rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 text-white hover:text-slate-950"
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
                    <span>{activeDuel.playerMove === 'rock' ? '✊' : activeDuel.playerMove === 'paper' ? '✋' : '✌️'}</span>
                  </div>
                  <span className="text-xl font-black text-amber-400">VS</span>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1">Rival</span>
                    <span>{activeDuel.botMove === 'rock' ? '✊' : activeDuel.botMove === 'paper' ? '✋' : '✌️'}</span>
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

      {/* Spectator Mode Overlay */}
      {matchState === 'SPECTATING' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col items-center max-w-sm w-full">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">
              Spectating: {spectatingTargetName || 'Conga Leader'}
            </span>
            <span className="text-xs text-slate-400 font-mono">Placed #{placement}</span>
          </div>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => {
                spectatingBotIndexRef.current++;
              }}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl cursor-pointer"
            >
              Next Leader →
            </button>
            <button
              onClick={() => audioSystem.playCrowdCheer(25, 0, 1.2)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer"
            >
              Cheer! 🎺
            </button>
          </div>
        </div>
      )}

      {/* Victory Royale Screen */}
      {matchState === 'VICTORY' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <span className="text-6xl mb-2 animate-bounce">👑🎉</span>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-amber-400 tracking-tight">
              #1 VICTORY ROYALE!
            </h2>
            <p className="text-sm text-slate-200 mt-2">
              You absorbed all rival lines and conquered the 3D island!
            </p>

            <div className="my-6 bg-amber-500/10 border border-amber-500/30 px-6 py-3 rounded-2xl flex items-center gap-3">
              <span className="text-3xl">🪙</span>
              <div className="text-left">
                <span className="text-xs text-amber-300 font-semibold">Reward</span>
                <div className="font-display font-black text-2xl text-amber-400">+300 Coins</div>
              </div>
            </div>

            <button
              onClick={() => handleStartMatch(playerCountChoice)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-sm rounded-xl cursor-pointer shadow-lg mb-2"
            >
              Play Again
            </button>

            <button
              onClick={onBackToMenu}
              className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
