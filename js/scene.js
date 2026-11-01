const TAU = Math.PI * 2;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

function ellipse(ctx, x, y, radiusX, radiusY) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, radiusX), Math.max(0.1, radiusY), 0, 0, TAU);
  ctx.fill();
}

function createCloudSprite(seed, width = 680, height = 300) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const random = mulberry32(seed);

  ctx.clearRect(0, 0, width, height);
  ctx.filter = "blur(7px)";

  const puffCount = 30;
  for (let i = 0; i < puffCount; i += 1) {
    const t = i / (puffCount - 1);
    const cx = width * (0.08 + 0.84 * t) + (random() - 0.5) * 56;
    const band = Math.sin(t * Math.PI * 3.1 + seed) * 0.6 + (random() - 0.5) * 0.7;
    const cy = height * (0.56 + band * 0.13);
    const rx = 36 + random() * 82;
    const ry = 17 + random() * 33;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    gradient.addColorStop(0, "rgba(240, 232, 214, 0.33)");
    gradient.addColorStop(0.42, "rgba(219, 210, 193, 0.23)");
    gradient.addColorStop(0.68, "rgba(163, 176, 168, 0.16)");
    gradient.addColorStop(0.85, "rgba(177, 159, 132, 0.13)");
    gradient.addColorStop(1, "rgba(146, 148, 137, 0)");
    ctx.fillStyle = gradient;
    ellipse(ctx, cx, cy, rx, ry);
  }

  for (let i = 0; i < 17; i += 1) {
    const cx = width * (0.16 + random() * 0.68);
    const cy = height * (0.35 + random() * 0.19);
    const r = 23 + random() * 52;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, "rgba(251, 239, 216, 0.2)");
    gradient.addColorStop(0.58, "rgba(248, 232, 205, 0.1)");
    gradient.addColorStop(1, "rgba(248, 232, 205, 0)");
    ctx.fillStyle = gradient;
    ellipse(ctx, cx, cy, r * 1.45, r * 0.5);
  }

  const base = ctx.createLinearGradient(0, height * 0.56, 0, height * 0.92);
  base.addColorStop(0, "rgba(191, 186, 172, 0)");
  base.addColorStop(0.48, "rgba(177, 174, 161, 0.08)");
  base.addColorStop(0.72, "rgba(226, 197, 157, 0.09)");
  base.addColorStop(1, "rgba(226, 197, 157, 0)");
  ctx.fillStyle = base;
  ellipse(ctx, width * 0.5, height * 0.7, width * 0.49, height * 0.2);

  ctx.filter = "none";
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";

  for (let i = 0; i < 9; i += 1) {
    const y = height * (0.6 + random() * 0.2);
    const start = width * (0.12 + random() * 0.18);
    const end = width * (0.65 + random() * 0.22);
    const grad = ctx.createLinearGradient(start, y, end, y);
    grad.addColorStop(0, "rgba(248, 222, 185, 0)");
    grad.addColorStop(0.44, "rgba(248, 222, 185, 0.1)");
    grad.addColorStop(0.72, "rgba(248, 222, 185, 0.055)");
    grad.addColorStop(1, "rgba(248, 222, 185, 0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1 + random() * 2.4;
    ctx.beginPath();
    ctx.moveTo(start, y);
    ctx.bezierCurveTo(
      lerp(start, end, 0.35),
      y + (random() - 0.5) * 18,
      lerp(start, end, 0.7),
      y + (random() - 0.5) * 22,
      end,
      y + (random() - 0.5) * 10
    );
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

function ridgeY(x, base, amplitude, phase, scale = 1) {
  const xx = x * scale;
  return (
    base +
    Math.sin(xx * 0.0027 + phase) * amplitude * 0.54 +
    Math.sin(xx * 0.0061 + phase * 1.9) * amplitude * 0.24 +
    Math.cos(xx * 0.00135 + phase * 0.73) * amplitude * 0.22
  );
}

function drawRidge(ctx, width, height, options) {
  const {
    base,
    amplitude,
    phase,
    colorTop,
    colorBottom,
    offset,
    fillTo
  } = options;

  const gradient = ctx.createLinearGradient(0, base - amplitude, 0, fillTo);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(0.65, colorBottom);
  gradient.addColorStop(1, colorBottom);

  ctx.beginPath();
  ctx.moveTo(-40, fillTo);

  for (let x = -40; x <= width + 40; x += 22) {
    const y = ridgeY(x + offset, base, amplitude, phase);
    if (x === -40) {
      ctx.lineTo(-40, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.lineTo(width + 40, fillTo);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawReed(ctx, reed, time) {
  const sway = Math.sin(time * reed.speed + reed.phase);
  const flutter = Math.sin(time * reed.speed * 2.2 + reed.phase * 2.1);
  const tipShift = sway * reed.sway + flutter * reed.sway * 0.16;
  const midX = reed.x + reed.curve + tipShift * 0.42;
  const tipX = reed.x + reed.curve * 0.32 + tipShift;
  const tipY = reed.baseY - reed.height;

  const gradient = ctx.createLinearGradient(reed.x, reed.baseY, tipX, tipY);
  gradient.addColorStop(0, reed.dark);
  gradient.addColorStop(0.58, reed.mid);
  gradient.addColorStop(1, reed.tip);

  ctx.strokeStyle = gradient;
  ctx.fillStyle = gradient;
  ctx.lineCap = "round";
  ctx.lineWidth = reed.width;

  ctx.beginPath();
  ctx.moveTo(reed.x, reed.baseY);
  ctx.bezierCurveTo(
    reed.x + reed.curve * 0.1,
    reed.baseY - reed.height * 0.36,
    midX,
    reed.baseY - reed.height * 0.68,
    tipX,
    tipY
  );
  ctx.stroke();

  if (reed.leaves) {
    for (let i = 0; i < reed.leaves; i += 1) {
      const t = 0.26 + i * 0.21;
      const side = i % 2 === 0 ? 1 : -1;
      const leafY = reed.baseY - reed.height * t;
      const baseX = lerp(reed.x, tipX, t * 0.72);
      const direction = side * (reed.leafLength || 14) * (0.7 + (i % 3) * 0.17);

      ctx.lineWidth = Math.max(0.7, reed.width * 0.36);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(baseX, leafY);
      ctx.quadraticCurveTo(
        baseX + direction * 0.7,
        leafY - 8 - i * 1.5,
        baseX + direction,
        leafY - 2 + Math.sin(time * 0.9 + reed.phase + i) * 3
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  if (reed.seedHead) {
    const headLength = reed.seedHead;
    const angle = Math.atan2(tipY - reed.baseY, tipX - reed.x) + Math.PI / 2;
    ctx.save();
    ctx.translate(tipX, tipY + headLength * 0.34);
    ctx.rotate(angle);
    ctx.fillStyle = reed.headColor || "rgba(18, 34, 29, 0.9)";
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1.2, reed.width * 0.9), headLength, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawFlock(ctx, x, y, scale, time, alpha, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -scale : scale, scale);
  ctx.strokeStyle = `rgba(15, 37, 34, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";

  for (let i = 0; i < 5; i += 1) {
    const offsetX = i * 15 + (i % 2) * 5;
    const offsetY = (i % 3) * 5 + (i === 2 ? -4 : 0);
    const flap = Math.sin(time * 3.4 + i * 0.65) * 2.2;
    ctx.beginPath();
    ctx.moveTo(offsetX - 4.5, offsetY + flap);
    ctx.quadraticCurveTo(offsetX - 2, offsetY - 2.3 + flap * 0.4, offsetX, offsetY);
    ctx.quadraticCurveTo(offsetX + 2, offsetY - 2.3 + flap * 0.4, offsetX + 4.5, offsetY + flap);
    ctx.stroke();
  }

  ctx.restore();
}

export class Environment {
  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    this.time = 0;
    this.travel = 0;
    this.cloudPhase = 0;
    this.width = 0;
    this.height = 0;
    this.horizon = 0;
    this.waterLine = 0;
    this.sunX = 0;
    this.sunY = 0;
    this.cloudSprites = [];
    this.clouds = [];
    this.motes = [];
    this.reeds = [];
    this.ripples = [];
    this.cloudsBuilt = false;
  }

  setReducedMotion(reduced) {
    this.reducedMotion = reduced;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.horizon = height * 0.565;
    this.waterLine = height * 0.875;
    this.sunX = width * 0.72;
    this.sunY = height * 0.245;

    if (!this.cloudsBuilt) {
      this.buildClouds();
      this.cloudsBuilt = true;
    }

    this.buildMotes();
    this.buildReeds();
    this.buildRipples();
  }

  buildClouds() {
    this.cloudSprites = [
      createCloudSprite(8841, 720, 290),
      createCloudSprite(19543, 640, 250),
      createCloudSprite(53711, 760, 320)
    ];

    const random = mulberry32(71024);

    this.clouds = [
      { x: 0.06, y: 0.16, scale: 1.25, alpha: 0.5, drift: 1.2, sprite: 0, front: false },
      { x: 0.46, y: 0.06, scale: 0.88, alpha: 0.38, drift: 0.7, sprite: 1, front: false },
      { x: 0.83, y: 0.28, scale: 1.05, alpha: 0.33, drift: 1.5, sprite: 2, front: true },
      { x: 0.26, y: 0.36, scale: 0.65, alpha: 0.25, drift: 2.2, sprite: 1, front: true },
      { x: 0.61, y: 0.25, scale: 0.74, alpha: 0.27, drift: 1.05, sprite: 0, front: false }
    ].map((cloud) => ({
      ...cloud,
      phase: random() * TAU,
      bob: 2 + random() * 5
    }));
  }

  buildMotes() {
    const count = this.reducedMotion ? 14 : 38;
    const random = mulberry32(91913);
    this.motes = Array.from({ length: count }, () => ({
      x: random() * this.width,
      y: this.horizon + random() * (this.height - this.horizon) * 0.85,
      radius: 0.5 + random() * 1.7,
      speed: 4 + random() * 13,
      drift: 6 + random() * 20,
      phase: random() * TAU,
      alpha: 0.08 + random() * 0.22
    }));
  }

  buildReeds() {
    const random = mulberry32(27181);
    const count = this.reducedMotion ? 18 : 42;
    const margin = this.width * 0.2;
    this.reeds = [];

    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x =
        side < 0
          ? random() * margin
          : this.width - random() * margin;
      const depth = random();
      const baseY = this.height + 17 + depth * 34;
      const height = (this.height * (0.19 + random() * 0.39)) * (0.65 + depth * 0.6);
      const near = depth > 0.56;
      const width = near ? 1.5 + random() * 2.8 : 0.8 + random() * 1.1;
      const colorDark = near ? "rgba(9, 28, 24, 0.94)" : "rgba(25, 53, 44, 0.64)";
      const colorMid = near ? "rgba(18, 45, 35, 0.96)" : "rgba(53, 81, 65, 0.58)";
      const colorTip = near ? "rgba(59, 82, 58, 0.9)" : "rgba(112, 123, 91, 0.45)";

      this.reeds.push({
        x,
        baseY,
        height,
        width,
        curve: side * (8 + random() * 48) + (random() - 0.5) * 18,
        sway: 4 + random() * 12,
        speed: 0.32 + random() * 0.4,
        phase: random() * TAU,
        dark: colorDark,
        mid: colorMid,
        tip: colorTip,
        leaves: depth > 0.55 ? 2 + Math.floor(random() * 3) : Math.floor(random() * 2),
        leafLength: 12 + random() * 22,
        seedHead: depth > 0.4 && random() > 0.62 ? 5 + random() * 9 : 0,
        headColor: near ? "rgba(34, 48, 34, 0.95)" : "rgba(68, 79, 58, 0.55)",
        depth
      });
    }

    this.reeds.sort((a, b) => a.depth - b.depth);
  }

  buildRipples() {
    const random = mulberry32(41663);
    const count = this.reducedMotion ? 24 : 58;
    this.ripples = Array.from({ length: count }, () => {
      const depth = random();
      return {
        x: random() * this.width,
        y: lerp(this.horizon + 28, this.height - 14, depth * depth),
        width: lerp(4, 34, depth),
        alpha: lerp(0.045, 0.2, depth),
        speed: 0.25 + random() * 0.65,
        phase: random() * TAU
      };
    });
  }

  update(dt, speed) {
    const motion = this.reducedMotion ? 0.2 : 1;
    this.time += dt;
    this.travel += speed * dt * motion;
    this.cloudPhase += dt * 0.025 * motion;

    for (const mote of this.motes) {
      mote.y -= mote.speed * dt * motion;
      mote.x += Math.sin(this.time * 0.2 + mote.phase) * mote.drift * dt * motion;

      if (mote.y < this.horizon - 20) {
        mote.y = this.height + 12;
        mote.x = Math.random() * this.width;
      }

      if (mote.x < -20) mote.x = this.width + 20;
      if (mote.x > this.width + 20) mote.x = -20;
    }
  }

  drawBackdrop(ctx, width, height, pipes = [], state = "playing") {
    this.drawSky(ctx, width, height);
    this.drawSun(ctx, width, height);
    this.drawClouds(ctx, width, height);
    this.drawDistantLand(ctx, width, height);
    this.drawWater(ctx, width, height);
    this.drawDistantLife(ctx, width, height);
    this.drawWaterLight(ctx, width, height);
    this.drawPipeReflections(ctx, pipes, width, height);
    this.drawHaze(ctx, width, height);
  }

  drawSky(ctx, width, height) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.horizon + height * 0.06);
    sky.addColorStop(0, "#35555c");
    sky.addColorStop(0.32, "#607c80");
    sky.addColorStop(0.57, "#98a79e");
    sky.addColorStop(0.78, "#c7bda9");
    sky.addColorStop(0.92, "#e6c9a3");
    sky.addColorStop(1, "#eed2a8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, this.horizon + 3);

    const upperLift = ctx.createRadialGradient(
      width * 0.22,
      height * 0.08,
      0,
      width * 0.22,
      height * 0.08,
      width * 0.52
    );
    upperLift.addColorStop(0, "rgba(15, 48, 52, 0.2)");
    upperLift.addColorStop(0.58, "rgba(26, 56, 61, 0.06)");
    upperLift.addColorStop(1, "rgba(26, 56, 61, 0)");
    ctx.fillStyle = upperLift;
    ctx.fillRect(0, 0, width, this.horizon);
  }

  drawSun(ctx, width, height) {
    const x = this.sunX;
    const y = this.sunY;
    const radius = Math.min(width, height) * 0.34;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
    halo.addColorStop(0, "rgba(255, 228, 177, 0.72)");
    halo.addColorStop(0.12, "rgba(255, 218, 158, 0.42)");
    halo.addColorStop(0.34, "rgba(243, 192, 128, 0.16)");
    halo.addColorStop(0.66, "rgba(230, 183, 133, 0.05)");
    halo.addColorStop(1, "rgba(230, 183, 133, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    const discRadius = Math.min(width, height) * 0.036;

    const bloom = ctx.createRadialGradient(x, y, 0, x, y, discRadius * 2.7);
    bloom.addColorStop(0, "rgba(255, 247, 218, 0.98)");
    bloom.addColorStop(0.35, "rgba(255, 226, 177, 0.65)");
    bloom.addColorStop(1, "rgba(255, 211, 154, 0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, discRadius * 2.7, 0, TAU);
    ctx.fill();

    const disc = ctx.createRadialGradient(
      x - discRadius * 0.16,
      y - discRadius * 0.18,
      0,
      x,
      y,
      discRadius
    );
    disc.addColorStop(0, "rgba(255, 252, 232, 1)");
    disc.addColorStop(0.6, "rgba(255, 236, 195, 0.96)");
    disc.addColorStop(1, "rgba(255, 212, 151, 0)");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, discRadius, 0, TAU);
    ctx.fill();

    const band = ctx.createLinearGradient(x - radius * 0.8, y + 20, x + radius * 0.8, y + 20);
    band.addColorStop(0, "rgba(255, 225, 175, 0)");
    band.addColorStop(0.4, "rgba(255, 225, 175, 0.14)");
    band.addColorStop(0.62, "rgba(255, 225, 175, 0.08)");
    band.addColorStop(1, "rgba(255, 225, 175, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(x - radius * 0.8, y + discRadius * 0.1, radius * 1.6, height * 0.11);

    ctx.restore();
  }

  drawClouds(ctx, width, height) {
    for (const cloud of this.clouds) {
      if (cloud.front) continue;
      this.drawCloud(ctx, cloud, width, height);
    }

    for (const cloud of this.clouds) {
      if (!cloud.front) continue;
      this.drawCloud(ctx, cloud, width, height);
    }
  }

  drawCloud(ctx, cloud, width, height) {
    const sprite = this.cloudSprites[cloud.sprite];
    if (!sprite) return;

    const drift = (this.cloudPhase * cloud.drift + cloud.phase * 0.01) * width;
    const x = ((cloud.x * width + drift + sprite.width * cloud.scale * 0.5) % (width + sprite.width * cloud.scale * 1.2)) - sprite.width * cloud.scale * 0.62;
    const y = cloud.y * height + Math.sin(this.time * 0.035 + cloud.phase) * cloud.bob;
    const scale = cloud.scale;

    ctx.save();
    ctx.globalAlpha = cloud.alpha * (this.reducedMotion ? 0.75 : 1);
    ctx.drawImage(
      sprite,
      x,
      y,
      sprite.width * scale,
      sprite.height * scale
    );
    ctx.restore();
  }

  drawDistantLand(ctx, width, height) {
    const offset = this.travel * 0.055;
    const fillBase = this.horizon + 6;

    ctx.save();
    ctx.globalAlpha = 0.66;
    drawRidge(ctx, width, height, {
      base: this.horizon - height * 0.025,
      amplitude: height * 0.058,
      phase: 1.4,
      colorTop: "rgba(94, 118, 113, 0.5)",
      colorBottom: "rgba(103, 123, 116, 0.25)",
      offset: offset * 0.6,
      fillTo: fillBase
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.78;
    drawRidge(ctx, width, height, {
      base: this.horizon - height * 0.002,
      amplitude: height * 0.037,
      phase: 3.6,
      colorTop: "rgba(67, 94, 88, 0.62)",
      colorBottom: "rgba(74, 101, 92, 0.18)",
      offset,
      fillTo: fillBase
    });
    ctx.restore();

    const mist = ctx.createLinearGradient(0, this.horizon - height * 0.055, 0, this.horizon + height * 0.035);
    mist.addColorStop(0, "rgba(232, 221, 198, 0)");
    mist.addColorStop(0.58, "rgba(232, 221, 198, 0.26)");
    mist.addColorStop(1, "rgba(232, 221, 198, 0)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, this.horizon - height * 0.06, width, height * 0.1);

    this.drawLighthouse(ctx, width, height);
  }

  drawLighthouse(ctx, width, height) {
    const parallax = this.travel * 0.048;
    const x = ((width * 0.185 - parallax + width * 0.5) % (width + 120)) - 60;
    const base = this.horizon + 2;
    const towerHeight = height * 0.077;

    ctx.save();
    ctx.globalAlpha = 0.68;

    const ground = ctx.createLinearGradient(x - 30, base - 12, x + 34, base + 12);
    ground.addColorStop(0, "rgba(46, 74, 67, 0)");
    ground.addColorStop(0.45, "rgba(46, 74, 67, 0.64)");
    ground.addColorStop(0.68, "rgba(54, 79, 67, 0.58)");
    ground.addColorStop(1, "rgba(46, 74, 67, 0)");
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.ellipse(x + 4, base + 1, 34, 7, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(38, 61, 57, 0.9)";
    ctx.beginPath();
    ctx.moveTo(x - 7, base);
    ctx.lineTo(x - 5.5, base - towerHeight);
    ctx.lineTo(x + 5.5, base - towerHeight);
    ctx.lineTo(x + 7, base);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(210, 187, 151, 0.46)";
    ctx.fillRect(x - 3.8, base - towerHeight + 3, 7.6, towerHeight * 0.11);
    ctx.fillStyle = "rgba(44, 65, 60, 0.9)";
    ctx.fillRect(x - 7.7, base - towerHeight * 0.73, 15.4, 2);
    ctx.fillStyle = "rgba(41, 61, 57, 0.95)";
    ctx.fillRect(x - 6.8, base - towerHeight - 4.5, 13.6, 4.5);
    ctx.fillStyle = "rgba(233, 195, 131, 0.9)";
    ctx.fillRect(x - 3.7, base - towerHeight - 3.1, 7.4, 2.4);

    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(x, base - towerHeight - 2, 0, x, base - towerHeight - 2, 19);
    glow.addColorStop(0, "rgba(239, 196, 126, 0.32)");
    glow.addColorStop(1, "rgba(239, 196, 126, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, base - towerHeight - 2, 19, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  drawWater(ctx, width, height) {
    const water = ctx.createLinearGradient(0, this.horizon, 0, height);
    water.addColorStop(0, "#b6b3a1");
    water.addColorStop(0.08, "#a7ad9c");
    water.addColorStop(0.2, "#849b90");
    water.addColorStop(0.4, "#5e8179");
    water.addColorStop(0.65, "#3b6862");
    water.addColorStop(0.82, "#2b5551");
    water.addColorStop(1, "#142f2d");
    ctx.fillStyle = water;
    ctx.fillRect(0, this.horizon, width, height - this.horizon);

    const horizonGlow = ctx.createLinearGradient(0, this.horizon, 0, this.horizon + height * 0.08);
    horizonGlow.addColorStop(0, "rgba(245, 219, 177, 0.56)");
    horizonGlow.addColorStop(0.35, "rgba(233, 200, 153, 0.18)");
    horizonGlow.addColorStop(1, "rgba(233, 200, 153, 0)");
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, this.horizon, width, height * 0.1);

    this.drawMarshIslands(ctx, width, height);
  }

  drawMarshIslands(ctx, width, height) {
    const parallax = this.travel * 0.12;
    const random = mulberry32(61287);
    const count = 5;

    for (let i = 0; i < count; i += 1) {
      const baseRatio = 0.11 + random() * 0.72;
      const wrap = width + 280;
      const worldX = baseRatio * width - parallax * (0.7 + random() * 0.5) + i * 41;
      const x = ((worldX + 140) % wrap + wrap) % wrap - 140;
      const baseline = this.horizon + height * (0.028 + random() * 0.052);
      const islandWidth = 38 + random() * 110;
      const islandHeight = 4 + random() * 9;

      ctx.save();
      ctx.globalAlpha = 0.5 + random() * 0.15;
      const grad = ctx.createLinearGradient(0, baseline - islandHeight, 0, baseline + 6);
      grad.addColorStop(0, "rgba(37, 65, 57, 0.82)");
      grad.addColorStop(0.55, "rgba(37, 65, 57, 0.72)");
      grad.addColorStop(1, "rgba(37, 65, 57, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, baseline, islandWidth, islandHeight, -0.03, 0, TAU);
      ctx.fill();

      const stems = 2 + Math.floor(random() * 4);
      for (let s = 0; s < stems; s += 1) {
        const sx = x - islandWidth * 0.46 + random() * islandWidth * 0.92;
        const stemHeight = 4 + random() * 19;
        const sway = Math.sin(this.time * 0.8 + i * 4 + s) * 1.4;
        ctx.strokeStyle = "rgba(27, 52, 44, 0.72)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx, baseline);
        ctx.quadraticCurveTo(sx + sway * 0.35, baseline - stemHeight * 0.7, sx + sway, baseline - stemHeight);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawDistantLife(ctx, width, height) {
    const flockProgress = (this.time * 7.2 + width * 0.15) % (width + 400);
    const flockX = width + 120 - flockProgress;
    const flockY = height * 0.25 + Math.sin(this.time * 0.07) * 12;
    drawFlock(ctx, flockX, flockY, 1.05, this.time, 0.25, false);

    const secondProgress = (this.time * 4.4 + width * 0.62) % (width + 560);
    const secondX = width + 200 - secondProgress;
    const secondY = height * 0.4 + Math.cos(this.time * 0.05) * 18;
    drawFlock(ctx, secondX, secondY, 0.58, this.time + 2, 0.15, true);

    const boatX = ((width * 0.34 - this.travel * 0.035 + width * 0.5) % (width + 90)) - 40;
    const boatY = this.horizon + height * 0.032;
    ctx.save();
    ctx.globalAlpha = 0.46;
    ctx.fillStyle = "rgba(32, 52, 48, 0.9)";
    ctx.beginPath();
    ctx.moveTo(boatX - 14, boatY);
    ctx.quadraticCurveTo(boatX, boatY + 4.5, boatX + 14, boatY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(239, 226, 199, 0.72)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(boatX + 1, boatY - 2);
    ctx.lineTo(boatX + 1, boatY - 24);
    ctx.lineTo(boatX + 13, boatY - 5);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(238, 220, 189, 0.38)";
    ctx.fill();
    ctx.restore();

    const sunStreak = ctx.createLinearGradient(this.sunX - 95, 0, this.sunX + 95, 0);
    sunStreak.addColorStop(0, "rgba(248, 214, 158, 0)");
    sunStreak.addColorStop(0.5, "rgba(248, 214, 158, 0.11)");
    sunStreak.addColorStop(1, "rgba(248, 214, 158, 0)");
    ctx.fillStyle = sunStreak;
    ctx.fillRect(this.sunX - 95, this.horizon, 190, height - this.horizon);
  }

  drawWaterLight(ctx, width, height) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const sunPathWidth = width * 0.075;
    for (let i = 0; i < 32; i += 1) {
      const depth = i / 31;
      const y = this.horizon + 8 + Math.pow(depth, 1.65) * (this.waterLine - this.horizon - 8);
      const wave = Math.sin(this.time * 0.45 + i * 1.87);
      const x = this.sunX + wave * (5 + depth * 26) + Math.sin(i * 3.1) * sunPathWidth * 0.28;
      const widthAt = lerp(3, 25, depth * depth) * (0.5 + Math.abs(wave) * 0.75);
      ctx.fillStyle = `rgba(255, 226, 175, ${0.13 * (1 - depth * 0.62)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, widthAt, 0.7 + depth * 1.2, 0, 0, TAU);
      ctx.fill();
    }

    for (const ripple of this.ripples) {
      const pulse = (Math.sin(this.time * ripple.speed + ripple.phase) + 1) * 0.5;
      const x =
        ripple.x +
        Math.sin(this.time * ripple.speed * 0.7 + ripple.phase) * 18;
      ctx.strokeStyle = `rgba(237, 227, 202, ${ripple.alpha * (0.25 + pulse * 0.75)})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - ripple.width * 0.5, ripple.y);
      ctx.quadraticCurveTo(x, ripple.y - 1.1, x + ripple.width * 0.5, ripple.y);
      ctx.stroke();
    }

    const nearGlow = ctx.createLinearGradient(0, this.waterLine - 28, 0, this.waterLine + 48);
    nearGlow.addColorStop(0, "rgba(211, 196, 163, 0)");
    nearGlow.addColorStop(0.38, "rgba(221, 209, 177, 0.09)");
    nearGlow.addColorStop(0.8, "rgba(52, 91, 80, 0.1)");
    nearGlow.addColorStop(1, "rgba(21, 48, 43, 0.18)");
    ctx.fillStyle = nearGlow;
    ctx.fillRect(0, this.waterLine - 28, width, 76);

    ctx.restore();
  }

  drawPipeReflections(ctx, pipes, width, height) {
    if (!pipes || pipes.length === 0) return;

    for (const pipe of pipes) {
      const left = pipe.x - pipe.width * 0.5;
      const reflectionDepth = 68 + (pipe.seed % 23);
      const baseGradient = ctx.createLinearGradient(0, this.waterLine, 0, this.waterLine + reflectionDepth);
      baseGradient.addColorStop(0, "rgba(34, 70, 59, 0.26)");
      baseGradient.addColorStop(0.4, "rgba(35, 70, 60, 0.16)");
      baseGradient.addColorStop(1, "rgba(27, 58, 50, 0)");
      ctx.fillStyle = baseGradient;
      ctx.fillRect(left, this.waterLine, pipe.width, reflectionDepth);

      const strips = 13;
      for (let i = 0; i < strips; i += 1) {
        const t = i / (strips - 1);
        const y = this.waterLine + i * 4.6;
        const wobble =
          Math.sin(this.time * 1.1 + i * 1.2 + pipe.seed * 0.1) *
          (1.4 + t * 4.5);
        ctx.fillStyle = `rgba(187, 175, 142, ${0.045 * (1 - t)})`;
        ctx.fillRect(left + wobble, y, pipe.width * (1 - t * 0.12), 1.2);
      }

      ctx.save();
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = "rgba(224, 212, 183, 0.42)";
      ctx.lineWidth = 0.8;
      const minX = left + 4;
      const maxX = left + pipe.width - 4;
      for (let i = 0; i < 4; i += 1) {
        const y = this.waterLine + 6 + i * 7;
        const x0 = minX + ((pipe.seed + i * 27) % 22);
        const x1 = maxX - ((pipe.seed + i * 19) % 18);
        ctx.beginPath();
        ctx.moveTo(x0, y + Math.sin(this.time * 1.6 + i) * 1.4);
        ctx.quadraticCurveTo((x0 + x1) * 0.5, y + 2.6, x1, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawHaze(ctx, width, height) {
    ctx.save();

    const lowMist = ctx.createLinearGradient(0, this.horizon + 4, 0, this.horizon + height * 0.11);
    lowMist.addColorStop(0, "rgba(230, 217, 192, 0.28)");
    lowMist.addColorStop(0.35, "rgba(230, 217, 192, 0.1)");
    lowMist.addColorStop(1, "rgba(230, 217, 192, 0)");
    ctx.fillStyle = lowMist;
    ctx.fillRect(0, this.horizon + 2, width, height * 0.12);

    const horizonLine = ctx.createLinearGradient(0, this.horizon - 1, 0, this.horizon + 2);
    horizonLine.addColorStop(0, "rgba(246, 227, 190, 0)");
    horizonLine.addColorStop(0.7, "rgba(246, 227, 190, 0.2)");
    horizonLine.addColorStop(1, "rgba(246, 227, 190, 0)");
    ctx.fillStyle = horizonLine;
    ctx.fillRect(0, this.horizon - 1, width, 4);

    ctx.restore();
  }

  drawMotes(ctx, width, height) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const mote of this.motes) {
      const flicker = 0.6 + Math.sin(this.time * 0.8 + mote.phase) * 0.4;
      ctx.fillStyle = `rgba(243, 216, 165, ${mote.alpha * flicker})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.radius, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  drawForeground(ctx, width, height) {
    ctx.save();

    for (const reed of this.reeds) {
      ctx.globalAlpha = reed.depth > 0.55 ? 0.93 : 0.6;
      drawReed(ctx, reed, this.time);
    }

    ctx.globalAlpha = 1;

    const foregroundWater = ctx.createLinearGradient(0, this.waterLine - 18, 0, height);
    foregroundWater.addColorStop(0, "rgba(11, 35, 31, 0)");
    foregroundWater.addColorStop(0.56, "rgba(9, 29, 26, 0.13)");
    foregroundWater.addColorStop(1, "rgba(5, 22, 20, 0.32)");
    ctx.fillStyle = foregroundWater;
    ctx.fillRect(0, this.waterLine - 18, width, height - this.waterLine + 18);

    for (let i = 0; i < 8; i += 1) {
      const y = this.waterLine + i * 5.2;
      const x = (width * 0.11 + i * 137 + Math.sin(this.time * 0.3 + i) * 32) % width;
      const length = 44 + i * 13;
      ctx.strokeStyle = `rgba(177, 170, 143, ${0.11 - i * 0.01})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + length * 0.5, y - 2.2, x + length, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawBirdShadow(ctx, bird, width, height) {
    const distance = clamp((this.waterLine - bird.y) / (this.waterLine - 60), 0, 1);
    const alpha = (1 - distance) * 0.16;
    if (alpha <= 0.002) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    const scale = 0.7 + distance * 1.3;
    const gradient = ctx.createRadialGradient(
      bird.x - 14,
      this.waterLine + 9,
      0,
      bird.x - 14,
      this.waterLine + 9,
      48 * scale
    );
    gradient.addColorStop(0, "rgba(8, 21, 18, 0.8)");
    gradient.addColorStop(1, "rgba(8, 21, 18, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(
      bird.x - 14,
      this.waterLine + 9,
      48 * scale,
      7 * scale,
      -0.04,
      0,
      TAU
    );
    ctx.fill();
    ctx.restore();
  }

  drawSplash(ctx, splash) {
    const progress = 1 - splash.life / splash.maxLife;
    const alpha = Math.max(0, splash.life / splash.maxLife);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < splash.rings.length; i += 1) {
      const ring = splash.rings[i];
      const ringProgress = clamp(progress - ring.delay, 0, 1);
      if (ringProgress <= 0) continue;
      const eased = 1 - Math.pow(1 - ringProgress, 3);
      ctx.strokeStyle = `rgba(222, 221, 195, ${alpha * ring.alpha * (1 - ringProgress)})`;
      ctx.lineWidth = 1.1 - ringProgress * 0.5;
      ctx.beginPath();
      ctx.ellipse(
        splash.x,
        this.waterLine + ring.offset,
        (12 + eased * 58) * ring.scale,
        2 + eased * 7,
        0,
        0,
        TAU
      );
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const drop of splash.drops) {
      if (drop.life <= 0) continue;
      const a = drop.life / drop.maxLife;
      ctx.fillStyle = `rgba(224, 227, 204, ${a * 0.68})`;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius * a, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export { smoothstep, makeCanvas };
