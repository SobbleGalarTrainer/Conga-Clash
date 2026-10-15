import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Character, Move, DuelResult, PowerUp } from '../types/game';
import { CHARACTERS_ROSTER, INITIAL_RIVALS } from '../data/characters';
import { create3DDancer, updateDancerAnimation, setupStudioEnvironment } from '../utils/threeDancer';
import { createMapFloorTexture, createMapCenterpieceMesh } from '../utils/mapRenderer3D';
import { audioSystem } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { MapSelectorModal } from './MapSelectorModal';

interface ThreeCongaArenaProps {
  playerLeader: Character;
  onBackToMenu: () => void;
  onUpdateStats?: (recruits: number, won: boolean, tied: boolean, placement?: number) => void;
}

interface DancerEntity {
  id: string;
  char: Character;
  group: THREE.Group;
  x: number;
  z: number;
  angle: number;
  vx: number;
  vz: number;
  isLeader: boolean;
  leaderId: string | null;
  followers: DancerEntity[];
  trail: { x: number; z: number; angle: number }[];
}

export const ThreeCongaArena: React.FC<ThreeCongaArenaProps> = ({
  playerLeader,
  onBackToMenu,
  onUpdateStats,
}) => {
  const { user, addCoins, incrementMissionProgress, recordHighScore, currentMap } = useAuth();
  const mountRef = useRef<HTMLDivElement>(null);

  // Game UI State
  const [trainLength, setTrainLength] = useState(1);
  const [score, setScore] = useState(0);
  const [isSpectating, setIsSpectating] = useState(false);
  const [spectatorLeaderName, setSpectatorLeaderName] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [showControlsDock, setShowControlsDock] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);

  // Active RPS Duel state
  const [activeDuel, setActiveDuel] = useState<{
    rivalName: string;
    rivalChar: Character;
    rivalEntity: DancerEntity;
    status: 'choosing' | 'revealed';
    playerMove: Move | null;
    rivalMove: Move | null;
    result: DuelResult | null;
  } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Simulation Entities
  const playerEntityRef = useRef<DancerEntity | null>(null);
  const rivalEntitiesRef = useRef<DancerEntity[]>([]);
  const soloDancersRef = useRef<DancerEntity[]>([]);
  const keysRef = useRef<{ [k: string]: boolean }>({});
  const mouseTargetRef = useRef<{ x: number; z: number; active: boolean }>({ x: 0, z: 0, active: false });

  // Handle RPS Duel Choice
  const handleSelectMove = useCallback(
    (move: Move) => {
      if (!activeDuel || activeDuel.status !== 'choosing') return;

      const moves: Move[] = ['rock', 'paper', 'scissors'];
      // Rival AI personality logic
      const p = activeDuel.rivalChar.personality;
      let rivalMove: Move = moves[Math.floor(Math.random() * 3)];
      if (p === 'rock_heavy') rivalMove = Math.random() < 0.6 ? 'rock' : moves[Math.floor(Math.random() * 3)];
      else if (p === 'paper_tactician') rivalMove = Math.random() < 0.6 ? 'paper' : moves[Math.floor(Math.random() * 3)];
      else if (p === 'scissors_blitz') rivalMove = Math.random() < 0.6 ? 'scissors' : moves[Math.floor(Math.random() * 3)];

      let result: DuelResult = 'tie';
      if (move === rivalMove) result = 'tie';
      else if (
        (move === 'rock' && rivalMove === 'scissors') ||
        (move === 'paper' && rivalMove === 'rock') ||
        (move === 'scissors' && rivalMove === 'paper')
      ) {
        result = 'win';
      } else {
        result = 'lose';
      }

      setActiveDuel((prev) => (prev ? { ...prev, playerMove: move, rivalMove, result, status: 'revealed' } : null));

      setTimeout(() => {
        const player = playerEntityRef.current;
        const rival = activeDuel.rivalEntity;
        const scene = sceneRef.current;

        if (result === 'win' && player && rival && scene) {
          // Player absorbs rival leader and all their followers!
          const recruitedCount = 1 + rival.followers.length;
          audioSystem.playWinRecruit();
          audioSystem.playCrowdCheer(player.followers.length + recruitedCount, 0, 1.2);

          // Add rival leader as follower
          rival.isLeader = false;
          rival.leaderId = player.id;
          player.followers.push(rival);

          // Add all rival followers to player
          rival.followers.forEach((f) => {
            f.leaderId = player.id;
            player.followers.push(f);
          });
          rival.followers = [];

          // Remove from rivals list
          rivalEntitiesRef.current = rivalEntitiesRef.current.filter((r) => r.id !== rival.id);

          const newTotal = 1 + player.followers.length;
          setTrainLength(newTotal);
          setScore((s) => s + recruitedCount * 150);

          // Missions & Coins
          addCoins(recruitedCount * 25, 'Arena Duel Victory');
          incrementMissionProgress('duels', 1);
          incrementMissionProgress('recruits', recruitedCount);
          recordHighScore(newTotal, 'Dancers Conga Line');

          if (onUpdateStats) {
            onUpdateStats(recruitedCount, true, false);
          }
        } else if (result === 'lose' && player && rival) {
          // FORCED CONGA ABSORPTION & SPECTATOR MODE!
          audioSystem.playLoseSound();
          audioSystem.playCrowdCheer(rival.followers.length + 1 + player.followers.length, 0, 1.1);

          // Player and followers join rival train
          player.isLeader = false;
          player.leaderId = rival.id;
          rival.followers.push(player);

          player.followers.forEach((f) => {
            f.leaderId = rival.id;
            rival.followers.push(f);
          });
          player.followers = [];

          setIsSpectating(true);
          setSpectatorLeaderName(rival.char.name);
          setIsGameOver(true);

          if (onUpdateStats) {
            onUpdateStats(0, false, false);
          }
        } else {
          // Tie
          audioSystem.playCowbell();
        }

        setActiveDuel(null);
      }, 2200);
    },
    [activeDuel, addCoins, incrementMissionProgress, onUpdateStats, recordHighScore]
  );

  // Key listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (activeDuel && activeDuel.status === 'choosing') {
        if (e.key === '1' || e.key.toLowerCase() === 'r') handleSelectMove('rock');
        if (e.key === '2' || e.key.toLowerCase() === 'p') handleSelectMove('paper');
        if (e.key === '3' || e.key.toLowerCase() === 's') handleSelectMove('scissors');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeDuel, handleSelectMove]);

  // Main Three.js Arena Lifecycle
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(currentMap.skyColor);
    scene.fog = new THREE.FogExp2(currentMap.skyColor, 0.022);
    sceneRef.current = scene;

    // 2. Camera (Third-person follow)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 120);
    camera.position.set(0, 12, 14);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // 3. WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Reflection Map
    setupStudioEnvironment(renderer, scene);

    // 4. Lights
    const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x1e1b4b, 1.4);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfef08a, 2.2);
    dirLight.position.set(15, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 70;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.0006;
    scene.add(dirLight);

    // Dynamic carnival colored spotlights
    const spotPink = new THREE.SpotLight(0xec4899, 4, 35, Math.PI / 4, 0.5);
    spotPink.position.set(-18, 16, -18);
    scene.add(spotPink);

    const spotCyan = new THREE.SpotLight(0x06b6d4, 4, 35, Math.PI / 4, 0.5);
    spotCyan.position.set(18, 16, 18);
    scene.add(spotCyan);

    // 5. Arena Floor matching currentMap (All 16 Maps supported!)
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorTex = createMapFloorTexture(currentMap);
    floorTex.repeat.set(8, 8);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Glowing Neon Perimeter Barrier
    const barrierRadius = 26;
    const barrierGeo = new THREE.TorusGeometry(barrierRadius, 0.25, 16, 64);
    const barrierMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.rotation.x = Math.PI / 2;
    barrier.position.y = 0.25;
    scene.add(barrier);

    // 3D Architectural Landmark Centerpiece matching the 16 Maps
    const centerpiece = createMapCenterpieceMesh(currentMap);
    centerpiece.position.set(0, 0, 0);
    scene.add(centerpiece);

    // 6. Spawn Player Entity
    const playerMesh = create3DDancer(playerLeader, true);
    playerMesh.position.set(0, 0, 0);
    scene.add(playerMesh);

    const playerEntity: DancerEntity = {
      id: 'player_lead',
      char: playerLeader,
      group: playerMesh,
      x: 0,
      z: 0,
      angle: 0,
      vx: 0,
      vz: 0,
      isLeader: true,
      leaderId: null,
      followers: [],
      trail: [],
    };
    playerEntityRef.current = playerEntity;

    // 7. Spawn Rival AI Conga Trains
    const rivals: DancerEntity[] = [];
    INITIAL_RIVALS.forEach((riv, idx) => {
      const angle = (idx / INITIAL_RIVALS.length) * Math.PI * 2;
      const rx = Math.sin(angle) * 16;
      const rz = Math.cos(angle) * 16;

      const rMesh = create3DDancer(riv.leader, true);
      rMesh.position.set(rx, 0, rz);
      scene.add(rMesh);

      const rivFollowers: DancerEntity[] = [];
      riv.followers.forEach((fChar, fIdx) => {
        const fMesh = create3DDancer(fChar, false);
        fMesh.position.set(rx - (fIdx + 1) * 1.1, 0, rz);
        scene.add(fMesh);
        rivFollowers.push({
          id: `fol_${riv.leader.id}_${fIdx}`,
          char: fChar,
          group: fMesh,
          x: rx - (fIdx + 1) * 1.1,
          z: rz,
          angle: 0,
          vx: 0,
          vz: 0,
          isLeader: false,
          leaderId: riv.leader.id,
          followers: [],
          trail: [],
        });
      });

      rivals.push({
        id: riv.leader.id,
        char: riv.leader,
        group: rMesh,
        x: rx,
        z: rz,
        angle: angle + Math.PI,
        vx: (Math.random() - 0.5) * 2,
        vz: (Math.random() - 0.5) * 2,
        isLeader: true,
        leaderId: null,
        followers: rivFollowers,
        trail: [],
      });
    });
    rivalEntitiesRef.current = rivals;

    // 8. Spawn Solo Wandering Dancers across floor
    const soloDancers: DancerEntity[] = [];
    CHARACTERS_ROSTER.slice(5, 18).forEach((char, idx) => {
      const sMesh = create3DDancer(char, false);
      const sx = (Math.random() - 0.5) * 38;
      const sz = (Math.random() - 0.5) * 38;
      sMesh.position.set(sx, 0, sz);
      scene.add(sMesh);

      soloDancers.push({
        id: `solo_${char.id}_${idx}`,
        char,
        group: sMesh,
        x: sx,
        z: sz,
        angle: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 1.5,
        vz: (Math.random() - 0.5) * 1.5,
        isLeader: false,
        leaderId: null,
        followers: [],
        trail: [],
      });
    });
    soloDancersRef.current = soloDancers;

    // 9. Main Game Loop
    let animId: number;
    const clock = new THREE.Clock();

    const gameLoop = () => {
      animId = requestAnimationFrame(gameLoop);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Mirror ball rotation
      mirrorBall.rotation.y += delta * 0.8;

      // Color spot oscillations
      spotPink.position.x = Math.sin(elapsed * 0.5) * 20;
      spotCyan.position.z = Math.cos(elapsed * 0.5) * 20;

      const player = playerEntityRef.current;
      const keys = keysRef.current;

      // Update Player movement if not locked in duel and alive
      if (player && player.isLeader && !activeDuel) {
        let mx = 0;
        let mz = 0;
        if (keys['arrowup'] || keys['w']) mz -= 1;
        if (keys['arrowdown'] || keys['s']) mz += 1;
        if (keys['arrowleft'] || keys['a']) mx -= 1;
        if (keys['arrowright'] || keys['d']) mx += 1;

        // Pointer steering if clicked
        if (mouseTargetRef.current.active) {
          const dx = mouseTargetRef.current.x - player.x;
          const dz = mouseTargetRef.current.z - player.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.5) {
            mx = dx / dist;
            mz = dz / dist;
          }
        }

        const speed = 7.5;
        if (mx !== 0 || mz !== 0) {
          const targetAngle = Math.atan2(mx, -mz);
          player.angle = THREE.MathUtils.damp(player.angle, targetAngle, 10, delta);
          player.vx = Math.sin(player.angle) * speed;
          player.vz = -Math.cos(player.angle) * speed;
        } else {
          player.vx *= 0.85;
          player.vz *= 0.85;
        }

        player.x += player.vx * delta;
        player.z += player.vz * delta;

        // Keep inside arena barrier
        const distFromCenter = Math.hypot(player.x, player.z);
        if (distFromCenter > barrierRadius - 1) {
          const pushBackAngle = Math.atan2(player.z, player.x);
          player.x = Math.cos(pushBackAngle) * (barrierRadius - 1);
          player.z = Math.sin(pushBackAngle) * (barrierRadius - 1);
        }

        player.group.position.set(player.x, 0, player.z);
        player.group.rotation.y = player.angle;

        // Update trail for conga snake physics
        player.trail.unshift({ x: player.x, z: player.z, angle: player.angle });
        if (player.trail.length > 250) player.trail.pop();

        // Update followers trailing behind leader
        player.followers.forEach((f, fIdx) => {
          const spacingFrames = (fIdx + 1) * 14;
          const target = player.trail[spacingFrames] || player.trail[player.trail.length - 1];
          if (target) {
            f.x = THREE.MathUtils.damp(f.x, target.x, 12, delta);
            f.z = THREE.MathUtils.damp(f.z, target.z, 12, delta);
            f.angle = THREE.MathUtils.damp(f.angle, target.angle, 10, delta);
            f.group.position.set(f.x, 0, f.z);
            f.group.rotation.y = f.angle;
          }
          updateDancerAnimation(f.group, elapsed - (fIdx + 1) * 0.1, true, 1.2);
        });

        updateDancerAnimation(player.group, elapsed, true, 1.2);

        // Check Clash collisions with solo wandering dancers
        soloDancersRef.current.forEach((solo, sIdx) => {
          if (!solo.leaderId) {
            const d = Math.hypot(player.x - solo.x, player.z - solo.z);
            if (d < 1.4) {
              // Recruit solo dancer immediately into line!
              solo.leaderId = player.id;
              player.followers.push(solo);
              soloDancersRef.current.splice(sIdx, 1);

              audioSystem.playCongaHigh();
              audioSystem.playCrowdCheer(player.followers.length + 1, 0, 0.7);
              setTrainLength(1 + player.followers.length);
              setScore((s) => s + 50);
              addCoins(10, 'Recruited Solo Dancer');
              incrementMissionProgress('recruits', 1);
            }
          }
        });

        // Check Clash collisions with rival AI Leaders
        rivalEntitiesRef.current.forEach((rival) => {
          if (rival.isLeader) {
            const d = Math.hypot(player.x - rival.x, player.z - rival.z);
            if (d < 2.0) {
              // Trigger 3D Rock Paper Scissors Duel!
              audioSystem.playWhistle();
              setActiveDuel({
                rivalName: rival.char.name,
                rivalChar: rival.char,
                rivalEntity: rival,
                status: 'choosing',
                playerMove: null,
                rivalMove: null,
                result: null,
              });
            }
          }
        });
      }

      // Update AI Rivals wandering and dancing
      rivalEntitiesRef.current.forEach((rival) => {
        if (rival.isLeader) {
          // AI roam logic
          if (Math.random() < 0.02) {
            rival.angle += (Math.random() - 0.5) * 1.5;
          }
          const rivSpeed = 4.0;
          rival.x += Math.sin(rival.angle) * rivSpeed * delta;
          rival.z -= Math.cos(rival.angle) * rivSpeed * delta;

          // Bounce off barrier
          const dCenter = Math.hypot(rival.x, rival.z);
          if (dCenter > barrierRadius - 1.5) {
            rival.angle += Math.PI;
          }

          rival.group.position.set(rival.x, 0, rival.z);
          rival.group.rotation.y = rival.angle;

          rival.trail.unshift({ x: rival.x, z: rival.z, angle: rival.angle });
          if (rival.trail.length > 200) rival.trail.pop();

          rival.followers.forEach((rf, rfIdx) => {
            const spacing = (rfIdx + 1) * 14;
            const t = rival.trail[spacing] || rival.trail[rival.trail.length - 1];
            if (t) {
              rf.x = THREE.MathUtils.damp(rf.x, t.x, 12, delta);
              rf.z = THREE.MathUtils.damp(rf.z, t.z, 12, delta);
              rf.angle = THREE.MathUtils.damp(rf.angle, t.angle, 10, delta);
              rf.group.position.set(rf.x, 0, rf.z);
              rf.group.rotation.y = rf.angle;
            }
            updateDancerAnimation(rf.group, elapsed - (rfIdx + 1) * 0.1, true, 1.1);
          });

          updateDancerAnimation(rival.group, elapsed, true, 1.1);
        }
      });

      // Update Solo Dancers wandering
      soloDancersRef.current.forEach((solo) => {
        if (!solo.leaderId) {
          solo.x += solo.vx * delta;
          solo.z += solo.vz * delta;
          const dCenter = Math.hypot(solo.x, solo.z);
          if (dCenter > barrierRadius - 2) {
            solo.vx = -solo.vx;
            solo.vz = -solo.vz;
          }
          solo.group.position.set(solo.x, 0, solo.z);
          updateDancerAnimation(solo.group, elapsed + Math.sin(solo.x), true, 0.9);
        }
      });

      // Camera Follow Logic (Damped Third-Person Chase)
      if (cameraRef.current) {
        let focusEntity = playerEntityRef.current;
        if (isSpectating) {
          // Follow the conqueror leader
          focusEntity = rivalEntitiesRef.current[0] || playerEntityRef.current;
        }

        if (focusEntity) {
          const targetCamX = focusEntity.x - Math.sin(focusEntity.angle) * 8.5;
          const targetCamZ = focusEntity.z + Math.cos(focusEntity.angle) * 8.5;
          const targetCamY = 7.5;

          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, targetCamX, 4, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, targetCamY, 4, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, targetCamZ, 4, delta);

          cameraRef.current.lookAt(focusEntity.x, 1.4, focusEntity.z);
        }
      }

      renderer.render(scene, camera);
    };

    gameLoop();

    // Resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isSpectating, playerLeader, currentMap.id]);

  // Pointer drag steering
  const handlePointerDown = (e: React.PointerEvent) => {
    mouseTargetRef.current.active = true;
    updatePointerTarget(e);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (mouseTargetRef.current.active) {
      updatePointerTarget(e);
    }
  };
  const handlePointerUp = () => {
    mouseTargetRef.current.active = false;
  };

  const updatePointerTarget = (e: React.PointerEvent) => {
    if (!mountRef.current || !playerEntityRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    // Project ray onto ground plane
    mouseTargetRef.current.x = playerEntityRef.current.x + nx * 10;
    mouseTargetRef.current.z = playerEntityRef.current.z - ny * 10;
  };

  return (
    <div className="w-full flex flex-col items-center relative">
      {/* Top Arena HUD Strip */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 mb-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Menu</span>
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">3D Arena</span>
              <button
                onClick={() => setShowMapModal(true)}
                className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                title="Click to switch between all 16 maps"
              >
                <span>{currentMap.icon}</span>
                <span className="max-w-[100px] truncate">{currentMap.name}</span>
                <span className="text-[8px] text-slate-400">▾</span>
              </button>
            </div>
            <h2 className="text-sm sm:text-base font-display font-black text-white">{playerLeader.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <span className="text-slate-400 block text-[10px]">Conga Length</span>
            <span className="font-display font-black text-amber-400 text-lg tabular-nums">
              {trainLength} <span className="text-xs font-normal text-slate-400">Dancers</span>
            </span>
          </div>

          <div className="text-center">
            <span className="text-slate-400 block text-[10px]">Score</span>
            <span className="font-display font-black text-emerald-400 text-lg tabular-nums">{score}</span>
          </div>

          {user.isGuest ? (
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-400">
              Guest: No Coins
            </span>
          ) : (
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
              <span>🪙</span>
              <span className="font-black text-amber-400 text-xs tabular-nums">{user.coins}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main 3D Viewport */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-[580px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl relative cursor-crosshair select-none"
      >
        {/* On-screen Directional Hints */}
        <div className="absolute top-4 left-4 pointer-events-none z-10 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 text-[11px] text-slate-300 backdrop-blur-sm">
          <div><strong className="text-amber-400">WASD / Arrow Keys</strong> or Drag Mouse to Steer</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bump into solo dancers to recruit · Duel rival trains!</div>
        </div>

        {/* Spectator Mode Game Over Banner */}
        {isSpectating && (
          <div className="absolute inset-x-0 top-16 z-30 flex justify-center pointer-events-none px-4">
            <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 shadow-2xl text-center max-w-md pointer-events-auto backdrop-blur-md animate-bounce">
              <span className="text-3xl mb-1 block">😵💃👑</span>
              <h3 className="font-display font-black text-xl text-white">FORCED CONGA ABSORPTION!</h3>
              <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                You lost the Rock-Paper-Scissors duel! Your entire conga line was absorbed, and you are now forced to follow <strong className="text-amber-400 font-bold">{spectatorLeaderName}</strong>!
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onBackToMenu}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Return to Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3D Rock Paper Scissors Duel Modal */}
        {activeDuel && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center relative animate-in fade-in zoom-in-95">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block mb-1">
                Carnival Conga Clash
              </span>
              <h3 className="font-display font-black text-2xl text-white">
                Duel vs {activeDuel.rivalName}!
              </h3>
              <p className="text-xs text-slate-300 mt-1 mb-6">
                Winner recruits the losing leader and their entire conga line!
              </p>

              {activeDuel.status === 'choosing' ? (
                <div>
                  <div className="text-xs text-slate-400 mb-3">Choose your move (or press 1 / 2 / 3):</div>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleSelectMove('rock')}
                      className="group p-4 bg-slate-950 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">🪨</span>
                      <span className="font-display font-black text-white text-sm">Rock</span>
                      <span className="text-[10px] text-slate-400">Key 1</span>
                    </button>
                    <button
                      onClick={() => handleSelectMove('paper')}
                      className="group p-4 bg-slate-950 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">📄</span>
                      <span className="font-display font-black text-white text-sm">Paper</span>
                      <span className="text-[10px] text-slate-400">Key 2</span>
                    </button>
                    <button
                      onClick={() => handleSelectMove('scissors')}
                      className="group p-4 bg-slate-950 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-2"
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">✂️</span>
                      <span className="font-display font-black text-white text-sm">Scissors</span>
                      <span className="text-[10px] text-slate-400">Key 3</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-center gap-8 my-4">
                    <div className="text-center">
                      <span className="text-xs text-slate-400 block mb-1">You</span>
                      <div className="text-5xl">
                        {activeDuel.playerMove === 'rock' ? '🪨' : activeDuel.playerMove === 'paper' ? '📄' : '✂️'}
                      </div>
                      <span className="text-xs font-bold capitalize text-white mt-1 block">
                        {activeDuel.playerMove}
                      </span>
                    </div>

                    <div className="font-display font-black text-2xl text-amber-400">VS</div>

                    <div className="text-center">
                      <span className="text-xs text-slate-400 block mb-1">{activeDuel.rivalName}</span>
                      <div className="text-5xl">
                        {activeDuel.rivalMove === 'rock' ? '🪨' : activeDuel.rivalMove === 'paper' ? '📄' : '✂️'}
                      </div>
                      <span className="text-xs font-bold capitalize text-white mt-1 block">
                        {activeDuel.rivalMove}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`font-display font-black text-2xl ${
                      activeDuel.result === 'win'
                        ? 'text-emerald-400'
                        : activeDuel.result === 'lose'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {activeDuel.result === 'win'
                      ? '🎉 VICTORY! Conga Train Absorbed!'
                      : activeDuel.result === 'lose'
                      ? '💀 DEFEAT! Absorbed into their train!'
                      : '🤝 TIE! Double Shake!'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showMapModal && (
        <MapSelectorModal onClose={() => setShowMapModal(false)} />
      )}
    </div>
  );
};
