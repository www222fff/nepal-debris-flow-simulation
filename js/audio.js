/**
 * 喜马拉雅极端地质灾害好莱坞电影级 3D 程序化音效合成引擎
 * 100% 纯 Web Audio API 实时声波合成，零外部音效文件依赖
 * 
 * 包含 8 大核心声学层：
 * 1. 【地鸣次声】20-45Hz 构造级大地剧烈颤抖超重低音 (Infrasonic Quake)
 * 2. 【怒涛狂啸】千万吨粘性泥石流高速冲沟湍流咆哮 (Viscous Torrent Roar)
 * 3. 【冰崩爆破】高位悬冰川断裂崩坠千米深渊音爆 (Glacial Avalanche Blast)
 * 4. 【巨砾碾压】房屋级巨石在基岩河床高速碰撞粉碎 (Megaclast Grinding & Impacts)
 * 5. 【长空电闪】撕裂苍穹的折线闪电与深谷回音重雷 (Mountain Gorge Thunderclaps)
 * 6. 【建筑崩毁】房屋爆碎、钢桥撕裂与高压电弧短路火花 (Structural Annihilation)
 * 7. 【暴风骤雨】季风暴雨倾盆、峡谷疾风呼啸 (Monsoon Tempest)
 * 8. 【古刹风铃】灾难爆发前夕山巅寺庙随风回荡的孤寂风铃 (Temple Wind Chime)
 */
export class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.initialized = false;

    // 混音总线
    this.masterGain = null;
    this.compressor = null;

    // 子系统通道
    this.rainGain = null;
    this.windGain = null;
    this.windFilter = null;

    this.quakeGain = null;
    this.quakeOsc1 = null;
    this.quakeOsc2 = null;
    this.quakeFilter = null;

    this.roarGain = null;
    this.roarFilter = null;
    this.roarFilter2 = null;

    this.lastImpactTime = 0;
    this.lastSparkTime = 0;
    this.lastChimeTime = 0;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.enabled = true;
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.1);
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // 电影级母带多频动态压限器 (打造胸腔共鸣厚重感与防爆音)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // 初始化各声学合成器
      this.initRainAndWind();
      this.initEarthquakeInfrasound();
      this.initMudTorrentRoar();

      this.initialized = true;
      this.enabled = true;

      // 移除提示横幅
      const banner = document.getElementById('audio-unlock-banner');
      if (banner) {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 400);
      }

      console.log('🎬 [AudioEngine] IMAX 级 3D 地质动力学音效合成器已就绪');
      return true;
    } catch (e) {
      console.warn('[AudioEngine] Web Audio blocked or not supported:', e);
      return false;
    }
  }

  // 1. 狂暴风雨声场
  initRainAndWind() {
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // 倾盆暴雨
    const rainNoise = this.ctx.createBufferSource();
    rainNoise.buffer = noiseBuffer;
    rainNoise.loop = true;

    const rainBandpass = this.ctx.createBiquadFilter();
    rainBandpass.type = 'bandpass';
    rainBandpass.frequency.setValueAtTime(1200, this.ctx.currentTime);
    rainBandpass.Q.setValueAtTime(0.65, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

    rainNoise.connect(rainBandpass);
    rainBandpass.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainNoise.start();

    // 峡谷疾风
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = noiseBuffer;
    windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.32, this.ctx.currentTime);

    windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windNoise.start();
  }

  // 2. 次声波构造级地震地鸣 (Infrasonic Earth Tremor)
  initEarthquakeInfrasound() {
    this.quakeOsc1 = this.ctx.createOscillator();
    this.quakeOsc1.type = 'sine';
    this.quakeOsc1.frequency.setValueAtTime(32, this.ctx.currentTime);

    this.quakeOsc2 = this.ctx.createOscillator();
    this.quakeOsc2.type = 'sawtooth';
    this.quakeOsc2.frequency.setValueAtTime(24, this.ctx.currentTime);

    // 双重低频 LFO 调制 (营造千万吨山体共振晃动的真实波动感)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(3.8, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(10, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.quakeOsc1.frequency);
    lfo.start();

    this.quakeFilter = this.ctx.createBiquadFilter();
    this.quakeFilter.type = 'lowpass';
    this.quakeFilter.frequency.setValueAtTime(70, this.ctx.currentTime);
    this.quakeFilter.Q.setValueAtTime(2.4, this.ctx.currentTime);

    this.quakeGain = this.ctx.createGain();
    this.quakeGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.quakeOsc1.connect(this.quakeFilter);
    this.quakeOsc2.connect(this.quakeFilter);
    this.quakeFilter.connect(this.quakeGain);
    this.quakeGain.connect(this.masterGain);

    this.quakeOsc1.start();
    this.quakeOsc2.start();
  }

  // 3. 千万吨泥石流万马奔腾怒吼 (Viscous Churning Roar)
  initMudTorrentRoar() {
    const bufferSize = this.ctx.sampleRate * 2.5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.035 * white)) / 1.035;
      data[i] = lastOut * 4.2;
    }

    const roarSource = this.ctx.createBufferSource();
    roarSource.buffer = noiseBuffer;
    roarSource.loop = true;

    // 双峰狭窄峡谷声学共鸣腔
    this.roarFilter = this.ctx.createBiquadFilter();
    this.roarFilter.type = 'bandpass';
    this.roarFilter.frequency.setValueAtTime(130, this.ctx.currentTime);
    this.roarFilter.Q.setValueAtTime(1.9, this.ctx.currentTime);

    this.roarFilter2 = this.ctx.createBiquadFilter();
    this.roarFilter2.type = 'lowpass';
    this.roarFilter2.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.roarGain = this.ctx.createGain();
    this.roarGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    roarSource.connect(this.roarFilter);
    this.roarFilter.connect(this.roarFilter2);
    this.roarFilter2.connect(this.roarGain);
    this.roarGain.connect(this.masterGain);

    roarSource.start();
  }

  // 4. 实时声场动力学调制
  update(speedRatio, progress) {
    if (!this.initialized || !this.enabled || !this.ctx) return;

    const t = this.ctx.currentTime;
    const s = Math.min(1.3, Math.max(0.0, speedRatio));

    // 地鸣次声波与主频
    const targetQuakeGain = Math.min(0.95, Math.pow(s, 1.1) * 0.98);
    const targetQuakeFreq = 24 + s * 34;
    this.quakeGain.gain.setTargetAtTime(targetQuakeGain, t, 0.06);
    this.quakeOsc1.frequency.setTargetAtTime(targetQuakeFreq, t, 0.06);
    this.quakeFilter.frequency.setTargetAtTime(50 + s * 80, t, 0.06);

    // 泥浆怒涛咆哮
    const targetRoarGain = Math.min(1.0, Math.pow(s, 0.85) * 0.96);
    const targetRoarFreq = 100 + s * 280;
    this.roarGain.gain.setTargetAtTime(targetRoarGain, t, 0.06);
    this.roarFilter.frequency.setTargetAtTime(targetRoarFreq, t, 0.06);

    // 疾风呼啸
    const windFreq = 200 + Math.sin(t * 1.8) * 140 + s * 180;
    this.windFilter.frequency.setTargetAtTime(windFreq, t, 0.12);

    // 房屋级巨石撞击与碾碎音
    if (s > 0.28 && t - this.lastImpactTime > (0.9 - s * 0.55)) {
      if (Math.random() < 0.72) {
        this.playMegaclastCollision(s);
        this.lastImpactTime = t;
      }
    }

    // 阶段1前夕播放凄美古刹风铃声
    if (progress < 0.18 && t - this.lastChimeTime > 4.5) {
      this.playTempleWindChime();
      this.lastChimeTime = t;
    }
  }

  // 5. 房屋级巨石在峡谷剧烈砸地碰撞
  playMegaclastCollision(intensity = 1.0) {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = Math.random() > 0.4 ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(160 * intensity, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, t);

    const amp = Math.min(1.0, 0.5 + intensity * 0.55);
    gain.gain.setValueAtTime(amp, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  // 6. 高位悬冰川断裂崩坠千米深渊音爆 (Glacial Catastrophe Blast)
  playAvalancheBlast() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 冰层炸裂第一声高锐脆响
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(880, t);
    crackOsc.frequency.exponentialRampToValueAtTime(60, t + 0.18);
    crackGain.gain.setValueAtTime(0.9, t);
    crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(t);
    crackOsc.stop(t + 0.22);

    // 随后引发的万吨岩冰体坠落深谷音爆
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(110, t + 0.05);
    boomOsc.frequency.exponentialRampToValueAtTime(16, t + 2.2);

    boomGain.gain.setValueAtTime(1.0, t + 0.05);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 2.4);

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(t + 0.05);
    boomOsc.stop(t + 2.45);

    this.playThunderClap(0.85);
  }

  // 7. 撕裂苍穹的雷鸣与峡谷漫长回声
  playThunderClap(volume = 1.0) {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 2.8;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.5));
    }

    const thunderSource = this.ctx.createBufferSource();
    thunderSource.buffer = noiseBuffer;

    const thunderFilter = this.ctx.createBiquadFilter();
    thunderFilter.type = 'lowpass';
    thunderFilter.frequency.setValueAtTime(520, t);
    thunderFilter.frequency.exponentialRampToValueAtTime(55, t + 2.6);

    const thunderGain = this.ctx.createGain();
    thunderGain.gain.setValueAtTime(0.95 * volume, t);
    thunderGain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);

    thunderSource.connect(thunderFilter);
    thunderFilter.connect(thunderGain);
    thunderGain.connect(this.masterGain);

    thunderSource.start(t);
  }

  // 8. 建筑物摧毁、木梁折断与钢结构扭曲
  playDemolitionSound() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const delay = i * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320 + Math.random() * 220, t + delay);
      osc.frequency.exponentialRampToValueAtTime(35, t + delay + 0.3);

      gain.gain.setValueAtTime(0.85, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + delay);
      osc.stop(t + delay + 0.38);
    }
  }

  // 9. 电力电缆断裂与高压电弧火花爆鸣
  playElectricSpark() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600 + Math.random() * 800, t);
    osc.frequency.setValueAtTime(300, t + 0.08);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // 10. 喜马拉雅寺庙祈福铜铃风铃声 (灾难爆发前夕的宁静反衬)
  playTempleWindChime() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const freqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7 和弦

    freqs.forEach((f, idx) => {
      const delay = idx * 0.14 + Math.random() * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + delay);

      gain.gain.setValueAtTime(0.18, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 2.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + delay);
      osc.stop(t + delay + 2.9);
    });
  }

  toggleSound() {
    if (!this.initialized) {
      return this.init();
    }
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.9 : 0.0, this.ctx.currentTime, 0.05);
    }
    return this.enabled;
  }
}
