import * as THREE from 'three';

/**
 * 喜马拉雅村落建筑群、佛塔经幡与跨河大桥 (Infrastructure & Settlement Impact)
 */
export class HimalayanSettlements {
  constructor(scene, terrain, audio) {
    this.scene = scene;
    this.terrain = terrain;
    this.audio = audio;

    this.buildings = [];
    this.stupas = [];

    this.initForest();
    this.initVillageHouses();
    this.initStupas();
    this.initBridgeAndHighway();
  }

  initForest() {
    // 树木远离主冲沟与主要视线，分布在两侧高耸山坡
    const count = 900;
    const trunkGeom = new THREE.CylinderGeometry(0.35, 0.65, 3.8, 5);
    const foliageGeom = new THREE.ConeGeometry(2.4, 8.0, 6);
    foliageGeom.translate(0, 4.5, 0);

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x1c3a22, flatShading: true });

    this.trunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, count);
    this.foliageMesh = new THREE.InstancedMesh(foliageGeom, foliageMat, count);

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 900;
      const z = (Math.random() - 0.5) * 1100 + 50;
      const y = this.terrain.getTerrainHeight(x, z);

      const nearest = this.terrain.getClosestCurvePoint(x, z);
      // 距离泥石流主轴线大于 65 米，避免树木挡住冲沟视线
      if (y > 25 && y < 220 && nearest.dist > 65) {
        dummy.position.set(x, y + 1.0, z);
        const scale = 0.65 + Math.random() * 0.8;
        dummy.scale.set(scale, scale * (0.85 + Math.random() * 0.4), scale);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.updateMatrix();

        this.trunkMesh.setMatrixAt(idx, dummy.matrix);
        this.foliageMesh.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }

    this.trunkMesh.count = idx;
    this.foliageMesh.count = idx;
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.foliageMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.trunkMesh);
    this.scene.add(this.foliageMesh);
  }

  initVillageHouses() {
    // 村落居民点
    const coords = [
      { x: 80, z: 155, scale: 1.3, type: 'temple' },
      { x: 100, z: 175, scale: 1.1, type: 'house' },
      { x: 65, z: 195, scale: 1.0, type: 'house' },
      { x: 115, z: 210, scale: 1.2, type: 'house' },
      { x: 85, z: 235, scale: 1.1, type: 'house' },
      { x: 130, z: 255, scale: 1.4, type: 'lodge' },
      { x: 75, z: 285, scale: 1.0, type: 'house' },
      { x: 135, z: 310, scale: 1.1, type: 'house' },
      { x: 95, z: 340, scale: 1.1, type: 'house' },
      { x: 150, z: 365, scale: 1.25, type: 'lodge' },
      { x: 195, z: 280, scale: 1.1, type: 'house' },
      { x: 225, z: 320, scale: 1.3, type: 'house' }
    ];

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.88 });
    const roofMatRed = new THREE.MeshStandardMaterial({ color: 0xbd2a2a, roughness: 0.55 });
    const roofMatBlue = new THREE.MeshStandardMaterial({ color: 0x225577, roughness: 0.5 });

    coords.forEach((c, i) => {
      const y = this.terrain.getTerrainHeight(c.x, c.z);
      const group = new THREE.Group();
      group.position.set(c.x, y, c.z);

      const s = c.scale;

      const bodyGeom = new THREE.BoxGeometry(6.5 * s, 5.0 * s, 8.5 * s);
      bodyGeom.translate(0, 2.5 * s, 0);
      const bodyMesh = new THREE.Mesh(bodyGeom, wallMat);
      bodyMesh.castShadow = true;
      group.add(bodyMesh);

      const roofGeom = new THREE.ConeGeometry(7.2 * s, 3.6 * s, 4);
      roofGeom.rotateY(Math.PI / 4);
      roofGeom.translate(0, 6.4 * s, 0);
      const roofMesh = new THREE.Mesh(roofGeom, (i % 2 === 0) ? roofMatRed : roofMatBlue);
      roofMesh.castShadow = true;
      group.add(roofMesh);

      if (c.type === 'temple') {
        const spireGeom = new THREE.CylinderGeometry(0.3 * s, 0.8 * s, 3.2 * s, 8);
        spireGeom.translate(0, 9.4 * s, 0);
        const spireMat = new THREE.MeshStandardMaterial({ color: 0xf0b828, metalness: 0.85, roughness: 0.2 });
        group.add(new THREE.Mesh(spireGeom, spireMat));
      }

      this.scene.add(group);

      const nearest = this.terrain.getClosestCurvePoint(c.x, c.z);

      this.buildings.push({
        group: group,
        roof: roofMesh,
        origPos: group.position.clone(),
        origRot: group.rotation.clone(),
        distToChannel: nearest.dist,
        pathT: nearest.t,
        criticalT: 0.54 + (c.z / 700) * 0.38,
        collapsed: false,
        soundPlayed: false
      });
    });
  }

  initStupas() {
    const stupaCoords = [
      { x: 92, z: 140 },
      { x: 125, z: 235 },
      { x: 150, z: 330 }
    ];

    const stupaMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf0b828, metalness: 0.85, roughness: 0.25 });

    stupaCoords.forEach(sc => {
      const y = this.terrain.getTerrainHeight(sc.x, sc.z);
      const group = new THREE.Group();
      group.position.set(sc.x, y, sc.z);

      const base = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.0, 4.0), stupaMat);
      base.position.y = 1.0;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 12), stupaMat);
      dome.position.y = 3.2;
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.5, 8), goldMat);
      top.position.y = 5.2;

      group.add(base, dome, top);
      this.scene.add(group);

      this.stupas.push({
        group: group,
        origPos: group.position.clone(),
        criticalT: 0.55 + (sc.z / 700) * 0.36
      });
    });
  }

  initBridgeAndHighway() {
    const bridgeGroup = new THREE.Group();
    const bridgeX = 85;
    const bridgeZ = 240;
    const bridgeY = this.terrain.getTerrainHeight(bridgeX, bridgeZ) + 5.0;
    bridgeGroup.position.set(bridgeX, bridgeY, bridgeZ);

    const deckGeom = new THREE.BoxGeometry(52, 1.8, 7.5);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x4a525d, roughness: 0.65 });
    const deck = new THREE.Mesh(deckGeom, deckMat);
    deck.rotation.y = -0.38;
    bridgeGroup.add(deck);

    // 红色醒目钢桁架
    const trussGeom = new THREE.BoxGeometry(52, 4.2, 0.45);
    const trussMat = new THREE.MeshStandardMaterial({ color: 0xb52418, metalness: 0.65, roughness: 0.35 });
    const t1 = new THREE.Mesh(trussGeom, trussMat);
    t1.position.set(0, 2.5, 3.5);
    t1.rotation.y = -0.38;
    const t2 = new THREE.Mesh(trussGeom, trussMat);
    t2.position.set(0, 2.5, -3.5);
    t2.rotation.y = -0.38;
    bridgeGroup.add(t1, t2);

    const pierGeom = new THREE.CylinderGeometry(1.8, 2.2, 20, 8);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x383e47 });
    const pier1 = new THREE.Mesh(pierGeom, pierMat);
    pier1.position.set(-14, -9.5, 5);
    const pier2 = new THREE.Mesh(pierGeom, pierMat);
    pier2.position.set(14, -9.5, -5);
    bridgeGroup.add(pier1, pier2);

    this.scene.add(bridgeGroup);

    this.bridge = {
      group: bridgeGroup,
      origPos: bridgeGroup.position.clone(),
      origRot: bridgeGroup.rotation.clone(),
      deck: deck,
      truss: [t1, t2],
      criticalT: 0.66,
      destroyed: false,
      soundPlayed: false
    };

    // 沿山公路
    const roadPoints = [
      new THREE.Vector3(140, this.terrain.getTerrainHeight(140, 85) + 0.8, 85),
      new THREE.Vector3(110, this.terrain.getTerrainHeight(110, 165) + 0.8, 165),
      new THREE.Vector3(85,  bridgeY, 240),
      new THREE.Vector3(65,  this.terrain.getTerrainHeight(65, 335) + 0.8, 335),
      new THREE.Vector3(45,  this.terrain.getTerrainHeight(45, 460) + 0.8, 460),
      new THREE.Vector3(25,  this.terrain.getTerrainHeight(25, 600) + 0.8, 600)
    ];

    const roadCurve = new THREE.CatmullRomCurve3(roadPoints);
    const roadGeom = new THREE.TubeGeometry(roadCurve, 80, 2.6, 4, false);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x282c34, roughness: 0.95 });
    this.roadMesh = new THREE.Mesh(roadGeom, roadMat);
    this.scene.add(this.roadMesh);
  }

  updateDestruction(progress) {
    this.buildings.forEach(b => {
      if (progress < b.criticalT - 0.05) {
        b.group.position.copy(b.origPos);
        b.group.rotation.copy(b.origRot);
        if (b.roof) b.roof.position.set(0, 0, 0);
        b.collapsed = false;
        b.soundPlayed = false;
      } else if (progress < b.criticalT + 0.08) {
        const f = (progress - (b.criticalT - 0.05)) / 0.13;
        b.group.position.y = b.origPos.y - f * 3.5;
        b.group.position.x = b.origPos.x + f * 4.8;
        b.group.rotation.z = -f * 0.55;
        b.group.rotation.x = f * 0.38;

        if (b.roof) {
          b.roof.position.x = f * 10.0;
          b.roof.position.y = 6.4 + f * 5.0;
          b.roof.rotation.z = f * 1.0;
        }

        if (!b.soundPlayed && this.audio) {
          this.audio.playDemolitionSound();
          b.soundPlayed = true;
        }
      } else {
        const bury = Math.min(1.0, (progress - (b.criticalT + 0.08)) / 0.25);
        b.group.position.y = b.origPos.y - 4.5 - bury * 5.5;
        b.group.position.x = b.origPos.x + 8.0 + bury * 6.5;
        b.group.position.z = b.origPos.z + bury * 8.5;
        b.group.rotation.z = -0.9 - bury * 0.4;
        b.group.rotation.x = 0.6 + bury * 0.3;
        b.collapsed = true;
      }
    });

    this.stupas.forEach(st => {
      if (progress > st.criticalT) {
        const factor = Math.min(1.0, (progress - st.criticalT) / 0.14);
        st.group.position.y = st.origPos.y - factor * 3.8;
        st.group.position.x = st.origPos.x + factor * 5.0;
        st.group.rotation.z = -factor * 0.8;
      } else {
        st.group.position.copy(st.origPos);
        st.group.rotation.set(0, 0, 0);
      }
    });

    if (this.bridge) {
      if (progress < this.bridge.criticalT) {
        this.bridge.group.position.copy(this.bridge.origPos);
        this.bridge.deck.position.set(0, 0, 0);
        this.bridge.deck.rotation.z = 0;
        this.bridge.destroyed = false;
        this.bridge.soundPlayed = false;
      } else if (progress < this.bridge.criticalT + 0.14) {
        const bp = (progress - this.bridge.criticalT) / 0.14;
        this.bridge.deck.position.y = -bp * 12.0;
        this.bridge.deck.position.x = bp * 8.0;
        this.bridge.deck.rotation.z = -bp * 0.75;
        this.bridge.deck.rotation.x = bp * 0.55;
        this.bridge.destroyed = true;

        if (!this.bridge.soundPlayed && this.audio) {
          this.audio.playDemolitionSound();
          this.bridge.soundPlayed = true;
        }
      } else {
        this.bridge.deck.position.y = -13.0;
        this.bridge.deck.position.x = 9.5;
        this.bridge.deck.rotation.z = -0.85;
        this.bridge.destroyed = true;
      }
    }
  }
}
