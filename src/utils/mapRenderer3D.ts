import * as THREE from 'three';
import { GameMap } from '../types/game';

/**
 * Creates dynamic, high-fidelity procedural floor textures for each of the 16 maps
 */
export function createMapFloorTexture(map: GameMap): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = map.groundColorHex;
  ctx.fillRect(0, 0, 512, 512);

  switch (map.id) {
    case 'the_park': {
      // Grass patches & stepping stones
      ctx.fillStyle = '#15803d';
      for (let i = 0; i < 400; i++) {
        const x = (i * 73) % 512;
        const y = (i * 127) % 512;
        ctx.fillRect(x, y, 4, 4);
      }
      // Wildflowers (yellow, white, pink)
      const flowerColors = ['#fde047', '#ffffff', '#f472b6'];
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = flowerColors[i % 3];
        const fx = (i * 97) % 500 + 6;
        const fy = (i * 149) % 500 + 6;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Stepping stone paths
      ctx.strokeStyle = 'rgba(214, 211, 209, 0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(32, 32, 448, 448);
      break;
    }

    case 'the_gym': {
      // Hardwood basketball court
      const plankHeight = 16;
      for (let y = 0; y < 512; y += plankHeight) {
        const isDark = (y / plankHeight) % 2 === 0;
        ctx.fillStyle = isDark ? '#b45309' : '#d97706';
        ctx.fillRect(0, y, 512, plankHeight - 1);
      }
      // Basketball court lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 472, 472);
      // Center court circle
      ctx.beginPath();
      ctx.arc(256, 256, 70, 0, Math.PI * 2);
      ctx.stroke();
      // Center line
      ctx.beginPath();
      ctx.moveTo(20, 256);
      ctx.lineTo(492, 256);
      ctx.stroke();
      break;
    }

    case 'toronto_city_hall': {
      // Civic granite pavers with Canadian maple leaf motif
      const tileSize = 64;
      for (let y = 0; y < 512; y += tileSize) {
        for (let x = 0; x < 512; x += tileSize) {
          ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? '#334155' : '#475569';
          ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
      }
      // Maple Leaf Emblem in Center
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.font = 'bold 90px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍁', 256, 256);
      // Pool border neon cyan line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 480, 480);
      break;
    }

    case 'the_white_house': {
      // Presidential manicured lawn & ceremonial red carpet runner
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, 512, 512);
      // Red carpet strip down center
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(206, 0, 100, 512);
      // Golden fringe on carpet
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(200, 0, 6, 512);
      ctx.fillRect(306, 0, 6, 512);
      // Stars on carpet
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      for (let y = 40; y < 512; y += 64) {
        ctx.fillText('⭐', 256, y);
      }
      break;
    }

    case 'the_airport': {
      // Runway asphalt with landing lines and taxi markings
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 512);
      // White dashed center runway stripes
      ctx.fillStyle = '#ffffff';
      for (let y = 16; y < 512; y += 50) {
        ctx.fillRect(244, y, 24, 30);
      }
      // Yellow taxi edge guidelines
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, 0);
      ctx.lineTo(60, 512);
      ctx.moveTo(452, 0);
      ctx.lineTo(452, 512);
      ctx.stroke();
      // Runway numbers
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('09L', 256, 90);
      ctx.fillText('27R', 256, 440);
      break;
    }

    case 'brebeuf_college_school': {
      // Collegiate red brick quad pavers with crest
      const bW = 32;
      const bH = 16;
      for (let y = 0; y < 512; y += bH) {
        const offset = (y / bH) % 2 === 0 ? 0 : bW / 2;
        for (let x = -bW; x < 512 + bW; x += bW) {
          ctx.fillStyle = ((x + y) % 3 === 0) ? '#881337' : '#9f1239';
          ctx.fillRect(x + offset + 1, y + 1, bW - 2, bH - 2);
        }
      }
      // Collegiate gold crest ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BREBEUF COLLEGE', 256, 260);
      break;
    }

    case '6000_yonge_street': {
      // Uptown neon street terrazzo with vibrant subway crosswalks
      ctx.fillStyle = '#110b1f';
      ctx.fillRect(0, 0, 512, 512);
      // Neon grid lines
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
      // Neon Cyan Subway Crosswalk stripes
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      for (let x = 80; x < 440; x += 40) {
        ctx.fillRect(x, 240, 24, 32);
      }
      break;
    }

    case 'an_amusement_park': {
      // Harlequin diamond carnival pattern
      const size = 64;
      for (let y = 0; y < 512; y += size) {
        for (let x = 0; x < 512; x += size) {
          const col = ((x / size) + (y / size)) % 3;
          ctx.fillStyle = col === 0 ? '#581c87' : col === 1 ? '#be185d' : '#b45309';
          ctx.fillRect(x, y, size, size);
        }
      }
      // Colorful confetti dots
      const confettiColors = ['#facc15', '#38bdf8', '#f43f5e', '#a855f7'];
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = confettiColors[i % confettiColors.length];
        const cx = (i * 61) % 512;
        const cy = (i * 97) % 512;
        ctx.fillRect(cx, cy, 3, 3);
      }
      break;
    }

    case 'the_island': {
      // Tropical sand with turquoise ocean foam and shells
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(0, 0, 512, 512);
      // Waves / water gradient on top & bottom edges
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 512, 45);
      ctx.fillRect(0, 467, 512, 45);
      // Ocean foam
      ctx.fillStyle = '#e0f2fe';
      for (let x = 0; x < 512; x += 24) {
        ctx.beginPath();
        ctx.arc(x + 12, 45, 8, 0, Math.PI);
        ctx.arc(x + 12, 467, 8, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'london': {
      // Victorian cobblestones with rainy gloss
      const cW = 40;
      const cH = 20;
      for (let y = 0; y < 512; y += cH) {
        const offset = (y / cH) % 2 === 0 ? 0 : cW / 2;
        for (let x = -cW; x < 512 + cW; x += cW) {
          ctx.fillStyle = ((x + y) % 5 === 0) ? '#1c1917' : '#292524';
          ctx.fillRect(x + offset + 1, y + 1, cW - 2, cH - 2);
        }
      }
      // Red phone booth emblem
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.font = '64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☎️', 256, 270);
      break;
    }

    case 'paris': {
      // Haussmann limestone boulevard promenade with falling leaves
      const pSize = 48;
      for (let y = 0; y < 512; y += pSize) {
        for (let x = 0; x < 512; x += pSize) {
          ctx.fillStyle = ((x + y) / pSize) % 2 === 0 ? '#44333c' : '#35252e';
          ctx.fillRect(x + 1, y + 1, pSize - 2, pSize - 2);
        }
      }
      // Fallen golden leaves
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      for (let i = 0; i < 70; i++) {
        const lx = (i * 83) % 500 + 6;
        const ly = (i * 137) % 500 + 6;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 4, 2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'moscow': {
      // Red Square cobblestones dusted with snow
      const sSize = 36;
      for (let y = 0; y < 512; y += sSize) {
        for (let x = 0; x < 512; x += sSize) {
          ctx.fillStyle = ((x + y) / sSize) % 2 === 0 ? '#450a0a' : '#571010';
          ctx.fillRect(x + 1, y + 1, sSize - 2, sSize - 2);
        }
      }
      // White snow dusting
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let i = 0; i < 250; i++) {
        const sx = (i * 79) % 512;
        const sy = (i * 113) % 512;
        ctx.fillRect(sx, sy, 2, 2);
      }
      break;
    }

    case 'beijing': {
      // Imperial brick & golden dragons
      const iW = 64;
      const iH = 32;
      for (let y = 0; y < 512; y += iH) {
        const off = (y / iH) % 2 === 0 ? 0 : iW / 2;
        for (let x = -iW; x < 512 + iW; x += iW) {
          ctx.fillStyle = ((x + y) % 4 === 0) ? '#7f1d1d' : '#991b1b';
          ctx.fillRect(x + off + 1, y + 1, iW - 2, iH - 2);
        }
      }
      // Imperial Gold Border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, 480, 480);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.font = 'bold 70px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏮', 256, 270);
      break;
    }

    case 'hinundayan': {
      // Bamboo slatted fiesta pavilion with banig weaves
      const bambooH = 14;
      for (let y = 0; y < 512; y += bambooH) {
        ctx.fillStyle = (y / bambooH) % 2 === 0 ? '#065f46' : '#047857';
        ctx.fillRect(0, y, 512, bambooH - 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, y, 512, 2);
      }
      // Colorful fiesta triangles (banderitas)
      const bColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
      for (let x = 0; x < 512; x += 32) {
        ctx.fillStyle = bColors[(x / 32) % bColors.length];
        ctx.beginPath();
        ctx.moveTo(x, 16);
        ctx.lineTo(x + 32, 16);
        ctx.lineTo(x + 16, 42);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'manila': {
      // Spanish colonial stone cobblestones & mango borders
      const mSize = 42;
      for (let y = 0; y < 512; y += mSize) {
        for (let x = 0; x < 512; x += mSize) {
          ctx.fillStyle = ((x + y) / mSize) % 2 === 0 ? '#431407' : '#7c2d12';
          ctx.fillRect(x + 1, y + 1, mSize - 2, mSize - 2);
        }
      }
      // Jeepney emblem in center
      ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
      ctx.font = '72px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚐', 256, 270);
      break;
    }

    case 'san_francisco': {
      // Wooden wharf pier planks with steel cable car rails
      const plankH = 20;
      for (let y = 0; y < 512; y += plankH) {
        ctx.fillStyle = (y / plankH) % 2 === 0 ? '#3b2f2f' : '#4a3b32';
        ctx.fillRect(0, y, 512, plankH - 1);
      }
      // Steel Cable Car Rails down center
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(180, 0, 8, 512);
      ctx.fillRect(324, 0, 8, 512);
      // Center cable slot
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(252, 0, 8, 512);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Builds a custom 3D architectural landmark centerpiece for the map
 */
export function createMapCenterpieceMesh(map: GameMap): THREE.Group {
  const root = new THREE.Group();
  root.name = `map_centerpiece_${map.id}`;

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const cyanMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3, emissive: 0x0891b2, emissiveIntensity: 0.3 });

  switch (map.id) {
    case 'the_park': {
      // Park Gazebo: Octagonal pavilion with pillars and conical dome
      const baseGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.5, 8);
      const base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.y = 0.25;
      root.add(base);

      // 8 Pillars
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const colGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8);
        const col = new THREE.Mesh(colGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
        col.position.set(Math.cos(angle) * 3, 1.85, Math.sin(angle) * 3);
        root.add(col);
      }

      // Roof dome
      const roofGeo = new THREE.ConeGeometry(3.8, 2, 8);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.5 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 4.4;
      root.add(roof);

      // Gold spire
      const spireGeo = new THREE.CylinderGeometry(0.04, 0.08, 1, 8);
      const spire = new THREE.Mesh(spireGeo, goldMat);
      spire.position.y = 5.7;
      root.add(spire);
      break;
    }

    case 'the_gym': {
      // Basketball hoop & center arena scoreboard
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
      const pole = new THREE.Mesh(poleGeo, stoneMat);
      pole.position.set(0, 2.5, -4);
      root.add(pole);

      // Backboard
      const bbGeo = new THREE.BoxGeometry(2.4, 1.5, 0.1);
      const bbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.85 });
      const bb = new THREE.Mesh(bbGeo, bbMat);
      bb.position.set(0, 4.5, -3.5);
      root.add(bb);

      // Orange hoop
      const rimGeo = new THREE.TorusGeometry(0.45, 0.04, 8, 16);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.5, roughness: 0.3 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 4.2, -3.05);
      root.add(rim);

      // Floating scoreboard cube high up
      const boardGeo = new THREE.BoxGeometry(3, 2, 3);
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, 9, 0);
      root.add(board);
      break;
    }

    case 'toronto_city_hall': {
      // Famous Toronto 3D sign & Curved Tower arch
      // 3D TORONTO Letters stand
      const lettersGroup = new THREE.Group();
      const letterColors = [0xef4444, 0xf97316, 0xfacc15, 0x10b981, 0x06b6d4, 0x6366f1, 0xec4899];
      const spacing = 0.85;
      for (let i = 0; i < 7; i++) {
        const charGeo = new THREE.BoxGeometry(0.65, 1.6, 0.3);
        const charMat = new THREE.MeshStandardMaterial({
          color: letterColors[i],
          roughness: 0.2,
          emissive: letterColors[i],
          emissiveIntensity: 0.5,
        });
        const mesh = new THREE.Mesh(charGeo, charMat);
        mesh.position.set((i - 3) * spacing, 0.8, 0);
        lettersGroup.add(mesh);
      }
      root.add(lettersGroup);

      // Council Chamber Dome behind sign
      const domeGeo = new THREE.SphereGeometry(2.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(0, 0, -4.5);
      root.add(dome);

      // Curved Tower mockup wings
      const towerGeo = new THREE.CylinderGeometry(4.5, 4.5, 9, 16, 1, false, 0, Math.PI * 0.6);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
      const eastTower = new THREE.Mesh(towerGeo, towerMat);
      eastTower.position.set(3.5, 4.5, -6);
      eastTower.rotation.y = -Math.PI / 4;
      root.add(eastTower);
      break;
    }

    case 'the_white_house': {
      // Classical neoclassical portico with columns & American flag
      const podiumGeo = new THREE.BoxGeometry(6, 0.6, 3.5);
      const podium = new THREE.Mesh(podiumGeo, stoneMat);
      podium.position.y = 0.3;
      root.add(podium);

      // 4 Marble Columns
      for (let i = -1.5; i <= 1.5; i += 1) {
        const colGeo = new THREE.CylinderGeometry(0.18, 0.18, 4.2, 12);
        const colMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(i * 1.5, 2.4, 0.8);
        root.add(col);
      }

      // Triangular pediment roof
      const pedGeo = new THREE.ConeGeometry(3.5, 1.4, 4);
      const ped = new THREE.Mesh(pedGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
      ped.position.set(0, 5.1, 0.8);
      ped.rotation.y = Math.PI / 4;
      root.add(ped);

      // Flagpole
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8);
      const pole = new THREE.Mesh(poleGeo, goldMat);
      pole.position.set(0, 6.8, 0.8);
      root.add(pole);
      break;
    }

    case 'the_airport': {
      // Air Traffic Control Tower with rotating radar
      const towerShaftGeo = new THREE.CylinderGeometry(1.2, 1.8, 7.5, 12);
      const towerShaft = new THREE.Mesh(towerShaftGeo, stoneMat);
      towerShaft.position.y = 3.75;
      root.add(towerShaft);

      // Control cabin (octagonal glass)
      const cabinGeo = new THREE.CylinderGeometry(2.4, 2, 1.8, 8);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, transparent: true, opacity: 0.85 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.y = 8.2;
      root.add(cabin);

      // Radar dish
      const radarGeo = new THREE.BoxGeometry(1.6, 0.6, 0.1);
      const radar = new THREE.Mesh(radarGeo, redMat);
      radar.position.set(0, 9.6, 0);
      radar.name = 'airport_radar';
      root.add(radar);
      break;
    }

    case 'brebeuf_college_school': {
      // Collegiate clock tower with arched brickwork
      const towerBaseGeo = new THREE.BoxGeometry(2.8, 6.5, 2.8);
      const towerBaseMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.6 });
      const tower = new THREE.Mesh(towerBaseGeo, towerBaseMat);
      tower.position.y = 3.25;
      root.add(tower);

      // Clock face
      const clockFaceGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
      const clockFace = new THREE.Mesh(clockFaceGeo, new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 }));
      clockFace.rotation.x = Math.PI / 2;
      clockFace.position.set(0, 5.2, 1.45);
      root.add(clockFace);

      // Copper roof spire
      const spireGeo = new THREE.ConeGeometry(1.8, 3, 4);
      const spireMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = 7.8;
      spire.rotation.y = Math.PI / 4;
      root.add(spire);
      break;
    }

    case '6000_yonge_street': {
      // Modern high-rise skyscraper facade with glowing neon antennas
      const bldgGeo = new THREE.BoxGeometry(3.6, 9.5, 3.6);
      const bldgMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.6, roughness: 0.2 });
      const bldg = new THREE.Mesh(bldgGeo, bldgMat);
      bldg.position.y = 4.75;
      root.add(bldg);

      // Glowing Magenta Neon Spire
      const antGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8);
      const antMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.8 });
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(0, 11, 0);
      root.add(ant);
      break;
    }

    case 'an_amusement_park': {
      // Rotating neon Ferris wheel
      const wheelGroup = new THREE.Group();
      wheelGroup.name = 'amusement_ferris_wheel';

      const rimGeo = new THREE.TorusGeometry(3.6, 0.12, 8, 24);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.4 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rim);

      // Spokes
      for (let i = 0; i < 6; i++) {
        const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, 7.2, 8);
        const spoke = new THREE.Mesh(spokeGeo, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        spoke.rotation.z = (i / 6) * Math.PI;
        wheelGroup.add(spoke);
      }

      // Gondolas
      const gondolaColors = [0xef4444, 0x3b82f6, 0x10b981, 0xfacc15, 0xa855f7, 0xec4899];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const gondGeo = new THREE.BoxGeometry(0.6, 0.6, 0.5);
        const gondMat = new THREE.MeshStandardMaterial({ color: gondolaColors[i], roughness: 0.3 });
        const gond = new THREE.Mesh(gondGeo, gondMat);
        gond.position.set(Math.cos(angle) * 3.6, Math.sin(angle) * 3.6, 0);
        wheelGroup.add(gond);
      }

      wheelGroup.position.set(0, 5.2, 0);
      root.add(wheelGroup);

      // A-frame base support
      const legGeo = new THREE.CylinderGeometry(0.12, 0.15, 6, 8);
      const leg1 = new THREE.Mesh(legGeo, stoneMat);
      leg1.position.set(-1.8, 2.8, 0);
      leg1.rotation.z = -0.3;
      root.add(leg1);

      const leg2 = new THREE.Mesh(legGeo, stoneMat);
      leg2.position.set(1.8, 2.8, 0);
      leg2.rotation.z = 0.3;
      root.add(leg2);
      break;
    }

    case 'the_island': {
      // Tropical Tiki Totem & Bamboo Hut
      const totemGeo = new THREE.CylinderGeometry(0.8, 0.9, 4.5, 12);
      const totemMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const totem = new THREE.Mesh(totemGeo, totemMat);
      totem.position.y = 2.25;
      root.add(totem);

      // Flaming Torch on top
      const bowlGeo = new THREE.CylinderGeometry(0.7, 0.3, 0.6, 8);
      const bowl = new THREE.Mesh(bowlGeo, goldMat);
      bowl.position.y = 4.8;
      root.add(bowl);

      const flameGeo = new THREE.ConeGeometry(0.4, 0.9, 8);
      const flameMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 1 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 5.5;
      root.add(flame);
      break;
    }

    case 'london': {
      // Big Ben Clock Tower mockup
      const towerGeo = new THREE.BoxGeometry(2.4, 8, 2.4);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.6 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = 4;
      root.add(tower);

      // 4 Gilded Clock Dials
      for (let i = 0; i < 4; i++) {
        const dialGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16);
        const dialMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.3 });
        const dial = new THREE.Mesh(dialGeo, dialMat);
        const angle = (i * Math.PI) / 2;
        dial.position.set(Math.sin(angle) * 1.25, 6.8, Math.cos(angle) * 1.25);
        dial.rotation.x = Math.PI / 2;
        dial.rotation.z = -angle;
        root.add(dial);
      }

      // Pyramid spire
      const spireGeo = new THREE.ConeGeometry(1.6, 3, 4);
      const spire = new THREE.Mesh(spireGeo, goldMat);
      spire.position.y = 9.5;
      spire.rotation.y = Math.PI / 4;
      root.add(spire);
      break;
    }

    case 'paris': {
      // Eiffel Tower steel lattice mockup
      const baseGeo = new THREE.ConeGeometry(3.2, 5, 4);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.7, roughness: 0.3, wireframe: true });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 2.5;
      base.rotation.y = Math.PI / 4;
      root.add(base);

      // Upper spire
      const spireGeo = new THREE.ConeGeometry(1.2, 5, 4);
      const spire = new THREE.Mesh(spireGeo, baseMat);
      spire.position.y = 7.5;
      spire.rotation.y = Math.PI / 4;
      root.add(spire);

      // Golden Beacon light at top
      const beaconGeo = new THREE.SphereGeometry(0.25, 8, 8);
      const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 1 }));
      beacon.position.y = 10.2;
      root.add(beacon);
      break;
    }

    case 'moscow': {
      // St. Basil's Swirling Onion Domes
      const towerGeo = new THREE.CylinderGeometry(1.2, 1.4, 4.5, 12);
      const tower = new THREE.Mesh(towerGeo, redMat);
      tower.position.y = 2.25;
      root.add(tower);

      // Onion dome
      const domeGeo = new THREE.SphereGeometry(1.5, 16, 16);
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.scale.set(1, 1.4, 1);
      dome.position.y = 5.2;
      root.add(dome);

      // Cross on top
      const crossGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
      const cross = new THREE.Mesh(crossGeo, goldMat);
      cross.position.y = 6.8;
      root.add(cross);
      break;
    }

    case 'beijing': {
      // Imperial Hall Pavilion with Golden Eaves
      const baseGeo = new THREE.BoxGeometry(4.5, 0.8, 4.5);
      const base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.y = 0.4;
      root.add(base);

      // Crimson Pillars
      for (let x = -1.6; x <= 1.6; x += 3.2) {
        for (let z = -1.6; z <= 1.6; z += 3.2) {
          const colGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8);
          const col = new THREE.Mesh(colGeo, redMat);
          col.position.set(x, 2, z);
          root.add(col);
        }
      }

      // Golden Curved Eaves
      const eaveGeo = new THREE.ConeGeometry(3.8, 1.4, 4);
      const eaveMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.5 });
      const eave = new THREE.Mesh(eaveGeo, eaveMat);
      eave.position.y = 4.2;
      eave.rotation.y = Math.PI / 4;
      root.add(eave);
      break;
    }

    case 'hinundayan': {
      // Bamboo Fiesta Arch with banderitas
      const postGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.5, 8);
      const bambooMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.5 });
      const leftPost = new THREE.Mesh(postGeo, bambooMat);
      leftPost.position.set(-2.5, 2.25, 0);
      root.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, bambooMat);
      rightPost.position.set(2.5, 2.25, 0);
      root.add(rightPost);

      const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.2, 8);
      const beam = new THREE.Mesh(beamGeo, bambooMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(0, 4.5, 0);
      root.add(beam);

      // Hanging colorful flags
      const flagColors = [0xef4444, 0xf59e0b, 0x3b82f6, 0x10b981];
      for (let i = 0; i < 5; i++) {
        const flagGeo = new THREE.BoxGeometry(0.4, 0.6, 0.05);
        const flagMat = new THREE.MeshStandardMaterial({ color: flagColors[i % flagColors.length] });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set((i - 2) * 0.9, 3.9, 0);
        root.add(flag);
      }
      break;
    }

    case 'manila': {
      // Philippine Jeepney Mockup
      const bodyGeo = new THREE.BoxGeometry(2.4, 1.4, 4.2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.3, metalness: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.2;
      root.add(body);

      // Chrome roof
      const roofGeo = new THREE.BoxGeometry(2.5, 0.2, 4.4);
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 });
      const roof = new THREE.Mesh(roofGeo, chromeMat);
      roof.position.y = 2.1;
      root.add(roof);

      // Headlights
      const lightGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const lightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 1 });
      const hlLeft = new THREE.Mesh(lightGeo, lightMat);
      hlLeft.position.set(-0.8, 1, 2.15);
      root.add(hlLeft);

      const hlRight = new THREE.Mesh(lightGeo, lightMat);
      hlRight.position.set(0.8, 1, 2.15);
      root.add(hlRight);
      break;
    }

    case 'san_francisco': {
      // Golden Gate Bridge Suspension Tower
      const legGeo = new THREE.BoxGeometry(0.5, 8.5, 0.5);
      const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.4 }); // International Orange
      const leftLeg = new THREE.Mesh(legGeo, bridgeMat);
      leftLeg.position.set(-1.4, 4.25, 0);
      root.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, bridgeMat);
      rightLeg.position.set(1.4, 4.25, 0);
      root.add(rightLeg);

      // Cross struts
      for (let y = 2.5; y <= 7.5; y += 2) {
        const strutGeo = new THREE.BoxGeometry(2.8, 0.3, 0.3);
        const strut = new THREE.Mesh(strutGeo, bridgeMat);
        strut.position.set(0, y, 0);
        root.add(strut);
      }
      break;
    }
  }

  return root;
}
