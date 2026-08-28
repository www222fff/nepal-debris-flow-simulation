import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { HimalayanTerrain } from './terrain.js';
import { HimalayanSettlements } from './settlements.js';
import { DebrisFlowSimulation } from './debris.js';
import { HimalayanEnvironment } from './environment.js';
import { ProceduralAudioEngine } from './audio.js';
import { HUDController } from './hud.js';

/**
 * 尼泊尔泥石流 3D 动力学仿真主程序 (Clear Perspective & Cinematic Flow)
 */
class SimulationApp {
  constructor() {
    this.container = document.getElementById('webgl-container');

    this.progress = 0.0;
    this.isPlaying = true;
    this.playbackRate = 1.0;
    this.totalDuration = 48.0;

    this.cameraMode = 'director';
    this.camTargetPos = new THREE.Vector3();
    this.camLookTarget = new THREE.Vector3();

    this.shakeIntensity = 0.0;
    this.shakeOffset = new THREE.Vector3();

    this.initThree();
    this.initPostProcessing();
    this.initAudio();
    this.initWorld();
    this.initControls();
    this.initHUD();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    const unlockAudio = () => {
      this.audio.init();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1c2b3d);

    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 2, 5000);
    this.camera.position.set(-380, 520, 680);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight);
      }
    });
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.30,
      0.4,
      0.85
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  initAudio() {
    this.audio = new ProceduralAudioEngine();
  }

  initWorld() {
    this.terrain = new HimalayanTerrain(this.scene);
    this.settlements = new HimalayanSettlements(this.scene, this.terrain, this.audio);
    this.debris = new DebrisFlowSimulation(this.scene, this.terrain);
    this.environment = new HimalayanEnvironment(this.scene, this.audio);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 2200;
    this.controls.target.set(0, 90, 0);

    this.camPresets = {
      panoramic: {
        pos: new THREE.Vector3(-380, 520, 680),
        target: new THREE.Vector3(50, 70, 0)
      },
      source: {
        pos: new THREE.Vector3(-280, 420, -400),
        target: new THREE.Vector3(-180, 310, -620)
      },
      village: {
        pos: new THREE.Vector3(-140, 220, 420),
        target: new THREE.Vector3(100, 30, 260)
      },
      bridge: {
        pos: new THREE.Vector3(-60, 160, 340),
        target: new THREE.Vector3(85, 30, 240)
      },
      cross: {
        pos: new THREE.Vector3(-320, 260, -40),
        target: new THREE.Vector3(20, 110, -60)
      }
    };
  }

  initHUD() {
    this.hud = new HUDController(this);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    this.audio.init();
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.textContent = this.isPlaying ? '⏸ 暂停演化' : '▶ 继续演化';
    }
  }

  restart() {
    this.progress = 0.0;
    this.isPlaying = true;
    this.audio.init();
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) btnPlay.textContent = '⏸ 暂停演化';
  }

  setProgress(val) {
    this.progress = THREE.MathUtils.clamp(val, 0.0, 1.0);
  }

  setPlaybackRate(rate) {
    this.playbackRate = rate;
  }

  jumpToStage(stage) {
    this.audio.init();
    if (stage === 1) {
      this.progress = 0.02;
      this.setCameraMode('source');
      this.audio.playAvalancheBlast();
    } else if (stage === 2) {
      this.progress = 0.35;
      this.setCameraMode('tracking');
    } else if (stage === 3) {
      this.progress = 0.72;
      this.setCameraMode('village');
    }
    this.isPlaying = true;
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    document.querySelectorAll('.btn-cam').forEach(b => {
      b.classList.toggle('active', b.dataset.cam === mode);
    });

    if (mode === 'free') {
      this.controls.enabled = true;
    } else {
      this.controls.enabled = false;
    }
  }

  updateCamera(deltaTime) {
    const telemetry = this.debris.getTelemetry();
    const speed = parseFloat(telemetry.speed);
    const front = telemetry.frontPos;
    const tangent = telemetry.frontTangent;

    const distToSurge = this.camera.position.distanceTo(front);
    const quakeFactor = Math.max(0, 1.0 - distToSurge / 450);
    this.shakeIntensity = (speed / 48.5) * quakeFactor * 1.5;

    this.shakeOffset.set(
      (Math.random() - 0.5) * this.shakeIntensity,
      (Math.random() - 0.5) * this.shakeIntensity * 1.2,
      (Math.random() - 0.5) * this.shakeIntensity
    );

    if (this.cameraMode === 'free') {
      this.controls.update();
      this.camera.position.add(this.shakeOffset);
      return;
    }

    if (this.cameraMode === 'director') {
      const p = this.progress;
      if (p < 0.25) {
        // 阶段一：源区俯视
        const targetPos = new THREE.Vector3(-280, 420, -400);
        const lookTarget = new THREE.Vector3(-180, 310, -620);
        this.camera.position.lerp(targetPos, 0.05).add(this.shakeOffset);
        this.controls.target.lerp(lookTarget, 0.06);
        this.camera.lookAt(this.controls.target);
      } else if (p < 0.65) {
        // 阶段二：峡谷高空追浪
        const offset = new THREE.Vector3(
          -tangent.x * 125.0 - 55.0,
          95.0,
          -tangent.z * 125.0 + 55.0
        );
        this.camTargetPos.copy(front).add(offset);
        this.camLookTarget.copy(front).add(tangent.clone().multiplyScalar(40));

        this.camera.position.lerp(this.camTargetPos, 0.06).add(this.shakeOffset);
        this.controls.target.lerp(this.camLookTarget, 0.08);
        this.camera.lookAt(this.controls.target);
      } else if (p < 0.88) {
        // 阶段三：村落与大桥冲毁全景俯瞰
        const villagePos = new THREE.Vector3(-140, 220, 420);
        const lookVillage = new THREE.Vector3(100, 30, 260);
        this.camera.position.lerp(villagePos, 0.05).add(this.shakeOffset);
        this.controls.target.lerp(lookVillage, 0.07);
        this.camera.lookAt(this.controls.target);
      } else {
        // 阶段三后期：宏观全景
        const grandPos = new THREE.Vector3(-380, 520, 680);
        const grandTarget = new THREE.Vector3(50, 70, 0);
        this.camera.position.lerp(grandPos, 0.04).add(this.shakeOffset);
        this.controls.target.lerp(grandTarget, 0.05);
        this.camera.lookAt(this.controls.target);
      }
      return;
    }

    if (this.cameraMode === 'tracking') {
      const offset = new THREE.Vector3(
        -tangent.x * 130.0 - 55.0,
        95.0,
        -tangent.z * 130.0 + 55.0
      );
      this.camTargetPos.copy(front).add(offset);
      this.camLookTarget.copy(front).add(tangent.clone().multiplyScalar(45));

      this.camera.position.lerp(this.camTargetPos, 0.06).add(this.shakeOffset);
      this.controls.target.lerp(this.camLookTarget, 0.08);
      this.camera.lookAt(this.controls.target);
      return;
    }

    if (this.cameraMode === 'fpv') {
      const offset = new THREE.Vector3(
        -tangent.x * 60.0,
        40.0,
        -tangent.z * 60.0
      );
      this.camTargetPos.copy(front).add(offset);
      this.camLookTarget.copy(front).add(tangent.clone().multiplyScalar(80));

      this.camera.position.lerp(this.camTargetPos, 0.08).add(this.shakeOffset);
      this.controls.target.lerp(this.camLookTarget, 0.1);
      this.camera.lookAt(this.controls.target);
      return;
    }

    const preset = this.camPresets[this.cameraMode] || this.camPresets.panoramic;
    this.camera.position.lerp(preset.pos, 0.04).add(this.shakeOffset);
    this.controls.target.lerp(preset.target, 0.05);
    this.camera.lookAt(this.controls.target);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.isPlaying) {
      this.progress += (deltaTime / this.totalDuration) * this.playbackRate;
      if (this.progress > 1.0) {
        this.progress = 1.0;
        this.isPlaying = false;
        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) btnPlay.textContent = '↺ 重新播放';
      }
    }

    this.debris.update(this.progress, deltaTime);
    this.terrain.updateLake(this.progress);
    this.settlements.updateDestruction(this.progress);
    this.environment.update(deltaTime);

    const telemetry = this.debris.getTelemetry();
    this.audio.update(parseFloat(telemetry.speed) / 48.5, this.progress);

    this.updateCamera(deltaTime);
    this.hud.update(this.progress, telemetry);

    this.composer.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.simApp = new SimulationApp();
});
