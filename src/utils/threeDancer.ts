import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Character, HatStyle } from '../types/game';

// Shared geometries for performance & zero GC
const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
const torsoGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12);
const hipGeo = new THREE.CylinderGeometry(0.28, 0.26, 0.22, 12);
const limbGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8);
const footGeo = new THREE.BoxGeometry(0.14, 0.1, 0.24);
const handGeo = new THREE.SphereGeometry(0.09, 8, 8);

// Setup procedural studio environment
export function setupStudioEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();
  return envTexture;
}

// Generate procedural floor texture for Carnival Parquet
export function createParquetFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm wooden dance parquet with festive carnival chevron
  ctx.fillStyle = '#2d1810';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 64;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isAlt ? '#3e2216' : '#2b160e';
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

      // Fine wood grain lines
      ctx.strokeStyle = 'rgba(255, 200, 150, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y + i * 16);
        ctx.lineTo(x + tileSize, y + i * 16);
        ctx.stroke();
      }
    }
  }

  // Golden carnival border insets
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 504, 504);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Build procedural Hat / Accessory mesh
export function createHatMesh(hat: HatStyle, accessoryColor: string): THREE.Group {
  const hatGroup = new THREE.Group();
  hatGroup.name = 'hat_root';

  const accMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accessoryColor),
    roughness: 0.35,
    metalness: 0.2,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.85,
  });

  switch (hat) {
    case 'sombrero': {
      // Brim
      const brimGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.05, 20);
      const brim = new THREE.Mesh(brimGeo, accMat);
      brim.position.y = 0.02;
      hatGroup.add(brim);

      // Cone crown
      const crownGeo = new THREE.ConeGeometry(0.3, 0.42, 16);
      const crown = new THREE.Mesh(crownGeo, accMat);
      crown.position.y = 0.22;
      hatGroup.add(crown);

      // Festive trim band
      const bandGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 20);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.06;
      hatGroup.add(band);
      break;
    }

    case 'crown':
    case 'golden_halo': {
      if (hat === 'golden_halo') {
        const ringGeo = new THREE.TorusGeometry(0.35, 0.035, 12, 24);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfef08a,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          metalness: 0.9,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.28;
        hatGroup.add(ring);
      } else {
        // Imperial Crown
        const baseGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.18, 16);
        const base = new THREE.Mesh(baseGeo, goldMat);
        hatGroup.add(base);

        // Crown spikes
        for (let i = 0; i < 5; i++) {
          const spikeGeo = new THREE.ConeGeometry(0.08, 0.22, 6);
          const spike = new THREE.Mesh(spikeGeo, goldMat);
          const angle = (i / 5) * Math.PI * 2;
          spike.position.set(Math.sin(angle) * 0.28, 0.18, Math.cos(angle) * 0.28);
          hatGroup.add(spike);
        }
      }
      break;
    }

    case 'party_hat': {
      const coneGeo = new THREE.ConeGeometry(0.24, 0.5, 14);
      const cone = new THREE.Mesh(coneGeo, accMat);
      cone.position.y = 0.25;
      hatGroup.add(cone);

      // Fluffy pom-pom top
      const pomGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const pomMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });
      const pom = new THREE.Mesh(pomGeo, pomMat);
      pom.position.y = 0.52;
      hatGroup.add(pom);
      break;
    }

    case 'disco_afro': {
      const afroGeo = new THREE.SphereGeometry(0.46, 16, 14);
      const afroMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.95,
        metalness: 0.05,
      });
      const afro = new THREE.Mesh(afroGeo, afroMat);
      afro.scale.set(1.15, 1.05, 1.15);
      afro.position.y = 0.12;
      hatGroup.add(afro);

      // Golden afro pick
      const pickGeo = new THREE.BoxGeometry(0.04, 0.26, 0.02);
      const pick = new THREE.Mesh(pickGeo, goldMat);
      pick.rotation.z = 0.35;
      pick.position.set(0.35, 0.2, 0.1);
      hatGroup.add(pick);
      break;
    }

    case 'flower_lei': {
      const garlandGeo = new THREE.TorusGeometry(0.34, 0.06, 10, 18);
      const flowerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(accessoryColor),
        roughness: 0.6,
      });
      const garland = new THREE.Mesh(garlandGeo, flowerMat);
      garland.rotation.x = Math.PI / 2;
      garland.position.y = -0.05;
      hatGroup.add(garland);
      break;
    }

    case 'sunglasses':
    case 'neon_visor': {
      if (hat === 'neon_visor') {
        const visorGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.14, 16, 1, true, -Math.PI / 2, Math.PI);
        const visorMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.6,
          roughness: 0.1,
          metalness: 0.9,
          side: THREE.DoubleSide,
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0, 0.08);
        hatGroup.add(visor);
      } else {
        // Sunglasses
        const frameGeo = new THREE.BoxGeometry(0.55, 0.12, 0.06);
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          roughness: 0.1,
          metalness: 0.9,
        });
        const glasses = new THREE.Mesh(frameGeo, glassMat);
        glasses.position.set(0, 0.02, 0.32);
        hatGroup.add(glasses);
      }
      break;
    }

    case 'chef_hat': {
      const bandGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 16);
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
      const band = new THREE.Mesh(bandGeo, whiteMat);
      hatGroup.add(band);

      const puffGeo = new THREE.CylinderGeometry(0.42, 0.32, 0.36, 16);
      const puff = new THREE.Mesh(puffGeo, whiteMat);
      puff.position.y = 0.24;
      hatGroup.add(puff);
      break;
    }

    case 'carnival_mask': {
      const maskGeo = new THREE.BoxGeometry(0.5, 0.18, 0.08);
      const maskMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(accessoryColor),
        roughness: 0.3,
        metalness: 0.6,
      });
      const mask = new THREE.Mesh(maskGeo, maskMat);
      mask.position.set(0, 0.02, 0.3);
      hatGroup.add(mask);

      // Feather spike
      const plumeGeo = new THREE.ConeGeometry(0.06, 0.45, 8);
      const plumeMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.5 });
      const plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.rotation.z = -0.3;
      plume.position.set(-0.2, 0.3, 0.25);
      hatGroup.add(plume);
      break;
    }

    case 'viking_horns': {
      const capGeo = new THREE.SphereGeometry(0.34, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.4, metalness: 0.8 });
      const cap = new THREE.Mesh(capGeo, ironMat);
      hatGroup.add(cap);

      // Horns
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
      [-1, 1].forEach((dir) => {
        const hornGeo = new THREE.ConeGeometry(0.09, 0.36, 8);
        const horn = new THREE.Mesh(hornGeo, hornMat);
        horn.rotation.z = -dir * 0.7;
        horn.position.set(dir * 0.35, 0.2, 0);
        hatGroup.add(horn);
      });
      break;
    }

    case 'pirate_tricorn': {
      const tricornGeo = new THREE.CylinderGeometry(0.58, 0.45, 0.2, 3);
      const tricornMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7 });
      const tricorn = new THREE.Mesh(tricornGeo, tricornMat);
      tricorn.position.y = 0.1;
      hatGroup.add(tricorn);
      break;
    }

    case 'astronaut_helmet': {
      const helmGeo = new THREE.SphereGeometry(0.42, 16, 16);
      const helmMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.1 });
      const helm = new THREE.Mesh(helmGeo, helmMat);
      hatGroup.add(helm);

      const goldVisorGeo = new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI, 0, Math.PI);
      const visor = new THREE.Mesh(goldVisorGeo, goldMat);
      visor.rotation.y = Math.PI / 2;
      visor.position.set(0, 0, 0.1);
      hatGroup.add(visor);
      break;
    }

    case 'cat_ears': {
      const earMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(accessoryColor), roughness: 0.4 });
      [-1, 1].forEach((dir) => {
        const earGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
        const ear = new THREE.Mesh(earGeo, earMat);
        ear.rotation.z = -dir * 0.35;
        ear.position.set(dir * 0.22, 0.25, 0);
        hatGroup.add(ear);
      });
      break;
    }

    case 'wizard_hat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.04, 16), accMat);
      hatGroup.add(brim);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.65, 12), accMat);
      cone.position.set(0, 0.33, -0.05);
      cone.rotation.x = -0.15;
      hatGroup.add(cone);
      break;
    }

    case 'steampunk_goggles': {
      const goggleMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.8 });
      [-1, 1].forEach((dir) => {
        const eyeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12);
        const eye = new THREE.Mesh(eyeGeo, goggleMat);
        eye.rotation.x = Math.PI / 2;
        eye.position.set(dir * 0.16, 0.05, 0.3);
        hatGroup.add(eye);
      });
      break;
    }

    case 'feathers':
    default: {
      // Flowing carnival plumes
      const colors = [0xec4899, 0xfacc15, 0x06b6d4];
      colors.forEach((c, i) => {
        const plumeGeo = new THREE.ConeGeometry(0.07, 0.5 + i * 0.05, 8);
        const plumeMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
        const plume = new THREE.Mesh(plumeGeo, plumeMat);
        plume.rotation.z = (i - 1) * 0.28;
        plume.position.set((i - 1) * 0.12, 0.32, -0.05);
        hatGroup.add(plume);
      });
      break;
    }
  }

  return hatGroup;
}

// Create complete 3D procedural character model (Group of 3-12 parts)
export function create3DDancer(character: Character, isLeader = false): THREE.Group {
  const root = new THREE.Group();
  root.name = `dancer_${character.id}`;

  // Materials based on character stats
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(character.skinTone || '#deb887'),
    roughness: 0.6,
    metalness: 0.05,
  });

  const shirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(character.shirtColor || '#f97316'),
    roughness: 0.5,
    metalness: 0.15,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(character.pantsColor || '#1e293b'),
    roughness: 0.7,
    metalness: 0.1,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(character.hairColor || '#3d2314'),
    roughness: 0.85,
    metalness: 0.05,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.2,
  });

  // 1. Torso & Hips
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  torso.position.y = 1.05;
  root.add(torso);

  const hips = new THREE.Mesh(hipGeo, pantsMat);
  hips.castShadow = true;
  hips.position.y = 0.68;
  root.add(hips);

  // 2. Head & Hair
  const headGroup = new THREE.Group();
  headGroup.name = 'head_group';
  headGroup.position.y = 1.6;

  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Hair puff
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), hairMat);
  hair.position.set(0, 0.05, -0.06);
  hair.scale.set(1.02, 1.05, 0.95);
  headGroup.add(hair);

  // 3. Hat / Accessory
  const hatMesh = createHatMesh(character.hat, character.accessoryColor);
  hatMesh.position.y = 0.3;
  headGroup.add(hatMesh);

  root.add(headGroup);

  // 4. Arms & Hands
  const leftArmPivot = new THREE.Group();
  leftArmPivot.name = 'left_arm_pivot';
  leftArmPivot.position.set(-0.35, 1.3, 0);

  const leftArm = new THREE.Mesh(limbGeo, shirtMat);
  leftArm.position.y = -0.22;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);

  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.y = -0.45;
  leftArmPivot.add(leftHand);
  root.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.name = 'right_arm_pivot';
  rightArmPivot.position.set(0.35, 1.3, 0);

  const rightArm = new THREE.Mesh(limbGeo, shirtMat);
  rightArm.position.y = -0.22;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);

  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.y = -0.45;
  rightArmPivot.add(rightHand);
  root.add(rightArmPivot);

  // 5. Legs & Feet
  const leftLegPivot = new THREE.Group();
  leftLegPivot.name = 'left_leg_pivot';
  leftLegPivot.position.set(-0.16, 0.6, 0);

  const leftLeg = new THREE.Mesh(limbGeo, pantsMat);
  leftLeg.position.y = -0.25;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);

  const leftFoot = new THREE.Mesh(footGeo, shoeMat);
  leftFoot.position.set(0, -0.48, 0.05);
  leftFoot.castShadow = true;
  leftLegPivot.add(leftFoot);
  root.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.name = 'right_leg_pivot';
  rightLegPivot.position.set(0.16, 0.6, 0);

  const rightLeg = new THREE.Mesh(limbGeo, pantsMat);
  rightLeg.position.y = -0.25;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);

  const rightFoot = new THREE.Mesh(footGeo, shoeMat);
  rightFoot.position.set(0, -0.48, 0.05);
  rightFoot.castShadow = true;
  rightLegPivot.add(rightFoot);
  root.add(rightLegPivot);

  // Contact shadow disc on floor
  const shadowGeo = new THREE.CircleGeometry(0.45, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  // Leader glow crown indicator if applicable
  if (isLeader) {
    const leaderRingGeo = new THREE.RingGeometry(0.55, 0.62, 24);
    const leaderRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(leaderRingGeo, leaderRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    ring.name = 'leader_ring';
    root.add(ring);
  }

  return root;
}

// Animate dancer with energetic Latin Conga Hop & Kick (1-2-3-KICK!)
export function updateDancerAnimation(
  root: THREE.Group,
  time: number,
  isDancing = true,
  speedMultiplier = 1.0
) {
  if (!isDancing) return;

  const t = time * 7 * speedMultiplier; // Conga rhythm tempo
  const beat = Math.floor(t / Math.PI) % 4; // 0, 1, 2, 3 (3 is the kick beat!)

  const headGroup = root.getObjectByName('head_group');
  const leftArmPivot = root.getObjectByName('left_arm_pivot');
  const rightArmPivot = root.getObjectByName('right_arm_pivot');
  const leftLegPivot = root.getObjectByName('left_leg_pivot');
  const rightLegPivot = root.getObjectByName('right_leg_pivot');
  const leaderRing = root.getObjectByName('leader_ring');

  // Conga vertical hop
  const hop = Math.abs(Math.sin(t)) * 0.16;
  root.position.y = hop;

  // Hips sway
  const hipSway = Math.sin(t * 0.5) * 0.18;
  root.rotation.z = hipSway * 0.2;

  // Head bob
  if (headGroup) {
    headGroup.rotation.x = Math.sin(t) * 0.12;
    headGroup.rotation.y = Math.cos(t * 0.5) * 0.15;
  }

  // Arms: Pump forward in conga train hold
  if (leftArmPivot && rightArmPivot) {
    leftArmPivot.rotation.x = -0.7 + Math.sin(t) * 0.3;
    leftArmPivot.rotation.z = -0.2 + Math.cos(t) * 0.15;
    rightArmPivot.rotation.x = -0.7 - Math.sin(t) * 0.3;
    rightArmPivot.rotation.z = 0.2 - Math.cos(t) * 0.15;
  }

  // Legs: Step-step-step-KICK!
  if (leftLegPivot && rightLegPivot) {
    if (beat === 3) {
      // High celebratory kick on beat 4!
      leftLegPivot.rotation.x = -0.95; // big forward kick!
      rightLegPivot.rotation.x = 0.1;
    } else {
      leftLegPivot.rotation.x = Math.sin(t) * 0.5;
      rightLegPivot.rotation.x = -Math.sin(t) * 0.5;
    }
  }

  if (leaderRing) {
    leaderRing.rotation.z += 0.02;
  }
}
