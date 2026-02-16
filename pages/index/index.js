const STORAGE_BEST_SCORE_KEY = "qujing_best_score";
const PENGUIN_STYLE_UPDATE_INTERVAL_MS = 16;
const PENGUIN_FOLLOW_EXTRA_SPEED = 0.7;
const PENGUIN_FOLLOW_MIN_SPEED = 2.2;
const PENGUIN_HORIZONTAL_BOOST = 1.2;
const ROAD_TONE_COUNT = 6;
const ROAD_PATTERN_COUNT = 6;
const BGM_SRC =
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=calm-ambient-11157.mp3";

Page({
  data: {
    gameState: "ready", // ready | playing | gameover
    score: 0,
    bestScore: 0,
    combo: 0,
    multiplier: 1,
    finalScore: 0,
    renderRows: [],
    snowflakes: [],
    scoreFloat: null,
    controlsDisabled: true,
    boardOffsetPercent: Number(((-100 / 14).toFixed(3))),
    penguinClass: "face-right motion-idle",
    penguinStyle: "left: 50%; top: 50%;",
    bgmEnabled: true,
  },

  onLoad() {
    this.gridCols = 9;
    this.gridRows = 14;
    this.safeBottomLine = this.gridRows - 1.2;
    this.bufferRows = 6;
    this.loopTimer = null;
    this.scoreFloatTimer = null;
    this.penguinMotionTimer = null;

    this.lastTickAt = 0;
    this.elapsedMs = 0;
    this.scrollAccumulator = 0;
    this.autoJumpElapsedMs = 0;
    this.penguinX = Math.floor(this.gridCols / 2);
    this.penguinY = Math.floor(this.gridRows * 0.65);
    this.renderPenguinX = this.penguinX;
    this.renderPenguinY = this.penguinY;
    this.penguinFacing = "right";
    this.penguinMotion = "idle";
    this.currentScrollSpeed = 1.8;

    this.roadRows = [];
    this.renderRowsCache = [];
    this.topRoadCenter = Math.floor(this.gridCols / 2);
    this.lastOffsetPercent = -1;
    this.lastPenguinClass = "";
    this.lastPenguinStyle = "";
    this.lastPenguinStyleSetAt = 0;
    this.penguinStyleUpdateIntervalMs = PENGUIN_STYLE_UPDATE_INTERVAL_MS;
    this.roadRowIdSeed = 1;
    this.bgm = null;

    const bestScore = wx.getStorageSync(STORAGE_BEST_SCORE_KEY) || 0;
    this.setData({
      bestScore,
      snowflakes: this.createSnowflakes(18),
    });
    this.initBgm();
    this.resetRound("ready");
  },

  onUnload() {
    this.stopLoop();
    this.stopBgm();
    this.destroyBgm();
    this.clearScoreFloatTimer();
    this.clearPenguinMotionTimer();
  },

  onShow() {
    if (this.data.gameState === "playing" && this.data.bgmEnabled) {
      this.playBgm();
    }
  },

  onHide() {
    this.stopBgm();
    if (this.data.gameState === "playing") {
      this.gameOver();
    }
  },

  onShareAppMessage() {
    const score = this.data.gameState === "gameover" ? this.data.finalScore : this.data.score;
    return {
      title: `我在《曲径》里跑了 ${score} 分，来挑战我！`,
      path: "/pages/index/index",
    };
  },

  startGame() {
    if (this.data.gameState === "playing") {
      return;
    }
    this.resetRound("playing");
    this.startLoop();
    this.playBgm();
  },

  restartGame() {
    this.startGame();
  },

  handleMoveLeft() {
    this.handlePlayerMove(-1);
  },

  handleMoveRight() {
    this.handlePlayerMove(1);
  },

  handlePlayerMove(delta) {
    if (this.data.gameState !== "playing") {
      return;
    }
    const nextX = Math.max(0, Math.min(this.gridCols - 1, this.penguinX + delta));
    if (nextX === this.penguinX) {
      return;
    }
    this.penguinX = nextX;
    this.penguinFacing = delta < 0 ? "left" : "right";
    this.setPenguinMotion(delta < 0 ? "left" : "right");
    this.setData({
      combo: 0,
      multiplier: 1,
    });
    this.updateFrameVisual(true);
  },

  resetRound(nextState) {
    this.stopLoop();
    this.clearScoreFloatTimer();
    this.clearPenguinMotionTimer();
    this.elapsedMs = 0;
    this.scrollAccumulator = 0;
    this.autoJumpElapsedMs = 0;
    this.penguinX = Math.floor(this.gridCols / 2);
    this.penguinY = Math.floor(this.gridRows * 0.65);
    this.renderPenguinX = this.penguinX;
    this.renderPenguinY = this.penguinY;
    this.penguinFacing = "right";
    this.penguinMotion = "idle";
    this.currentScrollSpeed = 1.8;
    this.topRoadCenter = Math.floor(this.gridCols / 2);
    this.roadRows = this.createInitialRoadRows(this.gridRows + this.bufferRows);
    this.renderRowsCache = this.roadRows.slice(0, this.gridRows + 1).map((row) => this.toRenderRow(row));
    this.lastPenguinStyleSetAt = 0;

    this.setData({
      gameState: nextState,
      score: 0,
      combo: 0,
      multiplier: 1,
      finalScore: 0,
      scoreFloat: null,
      controlsDisabled: nextState !== "playing",
      boardOffsetPercent: Number(((-100 / this.gridRows).toFixed(3))),
      penguinClass: "face-right motion-idle",
      penguinStyle: "left: 50%; top: 50%;",
      renderRows: this.renderRowsCache,
    });
    this.updateFrameVisual(true);
    this.updatePenguinClass(true);
  },

  startLoop() {
    this.stopLoop();
    this.lastTickAt = Date.now();
    this.loopTimer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(40, now - this.lastTickAt);
      this.lastTickAt = now;
      this.tick(dt);
    }, 16);
  },

  stopLoop() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  },

  tick(dt) {
    if (this.data.gameState !== "playing") {
      return;
    }

    this.elapsedMs += dt;
    const difficulty = this.getDifficulty(this.elapsedMs / 1000);
    this.currentScrollSpeed = difficulty.scrollSpeed;

    let roadShifted = false;

    this.scrollAccumulator += (difficulty.scrollSpeed * dt) / 1000;
    while (this.scrollAccumulator >= 1) {
      this.scrollAccumulator -= 1;
      this.shiftRoadDownOneRow();
      this.penguinY += 1;
      roadShifted = true;
    }

    this.autoJumpElapsedMs += dt;
    if (this.autoJumpElapsedMs >= difficulty.autoJumpIntervalMs) {
      this.autoJumpElapsedMs = 0;
      if (this.canAutoForward()) {
        this.penguinY -= 1;
        this.setPenguinMotion("forward");
        this.gainScore();
      } else {
        this.setPenguinMotion("blocked");
      }
    }

    if (this.penguinY >= this.safeBottomLine) {
      this.gameOver();
      return;
    }

    let frameExtraData = null;
    if (roadShifted) {
      this.syncRenderRows();
      frameExtraData = {
        renderRows: this.renderRowsCache,
      };
    }
    this.updatePenguinRender(dt);
    this.updateFrameVisual(false, frameExtraData);
  },

  gameOver() {
    if (this.data.gameState === "gameover") {
      return;
    }
    this.stopLoop();
    this.stopBgm();
    this.setPenguinMotion("fall");
    const finalScore = this.data.score;
    const bestScore = Math.max(this.data.bestScore, finalScore);
    if (bestScore > this.data.bestScore) {
      wx.setStorageSync(STORAGE_BEST_SCORE_KEY, bestScore);
    }
    this.setData({
      gameState: "gameover",
      finalScore,
      bestScore,
      controlsDisabled: true,
    });
  },

  gainScore() {
    const nextCombo = this.data.combo + 1;
    const nextMultiplier = Math.min(9, 1 + Math.floor(nextCombo / 6));
    const deltaScore = nextMultiplier;
    const nextScore = this.data.score + deltaScore;

    this.setData({
      combo: nextCombo,
      multiplier: nextMultiplier,
      score: nextScore,
      scoreFloat: {
        id: Date.now(),
        text: `+${deltaScore}`,
      },
    });
    this.clearScoreFloatTimer();
    this.scoreFloatTimer = setTimeout(() => {
      this.setData({ scoreFloat: null });
      this.scoreFloatTimer = null;
    }, 700);
  },

  clearScoreFloatTimer() {
    if (this.scoreFloatTimer) {
      clearTimeout(this.scoreFloatTimer);
      this.scoreFloatTimer = null;
    }
  },

  setPenguinMotion(motion) {
    this.clearPenguinMotionTimer();
    this.penguinMotion = motion;
    this.updatePenguinClass(false);
    if (motion === "fall") {
      return;
    }
    const motionDuration = motion === "blocked" ? 160 : 220;
    this.penguinMotionTimer = setTimeout(() => {
      this.penguinMotion = "idle";
      this.updatePenguinClass(false);
      this.penguinMotionTimer = null;
    }, motionDuration);
  },

  clearPenguinMotionTimer() {
    if (this.penguinMotionTimer) {
      clearTimeout(this.penguinMotionTimer);
      this.penguinMotionTimer = null;
    }
  },

  initBgm() {
    if (this.bgm) {
      return;
    }
    const bgm = wx.createInnerAudioContext();
    bgm.src = BGM_SRC;
    bgm.loop = true;
    bgm.volume = 0.35;
    bgm.obeyMuteSwitch = false;
    this.bgm = bgm;
  },

  playBgm() {
    if (!this.data.bgmEnabled) {
      return;
    }
    if (!this.bgm) {
      this.initBgm();
    }
    try {
      this.bgm.play();
    } catch (error) {
      // Keep game flow smooth if audio fails on specific devices.
    }
  },

  stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
    }
  },

  destroyBgm() {
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }
  },

  toggleBgm() {
    const nextEnabled = !this.data.bgmEnabled;
    this.setData({ bgmEnabled: nextEnabled });
    if (!nextEnabled) {
      this.stopBgm();
      return;
    }
    if (this.data.gameState === "playing") {
      this.playBgm();
    }
  },

  canAutoForward() {
    // After introducing one hidden top buffer row, the visible row mapping
    // shifts by +1 in roadRows, so the front cell is at floor(penguinY).
    const frontRow = Math.floor(this.penguinY);
    if (frontRow < 0 || frontRow >= this.roadRows.length) {
      return false;
    }
    return Boolean(this.roadRows[frontRow].cells[this.penguinX]);
  },

  getDifficulty(seconds) {
    if (seconds < 30) {
      return {
        scrollSpeed: 1.8,
        bendChance: 0.2,
        width: 3,
        autoJumpIntervalMs: 300,
      };
    }
    if (seconds < 60) {
      return {
        scrollSpeed: 2.4,
        bendChance: 0.38,
        width: 3,
        autoJumpIntervalMs: 260,
      };
    }
    if (seconds < 120) {
      return {
        scrollSpeed: 3.1,
        bendChance: 0.62,
        width: Math.random() < 0.5 ? 2 : 3,
        autoJumpIntervalMs: 220,
      };
    }
    return {
      scrollSpeed: 3.9,
      bendChance: 0.84,
      width: 2,
      autoJumpIntervalMs: 180,
    };
  },

  createInitialRoadRows(totalRows) {
    const rows = [];
    const baseWidth = 3;
    let center = this.topRoadCenter;
    for (let i = 0; i < totalRows; i += 1) {
      if (i > 0) {
        center = this.getNextCenter(center, 0.2, baseWidth);
      }
      rows.push(this.createRoadRow(center, baseWidth));
    }
    this.topRoadCenter = rows[0].center;
    return rows;
  },

  shiftRoadDownOneRow() {
    this.roadRows.pop();
    const difficulty = this.getDifficulty(this.elapsedMs / 1000);
    const nextCenter = this.getNextCenter(this.topRoadCenter, difficulty.bendChance, difficulty.width);
    const newTop = this.createRoadRow(nextCenter, difficulty.width);
    this.topRoadCenter = nextCenter;
    this.roadRows.unshift(newTop);
  },

  getNextCenter(prevCenter, bendChance, width) {
    let offset = 0;
    if (Math.random() < bendChance) {
      offset = Math.random() < 0.5 ? -1 : 1;
    }
    const half = Math.floor((width - 1) / 2);
    const minCenter = Math.max(half, 1);
    const maxCenter = Math.min(this.gridCols - 1 - half, this.gridCols - 2);
    return Math.max(minCenter, Math.min(maxCenter, prevCenter + offset));
  },

  createRoadRow(center, width) {
    const cells = new Array(this.gridCols).fill(false);
    const tones = new Array(this.gridCols).fill("");
    const patterns = new Array(this.gridCols).fill("");
    const start = Math.max(0, center - Math.floor(width / 2));
    const end = Math.min(this.gridCols - 1, start + width - 1);
    for (let i = start; i <= end; i += 1) {
      cells[i] = true;
      tones[i] = this.getRandomRoadToneClass();
      patterns[i] = this.getRandomRoadPatternClass();
    }
    return {
      id: `r${this.roadRowIdSeed++}`,
      center,
      width,
      cells,
      tones,
      patterns,
    };
  },

  getRandomRoadToneClass() {
    return `road-tone-${Math.floor(Math.random() * ROAD_TONE_COUNT)}`;
  },

  getRandomRoadPatternClass() {
    return `road-pattern-${Math.floor(Math.random() * ROAD_PATTERN_COUNT)}`;
  },

  createSnowflakes(count) {
    const list = [];
    for (let i = 0; i < count; i += 1) {
      list.push({
        id: i,
        left: `${Math.round(Math.random() * 100)}%`,
        size: `${6 + Math.round(Math.random() * 8)}rpx`,
        opacity: (0.25 + Math.random() * 0.55).toFixed(2),
        duration: `${5 + Math.round(Math.random() * 8)}s`,
        delay: `${Math.round(Math.random() * 5)}s`,
      });
    }
    return list;
  },

  toRenderRow(road) {
    return {
      id: road.id,
      cells: road.cells.map((hasRoad, col) => ({
        id: `c${col}`,
        hasRoad,
        toneClass: hasRoad ? road.tones[col] : "",
        patternClass: hasRoad ? road.patterns[col] : "",
      })),
    };
  },

  syncRenderRows() {
    if (this.renderRowsCache.length === 0) {
      this.renderRowsCache = this.roadRows.slice(0, this.gridRows + 1).map((row) => this.toRenderRow(row));
    } else {
      this.renderRowsCache.pop();
      this.renderRowsCache.unshift(this.toRenderRow(this.roadRows[0]));
    }
  },

  updatePenguinRender(dt) {
    const followSpeed = Math.max(PENGUIN_FOLLOW_MIN_SPEED, this.currentScrollSpeed + PENGUIN_FOLLOW_EXTRA_SPEED);
    const maxStepY = (followSpeed * dt) / 1000;
    const maxStepX = (followSpeed * PENGUIN_HORIZONTAL_BOOST * dt) / 1000;
    this.renderPenguinX = this.moveTowards(this.renderPenguinX, this.penguinX, maxStepX);
    this.renderPenguinY = this.moveTowards(this.renderPenguinY, this.penguinY, maxStepY);
  },

  moveTowards(current, target, maxDelta) {
    const delta = target - current;
    if (Math.abs(delta) <= maxDelta) {
      return target;
    }
    return current + Math.sign(delta) * maxDelta;
  },

  updateFrameVisual(force, extraData) {
    const now = Date.now();
    const offsetPercent = ((this.scrollAccumulator - 1) * 100) / this.gridRows;
    const penguinXPercent = ((this.renderPenguinX + 0.5) * 100) / this.gridCols;
    const penguinYPercent = ((this.renderPenguinY + this.scrollAccumulator + 0.5) * 100) / this.gridRows;
    const penguinStyle = `left: ${penguinXPercent.toFixed(2)}%; top: ${penguinYPercent.toFixed(2)}%;`;
    const shouldUpdateOffset = force || Math.abs(offsetPercent - this.lastOffsetPercent) >= 0.02;
    const penguinStyleChanged = force || penguinStyle !== this.lastPenguinStyle;
    const penguinUpdateThrottled =
      !force && penguinStyleChanged && now - this.lastPenguinStyleSetAt < this.penguinStyleUpdateIntervalMs;
    const shouldUpdatePenguinStyle = penguinStyleChanged && !penguinUpdateThrottled;

    const hasExtraData = Boolean(extraData && Object.keys(extraData).length > 0);
    if (!hasExtraData && !shouldUpdateOffset && !shouldUpdatePenguinStyle) {
      return;
    }

    this.lastOffsetPercent = offsetPercent;

    const updateData = {};
    if (shouldUpdateOffset) {
      updateData.boardOffsetPercent = Number(offsetPercent.toFixed(3));
    }
    if (shouldUpdatePenguinStyle) {
      this.lastPenguinStyle = penguinStyle;
      this.lastPenguinStyleSetAt = now;
      updateData.penguinStyle = penguinStyle;
    }
    if (hasExtraData) {
      Object.assign(updateData, extraData);
    }
    this.setData(updateData);
  },

  updatePenguinClass(force) {
    const nextClass = `face-${this.penguinFacing} motion-${this.penguinMotion}`;
    if (!force && nextClass === this.lastPenguinClass) {
      return;
    }
    this.lastPenguinClass = nextClass;
    this.setData({
      penguinClass: nextClass,
    });
  },
});
