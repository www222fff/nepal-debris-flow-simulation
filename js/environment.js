import * as THREE from 'three';

/**
 * 喜马拉雅季风暴雨与高空 3D 闪电云雾环境系统 (Bright, Clear & Dramatic Atmosphere)
 * 具备明亮清晰的高山照明、细腻的雨丝微粒、低空云雾与震撼 3D 闪电
 */
export class HimalayanEnvironment {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;

    this.initLighting();
    this.initRain();
    this.initMistCloud();
    this.init3DLightning();
  }

  initLighting() {
    // 明亮通透的高山环境光
    this.ambientLight = new THREE.AmbientLight(0x728aa8, 1.8);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xbad2ee, 0x443a2e, 1.5);
    this.hemiLight.position.set(0, 800, 0);
    this.scene.add(this.hemiLight);

    // 穿透云层的强主阳光 (营造清晰山脊与立体阴影)
    this.dirLight = new THREE.DirectionalLight(0xfff6ea, 2.8);
    this.dirLight.position.set(-350, 600, -280);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 50;
    this.dirLight.shadow.camera.far = 1800;
    this.dirLight.shadow.camera.left = -700;
    this.dirLight.shadow.camera.right = 700;
    this.dirLight.shadow.camera.top = 700;
    this.dirLight.shadow.camera.bottom = -700;
    this.scene.add(this.dirLight);

    // 补光 (照亮山谷背光阴影面，防止出现死黑)
    this.fillLight = new THREE.DirectionalLight(0x6080a0, 1.2);
    this.fillLight.position.set(400, 300, 300);
    this.scene.add(this.fillLight);

    // 清透柔和的高山浅色薄雾 (防止遮挡远景)
    this.scene.fog = new THREE.FogExp2(0x28384d, 0.00065);
  }

  initRain() {
    // 6,000 滴半透明雨丝微粒
    this.rainCount = 6000;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(this.rainCount * 3);
    const vels = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 1500;
      pos[i * 3 + 1] = Math.random() * 550 + 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1700;

      vels[i * 3 + 0] = -3.5 + (Math.random() - 0.5) * 2.0;
      vels[i * 3 + 1] = -150 - Math.random() * 60;
      vels[i * 3 + 2] = 5.0 + (Math.random() - 0.5) * 2.5;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainVels = vels;

    // 创建柔和雨丝小贴图 (避免方块像素)
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(8, 0, 8, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(210,235,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(4, 0, 8, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const rainMat = new THREE.PointsMaterial({
      size: 2.2,
      map: texture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.rainParticles = new THREE.Points(geom, rainMat);
    this.scene.add(this.rainParticles);
  }

  initMistCloud() {
    // 峡谷侧边漂浮的柔和浮云 (80 个大团云雾，远离主视线中央)
    this.mistCount = 80;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(this.mistCount * 3);

    for (let i = 0; i < this.mistCount; i++) {
      // 分布在山体外围边缘
      const side = Math.random() > 0.5 ? 1 : -1;
      pos[i * 3 + 0] = side * (300 + Math.random() * 400);
      pos[i * 3 + 1] = 80 + Math.random() * 160;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1200;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(220, 235, 250, 0.35)');
    grad.addColorStop(0.5, 'rgba(150, 180, 210, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 160,
      map: texture,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.mistParticles = new THREE.Points(geom, mat);
    this.scene.add(this.mistParticles);
  }

  init3DLightning() {
    this.lightningOverlay = document.getElementById('lightning-flash');
    this.nextLightningTime = 4.5;

    this.lightningGroup = new THREE.Group();
    this.lightningMat = new THREE.LineBasicMaterial({
      color: 0x88eeff,
      linewidth: 3,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    this.scene.add(this.lightningGroup);
  }

  generateLightningBranch(start, end, depth = 0) {
    const points = [];
    const segments = 10;
    let curr = start.clone();

    points.push(curr.clone());

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const ideal = new THREE.Vector3().lerpVectors(start, end, t);
      const jitter = (1.0 - t * 0.3) * (40.0 / (depth + 1));

      curr = new THREE.Vector3(
        ideal.x + (Math.random() - 0.5) * jitter,
        ideal.y + (Math.random() - 0.5) * (jitter * 0.5),
        ideal.z + (Math.random() - 0.5) * jitter
      );
      points.push(curr.clone());

      if (depth < 2 && Math.random() < 0.25 && i < segments - 2) {
        const branchEnd = curr.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          -50 - Math.random() * 70,
          (Math.random() - 0.5) * 80
        ));
        const subGeom = this.generateLightningBranch(curr, branchEnd, depth + 1);
        const subLine = new THREE.Line(subGeom, this.lightningMat);
        this.lightningGroup.add(subLine);
      }
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }

  update(deltaTime) {
    // 1. 雨滴下坠
    const rainPos = this.rainParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.rainCount; i++) {
      rainPos[i * 3 + 0] += this.rainVels[i * 3 + 0] * deltaTime;
      rainPos[i * 3 + 1] += this.rainVels[i * 3 + 1] * deltaTime;
      rainPos[i * 3 + 2] += this.rainVels[i * 3 + 2] * deltaTime;

      if (rainPos[i * 3 + 1] < 10) {
        rainPos[i * 3 + 1] = 580;
        rainPos[i * 3 + 0] = (Math.random() - 0.5) * 1500;
        rainPos[i * 3 + 2] = (Math.random() - 0.5) * 1700;
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;

    // 2. 峡谷云雾外围微移
    const mistPos = this.mistParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.mistCount; i++) {
      mistPos[i * 3 + 0] += 4.0 * deltaTime;
      mistPos[i * 3 + 2] += 2.5 * deltaTime;

      if (mistPos[i * 3 + 0] > 600) mistPos[i * 3 + 0] = -600;
      if (mistPos[i * 3 + 2] > 650) mistPos[i * 3 + 2] = -650;
    }
    this.mistParticles.geometry.attributes.position.needsUpdate = true;

    // 3. 随机闪电
    this.nextLightningTime -= deltaTime;
    if (this.nextLightningTime <= 0) {
      this.trigger3DLightning();
      this.nextLightningTime = 6.0 + Math.random() * 8.0;
    }
  }

  trigger3DLightning() {
    while (this.lightningGroup.children.length > 0) {
      this.lightningGroup.remove(this.lightningGroup.children[0]);
    }

    const startX = -240 + (Math.random() - 0.5) * 260;
    const startZ = -600 + (Math.random() - 0.5) * 300;
    const start = new THREE.Vector3(startX, 540, startZ);
    const end = new THREE.Vector3(startX + (Math.random() - 0.5) * 100, 220, startZ + (Math.random() - 0.5) * 100);

    const mainGeom = this.generateLightningBranch(start, end, 0);
    const mainLine = new THREE.Line(mainGeom, this.lightningMat);
    this.lightningGroup.add(mainLine);

    this.lightningMat.opacity = 1.0;

    if (this.lightningOverlay) {
      this.lightningOverlay.style.opacity = '0.92';
      setTimeout(() => {
        this.lightningOverlay.style.opacity = '0.2';
        setTimeout(() => {
          this.lightningOverlay.style.opacity = '0.88';
          setTimeout(() => {
            this.lightningOverlay.style.opacity = '0.0';
            this.lightningMat.opacity = 0.0;
          }, 80);
        }, 50);
      }, 70);
    }

    this.dirLight.intensity = 8.5;
    this.ambientLight.intensity = 4.2;

    if (this.audio) {
      this.audio.playThunderClap(0.9);
    }

    setTimeout(() => {
      this.dirLight.intensity = 2.8;
      this.ambientLight.intensity = 1.8;
    }, 190);
  }
}
