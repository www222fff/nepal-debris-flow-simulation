import * as THREE from 'three';

/**
 * 喜马拉雅高海拔大落差地形系统 (Crisp, Clear & Majestic Topography)
 */
export class HimalayanTerrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 1600;
    this.depth = 1800;
    this.segmentsX = 200;
    this.segmentsZ = 220;

    // 泥石流主运动轴线路径点 (从 5300m 极顶雪峰 -> 峡谷 -> 1600m 谷底江河)
    this.pathControlPoints = [
      new THREE.Vector3(-200, 360, -700), // 5300m 极顶雪峰崩塌源区
      new THREE.Vector3(-140, 300, -540), // 4600m 冰碛起动漏斗
      new THREE.Vector3(-85,  230, -380), // 3900m 冲沟源头陡坡
      new THREE.Vector3(-35,  165, -200), // 3200m 冲沟极速喉口
      new THREE.Vector3(25,   110,  -40), // 2500m 强烈铲刮弯道
      new THREE.Vector3(75,    65,  120), // 2000m 峡谷出口 / 冲积扇顶
      new THREE.Vector3(110,   35,  270), // 1750m 跨河大桥与村落
      new THREE.Vector3(155,   22,  450), // 1650m 谷底漫溢与堰塞湖
      new THREE.Vector3(210,   15,  640)  // 1580m 下游干流宽谷段
    ];

    this.flowCurve = new THREE.CatmullRomCurve3(this.pathControlPoints, false, 'catmullrom', 0.25);

    this.initTerrain();
    this.initPathGuideLine();
    this.initRiverAndLake();
  }

  fractalNoise2D(x, z) {
    let v = Math.sin(x * 0.003 + z * 0.0025) * 45.0;
    v += Math.cos(x * 0.008 - z * 0.007) * 22.0;
    v += Math.sin(x * 0.02 + z * 0.018) * 8.0;
    return v;
  }

  getTerrainHeight(x, z) {
    // 整体北高南低的宏大山体主坡降 (5300m -> 1600m)
    const slopeGrad = ((-z + 750) / 1500) * 300;

    // 两侧巍峨山脊与中央深切主峡谷
    const valleyCenterDist = Math.abs(x - (z * 0.16));
    const mountainSide = Math.pow(Math.min(valleyCenterDist / 380, 1.0), 1.5) * 180;

    const rough = this.fractalNoise2D(x, z);
    let height = Math.max(10, slopeGrad + mountainSide + rough);

    // 沿泥石流主冲沟进行平滑下切 (Gully Carving)
    const nearest = this.getClosestCurvePoint(x, z);
    const distToGully = Math.hypot(x - nearest.point.x, z - nearest.point.z);

    if (distToGully < 100) {
      const gullyDepth = (1.0 - distToGully / 100) * 25.0;
      height = Math.max(12, height - gullyDepth);
    }

    // 谷底主河道下切
    if (z > 140) {
      const riverCenterX = (z - 140) * 0.38 + 95;
      const distToRiver = Math.abs(x - riverCenterX);
      if (distToRiver < 80) {
        const riverDepth = (1.0 - distToRiver / 80) * 18.0;
        height = Math.max(8, height - riverDepth);
      }
    }

    return height;
  }

  getClosestCurvePoint(x, z) {
    let minDist = Infinity;
    let closestPt = null;
    let bestT = 0;
    for (let t = 0; t <= 1; t += 0.015) {
      const pt = this.flowCurve.getPoint(t);
      const d = Math.hypot(x - pt.x, z - pt.z);
      if (d < minDist) {
        minDist = d;
        closestPt = pt;
        bestT = t;
      }
    }
    return { point: closestPt, t: bestT, dist: minDist };
  }

  initTerrain() {
    const geom = new THREE.PlaneGeometry(this.width, this.depth, this.segmentsX, this.segmentsZ);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = [];

    // 高对比度、明亮喜马拉雅地质色彩
    const colPeakSnow = new THREE.Color(0xffffff);   // 纯白雪峰
    const colGlacialIce = new THREE.Color(0x9bd8f5); // 冰川淡蓝
    const colGreyRock = new THREE.Color(0x5a6575);   // 裸露灰岩
    const colBrownCrag = new THREE.Color(0x584435);  // 风化断崖
    const colScourChannel = new THREE.Color(0x2d1b10); // 泥石流深色剥蚀槽
    const colForest = new THREE.Color(0x234228);     // 针叶林带
    const colMeadow = new THREE.Color(0x405c36);     // 高山草甸
    const colAlluvium = new THREE.Color(0x6e604d);   // 谷底沙砾阶地

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);

      const nearest = this.getClosestCurvePoint(x, z);
      const isScourTrack = (nearest.dist < 35);

      const col = new THREE.Color();

      if (y > 260) {
        // 雪峰极顶
        col.copy(colGlacialIce).lerp(colPeakSnow, Math.min(1.0, (y - 260) / 70));
      } else if (y > 175) {
        // 冰磧悬壁与灰岩带
        const t = (y - 175) / 85;
        col.copy(colGreyRock).lerp(colGlacialIce, t * 0.65);
      } else if (isScourTrack) {
        // 泥石流主冲沟深褐色创面
        const blend = Math.min(1.0, nearest.dist / 35);
        col.copy(colScourChannel).lerp(colBrownCrag, blend);
      } else if (y > 65) {
        // 高山森林与草甸
        col.copy(colForest).lerp(colMeadow, (y - 65) / 110);
      } else {
        // 谷底河漫滩
        col.copy(colAlluvium).lerp(colForest, (y - 8) / 60);
      }

      colors.push(col.r, col.g, col.b);
    }

    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  initPathGuideLine() {
    // 3D 发光轨迹导引虚线
    const points = this.flowCurve.getPoints(100);
    const guideGeom = new THREE.BufferGeometry().setFromPoints(
      points.map(p => new THREE.Vector3(p.x, p.y + 4.0, p.z))
    );

    const guideMat = new THREE.LineDashedMaterial({
      color: 0x00f0ff,
      dashSize: 12,
      gapSize: 6,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });

    this.guideLine = new THREE.Line(guideGeom, guideMat);
    this.guideLine.computeLineDistances();
    this.scene.add(this.guideLine);
  }

  initRiverAndLake() {
    // 谷底碧绿主河水体
    const riverGeom = new THREE.PlaneGeometry(160, 700, 24, 48);
    riverGeom.rotateX(-Math.PI / 2);

    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x008fa8,
      roughness: 0.12,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88
    });

    this.riverMesh = new THREE.Mesh(riverGeom, riverMat);
    this.riverMesh.position.set(155, 17, 400);
    this.riverMesh.rotation.y = -0.36;
    this.scene.add(this.riverMesh);

    // 堰塞湖几何体
    const lakeGeom = new THREE.CircleGeometry(120, 36);
    lakeGeom.rotateX(-Math.PI / 2);

    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x2e4a36,
      roughness: 0.2,
      metalness: 0.65,
      transparent: true,
      opacity: 0.0
    });

    this.lakeMesh = new THREE.Mesh(lakeGeom, lakeMat);
    this.lakeMesh.position.set(125, 18, 290);
    this.lakeMesh.scale.set(0.01, 1, 0.01);
    this.scene.add(this.lakeMesh);
  }

  updateLake(progress) {
    if (progress > 0.65) {
      const p = (progress - 0.65) / 0.35;
      this.lakeMesh.material.opacity = Math.min(0.92, p * 1.3);
      const scale = 0.2 + p * 1.9;
      this.lakeMesh.scale.set(scale, 1, scale * 1.45);
      this.lakeMesh.position.y = 18.5 + p * 11.0;
    } else {
      this.lakeMesh.material.opacity = 0.0;
      this.lakeMesh.scale.set(0.001, 1, 0.001);
    }
  }
}
