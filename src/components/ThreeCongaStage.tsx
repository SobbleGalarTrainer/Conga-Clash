import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Character } from '../types/game';
import { create3DDancer, updateDancerAnimation, setupStudioEnvironment, createParquetFloorTexture } from '../utils/threeDancer';

interface ThreeCongaStageProps {
  leader: Character;
  followers: Character[];
  title?: string;
  isInteractive?: boolean;
}

export const ThreeCongaStage: React.FC<ThreeCongaStageProps> = ({
  leader,
  followers,
  title = '3D Conga Line Showcase',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [is3DActive, setIs3DActive] = useState(true);
  const [cameraView, setCameraView] = useState<'front' | 'side' | 'isometric'>('isometric');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [danceSpeed, setDanceSpeed] = useState(1.0);

  const dancersRef = useRef<{ group: THREE.Group; char: Character; offsetIndex: number }[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!mountRef.current || !is3DActive) return;

    const width = mountRef.current.clientWidth || 800;
    const height = 340;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.045);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.5);
    camera.lookAt(0, 0.8, 0);
    cameraRef.current = camera;

    // 3. Renderer with ACES ToneMapping & SRGB
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. Studio Environment
    setupStudioEnvironment(renderer, scene);

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 1.2);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfef08a, 2.0);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Warm disco accent spot
    const spotLight = new THREE.SpotLight(0xf43f5e, 2.5, 12, Math.PI / 4, 0.4);
    spotLight.position.set(-4, 5, 2);
    spotLight.castShadow = true;
    scene.add(spotLight);

    // 6. Dance Floor (Parquet texture)
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorTex = createParquetFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Stage neon border ring
    const borderGeo = new THREE.RingGeometry(5.8, 6.0, 48);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.01;
    scene.add(border);

    // 7. Assemble 3D Conga Line Train
    const trainGroup = new THREE.Group();
    scene.add(trainGroup);

    const allDancers = [leader, ...followers.slice(0, 10)];
    dancersRef.current = [];

    allDancers.forEach((char, idx) => {
      const isLead = idx === 0;
      const mesh = create3DDancer(char, isLead);

      // Conga train snake curve positioning
      const spacing = 1.05;
      const curveAngle = idx * 0.45;
      const x = Math.sin(curveAngle) * (idx * 0.35) - (idx * 0.8) + 1.8;
      const z = Math.cos(curveAngle) * (idx * 0.3) + (idx * 0.35) - 0.5;

      mesh.position.set(x, 0, z);
      // Face towards forward direction of line
      mesh.rotation.y = Math.PI * 0.35 - idx * 0.12;

      trainGroup.add(mesh);
      dancersRef.current.push({ group: mesh, char, offsetIndex: idx });
    });

    // 8. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime() * danceSpeed;

      // Animate each dancer with conga hop and kick
      dancersRef.current.forEach((d) => {
        // slight phase delay along the conga line for ripple effect!
        const delayedTime = elapsed - d.offsetIndex * 0.08;
        updateDancerAnimation(d.group, delayedTime, true, danceSpeed);
      });

      // Subtle camera gentle glide
      if (cameraRef.current) {
        if (cameraView === 'isometric') {
          const targetX = 4.5 + Math.sin(elapsed * 0.3) * 0.4;
          const targetZ = 5.5 + Math.cos(elapsed * 0.3) * 0.4;
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, targetX, 2, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, targetZ, 2, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 3.2, 2, delta);
          cameraRef.current.lookAt(0.5, 0.8, 0);
        } else if (cameraView === 'front') {
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, 0, 3, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 2.0, 3, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, 6.2, 3, delta);
          cameraRef.current.lookAt(0, 0.9, 0);
        } else if (cameraView === 'side') {
          cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, 6.8, 3, delta);
          cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, 2.2, 3, delta);
          cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, 0, 3, delta);
          cameraRef.current.lookAt(0, 0.9, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth || 800;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [leader, followers, is3DActive, cameraView, danceSpeed]);

  const totalDancers = 1 + followers.length;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
            🪩
          </div>
          <div>
            <h3 className="font-display font-black text-white text-base sm:text-lg flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                True 3D Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time procedural 3D conga hop & kick kinematics with Studio PBR reflections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden sm:inline">Conga Train:</span>
          <span className="font-display font-black text-amber-400 text-sm sm:text-base tabular-nums bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            {totalDancers} {totalDancers === 1 ? 'Dancer' : 'Dancers'}
          </span>
        </div>
      </div>

      {/* 3D Viewport Container */}
      <div className="relative w-full h-[340px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion as required by Skill) */}
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-xl transition-all duration-300 z-20 ${
            isCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
          }`}
        >
          {/* Collapse Handle */}
          <div className="flex justify-center mb-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-700 rounded-t-lg shadow-md cursor-pointer flex items-center gap-1"
            >
              <span>{isCollapsed ? '▴ Show 3D Controls' : '▾ Hide 3D Controls'}</span>
            </button>
          </div>

          {/* Unified Bottom Control Glass Bar */}
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Camera Views */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px]">Camera:</span>
              {(['isometric', 'front', 'side'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setCameraView(view)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                    cameraView === view
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Tempo multiplier */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px]">BPM:</span>
              {[0.8, 1.0, 1.3].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setDanceSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                    danceSpeed === spd
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd === 0.8 ? 'Slow' : spd === 1.0 ? '120' : '150!'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
