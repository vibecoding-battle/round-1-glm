import { AudioEngine } from "./audio.js";
import { Environment, clamp } from "./scene.js";
import { drawBird, drawPipePair } from "./sprites.js";

const WORLD_HEIGHT = 900;
const FIXED_STEP = 1 / 120;
const GRAVITY = 1900;
const FLAP_VELOCITY = -568;
const MAX_FALL_SPEED = 910;
const BIRD_RADIUS = 17;
const PIPE_WIDTH = 112;
const PIPE_CAP_WIDTH = 138;
const PIPE_CAP_HEIGHT = 42;
const BASE_SPEED = 218;
const MAX_SPEED = 302;
const BASE_GAP = 256;
const MIN_GAP = 202;
const STORAGE_BEST = "embruns:best";

const circleRectHit = (cx, cy, radius, x, y, width, height) => {
  const nearX = clamp(cx, x, x + width);
  const nearY = clamp(cy, y, y + height);
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy <= radius * radius;
};

const featherPalette = ["#f1dfb7", "#e8c787", "#dcb06b", "#8b8a68"];

class Embruns {
  constructor() {
    this.el = {
      app: document.getElementById("app"),
      canvas: document.getElementById("flight"),
      soundButton: document.getElementById("soundButton"),
      pauseButton: document.getElementById("pauseButton"),
      hudScore: document.getElementById("hudScore"),
      scoreDisplay: document.getElementById("scoreDisplay"),
      introLayer: document.getElementById("introLayer"),
      playButton: document.getElementById("playButton"),
      introBest: document.getElementById("introBest"),
      pauseLayer: document.getElementById("pauseLayer"),
      resumeButton: document.getElementById("resumeButton"),
      pauseRestartButton: document.getElementById("pauseRestartButton"),
      pauseMenuButton: document.getElementById("pauseMenuButton"),
      resultLayer: document.getElementById("resultLayer"),
      resultDialog: document.querySelector(".dialog--result"),
      resultTitle: document.getElementById("resultTitle"),
      resultNarrative: document.getElementById("resultNarrative"),
      resultScore: document.getElementById("resultScore"),
      resultBest: document.getElementById("resultBest"),
      replayButton: document.getElementById("replayButton"),
      resultMenuButton: document.getElementById("resultMenuButton"),
      flash: document.getElementById("flash"),
      liveRegion: document.getElementById("liveRegion")
    };

    this.ctx = this.el.canvas.getContext("2d", { alpha: false });
    this.audio = new AudioEngine();
    this.reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.reducedMotionQuery.matches;
    this.env = new Environment(this.reducedMotion);

    this.state = "intro";
    this.time = 0;
    this.score = 0;
    this.best = this.loadBest();
    this.bestBefore = this.best;
    this.isNewRecord = false;
    this.pipeSpeed = BASE_SPEED;
    this.pipes = [];
    this.particles = [];
    this.splashes = [];
    this.lastGapY = 0;
    this.deathTimer = 0;
    this.deathCause = null;
    this.shake = { time: 0, duration: 0.4, power: 0 };
    this.accumulator = 0;
    this.lastStamp = null;
    this.scale = 1;
    this.dpr = 1;
    this.worldW = 0;
    this.baseBirdX = 0;
    this.flashTimer = null;

    this.idleY = WORLD_HEIGHT * 0.44;
    this.bird = {
      x: 0,
      y: WORLD_HEIGHT * 0.45,
      vy: 0,
      angle: 0,
      flapAge: 10,
      blinkIn: 2.8,
      blinkAge: 0,
      blink: false,
      opacity: 1,
      inWater: false,
      dead: false
    };

    this.resize();
    this.bindEvents();
    this.syncSoundUI();
    this.updateBestUI();
    this.setLayerVisible(this.el.introLayer, true);
    this.setLayerVisible(this.el.pauseLayer, false);
    this.setLayerVisible(this.el.resultLayer, false);
    this.el.app.dataset.state = "intro";
    this.resetRound(true);
    this.updateTitle();

    if (new URLSearchParams(window.location.search).has("debug")) {
      window.__embruns = this;
    }

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  loadBest() {
    try {
      const value = Number.parseInt(window.localStorage.getItem(STORAGE_BEST), 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      window.localStorage.setItem(STORAGE_BEST, String(this.best));
    } catch {
      // Records are optional when storage is unavailable.
    }
  }

  bindEvents() {
    this.el.app.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const interactive = event.target.closest(
        "button, a, input, textarea, select, [role='button'], [contenteditable='true']"
      );
      if (interactive) return;

      if (this.state === "intro") {
        event.preventDefault();
        this.audio.unlock();
        this.startGame();
      } else if (this.state === "playing") {
        event.preventDefault();
        this.flap();
      }
    });

    this.el.playButton.addEventListener("click", () => {
      this.audio.unlock();
      this.startGame();
    });

    this.el.soundButton.addEventListener("click", () => this.toggleSound());
    this.el.pauseButton.addEventListener("click", () => this.pauseGame());
    this.el.resumeButton.addEventListener("click", () => this.resumeGame());

    this.el.pauseRestartButton.addEventListener("click", () => {
      this.audio.playButton();
      this.startGame();
    });

    this.el.pauseMenuButton.addEventListener("click", () => {
      this.audio.playButton();
      this.returnToMenu();
    });

    this.el.replayButton.addEventListener("click", () => {
      this.audio.playButton();
      this.startGame();
    });

    this.el.resultMenuButton.addEventListener("click", () => {
      this.audio.playButton();
      this.returnToMenu();
    });

    document.addEventListener("keydown", (event) => this.handleKeyDown(event));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pauseGame(true);
    });

    window.addEventListener("blur", () => {
      if (this.state === "playing") this.pauseGame(true);
    });

    window.addEventListener("resize", () => this.resize());

    this.reducedMotionQuery.addEventListener?.("change", (event) => {
      this.reducedMotion = event.matches;
      this.env.setReducedMotion(event.matches);
      this.resize();
    });
  }

  handleKeyDown(event) {
    if (
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }

    if (event.code === "KeyM" && !event.repeat) {
      event.preventDefault();
      this.toggleSound();
      return;
    }

    if (
      event.code === "Tab" &&
      (this.state === "paused" || this.state === "gameover")
    ) {
      this.trapFocus(event);
      return;
    }

    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) {
      if (this.state === "playing" || this.state === "paused") {
        event.preventDefault();
        this.togglePause();
      }
      return;
    }

    if (event.code === "KeyR" && !event.repeat) {
      if (this.state === "paused" || this.state === "gameover") {
        event.preventDefault();
        this.startGame();
      }
      return;
    }

    const isFlightKey =
      event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW";
    if (!isFlightKey || event.repeat) return;

    const active = document.activeElement;
    const onControl =
      active instanceof Element && active.closest("button, a, [role='button']");
    if (onControl) return;

    event.preventDefault();

    if (this.state === "intro") {
      this.audio.unlock();
      this.startGame();
    } else if (this.state === "playing") {
      this.flap();
    } else if (this.state === "paused") {
      this.resumeGame();
    }
  }

  trapFocus(event) {
    const layer =
      this.state === "paused" ? this.el.pauseLayer : this.el.resultLayer;
    const focusables = Array.from(
      layer.querySelectorAll(
        "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
      )
    ).filter((element) => element.offsetParent !== null);

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !layer.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !layer.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  setLayerVisible(layer, visible) {
    layer.classList.toggle("is-visible", visible);
    layer.setAttribute("aria-hidden", visible ? "false" : "true");
    if (visible) {
      layer.removeAttribute("inert");
    } else {
      layer.setAttribute("inert", "");
    }
  }

  hideAllLayers() {
    this.setLayerVisible(this.el.introLayer, false);
    this.setLayerVisible(this.el.pauseLayer, false);
    this.setLayerVisible(this.el.resultLayer, false);
  }

  syncSoundUI() {
    const muted = this.audio.isMuted;
    this.el.app.classList.toggle("is-muted", muted);
    this.el.soundButton.setAttribute(
      "aria-label",
      muted ? "Activer le son" : "Couper le son"
    );
    this.el.soundButton.title = muted ? "Activer le son (M)" : "Couper le son (M)";
  }

  toggleSound() {
    if (this.audio.isMuted) this.audio.unlock();
    this.audio.toggleMuted();
    this.syncSoundUI();

    if (!this.audio.isMuted) {
      this.audio.playButton();
      this.announce("Son activé.");
    } else {
      this.announce("Son coupé.");
    }
  }

  updateBestUI() {
    this.el.introBest.textContent = String(this.best);
    this.el.resultBest.textContent = String(this.best);
  }

  updateTitle() {
    if (this.state === "playing" || this.state === "dying" || this.state === "gameover") {
      document.title = `Embruns — ${this.score} passage${this.score > 1 ? "s" : ""}`;
    } else {
      document.title = "Embruns — Le vol des pertuis";
    }
  }

  announce(message) {
    this.el.liveRegion.textContent = "";
    window.setTimeout(() => {
      this.el.liveRegion.textContent = message;
    }, 40);
  }

  resize() {
    const rect = this.el.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    const physicalWidth = Math.round(cssWidth * this.dpr);
    const physicalHeight = Math.round(cssHeight * this.dpr);

    if (
      this.el.canvas.width !== physicalWidth ||
      this.el.canvas.height !== physicalHeight
    ) {
      this.el.canvas.width = physicalWidth;
      this.el.canvas.height = physicalHeight;
    }

    this.scale = cssHeight / WORLD_HEIGHT;
    this.worldW = cssWidth / this.scale;
    this.baseBirdX = clamp(this.worldW * 0.285, 112, 388);
    this.bird.x = this.baseBirdX;

    this.env.resize(this.worldW, WORLD_HEIGHT);

    if (this.state === "intro") {
      this.bird.y = this.idleY + Math.sin(this.time * 1.45) * 7;
    } else {
      this.bird.y = clamp(this.bird.y, 50, this.env.waterLine - BIRD_RADIUS);
    }

    this.lastGapY = clamp(
      this.lastGapY || this.bird.y,
      BASE_GAP * 0.5 + 100,
      WORLD_HEIGHT - 160
    );
  }

  resetRound(moveBird = false) {
    this.score = 0;
    this.isNewRecord = false;
    this.pipes = [];
    this.particles = [];
    this.splashes = [];
    this.deathTimer = 0;
    this.deathCause = null;
    this.pipeSpeed = BASE_SPEED;
    this.bird.vy = 0;
    this.bird.angle = 0;
    this.bird.opacity = 1;
    this.bird.inWater = false;
    this.bird.dead = false;
    this.bird.flapAge = 10;
    this.bird.blink = false;
    this.bird.blinkAge = 0;
    this.bird.blinkIn = 2.3 + Math.random() * 3;
    this.bird.x = this.baseBirdX;
    this.bird.y = this.idleY + Math.sin(this.time * 1.45) * 7;
    this.lastGapY = this.bird.y;
    this.el.scoreDisplay.textContent = "0";
    this.el.resultDialog.classList.remove("is-record");
    this.el.flash.classList.remove("is-active");
    this.updateTitle();

    if (moveBird) this.bird.y = this.idleY;
  }

  startGame() {
    if (this.state === "dying") return;

    this.audio.unlock();
    this.hideAllLayers();
    this.resetRound();
    this.bird.y = clamp(
      this.bird.y,
      BASE_GAP * 0.5 + 132,
      this.env.waterLine - BASE_GAP * 0.5 - 112
    );
    this.deathTimer = 0;
    this.deathCause = null;
    this.isNewRecord = false;
    this.bestBefore = this.best;
    this.pipes = [];
    this.el.scoreDisplay.textContent = "0";
    this.state = "playing";
    this.el.app.dataset.state = "playing";
    this.audio.setScene("playing");
    this.createInitialPipes();
    this.flap(true);
    this.updateTitle();
    this.el.canvas.focus({ preventScroll: true });
    this.announce(
      "Le vol commence. Appuyez sur Espace, la flèche haut, cliquez ou touchez pour battre des ailes."
    );
  }

  createInitialPipes() {
    const spacing = this.currentSpeed() * 1.86;
    let x = this.bird.x + 585;

    while (x < this.worldW + PIPE_CAP_WIDTH * 3) {
      this.pipes.push(this.createPipe(x));
      x += spacing;
    }

    if (this.pipes.length === 0) {
      this.pipes.push(this.createPipe(this.bird.x + 585));
    }

    this.lastGapY = this.pipes[this.pipes.length - 1].gapY;
  }

  currentSpeed() {
    return Math.min(MAX_SPEED, BASE_SPEED + this.score * 3.6);
  }

  currentGap() {
    return Math.max(MIN_GAP, BASE_GAP - this.score * 2.15);
  }

  createPipe(x) {
    const gap = this.currentGap();
    const waterLine = this.env.waterLine;
    const minCenter = gap * 0.5 + 96;
    const maxCenter = waterLine - 66 - gap * 0.5;
    const maxShift = this.score < 3 ? 128 : 166;
    const previous = this.pipes.length
      ? this.pipes[this.pipes.length - 1].gapY
      : this.bird.y;

    let center;
    if (this.pipes.length === 0) {
      center = clamp(this.bird.y, minCenter, maxCenter);
    } else {
      const shift = (Math.random() * 2 - 1) * maxShift;
      center = clamp(previous + shift, minCenter, maxCenter);
    }

    return {
      x,
      gapY: center,
      gap,
      width: PIPE_WIDTH,
      capWidth: PIPE_CAP_WIDTH,
      capHeight: PIPE_CAP_HEIGHT,
      seed: Math.floor(Math.random() * 1_000_000_000),
      passed: false
    };
  }

  ensurePipes() {
    if (this.state !== "playing") return;

    const spacing = this.currentSpeed() * 1.86;
    const edge = this.worldW + PIPE_CAP_WIDTH * 2.5;

    if (this.pipes.length === 0) {
      this.pipes.push(this.createPipe(this.bird.x + 585));
      return;
    }

    let guard = 0;
    while (this.pipes[this.pipes.length - 1].x < edge && guard < 14) {
      const last = this.pipes[this.pipes.length - 1];
      this.pipes.push(this.createPipe(last.x + spacing));
      guard += 1;
    }
  }

  flap(initial = false) {
    if (this.state !== "playing") return;

    this.bird.vy = FLAP_VELOCITY;
    this.bird.flapAge = 0;
    this.audio.playFlap();
    this.spawnFlapFeathers(initial ? 3 : 2);
  }

  pauseGame(auto = false) {
    if (this.state !== "playing") return;

    this.state = "paused";
    this.el.app.dataset.state = "paused";
    this.audio.setScene("paused");
    this.setLayerVisible(this.el.pauseLayer, true);
    this.announce("Vol en pause.");

    window.setTimeout(
      () => {
        if (this.state === "paused") {
          this.el.resumeButton.focus({ preventScroll: true });
        }
      },
      auto ? 100 : 220
    );
  }

  resumeGame() {
    if (this.state !== "paused") return;

    this.setLayerVisible(this.el.pauseLayer, false);
    this.state = "playing";
    this.el.app.dataset.state = "playing";
    this.audio.setScene("playing");
    this.lastStamp = null;
    this.accumulator = 0;
    this.el.canvas.focus({ preventScroll: true });
    this.announce("Le vol reprend.");
  }

  togglePause() {
    if (this.state === "playing") this.pauseGame();
    else if (this.state === "paused") this.resumeGame();
  }

  returnToMenu() {
    this.hideAllLayers();
    this.resetRound();
    this.state = "intro";
    this.el.app.dataset.state = "intro";
    this.audio.setScene("intro");
    this.updateBestUI();
    this.updateTitle();
    this.setLayerVisible(this.el.introLayer, true);
    this.bird.x = this.baseBirdX;
    this.bird.y = this.idleY;
    this.announce(
      `Retour au rivage. Meilleur vol : ${this.best} passages. Appuyez sur Espace pour repartir.`
    );

    window.setTimeout(() => {
      if (this.state === "intro") {
        this.el.playButton.focus({ preventScroll: true });
      }
    }, 420);
  }

  updateBlink(dt) {
    if (this.bird.blink) {
      this.bird.blinkAge += dt;
      if (this.bird.blinkAge >= 0.14) {
        this.bird.blink = false;
        this.bird.blinkAge = 0;
      }
      return;
    }

    this.bird.blinkIn -= dt;
    if (this.bird.blinkIn <= 0) {
      this.bird.blink = true;
      this.bird.blinkAge = 0;
      this.bird.blinkIn = 2.4 + Math.random() * 3.4;
    }
  }

  updateGame(dt) {
    this.bird.flapAge += dt;

    if (this.state === "playing") {
      this.updatePlayingStep(dt);
    } else if (this.state === "dying") {
      this.updateDyingStep(dt);
    }
  }

  updatePlayingStep(dt) {
    this.pipeSpeed += (this.currentSpeed() - this.pipeSpeed) * Math.min(1, dt * 2.2);

    this.bird.vy = Math.min(
      MAX_FALL_SPEED,
      this.bird.vy + GRAVITY * dt
    );
    this.bird.y += this.bird.vy * dt;

    if (this.bird.y < BIRD_RADIUS + 8) {
      this.bird.y = BIRD_RADIUS + 8;
      this.bird.vy = Math.max(0, this.bird.vy);
    }

    const targetAngle = clamp(this.bird.vy / 780, -0.48, 1.12);
    this.bird.angle += (targetAngle - this.bird.angle) * Math.min(1, dt * 9);

    for (const pipe of this.pipes) {
      pipe.x -= this.pipeSpeed * dt;
    }

    if (
      this.bird.y + BIRD_RADIUS * 0.72 >= this.env.waterLine
    ) {
      this.killBird("water");
      return;
    }

    if (this.checkPipeCollision()) {
      this.killBird("pipe");
      return;
    }

    for (const pipe of this.pipes) {
      if (!pipe.passed && pipe.x + pipe.width * 0.5 < this.bird.x - BIRD_RADIUS * 0.5) {
        pipe.passed = true;
        this.addScore();
      }
    }

    this.pipes = this.pipes.filter(
      (pipe) => pipe.x + pipe.capWidth * 0.5 > -64
    );

    this.ensurePipes();
  }

  checkPipeCollision() {
    const radius = BIRD_RADIUS * 0.78;
    const bx = this.bird.x;
    const by = this.bird.y;

    for (const pipe of this.pipes) {
      if (
        pipe.x + pipe.capWidth * 0.5 < bx - radius ||
        pipe.x - pipe.capWidth * 0.5 > bx + radius
      ) {
        continue;
      }

      const gapTop = pipe.gapY - pipe.gap * 0.5;
      const gapBottom = pipe.gapY + pipe.gap * 0.5;
      const bodyLeft = pipe.x - pipe.width * 0.5;
      const capLeft = pipe.x - pipe.capWidth * 0.5;

      if (
        circleRectHit(
          bx,
          by,
          radius,
          bodyLeft,
          -40,
          pipe.width,
          gapTop - pipe.capHeight + 42
        ) ||
        circleRectHit(
          bx,
          by,
          radius,
          capLeft,
          gapTop - pipe.capHeight,
          pipe.capWidth,
          pipe.capHeight
        ) ||
        circleRectHit(
          bx,
          by,
          radius,
          bodyLeft,
          gapBottom + pipe.capHeight - 2,
          pipe.width,
          this.env.waterLine - gapBottom - pipe.capHeight + 2
        ) ||
        circleRectHit(
          bx,
          by,
          radius,
          capLeft,
          gapBottom,
          pipe.capWidth,
          pipe.capHeight
        )
      ) {
        return true;
      }
    }

    return false;
  }

  addScore() {
    this.score += 1;
    this.el.scoreDisplay.textContent = String(this.score);

    this.el.scoreDisplay.classList.remove("is-popping");
    void this.el.scoreDisplay.offsetWidth;
    this.el.scoreDisplay.classList.add("is-popping");
    window.clearTimeout(this.scorePopTimer);
    this.scorePopTimer = window.setTimeout(() => {
      this.el.scoreDisplay.classList.remove("is-popping");
    }, 460);

    if (this.score > this.best) {
      this.best = this.score;
      this.saveBest();
      this.updateBestUI();
    }

    this.isNewRecord = this.score > this.bestBefore;
    this.audio.playScore(this.score);
    this.updateTitle();

    if (this.score === 1 || this.score % 5 === 0) {
      this.announce(`${this.score} passage${this.score > 1 ? "s" : ""}.`);
    }
  }

  killBird(cause) {
    if (this.state !== "playing") return;

    this.state = "dying";
    this.el.app.dataset.state = "dying";
    this.audio.setScene("dying");
    this.bird.dead = true;
    this.deathCause = cause;
    this.deathTimer = 0;

    if (cause === "water") {
      this.bird.inWater = true;
      this.bird.y = Math.min(
        this.bird.y,
        this.env.waterLine - BIRD_RADIUS * 0.35
      );
      this.bird.vy = Math.min(this.bird.vy, 160);
      this.audio.playSplash();
      this.triggerSplash(this.bird.x, 1.15);
      this.burstFeathers(this.bird.x, this.bird.y, 10);
    } else {
      this.bird.vy = -225;
      this.audio.playHit("pipe");
      this.triggerShake(9, 0.52);
      this.flashHit();
      this.burstFeathers(this.bird.x + 8, this.bird.y, 7);
    }

    this.updateTitle();
    this.announce(
      cause === "water"
        ? "L'oiseau touche l'eau. Le vol se termine."
        : "L'oiseau heurte un pertuis. Le vol se termine."
    );
  }

  updateDyingStep(dt) {
    this.deathTimer += dt;

    if (!this.bird.inWater) {
      this.bird.vy = Math.min(
        MAX_FALL_SPEED,
        this.bird.vy + GRAVITY * 1.08 * dt
      );
      this.bird.y += this.bird.vy * dt;
      const targetAngle = clamp(this.bird.vy / 640, 0.35, 1.35);
      this.bird.angle += (targetAngle - this.bird.angle) * Math.min(1, dt * 5.5);

      if (this.bird.y + BIRD_RADIUS * 0.7 >= this.env.waterLine) {
        this.bird.y = this.env.waterLine - BIRD_RADIUS * 0.35;
        this.bird.inWater = true;
        this.audio.playSplash();
        this.triggerSplash(this.bird.x, 0.92);
        this.burstFeathers(this.bird.x, this.bird.y, 5);
        this.triggerShake(4, 0.34);
      }
    } else {
      this.bird.y += 29 * dt;
      this.bird.angle += (0.38 - this.bird.angle) * Math.min(1, dt * 2.2);
      if (this.deathTimer > 0.52) {
        this.bird.opacity = clamp(1 - (this.deathTimer - 0.52) * 0.7, 0, 1);
      }
    }

    const threshold = this.deathCause === "water" ? 1.28 : 1.82;
    if (this.deathTimer >= threshold) {
      this.showResult();
    }
  }

  showResult() {
    if (this.state === "gameover") return;

    this.state = "gameover";
    this.el.app.dataset.state = "gameover";
    this.audio.setScene("gameover");
    this.el.flash.classList.remove("is-active");

    this.isNewRecord = this.score > 0 && this.score > this.bestBefore;
    if (this.isNewRecord) this.best = this.score;
    if (this.score > this.best) this.best = this.score;
    this.saveBest();
    this.updateBestUI();

    this.el.resultScore.textContent = String(this.score);
    this.el.resultBest.textContent = String(this.best);
    this.el.resultDialog.classList.toggle("is-record", this.isNewRecord);

    let title;
    let narrative;

    if (this.isNewRecord) {
      title = "Le pertuis s'incline.";
      narrative =
        this.score >= 12
          ? `Un vol de ${this.score} passages. La brume elle-même semble retenir votre nom.`
          : `Un vol de ${this.score} passages. Pour la première fois, le rivage garde votre trace.`;
    } else if (this.score === 0) {
      title =
        this.deathCause === "water"
          ? "La marée a le dernier mot."
          : "Le pertuis ne pardonne pas.";
      narrative =
        "L'aile s'est posée trop tôt. Le vent, lui, n'a pas dit son dernier mot.";
    } else if (this.score < 4) {
      title = "La marée a le dernier mot.";
      narrative = `Un vol bref, ${this.score} passage${this.score > 1 ? "s" : ""} arraché${this.score > 1 ? "s" : ""} à la brume. Le rivage s'en souviendra.`;
    } else if (this.score < 10) {
      title = "Le rivage vous a vu passer.";
      narrative = `${this.score} passages entre les pertuis. L'estuaire garde encore un peu de votre sillage.`;
    } else {
      title = "L'estuaire se souvient.";
      narrative = `${this.score} passages. Les roseaux ont plié, l'eau a tremblé, et la lumière vous a suivi.`;
    }

    this.el.resultTitle.textContent = title;
    this.el.resultNarrative.textContent = narrative;
    this.setLayerVisible(this.el.resultLayer, true);
    this.updateTitle();

    this.announce(
      `Fin du vol. ${this.score} passage${this.score > 1 ? "s" : ""}. Meilleur vol : ${this.best}. ${this.isNewRecord ? "Nouveau record." : ""}`
    );

    if (this.isNewRecord) {
      window.setTimeout(() => this.audio.playNewRecord(), 320);
    }

    window.setTimeout(() => {
      if (this.state === "gameover") {
        this.el.replayButton.focus({ preventScroll: true });
      }
    }, 480);
  }

  triggerShake(power, duration) {
    if (this.reducedMotion) return;
    this.shake.power = Math.max(this.shake.power, power);
    this.shake.duration = duration;
    this.shake.time = 0;
  }

  updateShake(dt) {
    if (this.shake.time < this.shake.duration) {
      this.shake.time = Math.min(this.shake.duration, this.shake.time + dt);
    }
  }

  shakeOffset() {
    if (this.reducedMotion || this.shake.time >= this.shake.duration) {
      return { x: 0, y: 0 };
    }

    const decay = 1 - this.shake.time / this.shake.duration;
    const power = this.shake.power * decay * decay;
    return {
      x: Math.sin(this.shake.time * 73) * power,
      y: Math.cos(this.shake.time * 57) * power * 0.62
    };
  }

  flashHit() {
    if (this.reducedMotion) return;
    this.el.flash.classList.remove("is-active");
    void this.el.flash.offsetWidth;
    this.el.flash.classList.add("is-active");
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => {
      this.el.flash.classList.remove("is-active");
    }, 560);
  }

  spawnFeather(x, y, speed) {
    const palette = featherPalette;
    this.particles.push({
      type: "feather",
      x,
      y,
      vx: (Math.random() - 0.5) * speed - 28,
      vy: (Math.random() - 0.7) * speed * 0.62,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 9,
      size: 2.2 + Math.random() * 3.6,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 0.7 + Math.random() * 0.65,
      maxLife: 1.35,
      sway: Math.random() * Math.PI * 2
    });
  }

  spawnFlapFeathers(count) {
    const amount = this.reducedMotion ? Math.min(1, count) : count;
    for (let i = 0; i < amount; i += 1) {
      this.spawnFeather(
        this.bird.x - 24 + Math.random() * 12,
        this.bird.y + (Math.random() - 0.5) * 18,
        64
      );
    }
  }

  burstFeathers(x, y, count) {
    const amount = this.reducedMotion ? Math.ceil(count * 0.35) : count;
    for (let i = 0; i < amount; i += 1) {
      this.spawnFeather(
        x + (Math.random() - 0.5) * 18,
        y + (Math.random() - 0.5) * 16,
        190
      );
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.vy += 112 * dt;
      particle.vx *= 1 - Math.min(0.96, dt * 1.7);
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.angle += particle.spin * dt;
      particle.sway += dt * 3;
      particle.x += Math.sin(particle.sway) * 10 * dt;
    }

    this.particles = this.particles.filter(
      (particle) =>
        particle.life > 0 &&
        particle.y < this.env.waterLine + 10 &&
        particle.x > -30 &&
        particle.x < this.worldW + 30
    );

    if (this.particles.length > 90) {
      this.particles.splice(0, this.particles.length - 90);
    }
  }

  triggerSplash(x, strength = 1) {
    const life = 0.82 + strength * 0.24;
    const dropCount = this.reducedMotion ? 8 : Math.round(19 * strength);
    const drops = Array.from({ length: dropCount }, () => {
      const angle = -Math.PI * (0.16 + Math.random() * 0.68);
      const speed = (55 + Math.random() * 160) * strength;
      return {
        x: x + (Math.random() - 0.5) * 24,
        y: this.env.waterLine + 2,
        vx: Math.cos(angle) * speed * 0.72,
        vy: Math.sin(angle) * speed,
        radius: 0.8 + Math.random() * 2.2,
        life: 0.34 + Math.random() * 0.52,
        maxLife: 0.86
      };
    });

    this.splashes.push({
      x,
      life,
      maxLife: life,
      rings: [
        { delay: 0, scale: 1, alpha: 0.62, offset: 1 },
        { delay: 0.16, scale: 0.74, alpha: 0.4, offset: 3 },
        { delay: 0.32, scale: 0.5, alpha: 0.26, offset: 5 }
      ],
      drops
    });

    if (this.splashes.length > 4) this.splashes.shift();
  }

  updateSplashes(dt) {
    for (const splash of this.splashes) {
      splash.life -= dt;
      for (const drop of splash.drops) {
        drop.life -= dt;
        drop.vy += 520 * dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
      }
    }

    this.splashes = this.splashes.filter(
      (splash) =>
        splash.life > 0 &&
        splash.drops.some((drop) => drop.life > 0)
    );
  }

  render() {
    const ctx = this.ctx;
    const canvas = this.el.canvas;
    const cssWidth = canvas.width / this.dpr;
    const cssHeight = canvas.height / this.dpr;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#0a2321";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.imageSmoothingEnabled = true;

    ctx.save();
    ctx.scale(this.scale, this.scale);
    const shake = this.shakeOffset();
    ctx.translate(shake.x, shake.y);

    this.env.drawBackdrop(
      ctx,
      this.worldW,
      WORLD_HEIGHT,
      this.pipes,
      this.state
    );

    for (const pipe of this.pipes) {
      drawPipePair(ctx, pipe, this.env.waterLine, this.time);
    }

    this.env.drawBirdShadow(ctx, this.bird, this.worldW, WORLD_HEIGHT);
    drawBird(ctx, this.bird, this.time);

    for (const splash of this.splashes) {
      this.env.drawSplash(ctx, splash);
    }

    this.drawFeathers(ctx);
    this.env.drawMotes(ctx, this.worldW, WORLD_HEIGHT);
    this.env.drawForeground(ctx, this.worldW, WORLD_HEIGHT);

    ctx.restore();
  }

  drawFeathers(ctx) {
    ctx.save();

    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle);
      ctx.fillStyle = particle.color;

      const size = particle.size;
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.7);
      ctx.bezierCurveTo(
        size * 1.1,
        -size * 0.8,
        size * 0.9,
        size * 0.9,
        0,
        size * 1.7
      );
      ctx.bezierCurveTo(
        -size * 0.7,
        size * 0.7,
        -size * 0.9,
        -size * 0.7,
        0,
        -size * 1.7
      );
      ctx.fill();

      ctx.strokeStyle = "rgba(68, 59, 39, 0.35)";
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.65);
      ctx.lineTo(0, size * 1.6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  update(dt) {
    this.time += dt;
    this.updateBlink(dt);

    let ambientSpeed = 0;
    if (this.state === "intro") ambientSpeed = 18;
    else if (this.state === "playing") ambientSpeed = this.pipeSpeed;
    else if (this.state === "dying" || this.state === "gameover") {
      ambientSpeed = 5;
    }

    this.env.update(dt, ambientSpeed);

    if (this.state === "intro") {
      this.bird.y = this.idleY + Math.sin(this.time * 1.45) * 7;
      this.bird.angle += (Math.sin(this.time * 0.9) * 0.035 - this.bird.angle) * Math.min(1, dt * 3);
      this.bird.opacity = 1;
      this.accumulator = 0;
    } else if (this.state === "playing" || this.state === "dying") {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < 10) {
        if (this.state !== "playing" && this.state !== "dying") break;
        this.updateGame(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
        steps += 1;
      }
      if (steps === 10) this.accumulator = 0;
    } else {
      this.accumulator = 0;
    }

    if (this.state !== "paused") {
      this.updateParticles(dt);
      this.updateSplashes(dt);
      this.updateShake(dt);
    }
  }

  loop(stamp) {
    if (this.lastStamp === null) this.lastStamp = stamp;
    const dt = Math.min(0.1, Math.max(0, (stamp - this.lastStamp) / 1000));
    this.lastStamp = stamp;

    this.update(dt);
    this.render();

    this.raf = requestAnimationFrame(this.loop);
  }
}

const game = new Embruns();

