import * as THREE from 'three';

/**
 * 喜马拉雅极端泥石流 3D 动力学流体仿真系统 (IMAX Scientific & Visual Edition)
 */
export class DebrisFlowSimulation {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.progress = 0.001;
    this.surgeFrontPos = new THREE.Vector3();
    this.surgeFrontTangent = new THREE.Vector3();

    this.flowTime = 0.0;

    this.initMudFlowTexture();
    this.initMudMesh();
    this.initMegaclasts();
    this.initFlotsam();
    this.initSprayParticles();
    this.initDustPlume();
    this.init3DBeacons();
  }

  // 1. 动态流动泥浆与激流白沫纹理
  initMudFlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    this.flowCanvas = canvas;
    this.flowCtx = canvas.getContext('2d');

    this.drawMudTexture(0);

    this.mudTexture = new THREE.CanvasTexture(canvas);
    this.mudTexture.wrapS = THREE.RepeatWrapping;
    this.mudTexture.wrapT = THREE.RepeatWrapping;
    this.mudTexture.repeat.set(12, 1);
  }

  drawMudTexture(time) {
    const ctx = this.flowCtx;
    const w = this.flowCanvas.width;
    const h = this.flowCanvas.height;

    // 浓厚饱满的含沙泥浆基础色 (富有地质质感的赭褐色)
    ctx.fillStyle = '#4e2f1a';
    ctx.fillRect(0, 0, w, h);

    // 湍流泥浪纹路
    ctx.lineWidth = 10;
    for (let i = 0; i < 28; i++) {
      const y = (i * 19 + time * 220) % h;
      ctx.strokeStyle = i % 2 === 0 ? '#6a4226' : '#321d0f';
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 45) {
        const offset = Math.sin(x * 0.025 + time * 5 + i * 0.7) * 14;
        ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // 激流翻滚的白色高亮泡沫浪尖 (Froth Rapids)
    ctx.strokeStyle = 'rgba(242, 250, 255, 0.82)';
    ctx.lineWidth = 5.5;
    for (let i = 0; i < 16; i++) {
      const y = (i * 34 + time * 340) % h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 32) {
        const offset = Math.cos(x * 0.045 + time * 6 + i) * 10;
        ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }
  }

  // 2. 泥石流主干网格 (精确无翻转拓扑)
  initMudMesh() {
    this.segments = 180;
    this.rings = 14;

    const numVertices = (this.segments + 1) * (this.rings + 1);
    const positions = new Float32Array(numVertices * 3);
    const uvs = new Float32Array(numVertices * 2);
    const indices = [];

    for (let i = 0; i <= this.segments; i++) {
      const u = i / this.segments;
      for (let j = 0; j <= this.rings; j++) {
        const v = j / this.rings;
        const idx = i * (this.rings + 1) + j;

        positions[idx * 3 + 0] = 0;
        positions[idx * 3 + 1] = -999;
        positions[idx * 3 + 2] = 0;

        uvs[idx * 2 + 0] = u * 12;
        uvs[idx * 2 + 1] = v;
      }
    }

    for (let i = 0; i < this.segments; i++) {
      for (let j = 0; j < this.rings; j++) {
        const a = i * (this.rings + 1) + j;
        const b = (i + 1) * (this.rings + 1) + j;
        const c = (i + 1) * (this.rings + 1) + (j + 1);
        const d = i * (this.rings + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.setIndex(indices);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x824f30,
      roughness: 0.35,
      metalness: 0.45,
      map: this.mudTexture,
      bumpScale: 0.35,
      side: THREE.DoubleSide
    });

    this.mudMesh = new THREE.Mesh(geom, mat);
    this.mudMesh.frustumCulled = false;
    this.mudMesh.castShadow = true;
    this.scene.add(this.mudMesh);
  }

  // 3. 巨砾漂石群 (140 块花岗岩巨石)
  initMegaclasts() {
    this.boulderCount = 140;
    const geom = new THREE.DodecahedronGeometry(3.5, 1);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.multiplyScalar(0.75 + Math.random() * 0.5);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x483f36,
      roughness: 0.92,
      metalness: 0.15,
      flatShading: true
    });

    this.boulderMesh = new THREE.InstancedMesh(geom, mat, this.boulderCount);
    this.boulderMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.boulderMesh.castShadow = true;

    this.boulders = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.boulderCount; i++) {
      const offsetT = (i / this.boulderCount) * 0.65;
      const lateral = (Math.random() - 0.5) * 20;
      const size = 0.9 + Math.pow(Math.random(), 1.8) * 2.5;
      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 10
      );

      this.boulders.push({
        baseOffsetT: offsetT,
        lateral: lateral,
        scale: size,
        rotSpeed: rotSpeed,
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        bouncePhase: Math.random() * Math.PI * 2
      });

      dummy.position.set(0, -999, 0);
      dummy.updateMatrix();
      this.boulderMesh.setMatrixAt(i, dummy.matrix);
    }

    this.boulderMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.boulderMesh);
  }

  // 4. 倒伏树木与残骸
  initFlotsam() {
    this.flotsamCount = 30;
    const logGeom = new THREE.CylinderGeometry(0.7, 0.9, 11, 5);
    logGeom.rotateZ(Math.PI / 2);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x543622, roughness: 0.85 });

    this.flotsamMesh = new THREE.InstancedMesh(logGeom, logMat, this.flotsamCount);
    this.flotsamMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.flotsams = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.flotsamCount; i++) {
      this.flotsams.push({
        offsetT: (i / this.flotsamCount) * 0.5,
        lateral: (Math.random() - 0.5) * 18,
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        scale: 0.9 + Math.random() * 0.8
      });

      dummy.position.set(0, -999, 0);
      dummy.updateMatrix();
      this.flotsamMesh.setMatrixAt(i, dummy.matrix);
    }

    this.flotsamMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.flotsamMesh);
  }

  // 生成完美圆形柔边粒子贴图
  createSoftCircleTexture(size = 32, innerColor = 'rgba(255,255,255,1)', outerColor = 'rgba(255,255,255,0)') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.6, innerColor.replace(/[\d.]+\)$/g, '0.35)'));
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // 5. 柔和气溶胶烟尘
  initDustPlume() {
    this.plumeCount = 600;
    this.plumeGeom = new THREE.BufferGeometry();

    this.plumePos = new Float32Array(this.plumeCount * 3);
    this.plumeVel = new Float32Array(this.plumeCount * 3);
    this.plumeLife = new Float32Array(this.plumeCount);

    for (let i = 0; i < this.plumeCount; i++) {
      this.plumePos[i * 3 + 0] = 0;
      this.plumePos[i * 3 + 1] = -999;
      this.plumePos[i * 3 + 2] = 0;
      this.plumeLife[i] = Math.random();
    }

    this.plumeGeom.setAttribute('position', new THREE.BufferAttribute(this.plumePos, 3));

    const plumeMat = new THREE.PointsMaterial({
      size: 6.5,
      map: this.createSoftCircleTexture(32, 'rgba(235, 245, 255, 0.45)', 'rgba(200, 190, 175, 0)'),
      color: 0xe8eef8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.dustParticles = new THREE.Points(this.plumeGeom, plumeMat);
    this.dustParticles.frustumCulled = false;
    this.scene.add(this.dustParticles);
  }

  // 6. 浪尖飞溅水花
  initSprayParticles() {
    this.sprayCount = 800;
    this.sprayGeom = new THREE.BufferGeometry();

    this.sprayPos = new Float32Array(this.sprayCount * 3);
    this.sprayVel = new Float32Array(this.sprayCount * 3);
    this.sprayLife = new Float32Array(this.sprayCount);

    for (let i = 0; i < this.sprayCount; i++) {
      this.sprayPos[i * 3 + 0] = 0;
      this.sprayPos[i * 3 + 1] = -999;
      this.sprayPos[i * 3 + 2] = 0;
      this.sprayLife[i] = Math.random();
    }

    this.sprayGeom.setAttribute('position', new THREE.BufferAttribute(this.sprayPos, 3));

    const sprayMat = new THREE.PointsMaterial({
      size: 2.8,
      map: this.createSoftCircleTexture(16, 'rgba(255, 255, 255, 0.9)', 'rgba(180, 220, 255, 0)'),
      color: 0xd8eeff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.sprayParticles = new THREE.Points(this.sprayGeom, sprayMat);
    this.sprayParticles.frustumCulled = false;
    this.scene.add(this.sprayParticles);
  }

  createBeaconPin(title, subtitle, tagColor = '#00d2ff', height = 30) {
    const group = new THREE.Group();

    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, height, 0)
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(tagColor),
      transparent: true,
      opacity: 0.75
    });
    const line = new THREE.Line(lineGeom, lineMat);
    group.add(line);

    const dotGeom = new THREE.SphereGeometry(2.0, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tagColor) });
    const dot = new THREE.Mesh(dotGeom, dotMat);
    group.add(dot);

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 18, 30, 0.88)';
    ctx.strokeStyle = tagColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 376, 104, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(title, 18, 42);

    ctx.fillStyle = '#a0b5d0';
    ctx.font = '19px monospace';
    ctx.fillText(subtitle, 18, 82);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.y = height + 6;
    const scaleFactor = Math.max(0.72, Math.min(1.0, window.innerWidth / 900));
    sprite.scale.set(38 * scaleFactor, 11.2 * scaleFactor, 1);
    group.add(sprite);

    return group;
  }

  init3DBeacons() {
    this.beacons = [];

    // 1. 5300m 极高位雪崩源区标牌
    const p1 = new THREE.Vector3(-200, 360, -700);
    const b1 = this.createBeaconPin('🏔️ 5300m 极顶冰崩起动区', '高位冰碛失稳 · 初发80万m³', '#00d2ff', 35);
    b1.position.copy(p1);
    this.scene.add(b1);

    // 2. 3200m 冲沟极速喉口标牌
    const p2 = new THREE.Vector3(-35, 165, -200);
    const b2 = this.createBeaconPin('⚡ 冲沟狭窄极速下泄段', '峰值流速 48.5 m/s · 强烈铲刮', '#ffb300', 30);
    b2.position.copy(p2);
    this.scene.add(b2);

    // 3. 1750m 下游受灾村落标牌
    const p3 = new THREE.Vector3(110, 35, 270);
    const b3 = this.createBeaconPin('🏘️ 1750m 吉隆受灾村落', '冲积扇交汇受灾区 · 紧急避险', '#ff3366', 28);
    b3.position.copy(p3);
    this.scene.add(b3);

    // 4. 跨河公路主钢桥
    const p4 = new THREE.Vector3(85, 30, 240);
    const b4 = this.createBeaconPin('🌉 跨河干线公路桥', '交通主干线 · 动水冲击冲断点', '#ff5500', 25);
    b4.position.copy(p4);
    this.scene.add(b4);

    // 5. 谷底堰塞湖回水区
    const p5 = new THREE.Vector3(155, 22, 450);
    const b5 = this.createBeaconPin('⚠️ 阻断主河道 · 特大堰塞湖', '数百万方泥沙阻江 · 水位暴涨', '#ff0055', 25);
    b5.position.copy(p5);
    this.scene.add(b5);
  }

  update(progress, deltaTime) {
    this.progress = THREE.MathUtils.clamp(progress, 0.001, 1.0);
    this.flowTime += deltaTime;

    this.drawMudTexture(this.flowTime);
    this.mudTexture.needsUpdate = true;

    const frontT = this.progress;
    this.surgeFrontPos = this.terrain.flowCurve.getPoint(frontT);
    this.surgeFrontTangent = this.terrain.flowCurve.getTangent(frontT).normalize();

    this.updateMudMesh();
    this.updateMegaclasts(deltaTime);
    this.updateFlotsam(deltaTime);
    this.updateDustPlume(deltaTime);
    this.updateBallisticSpray(deltaTime);
  }

  updateMudMesh() {
    const pos = this.mudMesh.geometry.attributes.position.array;
    const curve = this.terrain.flowCurve;
    const maxT = this.progress;

    const dummyUp = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= this.segments; i++) {
      const u = i / this.segments;
      const currentT = u * maxT;

      if (currentT > maxT || maxT < 0.005) {
        for (let j = 0; j <= this.rings; j++) {
          const idx = i * (this.rings + 1) + j;
          pos[idx * 3 + 0] = 0;
          pos[idx * 3 + 1] = -999;
          pos[idx * 3 + 2] = 0;
        }
        continue;
      }

      const centerPt = curve.getPoint(currentT);
      const tangent = curve.getTangent(currentT).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, dummyUp).normalize();

      let width = 20.0;
      let depth = 6.0;

      if (currentT > 0.22 && currentT <= 0.65) {
        width = 24.0 + (currentT - 0.22) * 45.0;
        depth = 7.0 + (currentT - 0.22) * 16.0;
      } else if (currentT > 0.65) {
        const fanT = (currentT - 0.65) / 0.35;
        width = 44.0 + Math.pow(fanT, 1.3) * 110.0;
        depth = 14.0 - fanT * 4.0;
      }

      if (u > 0.85) {
        const headFactor = Math.sin((u - 0.85) / 0.15 * Math.PI);
        depth += headFactor * 14.0;
        width += headFactor * 14.0;
      }

      for (let j = 0; j <= this.rings; j++) {
        const v = (j / this.rings) - 0.5;
        const idx = i * (this.rings + 1) + j;

        const lateralOffset = binormal.clone().multiplyScalar(v * width);
        const ptX = centerPt.x + lateralOffset.x;
        const ptZ = centerPt.z + lateralOffset.z;

        const terrY = this.terrain.getTerrainHeight(ptX, ptZ);

        const crown = (1.0 - Math.pow(v * 2.0, 2)) * depth;
        const waveFlutter = Math.sin(ptX * 0.1 + ptZ * 0.15 + this.flowTime * 5.5) * 1.2;
        const ptY = terrY + Math.max(1.2, crown + waveFlutter);

        pos[idx * 3 + 0] = ptX;
        pos[idx * 3 + 1] = ptY;
        pos[idx * 3 + 2] = ptZ;
      }
    }

    this.mudMesh.geometry.attributes.position.needsUpdate = true;
    this.mudMesh.geometry.computeVertexNormals();
  }

  updateMegaclasts(deltaTime) {
    const dummy = new THREE.Object3D();
    const curve = this.terrain.flowCurve;
    const maxT = this.progress;

    this.boulders.forEach((b, i) => {
      const currentT = maxT - b.baseOffsetT * maxT;

      if (currentT > 0 && currentT <= maxT && maxT > 0.03) {
        const pt = curve.getPoint(currentT);
        const tangent = curve.getTangent(currentT).normalize();
        const normal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

        const x = pt.x + binormal.x * b.lateral;
        const z = pt.z + binormal.z * b.lateral;

        b.bouncePhase += deltaTime * (8.0 + maxT * 10.0);
        const bounce = Math.abs(Math.sin(b.bouncePhase)) * (2.5 + b.scale * 1.2);
        const y = this.terrain.getTerrainHeight(x, z) + b.scale * 1.4 + bounce;

        b.rot.x += b.rotSpeed.x * deltaTime * (1.5 + maxT * 3);
        b.rot.y += b.rotSpeed.y * deltaTime * 2;
        b.rot.z += b.rotSpeed.z * deltaTime * (1.5 + maxT * 3);

        dummy.position.set(x, y, z);
        dummy.rotation.copy(b.rot);
        dummy.scale.set(b.scale, b.scale, b.scale);
        dummy.updateMatrix();

        this.boulderMesh.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -999, 0);
        dummy.updateMatrix();
        this.boulderMesh.setMatrixAt(i, dummy.matrix);
      }
    });

    this.boulderMesh.instanceMatrix.needsUpdate = true;
  }

  updateFlotsam(deltaTime) {
    const dummy = new THREE.Object3D();
    const curve = this.terrain.flowCurve;
    const maxT = this.progress;

    this.flotsams.forEach((f, i) => {
      const currentT = maxT - f.offsetT * maxT;

      if (currentT > 0 && currentT <= maxT && maxT > 0.08) {
        const pt = curve.getPoint(currentT);
        const tangent = curve.getTangent(currentT).normalize();
        const normal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

        const x = pt.x + binormal.x * f.lateral;
        const z = pt.z + binormal.z * f.lateral;
        const y = this.terrain.getTerrainHeight(x, z) + 3.0;

        f.rot.x += deltaTime * 3.0;
        f.rot.y += deltaTime * 2.0;

        dummy.position.set(x, y, z);
        dummy.rotation.copy(f.rot);
        dummy.scale.set(f.scale, f.scale, f.scale);
        dummy.updateMatrix();

        this.flotsamMesh.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -999, 0);
        dummy.updateMatrix();
        this.flotsamMesh.setMatrixAt(i, dummy.matrix);
      }
    });

    this.flotsamMesh.instanceMatrix.needsUpdate = true;
  }

  updateDustPlume(deltaTime) {
    const pos = this.plumePos;
    const curve = this.terrain.flowCurve;
    const maxT = this.progress;

    for (let i = 0; i < this.plumeCount; i++) {
      let life = this.plumeLife[i] + deltaTime * (0.35 + Math.random() * 0.4);

      if (life > 1.0 || pos[i * 3 + 1] < -500) {
        life = 0;

        const spawnT = Math.max(0.005, maxT - Math.random() * 0.35);
        const pt = curve.getPoint(spawnT);
        const tangent = curve.getTangent(spawnT).normalize();

        const spread = 24.0 * (0.5 + spawnT * 1.2);
        pos[i * 3 + 0] = pt.x + (Math.random() - 0.5) * spread;
        pos[i * 3 + 2] = pt.z + (Math.random() - 0.5) * spread;

        const terrY = this.terrain.getTerrainHeight(pos[i * 3 + 0], pos[i * 3 + 2]);
        pos[i * 3 + 1] = terrY + 2.5;

        this.plumeVel[i * 3 + 0] = tangent.x * 12.0 + (Math.random() - 0.5) * 12.0;
        this.plumeVel[i * 3 + 1] = 14.0 + Math.random() * 22.0;
        this.plumeVel[i * 3 + 2] = tangent.z * 12.0 + (Math.random() - 0.5) * 12.0;
      }

      this.plumeLife[i] = life;

      pos[i * 3 + 0] += this.plumeVel[i * 3 + 0] * deltaTime;
      pos[i * 3 + 1] += this.plumeVel[i * 3 + 1] * deltaTime;
      pos[i * 3 + 2] += this.plumeVel[i * 3 + 2] * deltaTime;

      this.plumeVel[i * 3 + 1] *= (1.0 - 0.3 * deltaTime);
    }

    this.plumeGeom.attributes.position.needsUpdate = true;
  }

  updateBallisticSpray(deltaTime) {
    const pos = this.sprayPos;
    const curve = this.terrain.flowCurve;
    const maxT = this.progress;

    for (let i = 0; i < this.sprayCount; i++) {
      let life = this.sprayLife[i] + deltaTime * (1.2 + Math.random() * 0.8);

      if (life > 1.0 || pos[i * 3 + 1] < -500) {
        life = 0;

        const spawnT = Math.max(0.01, maxT - Math.random() * 0.08);
        const pt = curve.getPoint(spawnT);
        const tangent = curve.getTangent(spawnT).normalize();

        const spread = 16.0 * (0.6 + spawnT);
        pos[i * 3 + 0] = pt.x + (Math.random() - 0.5) * spread;
        pos[i * 3 + 2] = pt.z + (Math.random() - 0.5) * spread;

        const terrY = this.terrain.getTerrainHeight(pos[i * 3 + 0], pos[i * 3 + 2]);
        pos[i * 3 + 1] = terrY + 6.0 + Math.random() * 8.0;

        const speed = 30.0 + spawnT * 35.0;
        this.sprayVel[i * 3 + 0] = tangent.x * speed + (Math.random() - 0.5) * 14.0;
        this.sprayVel[i * 3 + 1] = 14.0 + Math.random() * 20.0;
        this.sprayVel[i * 3 + 2] = tangent.z * speed + (Math.random() - 0.5) * 14.0;
      }

      this.sprayLife[i] = life;

      pos[i * 3 + 0] += this.sprayVel[i * 3 + 0] * deltaTime;
      pos[i * 3 + 1] += this.sprayVel[i * 3 + 1] * deltaTime;
      pos[i * 3 + 2] += this.sprayVel[i * 3 + 2] * deltaTime;

      this.sprayVel[i * 3 + 1] -= 28.0 * deltaTime;
    }

    this.sprayGeom.attributes.position.needsUpdate = true;
  }

  getTelemetry() {
    const p = this.progress;

    let speed = 0;
    if (p < 0.28) {
      speed = (p / 0.28) * 28.5;
    } else if (p < 0.68) {
      const cp = (p - 0.28) / 0.4;
      speed = 28.5 + Math.sin(cp * Math.PI) * 20.0;
    } else {
      const vp = (p - 0.68) / 0.32;
      speed = 48.5 * (1.0 - vp * 0.65);
    }

    const elevation = Math.round(5300 - p * 3700);
    const volume = Math.round(80 + Math.pow(p, 1.45) * 340);
    const pressure = Math.round(0.5 * 2.1 * Math.pow(speed, 2));
    const rainfall = (85.0 + Math.sin(p * 4.5) * 18.0).toFixed(1);
    const kineticEnergyJoules = (0.5 * volume * 1e6 * 2100 * Math.pow(speed, 2)).toExponential(2);

    return {
      speed: speed.toFixed(1),
      elevation: elevation,
      volume: volume,
      pressure: pressure,
      rainfall: rainfall,
      energy: kineticEnergyJoules,
      frontPos: this.surgeFrontPos,
      frontTangent: this.surgeFrontTangent
    };
  }
}
