import { mulberry32 } from "./scene.js";

const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTail(ctx, animate, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const tails = [
    { x: -23, y: -2, length: 27, angle: -0.17, color: "#3d4439" },
    { x: -25, y: 2, length: 31, angle: 0.08, color: "#4a4d3d" },
    { x: -22, y: 6, length: 25, angle: 0.28, color: "#5c5944" }
  ];

  for (const feather of tails) {
    const sway = animate ? Math.sin(animate * 5.2 + feather.y) * 0.045 : 0;
    ctx.save();
    ctx.translate(feather.x, feather.y);
    ctx.rotate(feather.angle + sway);
    const length = feather.length;
    const gradient = ctx.createLinearGradient(0, 0, -length, 4);
    gradient.addColorStop(0, feather.color);
    gradient.addColorStop(0.78, feather.color);
    gradient.addColorStop(1, "rgba(222, 189, 132, 0.55)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-length * 0.42, -8.5, -length, -1.5);
    ctx.quadraticCurveTo(-length * 0.65, 4.5, 0, 5.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(29, 37, 31, 0.34)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-3, 1.5);
    ctx.quadraticCurveTo(-length * 0.52, -3, -length * 0.93, -1);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawFarWing(ctx, wingAngle, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(1, -2);
  ctx.rotate(wingAngle * 0.77 - 0.08);

  const gradient = ctx.createLinearGradient(-4, -4, -38, 18);
  gradient.addColorStop(0, "rgba(72, 78, 58, 0.92)");
  gradient.addColorStop(0.55, "rgba(54, 62, 51, 0.95)");
  gradient.addColorStop(1, "rgba(74, 72, 50, 0.86)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.bezierCurveTo(-8, -10, -25, -18, -40, -17);
  ctx.bezierCurveTo(-30, -5, -25, 5, -10, 11);
  ctx.bezierCurveTo(-5, 8, 0, 4, 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(35, 42, 33, 0.44)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-3, 1 + i * 2.3);
    ctx.quadraticCurveTo(-20, -5 - i * 2.5, -35, -12 + i * 4.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNearWing(ctx, wingAngle) {
  ctx.save();
  ctx.translate(-1, -3);
  ctx.rotate(wingAngle);

  const lift = clamp(-wingAngle, -0.2, 0.85);
  const wingGradient = ctx.createLinearGradient(3, 0, -43, 12);
  wingGradient.addColorStop(0, "#737052");
  wingGradient.addColorStop(0.3, "#5b604c");
  wingGradient.addColorStop(0.72, "#3f4b40");
  wingGradient.addColorStop(1, "#263730");

  ctx.fillStyle = wingGradient;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.bezierCurveTo(-8, -12 + lift * 2, -27, -20 + lift * 4, -46, -18 + lift * 7);
  ctx.bezierCurveTo(-38, -7 + lift * 2, -29, 3, -12, 12);
  ctx.bezierCurveTo(-5, 10, 1, 5, 4, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(30, 39, 32, 0.48)";
  ctx.lineWidth = 0.65;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(1 - i * 1.6, 1.5 + i * 1.2);
    ctx.quadraticCurveTo(-20 - i * 2.6, -7 - i * 1.4, -37 + i * 1.2, -13 + i * 5.8);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(217, 178, 112, 0.5)";
  ctx.beginPath();
  ctx.ellipse(-32, -10 + lift * 5.6, 6.5, 2.1, -0.5, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "rgba(224, 194, 139, 0.26)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.quadraticCurveTo(-22, -16 + lift * 2, -42, -17 + lift * 6.5);
  ctx.stroke();

  ctx.restore();
}

function drawBeak(ctx) {
  const gradient = ctx.createLinearGradient(27, -6, 45, 5);
  gradient.addColorStop(0, "#a75f3f");
  gradient.addColorStop(0.5, "#ca7b4f");
  gradient.addColorStop(1, "#e0a06b");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(25, -7.2);
  ctx.quadraticCurveTo(37, -7.3, 44.5, -1.2);
  ctx.quadraticCurveTo(38, 4.2, 25, 3.7);
  ctx.quadraticCurveTo(30, -1, 25, -7.2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(69, 38, 27, 0.55)";
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(29, 0.5);
  ctx.quadraticCurveTo(37, 1.5, 43, -0.8);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 224, 177, 0.55)";
  ctx.beginPath();
  ctx.ellipse(35, -3.7, 4.6, 0.9, -0.08, 0, TAU);
  ctx.fill();
}

function drawEye(ctx, blink) {
  ctx.save();
  ctx.translate(18.5, -9.2);
  ctx.rotate(-0.09);

  ctx.fillStyle = "rgba(22, 30, 26, 0.72)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.3, 6.4, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#e9d9b8";
  ctx.beginPath();
  ctx.ellipse(-1.1, 0.3, 4.9, 4.1, 0, 0, TAU);
  ctx.fill();

  if (blink) {
    ctx.strokeStyle = "rgba(39, 40, 30, 0.9)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4.2, 0.2);
    ctx.quadraticCurveTo(0, 1.5, 3.7, 0);
    ctx.stroke();
  } else {
    const iris = ctx.createRadialGradient(0.1, -0.5, 0, 0.1, -0.5, 3.2);
    iris.addColorStop(0, "#191f19");
    iris.addColorStop(0.64, "#303a2c");
    iris.addColorStop(1, "#74664a");
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(0, -0.2, 2.8, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 250, 225, 0.95)";
    ctx.beginPath();
    ctx.arc(-1.1, -1.3, 1.05, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(33, 35, 27, 0.5)";
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.ellipse(-0.7, 0.2, 5.6, 4.8, 0, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

export function drawBird(ctx, bird, time = 0) {
  const { x, y, angle = 0, flapAge = 10, blink = false, opacity = 1 } = bird;
  const wingAge = Math.max(0, flapAge);
  const wingLift = Math.exp(-wingAge * 6.5) * Math.sin(wingAge * 32);
  const idle = Math.sin(time * 3.1 + 0.4) * 0.028;
  const wingAngle = 0.1 + wingLift * 1.05 + idle;
  const breathe = Math.sin(time * 2.3) * 0.004;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1.02 + breathe, 1.02 - breathe);

  drawTail(ctx, time, 0.86);
  drawFarWing(ctx, wingAngle, 0.62);

  const bodyGradient = ctx.createLinearGradient(0, -23, 0, 23);
  bodyGradient.addColorStop(0, "#4f5a49");
  bodyGradient.addColorStop(0.17, "#7b744f");
  bodyGradient.addColorStop(0.37, "#d3a75f");
  bodyGradient.addColorStop(0.67, "#edc880");
  bodyGradient.addColorStop(0.86, "#f3ddb0");
  bodyGradient.addColorStop(1, "#e9c993");

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(26.5, -7.2);
  ctx.bezierCurveTo(27.5, -16.3, 19.5, -23.2, 8.4, -23.2);
  ctx.bezierCurveTo(-7, -23.3, -24, -14.1, -30, -2.6);
  ctx.bezierCurveTo(-34, 7.3, -25.3, 18.6, -9.4, 21.7);
  ctx.bezierCurveTo(7.3, 24.8, 22.6, 16.5, 27.2, 5.1);
  ctx.bezierCurveTo(28.5, 1.7, 28.6, -2.9, 26.5, -7.2);
  ctx.closePath();

  ctx.save();
  ctx.clip();

  const breast = ctx.createRadialGradient(10, 5, 2, 8, 4, 29);
  breast.addColorStop(0, "rgba(239, 191, 107, 0.55)");
  breast.addColorStop(0.65, "rgba(228, 170, 82, 0.13)");
  breast.addColorStop(1, "rgba(228, 170, 82, 0)");
  ctx.fillStyle = breast;
  ctx.fillRect(-36, -26, 70, 52);

  const belly = ctx.createLinearGradient(0, 8, 0, 24);
  belly.addColorStop(0, "rgba(246, 226, 181, 0)");
  belly.addColorStop(1, "rgba(249, 229, 180, 0.68)");
  ctx.fillStyle = belly;
  ctx.fillRect(-34, 7, 68, 18);

  const backShade = ctx.createLinearGradient(-32, -18, 18, 4);
  backShade.addColorStop(0, "rgba(39, 50, 42, 0.45)");
  backShade.addColorStop(0.38, "rgba(50, 59, 45, 0.12)");
  backShade.addColorStop(1, "rgba(50, 59, 45, 0)");
  ctx.fillStyle = backShade;
  ctx.fillRect(-36, -26, 50, 34);

  ctx.strokeStyle = "rgba(97, 72, 42, 0.18)";
  ctx.lineWidth = 0.55;
  for (let i = 0; i < 8; i += 1) {
    const lineY = -4 + i * 2.7;
    ctx.beginPath();
    ctx.moveTo(-19 + i * 1.2, lineY);
    ctx.quadraticCurveTo(-2, lineY + 2.2, 17 - i * 1.2, lineY + 0.7);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(49, 52, 39, 0.58)";
  ctx.beginPath();
  ctx.moveTo(24, -22);
  ctx.bezierCurveTo(14, -24.6, 5, -23.2, -1, -19.5);
  ctx.bezierCurveTo(9, -20.5, 17, -17, 23, -12.4);
  ctx.bezierCurveTo(26.4, -15.3, 26.2, -18.8, 24, -22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(239, 225, 196, 0.86)";
  ctx.beginPath();
  ctx.moveTo(26.2, -9.2);
  ctx.bezierCurveTo(20.3, -14.7, 13.1, -16.4, 6.4, -14.1);
  ctx.bezierCurveTo(12, -6.8, 20, -3.1, 28.8, -4.2);
  ctx.bezierCurveTo(29.1, -6, 28.2, -7.8, 26.2, -9.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(92, 71, 44, 0.25)";
  ctx.beginPath();
  ctx.ellipse(-11, 11, 13, 5.4, 0.24, 0, TAU);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = "rgba(46, 43, 31, 0.55)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(26.5, -7.2);
  ctx.bezierCurveTo(27.5, -16.3, 19.5, -23.2, 8.4, -23.2);
  ctx.bezierCurveTo(-7, -23.3, -24, -14.1, -30, -2.6);
  ctx.bezierCurveTo(-34, 7.3, -25.3, 18.6, -9.4, 21.7);
  ctx.bezierCurveTo(7.3, 24.8, 22.6, 16.5, 27.2, 5.1);
  ctx.stroke();

  drawBeak(ctx);
  drawEye(ctx, blink);

  ctx.strokeStyle = "rgba(58, 52, 37, 0.42)";
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(21, 12.5);
  ctx.quadraticCurveTo(9, 17.2, -6, 16.2);
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = "rgba(53, 48, 35, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 20);
  ctx.lineTo(-8, 25);
  ctx.moveTo(3, 20);
  ctx.lineTo(6, 25);
  ctx.stroke();
  ctx.strokeStyle = "rgba(32, 36, 28, 0.7)";
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(-8, 25);
  ctx.quadraticCurveTo(-2, 27.5, 3, 25.6);
  ctx.moveTo(6, 25);
  ctx.quadraticCurveTo(9, 26, 11, 24);
  ctx.stroke();
  ctx.restore();

  drawNearWing(ctx, wingAngle);

  ctx.fillStyle = "rgba(255, 245, 216, 0.22)";
  ctx.beginPath();
  ctx.ellipse(15, -14.5, 6.8, 2.1, -0.37, 0, TAU);
  ctx.fill();

  ctx.restore();
}

function drawPipeTexture(ctx, pipe, left, top, bottom, seed, kind, waterLine) {
  const width = pipe.width;
  const height = bottom - top;
  if (height <= 0) return;

  const random = mulberry32(seed);
  const body = ctx.createLinearGradient(left, 0, left + width, 0);
  body.addColorStop(0, "#1b3a32");
  body.addColorStop(0.13, "#2f5346");
  body.addColorStop(0.34, "#456d59");
  body.addColorStop(0.58, "#3a6152");
  body.addColorStop(0.8, "#2b4c40");
  body.addColorStop(0.94, "#18372f");
  body.addColorStop(1, "#112b25");

  ctx.save();
  roundRect(ctx, left, top, width, height, 5);
  ctx.clip();

  ctx.fillStyle = body;
  ctx.fillRect(left, top, width, height);

  const topShade = ctx.createLinearGradient(0, top, 0, top + height);
  topShade.addColorStop(0, kind === "top" ? "rgba(5, 19, 16, 0.18)" : "rgba(5, 19, 16, 0)");
  topShade.addColorStop(0.6, "rgba(5, 19, 16, 0)");
  topShade.addColorStop(1, kind === "bottom" ? "rgba(6, 22, 18, 0.28)" : "rgba(6, 22, 18, 0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(left, top, width, height);

  const patches = 11;
  for (let i = 0; i < patches; i += 1) {
    const px = left + 3 + random() * (width - 6);
    const py = top + 8 + random() * Math.max(2, height - 16);
    const rx = 3 + random() * 16;
    const ry = 2 + random() * 22;
    const warm = random() > 0.55;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, Math.max(rx, ry));
    if (warm) {
      gradient.addColorStop(0, `rgba(139, 82, 46, ${0.08 + random() * 0.12})`);
      gradient.addColorStop(0.62, `rgba(133, 80, 43, ${0.035 + random() * 0.06})`);
    } else {
      gradient.addColorStop(0, `rgba(111, 139, 101, ${0.08 + random() * 0.12})`);
      gradient.addColorStop(0.62, `rgba(76, 108, 80, ${0.04 + random() * 0.06})`);
    }
    gradient.addColorStop(1, "rgba(45, 75, 57, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, random() * 0.7 - 0.35, 0, TAU);
    ctx.fill();
  }

  const streakCount = 8;
  for (let i = 0; i < streakCount; i += 1) {
    const sx = left + 8 + random() * (width - 16);
    const sy = top + random() * height * 0.75;
    const length = 22 + random() * 90;
    const gradient = ctx.createLinearGradient(0, sy, 0, sy + length);
    gradient.addColorStop(0, `rgba(14, 37, 28, ${0.11 + random() * 0.08})`);
    gradient.addColorStop(1, "rgba(14, 37, 28, 0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 0.7 + random() * 1.3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + 2, sy + length * 0.3, sx - 1, sy + length * 0.72, sx + 0.5, sy + length);
    ctx.stroke();
  }

  const highlight = ctx.createLinearGradient(0, 0, left + width * 0.76, 0);
  highlight.addColorStop(0, "rgba(208, 192, 154, 0)");
  highlight.addColorStop(0.54, "rgba(208, 192, 154, 0)");
  highlight.addColorStop(0.76, "rgba(218, 199, 159, 0.12)");
  highlight.addColorStop(0.84, "rgba(218, 199, 159, 0.04)");
  highlight.addColorStop(1, "rgba(218, 199, 159, 0)");
  ctx.fillStyle = highlight;
  ctx.fillRect(left, top, width, height);

  const rim = ctx.createLinearGradient(left + width * 0.62, 0, left + width, 0);
  rim.addColorStop(0, "rgba(228, 192, 139, 0)");
  rim.addColorStop(0.82, "rgba(228, 192, 139, 0.1)");
  rim.addColorStop(1, "rgba(238, 204, 149, 0.26)");
  ctx.fillStyle = rim;
  ctx.fillRect(left, top, width, height);

  const coreShadow = ctx.createLinearGradient(left, 0, left + width * 0.4, 0);
  coreShadow.addColorStop(0, "rgba(5, 19, 16, 0.3)");
  coreShadow.addColorStop(0.22, "rgba(5, 19, 16, 0.08)");
  coreShadow.addColorStop(0.64, "rgba(5, 19, 16, 0)");
  ctx.fillStyle = coreShadow;
  ctx.fillRect(left, top, width, height);

  const seamGap = kind === "top" ? -1 : 1;
  const seamStart = kind === "top" ? top : top + 70;
  const seamSpacing = 144;
  const seamCount = Math.max(1, Math.floor(height / seamSpacing));
  for (let i = 1; i <= seamCount; i += 1) {
    const sy = seamStart + seamGap * i * seamSpacing;
    if (sy < top + 8 || sy > bottom - 8) continue;
    ctx.strokeStyle = "rgba(8, 27, 22, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 3, sy);
    ctx.lineTo(left + width - 3, sy);
    ctx.stroke();
    ctx.strokeStyle = "rgba(201, 188, 153, 0.08)";
    ctx.beginPath();
    ctx.moveTo(left + 3, sy + 1);
    ctx.lineTo(left + width - 3, sy + 1);
    ctx.stroke();

    for (let bolt = 0; bolt < 4; bolt += 1) {
      const bx = left + 13 + bolt * ((width - 26) / 3);
      ctx.fillStyle = "rgba(10, 30, 24, 0.35)";
      ctx.beginPath();
      ctx.arc(bx, sy, 2.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(207, 188, 145, 0.22)";
      ctx.beginPath();
      ctx.arc(bx - 0.4, sy - 0.5, 0.75, 0, TAU);
      ctx.fill();
    }
  }

  const edgeGap = 10;
  const rivetSpacing = 53;
  const rivetStart = top + 20;
  const rivetEnd = bottom - 18;
  for (let y = rivetStart; y < rivetEnd; y += rivetSpacing) {
    for (const side of [1, -1]) {
      const rx = side < 0 ? left + edgeGap : left + width - edgeGap;
      ctx.fillStyle = "rgba(7, 24, 19, 0.32)";
      ctx.beginPath();
      ctx.arc(rx + 0.5, y + 0.7, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(216, 193, 148, 0.19)";
      ctx.beginPath();
      ctx.arc(rx - 0.3, y - 0.4, 1.25, 0, TAU);
      ctx.fill();
    }
  }

  if (kind === "bottom") {
    const barnacleTop = waterLine - 78;

    if (bottom > barnacleTop) {
      for (let i = 0; i < 9; i += 1) {
        const bx = left + 8 + random() * (width - 16);
        const by = barnacleTop + random() * Math.min(62, bottom - barnacleTop);
        if (by > bottom - 3) continue;
        const size = 1.4 + random() * 2.8;
        ctx.fillStyle = "rgba(205, 195, 163, 0.2)";
        ctx.beginPath();
        ctx.arc(bx, by, size, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(24, 46, 37, 0.34)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(bx, by, size, 0, TAU);
        ctx.stroke();
      }
    }

    const waterStain = ctx.createLinearGradient(0, waterLine - 122, 0, waterLine);
    waterStain.addColorStop(0, "rgba(13, 37, 29, 0)");
    waterStain.addColorStop(0.58, "rgba(13, 37, 29, 0.08)");
    waterStain.addColorStop(1, "rgba(8, 28, 22, 0.32)");
    ctx.fillStyle = waterStain;
    ctx.fillRect(left, waterLine - 122, width, 122);
  }

  ctx.restore();

  ctx.strokeStyle = "rgba(9, 28, 23, 0.4)";
  ctx.lineWidth = 1;
  roundRect(ctx, left, top, width, height, 5);
  ctx.stroke();

  roundRect(ctx, left, top, width, height, 5);
  ctx.strokeStyle = "rgba(214, 192, 150, 0.1)";
  ctx.lineWidth = 0.65;
  ctx.stroke();
}

function drawCap(ctx, pipe, left, y, kind, seed) {
  const x = left - (pipe.capWidth - pipe.width) * 0.5;
  const height = pipe.capHeight;
  const random = mulberry32(seed + 991);

  ctx.save();
  ctx.shadowColor = "rgba(4, 19, 16, 0.25)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 5;

  const cap = ctx.createLinearGradient(x, 0, x + pipe.capWidth, 0);
  cap.addColorStop(0, "#17372f");
  cap.addColorStop(0.11, "#335847");
  cap.addColorStop(0.34, "#507763");
  cap.addColorStop(0.55, "#426752");
  cap.addColorStop(0.8, "#2b4b3e");
  cap.addColorStop(0.94, "#1b3a30");
  cap.addColorStop(1, "#112b25");
  ctx.fillStyle = cap;
  roundRect(ctx, x, y, pipe.capWidth, height, 7);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.save();
  roundRect(ctx, x, y, pipe.capWidth, height, 7);
  ctx.clip();

  const inner = ctx.createLinearGradient(0, y, 0, y + height);
  inner.addColorStop(0, "rgba(237, 211, 164, 0.25)");
  inner.addColorStop(0.14, "rgba(237, 211, 164, 0.02)");
  inner.addColorStop(0.58, "rgba(8, 28, 23, 0.02)");
  inner.addColorStop(1, "rgba(7, 24, 20, 0.34)");
  ctx.fillStyle = inner;
  ctx.fillRect(x, y, pipe.capWidth, height);

  const rim = ctx.createLinearGradient(x, 0, x + pipe.capWidth, 0);
  rim.addColorStop(0, "rgba(8, 25, 20, 0.3)");
  rim.addColorStop(0.16, "rgba(8, 25, 20, 0)");
  rim.addColorStop(0.72, "rgba(233, 194, 138, 0)");
  rim.addColorStop(0.92, "rgba(233, 194, 138, 0.2)");
  rim.addColorStop(1, "rgba(233, 194, 138, 0)");
  ctx.fillStyle = rim;
  ctx.fillRect(x, y, pipe.capWidth, height);

  for (let i = 0; i < 15; i += 1) {
    const px = x + 3 + random() * (pipe.capWidth - 6);
    const py = y + random() * height;
    const r = 1 + random() * 5.5;
    ctx.fillStyle =
      random() > 0.58
        ? `rgba(128, 77, 44, ${0.07 + random() * 0.09})`
        : `rgba(83, 115, 82, ${0.045 + random() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 2.2, r, random() * 0.6, 0, TAU);
    ctx.fill();
  }

  const bolts = 5;
  for (let i = 0; i < bolts; i += 1) {
    const bx = x + 12 + i * ((pipe.capWidth - 24) / (bolts - 1));
    const by = kind === "top" ? y + height - 12 : y + 12;
    ctx.fillStyle = "rgba(6, 23, 19, 0.4)";
    ctx.beginPath();
    ctx.arc(bx + 0.5, by + 0.6, 2.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(220, 194, 147, 0.26)";
    ctx.beginPath();
    ctx.arc(bx - 0.35, by - 0.5, 1.25, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(6, 22, 17, 0.42)";
  if (kind === "top") {
    ctx.fillRect(x + 2, y + height - 3.5, pipe.capWidth - 4, 3.5);
    ctx.fillStyle = "rgba(240, 219, 173, 0.16)";
    ctx.fillRect(x + 3, y + 1, pipe.capWidth - 6, 1.2);
  } else {
    ctx.fillRect(x + 2, y, pipe.capWidth - 4, 3.5);
    ctx.fillStyle = "rgba(10, 28, 23, 0.3)";
    ctx.fillRect(x + 3, y + height - 2, pipe.capWidth - 6, 1.3);
  }

  const leafCount = 4 + Math.floor(random() * 4);
  for (let i = 0; i < leafCount; i += 1) {
    const lx = x + 14 + random() * (pipe.capWidth - 28);
    const ly = kind === "top" ? y + height - 2 : y + 1;
    const direction = kind === "top" ? -1 : 1;
    const stem = 4 + random() * 13;
    ctx.strokeStyle = "rgba(94, 122, 80, 0.36)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(lx + (random() - 0.5) * 8, ly + direction * stem * 0.6, lx + (random() - 0.5) * 15, ly + direction * stem);
    ctx.stroke();
  }

  ctx.restore();

  ctx.strokeStyle = "rgba(41, 77, 62, 0.3)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, pipe.capWidth, height, 7);
  ctx.stroke();

  ctx.restore();
}

function drawVines(ctx, pipe, gapTop, gapBottom, waterLine, seed) {
  const random = mulberry32(seed + 7822);
  const vineCount = 2 + (seed % 4);

  for (let i = 0; i < vineCount; i += 1) {
    const fromTop = random() > 0.34;
    const originX = pipe.x + (random() - 0.5) * pipe.capWidth * 0.72;
    const startY = fromTop ? gapTop : gapBottom;
    const direction = fromTop ? 1 : -1;
    const length = 10 + random() * (fromTop ? 34 : 18);
    const sway = Math.sin(random() * 6) * (2 + random() * 5);
    const controlY = startY + direction * length * 0.55;
    const tipX = originX + sway;
    const tipY = startY + direction * length;

    ctx.strokeStyle = "rgba(102, 127, 84, 0.45)";
    ctx.lineWidth = 0.8 + random() * 0.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(originX, startY - direction * 2);
    ctx.quadraticCurveTo(originX + sway * 0.4, controlY, tipX, tipY);
    ctx.stroke();

    const leaves = 1 + Math.floor(random() * 3);
    for (let l = 0; l < leaves; l += 1) {
      const t = 0.24 + (l / Math.max(1, leaves)) * 0.56;
      const lx = originX + sway * t * 0.7;
      const ly = startY + direction * length * t;
      const side = random() > 0.5 ? 1 : -1;
      const angle = side * (0.6 + random() * 0.8);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle * direction);
      ctx.fillStyle = "rgba(102, 130, 82, 0.38)";
      ctx.beginPath();
      ctx.ellipse(side * 3.6, 0, 4.6 + random() * 2.6, 1.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(155, 153, 105, 0.16)";
      ctx.lineWidth = 0.4;
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function drawPipePair(ctx, pipe, waterLine, time = 0) {
  const left = pipe.x - pipe.width * 0.5;
  const gapTop = pipe.gapY - pipe.gap * 0.5;
  const gapBottom = pipe.gapY + pipe.gap * 0.5;
  const topEnd = gapTop - pipe.capHeight + 2;
  const bottomStart = gapBottom + pipe.capHeight - 2;
  const seed = pipe.seed;
  const random = mulberry32(seed + 2024);

  ctx.save();

  const shadowX = pipe.x + pipe.width * 0.65;
  const shadow = ctx.createLinearGradient(shadowX, 0, shadowX + 30, 0);
  shadow.addColorStop(0, "rgba(13, 37, 32, 0.13)");
  shadow.addColorStop(1, "rgba(13, 37, 32, 0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(left + 20, 0, 38, Math.max(0, topEnd));
  ctx.fillRect(left + 20, gapBottom, 38, waterLine - gapBottom);

  if (topEnd > 0) {
    drawPipeTexture(
      ctx,
      pipe,
      left,
      -32,
      topEnd,
      seed + 17,
      "top",
      waterLine
    );
    drawCap(ctx, pipe, left, gapTop - pipe.capHeight, "top", seed + 29);
  }

  if (waterLine > gapBottom) {
    drawPipeTexture(
      ctx,
      pipe,
      left,
      bottomStart,
      waterLine + 3,
      seed + 67,
      "bottom",
      waterLine
    );
    drawCap(ctx, pipe, left, gapBottom, "bottom", seed + 71);
  }

  drawVines(ctx, pipe, gapTop, gapBottom, waterLine, seed);

  if (seed % 3 === 0) {
    const plateX = pipe.x + pipe.width * 0.2;
    const plateY = gapBottom + pipe.capHeight + 34;
    ctx.fillStyle = "rgba(20, 40, 31, 0.52)";
    roundRect(ctx, plateX - 11, plateY, 22, 15, 1);
    ctx.fill();
    ctx.strokeStyle = "rgba(216, 186, 132, 0.28)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.strokeStyle = "rgba(224, 199, 153, 0.34)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(plateX - 5 + i * 4, plateY + 4);
      ctx.lineTo(plateX - 5 + i * 4, plateY + 11);
      ctx.stroke();
    }
  }

  if (waterLine > 0) {
    const rippleSeed = mulberry32(seed + 333);
    for (let i = 0; i < 3; i += 1) {
      const x = pipe.x - pipe.capWidth * 0.42 + rippleSeed() * pipe.capWidth * 0.84;
      const y = waterLine + 2 + rippleSeed() * 7;
      ctx.strokeStyle = `rgba(211, 205, 173, ${0.12 - i * 0.02})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y, 10 + i * 9, 1.6 + i * 0.7, 0, 0, TAU);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function makeScarfAtmosphere(ctx, time) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "rgba(246, 223, 182, 0.3)";
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      1.4 + Math.sin(time * 1.2 + i) * 0.4,
      0,
      TAU
    );
    ctx.fill();
  }
  ctx.restore();
}
