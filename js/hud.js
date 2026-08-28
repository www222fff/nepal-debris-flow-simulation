/**
 * HUD 交互界面与地质遥测科研控制台 (Sci-Fi & Cinematic HUD)
 */
export class HUDController {
  constructor(app) {
    this.app = app;

    this.profileCanvas = document.getElementById('profile-canvas');
    this.profileCtx = this.profileCanvas ? this.profileCanvas.getContext('2d') : null;

    this.initDOMRefs();
    this.bindEvents();
  }

  initDOMRefs() {
    this.txtPeakSpeed = document.getElementById('kpi-peak-speed');
    this.txtVolume = document.getElementById('kpi-volume');
    this.txtDamStatus = document.getElementById('kpi-dam-status');
    this.txtEnergy = document.getElementById('kpi-energy');

    this.txtRainfall = document.getElementById('txt-rainfall');
    this.barRainfall = document.getElementById('bar-rainfall');

    this.txtSpeed = document.getElementById('txt-speed');
    this.barSpeed = document.getElementById('bar-speed');

    this.txtElevation = document.getElementById('txt-elevation');
    this.barElevation = document.getElementById('bar-elevation');

    this.txtPressure = document.getElementById('txt-pressure');
    this.barPressure = document.getElementById('bar-pressure');

    this.riskBadge = document.getElementById('risk-badge');
    this.riskDesc = document.getElementById('risk-desc');

    this.stageTag = document.getElementById('stage-tag');
    this.simClock = document.getElementById('sim-clock');
    this.stageTitle = document.getElementById('stage-title');
    this.stageBody = document.getElementById('stage-body');

    this.statusVillage = document.getElementById('status-village');
    this.statusRoad = document.getElementById('status-road');
    this.statusBridge = document.getElementById('status-bridge');
    this.statusRiver = document.getElementById('status-river');

    this.timelineText = document.getElementById('timeline-text');
    this.timelineFill = document.getElementById('timeline-fill');
    this.timelineHandle = document.getElementById('timeline-handle');
    this.timelineScrubber = document.getElementById('timeline-scrubber');

    this.btnPlay = document.getElementById('btn-play');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnSound = document.getElementById('btn-sound');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnCinema = document.getElementById('btn-cinema');

    this.stageBtns = document.querySelectorAll('.btn-stage');
    this.camBtns = document.querySelectorAll('.btn-cam');
    this.rateBtns = document.querySelectorAll('.btn-rate');
  }

  bindEvents() {
    this.btnPlay?.addEventListener('click', () => this.app.togglePlay());
    this.btnRestart?.addEventListener('click', () => this.app.restart());

    this.btnSound?.addEventListener('click', () => {
      const on = this.app.audio.toggleSound();
      this.btnSound.textContent = on ? '🔊 声音开' : '🔇 静音';
    });

    this.btnFullscreen?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });

    this.btnCinema?.addEventListener('click', () => {
      document.body.classList.toggle('cinema-mode');
      this.btnCinema.classList.toggle('active');
    });

    this.stageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const stage = parseInt(btn.dataset.stage, 10);
        this.app.jumpToStage(stage);
      });
    });

    this.camBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cam = btn.dataset.cam;
        this.app.setCameraMode(cam);
      });
    });

    this.rateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const rate = parseFloat(btn.dataset.rate);
        this.app.setPlaybackRate(rate);
        this.rateBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    if (this.timelineScrubber) {
      const handleScrub = (e) => {
        const rect = this.timelineScrubber.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.app.setProgress(ratio);
      };

      let isDragging = false;
      this.timelineScrubber.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleScrub(e);
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) handleScrub(e);
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    document.getElementById('btn-inspect-village')?.addEventListener('click', () => {
      this.app.setCameraMode('village');
    });

    document.getElementById('btn-inspect-scar')?.addEventListener('click', () => {
      this.app.setCameraMode('source');
    });
  }

  update(progress, telemetry) {
    const totalSecs = 150;
    const currSecs = Math.floor(progress * totalSecs);
    const m = String(Math.floor(currSecs / 60)).padStart(2, '0');
    const s = String(currSecs % 60).padStart(2, '0');

    if (this.timelineText) this.timelineText.textContent = `${m}:${s} / 02:30`;
    if (this.simClock) this.simClock.textContent = `T + ${m}:${s}`;

    const pct = (progress * 100).toFixed(1) + '%';
    if (this.timelineFill) this.timelineFill.style.width = pct;
    if (this.timelineHandle) this.timelineHandle.style.left = pct;

    if (this.txtSpeed) this.txtSpeed.textContent = `${telemetry.speed} m/s`;
    if (this.barSpeed) this.barSpeed.style.width = `${Math.min(100, (telemetry.speed / 50) * 100)}%`;

    if (this.txtElevation) this.txtElevation.textContent = `${telemetry.elevation.toLocaleString()} m`;
    if (this.barElevation) this.barElevation.style.width = `${((telemetry.elevation - 1600) / 3700) * 100}%`;

    if (this.txtPressure) this.txtPressure.textContent = `${telemetry.pressure} kPa`;
    if (this.barPressure) this.barPressure.style.width = `${Math.min(100, (telemetry.pressure / 480) * 100)}%`;

    if (this.txtRainfall) this.txtRainfall.textContent = `${telemetry.rainfall} mm/h`;
    if (this.barRainfall) this.barRainfall.style.width = `${(telemetry.rainfall / 100) * 100}%`;

    if (this.txtVolume) this.txtVolume.innerHTML = `${telemetry.volume} <small>万 m³</small>`;
    if (this.txtPeakSpeed) this.txtPeakSpeed.innerHTML = `${Math.max(48.5, parseFloat(telemetry.speed))} <small>m/s</small>`;
    if (this.txtEnergy && telemetry.energy) this.txtEnergy.innerHTML = `${telemetry.energy} <small>J</small>`;

    this.updateStageAndDisasterDetails(progress);
    this.drawProfileChart(progress);
  }

  updateStageAndDisasterDetails(p) {
    this.stageBtns.forEach(btn => btn.classList.remove('active'));

    if (p < 0.28) {
      this.stageBtns[0]?.classList.add('active');
      if (this.stageTag) this.stageTag.textContent = 'PHASE 01 / 03';
      if (this.stageTitle) this.stageTitle.textContent = '5300m 悬冰川与冰碛坡体暴雨失稳崩塌';
      if (this.stageBody) {
        this.stageBody.textContent = '喜马拉雅高海拔冰碛与悬冰川在强季风暴雨饱和渗透下，孔隙水压突增引发深层剪切破坏，80万方冰岩碎屑体高速崩塌起动，产生震天音爆与雪崩气溶胶巨云。';
      }
      if (this.riskBadge) {
        this.riskBadge.className = 'disaster-badge';
        if (this.riskDesc) this.riskDesc.textContent = '阶段一：高位冰崩岩崩爆发，气浪冲击波横扫山脊！';
      }
      this.setThreatStatus(this.statusVillage, 'safe', '避险预警中');
      this.setThreatStatus(this.statusRoad, 'safe', '路基畅通');
      this.setThreatStatus(this.statusBridge, 'safe', '未受力');
      this.setThreatStatus(this.statusRiver, 'safe', '正常泄流');
      if (this.txtDamStatus) this.txtDamStatus.textContent = '河道正常';
    } else if (p < 0.68) {
      this.stageBtns[1]?.classList.add('active');
      if (this.stageTag) this.stageTag.textContent = 'PHASE 02 / 03';
      if (this.stageTitle) this.stageTitle.textContent = '35° 峡谷高速下泄与极强铲刮增容';
      if (this.stageBody) {
        this.stageBody.textContent = '碎屑流涌入极陡峡谷，重力势能爆发式转化为动能。强烈侧蚀剥蚀山壁，总体积暴增至420万方，45米高拱起巨浪挟带房屋级巨石以48.5m/s极速向下游奔腾！';
      }
      if (this.riskBadge) {
        this.riskBadge.className = 'disaster-badge alert';
        if (this.riskDesc) this.riskDesc.textContent = '阶段二：千万吨级狂暴泥石流浪头在峡谷中狂暴冲撞！';
      }
      this.setThreatStatus(this.statusVillage, 'warning', '面临直接毁灭威胁');
      this.setThreatStatus(this.statusRoad, 'warning', '局部受损冲断');
      this.setThreatStatus(this.statusBridge, 'warning', '承受强动水冲击');
      this.setThreatStatus(this.statusRiver, 'warning', '含沙量爆表');
      if (this.txtDamStatus) this.txtDamStatus.textContent = '狂暴入江中';
    } else {
      this.stageBtns[2]?.classList.add('active');
      if (this.stageTag) this.stageTag.textContent = 'PHASE 03 / 03';
      if (this.stageTitle) this.stageTitle.textContent = '谷底爆发漫溢冲毁与横亘堰塞成湖';
      if (this.stageBody) {
        this.stageBody.textContent = '泥石流冲出沟口扇形爆发，瞬间冲垮沿河村落与公路主桥。数百万方泥沙巨石阻断干流主河道形成天然堰塞巨坝，上游水位急剧暴涨形成特大高危堰塞湖！';
      }
      if (this.riskBadge) {
        this.riskBadge.className = 'disaster-badge alert';
        if (this.riskDesc) this.riskDesc.textContent = '阶段三：村落桥梁遭受毁灭性打击，河道堰塞水位急涨数十米！';
      }
      this.setThreatStatus(this.statusVillage, 'destroyed', '遭泥浆掩埋冲毁');
      this.setThreatStatus(this.statusRoad, 'destroyed', '路基彻底冲断');
      this.setThreatStatus(this.statusBridge, 'destroyed', '主梁断裂倾覆');
      this.setThreatStatus(this.statusRiver, 'destroyed', '主干流严重堰塞');
      if (this.txtDamStatus) this.txtDamStatus.textContent = '特大高危堰塞湖';
    }
  }

  setThreatStatus(el, type, text) {
    if (!el) return;
    el.className = `threat-status ${type}`;
    el.textContent = text;
  }

  drawProfileChart(progress) {
    if (!this.profileCtx) return;
    const ctx = this.profileCtx;
    const w = this.profileCanvas.width;
    const h = this.profileCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(10, 12);
    ctx.bezierCurveTo(w * 0.25, 22, w * 0.45, 58, w * 0.72, 85);
    ctx.lineTo(w - 10, 92);

    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineTo(w - 10, h - 5);
    ctx.lineTo(10, h - 5);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0, 210, 255, 0.28)');
    grad.addColorStop(1, 'rgba(0, 210, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#c3cee0';
    ctx.font = '12px monospace';
    ctx.fillText('5,300m (源区)', 12, 14);
    ctx.fillText('1,600m (谷底)', w - 100, 82);

    const t = progress;
    const p0 = { x: 10, y: 12 };
    const p1 = { x: w * 0.25, y: 22 };
    const p2 = { x: w * 0.45, y: 58 };
    const p3 = { x: w - 10, y: 92 };

    const cx = 3 * (p1.x - p0.x);
    const bx = 3 * (p2.x - p1.x) - cx;
    const ax = p3.x - p0.x - cx - bx;

    const cy = 3 * (p1.y - p0.y);
    const by = 3 * (p2.y - p1.y) - cy;
    const ay = p3.y - p0.y - cy - by;

    const curX = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
    const curY = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;

    ctx.beginPath();
    ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3366';
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(curX, curY, 9.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 51, 102, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
}
