const STORAGE_BEST_SCORE_KEY = "qujing_best_score";
const STORAGE_LEADERBOARD_KEY = "qujing_leaderboard";
const LEADERBOARD_LIMIT = 20;
const RABBIT_STYLE_UPDATE_INTERVAL_MS = 16;
const RABBIT_SPRING_STIFFNESS_X = 220;
const RABBIT_SPRING_DAMPING_X = 24;
const RABBIT_SPRING_STIFFNESS_Y = 280;
const RABBIT_SPRING_DAMPING_Y = 28;
const RABBIT_SPRING_SNAP_DISTANCE = 0.008;
const RABBIT_SPRING_SNAP_SPEED = 0.05;
const RABBIT_MOVE_INPUT_DEBOUNCE_MS = 80;
const RABBIT_FORWARD_MOVE_DURATION_MS = 170;
const RABBIT_BLOCKED_BUMP_DISTANCE = 0.32;
const RABBIT_BLOCKED_BUMP_UP_MS = 90;
const RABBIT_BLOCKED_BUMP_DOWN_MS = 120;
const RABBIT_MAX_STEP_X_PER_TICK = 0.42;
const RABBIT_MAX_STEP_Y_PER_TICK = 0.34;
const RABBIT_MAX_UP_STEP_PER_TICK = 0.3;
const RABBIT_AUTO_JUMP_SETTLE_THRESHOLD = 0.12;
const RABBIT_SPEED_ANCHOR_Y = 0.25;
const RABBIT_SPEED_RATIO_AT_ANCHOR = 2;
const RABBIT_SPEED_RATIO_AT_BOTTOM = 2;
const RABBIT_TOP_LIMIT_RATIO = 0.25;
const RABBIT_AUTO_JUMP_RATIO_AT_BOTTOM = 2;
const ROAD_TONE_COUNT = 6;
const ROAD_PATTERN_COUNT = 40;
const GRID_CELL_SCALE = 1.75;
const BASE_GRID_COLS = 9;
const ENCOURAGE_SHOW_MS = 1800;
const ENCOURAGE_STEP_SCORE = 50;
const ENCOURAGE_TAGS = ["不错哦", "好棒呀", "太强啦", "冲鸭", "继续保持", "状态火热"];
const ENCOURAGE_LINES = [
  "你已经找到节奏啦，保持这个状态！",
  "手感很顺，下一段会更精彩。",
  "节奏拿捏得很好，继续冲呀。",
  "这波操作很丝滑，太会跑啦！",
  "你已经进入高手区间，继续稳住！",
  "太厉害了，分数涨得飞快。",
  "路线判断非常准，像开了挂一样稳。",
  "节奏和反应都在线，真的很强。",
  "这个分数很能打，继续创造纪录！",
];
const UI_FLAME_START_SCORE = 10;
const UI_FLAME_MAX_SCORE = 100;
const COUNTDOWN_START = 3;
const ICON_BONUS_MIN = 10;
const ICON_BONUS_MAX = 100;
const SELF_COLOR_PATTERN_INDEX_LIST = [3, 7, 11, 15, 19, 23, 27, 31, 35, 39];
const SELF_COLOR_PATTERN_INDEXES = new Set(SELF_COLOR_PATTERN_INDEX_LIST);
const SELF_COLOR_MIN_GAP = 10;
const SELF_COLOR_MAX_GAP = 40;
const CUTE_ICON_POOL = [
  // 20 cute animals
  "🐶",
  "🐱",
  "🐰",
  "🐻",
  "🐼",
  "🦊",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐵",
  "🐨",
  "🐸",
  "🐹",
  "🐤",
  "🦄",
  "🐧",
  "🦉",
  "🐙",
  "🦋",
  // 20 cute foods
  "🍓",
  "🍒",
  "🍎",
  "🍑",
  "🍇",
  "🍉",
  "🍍",
  "🍰",
  "🧁",
  "🍩",
  "🍪",
  "🍭",
  "🍬",
  "🍫",
  "🍯",
  "🍿",
  "🥞",
  "🍕",
  "🍔",
  "🍜",
];
const SELF_COLOR_ICON_POOL = ["🐰", "🐱", "🦊", "🦄", "🦋", "🍓", "🧁", "🍭", "🍩", "🍬"];
const BGM_SRC =
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=calm-ambient-11157.mp3";

Page({
  data: {
    gameState: "menu", // menu | countdown | playing | gameover
    score: 0,
    bestScore: 0,
    combo: 0,
    multiplier: 1,
    finalScore: 0,
    renderRows: [],
    snowflakes: [],
    scoreFloat: null,
    bonusFloat: null,
    encourageTip: null,
    countdownValue: 0,
    countdownPulse: 0,
    showRanking: false,
    canResume: false,
    leaderboard: [],
    uiFlameTier: 0,
    controlsDisabled: true,
    boardOffsetPercent: Number(((-100 / 16).toFixed(3))),
    rabbitClass: "face-right motion-idle",
    rabbitStyle: "left: 50%; top: 50%;",
    bgmEnabled: true,
    isPaused: false,
    gridCols: 9,
    gridRows: 16,
  },

  onLoad() {
    this.gridCols = Math.max(4, Math.round(BASE_GRID_COLS / GRID_CELL_SCALE));
    const windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const ratio = windowInfo.windowHeight / Math.max(1, windowInfo.windowWidth);
    this.gridRows = Math.max(12, Math.round(this.gridCols * ratio));
    this.safeBottomLine = this.gridRows - 1.2;
    this.bufferRows = 6;
    this.loopTimer = null;
    this.scoreFloatTimer = null;
    this.bonusFloatTimer = null;
    this.encourageTipTimer = null;
    this.countdownTimer = null;
    this.rabbitMotionTimer = null;
    this.nextEncourageScore = ENCOURAGE_STEP_SCORE;
    this.countdownMode = "new";
    this.countdownActive = false;

    this.lastTickAt = 0;
    this.lastMoveInputAt = 0;
    this.elapsedMs = 0;
    this.scrollAccumulator = 0;
    this.autoForwardBudget = 0;
    this.blockedAnimCooldownMs = 0;
    this.rabbitX = Math.floor(this.gridCols / 2);
    this.rabbitY = Math.floor(this.gridRows * 0.65);
    this.rabbitRenderX = this.rabbitX;
    this.rabbitRenderY = this.rabbitY;
    this.rabbitRenderVX = 0;
    this.rabbitRenderVY = 0;
    this.rabbitSpringVX = 0;
    this.rabbitSpringVY = 0;
    this.verticalMoveAnim = null;
    this.rabbitFacing = "right";
    this.rabbitMotion = "idle";
    this.currentScrollSpeed = 1.8;

    this.roadRows = [];
    this.renderRowsCache = [];
    this.topRoadCenter = Math.floor(this.gridCols / 2);
    this.lastRoadDirection = 0; // -1 left, 0 forward, 1 right
    this.roadDirectionStreak = 0;
    this.lastInsertedWasTransition = false;
    this.lastOffsetPercent = -1;
    this.lastRabbitClass = "";
    this.lastRabbitStyle = "";
    this.lastRabbitStyleSetAt = 0;
    this.rabbitStyleUpdateIntervalMs = RABBIT_STYLE_UPDATE_INTERVAL_MS;
    this.roadRowIdSeed = 1;
    this.bgm = null;
    this.collectedIconBonusCells = new Set();
    this.roadCellPatternCounter = 0;
    this.nextSelfColorGap = this.getNextSelfColorGap();

    const bestScore = wx.getStorageSync(STORAGE_BEST_SCORE_KEY) || 0;
    const leaderboard = this.normalizeLeaderboardRecords([...(wx.getStorageSync(STORAGE_LEADERBOARD_KEY) || []), bestScore]);
    wx.setStorageSync(STORAGE_LEADERBOARD_KEY, leaderboard);
    this.setData({
      bestScore,
      leaderboard,
      snowflakes: this.createSnowflakes(18),
      gridCols: this.gridCols,
      gridRows: this.gridRows,
    });
    this.initBgm();
    this.resetRound("menu");
  },

  onUnload() {
    this.stopLoop();
    this.stopBgm();
    this.destroyBgm();
    this.clearScoreFloatTimer();
    this.clearBonusFloatTimer();
    this.clearEncourageTipTimer();
    this.clearCountdownTimer();
    this.clearRabbitMotionTimer();
  },

  onShow() {
    if (this.data.gameState === "playing" && this.data.bgmEnabled && !this.data.isPaused) {
      this.playBgm();
    }
  },

  onHide() {
    this.stopBgm();
    if (this.data.gameState === "playing") {
      this.gameOver();
      return;
    }
    if (this.data.gameState === "countdown") {
      this.clearCountdownTimer();
      if (this.countdownMode === "resume") {
        this.setData({
          gameState: "menu",
          controlsDisabled: true,
        });
      } else {
        this.resetRound("menu");
      }
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
    if (this.data.gameState === "playing" || this.data.gameState === "countdown" || this.countdownActive) {
      return;
    }
    this.resetRound("countdown");
    this.setData({
      showRanking: false,
      canResume: false,
    });
    this.startCountdown("new");
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
    const now = Date.now();
    if (now - this.lastMoveInputAt < RABBIT_MOVE_INPUT_DEBOUNCE_MS) {
      return;
    }
    const nextX = Math.max(0, Math.min(this.gridCols - 1, this.rabbitX + delta));
    if (nextX === this.rabbitX) {
      return;
    }
    this.lastMoveInputAt = now;
    this.rabbitX = nextX;
    this.rabbitFacing = delta < 0 ? "left" : "right";
    this.setRabbitMotion(delta < 0 ? "left" : "right");
    this.setData({
      combo: 0,
      multiplier: 1,
    });
    this.tryCollectIconBonus();
    this.updateFrameVisual(true);
  },

  resetRound(nextState) {
    this.stopLoop();
    this.clearScoreFloatTimer();
    this.clearBonusFloatTimer();
    this.clearRabbitMotionTimer();
    this.clearCountdownTimer();
    this.elapsedMs = 0;
    this.lastMoveInputAt = 0;
    this.scrollAccumulator = 0;
    this.autoForwardBudget = 0;
    this.blockedAnimCooldownMs = 0;
    this.nextEncourageScore = ENCOURAGE_STEP_SCORE;
    this.clearEncourageTipTimer();
    this.rabbitX = Math.floor(this.gridCols / 2);
    this.rabbitY = Math.floor(this.gridRows * 0.65);
    this.openingStraightLength = 3 + Math.floor(Math.random() * 3); // exactly 3~5 connected cells (include start cell)
    this.rabbitStartRow = Math.floor(this.rabbitY);
    this.openingStraightTopRow = Math.max(0, this.rabbitStartRow - (this.openingStraightLength - 1));
    this.rabbitRenderX = this.rabbitX;
    this.rabbitRenderY = this.rabbitY;
    this.rabbitRenderVX = 0;
    this.rabbitRenderVY = 0;
    this.rabbitSpringVX = 0;
    this.rabbitSpringVY = 0;
    this.verticalMoveAnim = null;
    this.rabbitFacing = "right";
    this.rabbitMotion = "idle";
    this.currentScrollSpeed = 1.8;
    this.topRoadCenter = Math.floor(this.gridCols / 2);
    this.lastRoadDirection = 0;
    this.roadDirectionStreak = 0;
    this.lastInsertedWasTransition = false;
    this.roadRows = this.createInitialRoadRows(this.gridRows + this.bufferRows);
    this.renderRowsCache = this.roadRows.slice(0, this.gridRows + 1).map((row) => this.toRenderRow(row));
    this.lastRabbitStyleSetAt = 0;
    this.collectedIconBonusCells = new Set();
    this.roadCellPatternCounter = 0;
    this.nextSelfColorGap = this.getNextSelfColorGap();

    this.setData({
      gameState: nextState,
      score: 0,
      combo: 0,
      multiplier: 1,
      finalScore: 0,
      scoreFloat: null,
      bonusFloat: null,
      encourageTip: null,
      countdownValue: 0,
      countdownPulse: 0,
      uiFlameTier: 0,
      canResume: false,
      controlsDisabled: nextState !== "playing",
      isPaused: false,
      boardOffsetPercent: Number(((-100 / this.gridRows).toFixed(3))),
      rabbitClass: "face-right motion-idle",
      rabbitStyle: "left: 50%; top: 50%;",
      renderRows: this.renderRowsCache,
    });
    this.updateFrameVisual(true);
    this.updateRabbitClass(true);
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

    const movedRows = (difficulty.scrollSpeed * dt) / 1000;
    this.scrollAccumulator += movedRows;
    while (this.scrollAccumulator >= 1) {
      this.scrollAccumulator -= 1;
      this.shiftRoadDownOneRow();
      this.rabbitY += 1;
      roadShifted = true;
    }

    const yNorm = this.getRabbitScreenNormY();
    const jumpRateRatio = this.getPositionSpeedRatio(yNorm, RABBIT_SPEED_RATIO_AT_ANCHOR, RABBIT_AUTO_JUMP_RATIO_AT_BOTTOM);
    if (this.canAutoForward()) {
      this.autoForwardBudget += movedRows * jumpRateRatio;
      this.autoForwardBudget = Math.min(this.autoForwardBudget, 2.5);
    } else {
      this.autoForwardBudget = 0;
      if (this.blockedAnimCooldownMs <= 0) {
        this.startBlockedBump();
        this.setRabbitMotion("blocked");
        this.blockedAnimCooldownMs = 160;
      }
    }

    this.blockedAnimCooldownMs = Math.max(0, this.blockedAnimCooldownMs - dt);

    if (this.autoForwardBudget >= 1 && this.canAutoForward() && this.canStartAutoJump()) {
      this.autoForwardBudget -= 1;
      const fromY = this.rabbitY;
      this.rabbitY -= 1;
      this.startForwardStep(fromY, this.rabbitY);
      this.setRabbitMotion("forward");
      this.gainScore();
      this.tryCollectIconBonus();
    }

    if (this.rabbitY >= this.safeBottomLine) {
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
    this.updateRabbitRender(dt);
    this.updateFrameVisual(false, frameExtraData);
  },

  gameOver() {
    if (this.data.gameState === "gameover") {
      return;
    }
    this.stopLoop();
    this.stopBgm();
    this.clearBonusFloatTimer();
    this.clearEncourageTipTimer();
    this.setRabbitMotion("fall");
    const finalScore = this.data.score;
    const bestScore = Math.max(this.data.bestScore, finalScore);
    const leaderboard = this.updateLeaderboard(finalScore);
    if (bestScore > this.data.bestScore) {
      wx.setStorageSync(STORAGE_BEST_SCORE_KEY, bestScore);
    }
    this.setData({
      gameState: "gameover",
      finalScore,
      bestScore,
      leaderboard,
      controlsDisabled: true,
    });
  },

  gainScore() {
    const prevScore = this.data.score;
    const nextCombo = this.data.combo + 1;
    const nextMultiplier = Math.min(9, 1 + Math.floor(nextCombo / 6));
    const deltaScore = nextMultiplier;
    const nextScore = prevScore + deltaScore;

    this.setData({
      combo: nextCombo,
      multiplier: nextMultiplier,
      score: nextScore,
      uiFlameTier: this.getUiFlameTier(nextScore),
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
    this.tryShowEncourageTip(prevScore, nextScore);
  },

  clearScoreFloatTimer() {
    if (this.scoreFloatTimer) {
      clearTimeout(this.scoreFloatTimer);
      this.scoreFloatTimer = null;
    }
  },

  clearBonusFloatTimer() {
    if (this.bonusFloatTimer) {
      clearTimeout(this.bonusFloatTimer);
      this.bonusFloatTimer = null;
    }
  },

  clearEncourageTipTimer() {
    if (this.encourageTipTimer) {
      clearTimeout(this.encourageTipTimer);
      this.encourageTipTimer = null;
    }
  },

  clearCountdownTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.countdownActive = false;
  },

  startCountdown(mode) {
    this.countdownMode = mode || "new";
    this.clearCountdownTimer();
    this.countdownActive = true;
    let current = COUNTDOWN_START;
    this.setData({
      gameState: "countdown",
      countdownValue: current,
      countdownPulse: 1,
      controlsDisabled: true,
    });
    this.countdownTimer = setInterval(() => {
      current -= 1;
      if (current > 0) {
        this.setData({
          countdownValue: current,
          countdownPulse: this.data.countdownPulse + 1,
        });
        return;
      }
      this.clearCountdownTimer();
      const nextData = {
        gameState: "playing",
        countdownValue: 0,
        controlsDisabled: false,
        isPaused: false,
      };
      if (this.countdownMode !== "resume") {
        nextData.canResume = false;
      }
      this.setData(nextData);
      this.startLoop();
      if (this.data.bgmEnabled) {
        this.playBgm();
      }
    }, 1000);
  },

  tryShowEncourageTip(prevScore, nextScore) {
    if (this.data.gameState !== "playing") {
      return;
    }
    while (prevScore < this.nextEncourageScore && nextScore >= this.nextEncourageScore) {
      this.showEncourageTip(this.nextEncourageScore);
      this.nextEncourageScore += ENCOURAGE_STEP_SCORE;
    }
    while (nextScore >= this.nextEncourageScore) {
      // Catch-up in case score jumps over multiple milestones in one update.
      this.nextEncourageScore += ENCOURAGE_STEP_SCORE;
    }
  },

  showEncourageTip(milestoneScore) {
    const tag = ENCOURAGE_TAGS[Math.floor(Math.random() * ENCOURAGE_TAGS.length)];
    const text = ENCOURAGE_LINES[Math.floor(Math.random() * ENCOURAGE_LINES.length)];
    const tip = {
      id: Date.now(),
      score: milestoneScore,
      tag,
      text,
    };
    this.clearEncourageTipTimer();
    this.setData({
      encourageTip: tip,
    });
    this.encourageTipTimer = setTimeout(() => {
      this.setData({ encourageTip: null });
      this.encourageTipTimer = null;
    }, ENCOURAGE_SHOW_MS);
  },

  getUiFlameTier(score) {
    if (score < UI_FLAME_START_SCORE) {
      return 0;
    }
    if (score >= UI_FLAME_MAX_SCORE) {
      return 5;
    }
    const progress = (score - UI_FLAME_START_SCORE) / (UI_FLAME_MAX_SCORE - UI_FLAME_START_SCORE);
    return Math.min(5, 1 + Math.floor(progress * 5));
  },

  getPatternIndex(patternClass) {
    const match = /road-pattern-(\d+)/.exec(patternClass || "");
    return match ? Number(match[1]) : 0;
  },

  isSelfColorPattern(patternClass) {
    return SELF_COLOR_PATTERN_INDEXES.has(this.getPatternIndex(patternClass));
  },

  getCurrentRoadCellInfo() {
    const rowIndex = Math.floor(this.rabbitY) + 1;
    const row = this.roadRows[rowIndex];
    if (!row || !row.cells || !row.cells[this.rabbitX]) {
      return null;
    }
    return {
      rowId: row.id,
      col: this.rabbitX,
      patternClass: row.patterns[this.rabbitX],
    };
  },

  tryCollectIconBonus() {
    if (this.data.gameState !== "playing") {
      return;
    }
    const info = this.getCurrentRoadCellInfo();
    if (!info || !this.isSelfColorPattern(info.patternClass)) {
      return;
    }
    const cellKey = `${info.rowId}:${info.col}`;
    if (this.collectedIconBonusCells.has(cellKey)) {
      return;
    }
    this.collectedIconBonusCells.add(cellKey);
    const rawBonus = (1 + Math.floor(Math.random() * 10)) * 10;
    const bonus = Math.max(ICON_BONUS_MIN, Math.min(ICON_BONUS_MAX, rawBonus));
    const prevScore = this.data.score;
    const nextScore = prevScore + bonus;
    this.setData({
      score: nextScore,
      uiFlameTier: this.getUiFlameTier(nextScore),
      bonusFloat: {
        id: Date.now(),
        text: `+${bonus}`,
      },
    });
    this.clearBonusFloatTimer();
    this.bonusFloatTimer = setTimeout(() => {
      this.setData({ bonusFloat: null });
      this.bonusFloatTimer = null;
    }, 760);
    this.tryShowEncourageTip(prevScore, nextScore);
  },

  setRabbitMotion(motion) {
    this.clearRabbitMotionTimer();
    if (motion === "blocked") {
      // Keep blocked recoveries deterministic: no leftover inertia.
      this.rabbitSpringVX = 0;
      this.rabbitSpringVY = 0;
    }
    this.rabbitMotion = motion;
    this.updateRabbitClass(false);
    if (motion === "fall") {
      return;
    }
    const motionDuration = motion === "blocked" ? 160 : 220;
    this.rabbitMotionTimer = setTimeout(() => {
      this.rabbitMotion = "idle";
      this.updateRabbitClass(false);
      this.rabbitMotionTimer = null;
    }, motionDuration);
  },

  clearRabbitMotionTimer() {
    if (this.rabbitMotionTimer) {
      clearTimeout(this.rabbitMotionTimer);
      this.rabbitMotionTimer = null;
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
    if (this.data.gameState === "playing" && !this.data.isPaused) {
      this.playBgm();
    }
  },

  togglePause() {
    if (this.data.gameState !== "playing") {
      return;
    }
    this.stopLoop();
    this.stopBgm();
    this.setData({
      gameState: "menu",
      showRanking: false,
      canResume: true,
      isPaused: true,
      controlsDisabled: true,
    });
  },

  continueGame() {
    if (!this.data.canResume || this.data.gameState !== "menu" || this.countdownActive) {
      return;
    }
    this.setData({ showRanking: false });
    this.startCountdown("resume");
  },

  openRanking() {
    const leaderboard = this.normalizeLeaderboardRecords(wx.getStorageSync(STORAGE_LEADERBOARD_KEY) || []);
    this.setData({
      leaderboard,
      showRanking: true,
    });
  },

  closeRanking() {
    this.setData({ showRanking: false });
  },

  noop() {},

  exitGame() {
    if (typeof wx.exitMiniProgram === "function") {
      wx.exitMiniProgram();
      return;
    }
    wx.showToast({
      title: "当前环境不支持退出",
      icon: "none",
    });
  },

  normalizeLeaderboardRecords(records) {
    const list = Array.isArray(records) ? records : [];
    const normalized = list
      .map((item) => {
        if (Number.isFinite(Number(item))) {
          return {
            score: Number(item),
            at: 0,
          };
        }
        if (!item || !Number.isFinite(Number(item.score))) {
          return null;
        }
        return {
          score: Number(item.score),
          at: Number.isFinite(Number(item.at)) ? Number(item.at) : 0,
        };
      })
      .filter((item) => item && item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.at - b.at;
      })
      .slice(0, LEADERBOARD_LIMIT)
      .map((item) => ({
        score: item.score,
        at: item.at,
        timeLabel: item.at > 0 ? this.formatLeaderboardTime(item.at) : "--",
      }));
    return normalized;
  },

  formatLeaderboardTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hour = `${date.getHours()}`.padStart(2, "0");
    const minute = `${date.getMinutes()}`.padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  updateLeaderboard(finalScore) {
    const raw = wx.getStorageSync(STORAGE_LEADERBOARD_KEY) || [];
    const merged = this.normalizeLeaderboardRecords([
      ...raw,
      {
        score: finalScore,
        at: Date.now(),
      },
    ]);
    wx.setStorageSync(STORAGE_LEADERBOARD_KEY, merged);
    return merged;
  },

  getNextSelfColorGap() {
    return SELF_COLOR_MIN_GAP + Math.floor(Math.random() * (SELF_COLOR_MAX_GAP - SELF_COLOR_MIN_GAP + 1));
  },

  canAutoForward() {
    // After introducing one hidden top buffer row, the visible row mapping
    // shifts by +1 in roadRows, so the front cell is at floor(rabbitY).
    const frontRow = Math.floor(this.rabbitY);
    if (frontRow < 0 || frontRow >= this.roadRows.length) {
      return false;
    }
    return Boolean(this.roadRows[frontRow].cells[this.rabbitX]);
  },

  getDifficulty(seconds) {
    if (seconds < 30) {
      return {
        scrollSpeed: 1.8,
        bendChance: 0.2,
        width: 1,
        autoJumpIntervalMs: 300,
      };
    }
    if (seconds < 60) {
      return {
        scrollSpeed: 2.4,
        bendChance: 0.38,
        width: 1,
        autoJumpIntervalMs: 260,
      };
    }
    if (seconds < 120) {
      return {
        scrollSpeed: 3.1,
        bendChance: 0.62,
        width: 1,
        autoJumpIntervalMs: 220,
      };
    }
    return {
      scrollSpeed: 3.9,
      bendChance: 0.84,
      width: 1,
      autoJumpIntervalMs: 180,
    };
  },

  createInitialRoadRows(totalRows) {
    const rows = [];
    const baseWidth = 1;
    let center = this.rabbitX;
    this.lastInsertedWasTransition = false;
    for (let i = 0; i < totalRows; i += 1) {
      const prevCenter = center;
      const inOpeningStraight = i >= this.openingStraightTopRow && i <= this.rabbitStartRow;
      let targetCenter = center;
      if (inOpeningStraight) {
        // Guarantee a straight opening path and ensure rabbit starts on-road.
        targetCenter = this.rabbitX;
      } else if (i > 0) {
        // Ensure we can always align to opening straight in time (max one-column move per row).
        const rowsUntilOpening = this.openingStraightTopRow - i;
        const distanceToOpeningCenter = this.rabbitX - center;
        if (rowsUntilOpening > 0 && Math.abs(distanceToOpeningCenter) > rowsUntilOpening) {
          targetCenter = center + Math.sign(distanceToOpeningCenter);
        } else {
          targetCenter = this.getNextCenter(center, 0.2, baseWidth, rows, false);
        }
      }

      if (i > 0 && targetCenter !== center) {
        rows.push(this.createRoadTransitionRow(center, targetCenter));
        this.lastInsertedWasTransition = true;
      } else {
        rows.push(this.createRoadRow(targetCenter, baseWidth));
        this.lastInsertedWasTransition = false;
      }
      this.updateRoadDirection(Math.sign(targetCenter - prevCenter));
      center = targetCenter;
    }
    this.topRoadCenter = rows[0].center;
    return rows;
  },

  shiftRoadDownOneRow() {
    this.roadRows.pop();
    const difficulty = this.getDifficulty(this.elapsedMs / 1000);
    const prevCenter = this.topRoadCenter;
    const nextCenter = this.getNextCenter(this.topRoadCenter, difficulty.bendChance, difficulty.width, this.roadRows, true);
    const newTop =
      nextCenter === prevCenter
        ? this.createRoadRow(nextCenter, difficulty.width)
        : this.createRoadTransitionRow(prevCenter, nextCenter);
    this.lastInsertedWasTransition = nextCenter !== prevCenter;
    this.updateRoadDirection(Math.sign(nextCenter - prevCenter));
    this.topRoadCenter = nextCenter;
    this.roadRows.unshift(newTop);
  },

  getNextCenter(prevCenter, bendChance, width, rowsForSafety, insertAtTop) {
    const half = Math.floor((width - 1) / 2);
    const minCenter = Math.max(half, 1);
    const maxCenter = Math.min(this.gridCols - 1 - half, this.gridCols - 2);
    const straightCapReached = this.lastRoadDirection === 0 && this.roadDirectionStreak >= 5;
    const candidateOffsets = [-1, 0, 1].filter((offset) => {
      const nextCenter = prevCenter + offset;
      return nextCenter >= minCenter && nextCenter <= maxCenter;
    });
    if (candidateOffsets.length === 0) {
      return prevCenter;
    }

    // Only cap consecutive straight links (offset = 0) to <= 5.
    let allowedOffsets = candidateOffsets.filter(
      (offset) => !(offset === 0 && this.lastRoadDirection === 0 && this.roadDirectionStreak >= 5)
    );

    // Avoid immediate reverse turn after a transition row.
    // This prevents a middle cell from getting 3 links (up + down + horizontal),
    // while still allowing same-direction continuous turns (e.g. left-left-left).
    if (this.lastInsertedWasTransition && this.lastRoadDirection !== 0) {
      const reverse = -this.lastRoadDirection;
      const noReverse = allowedOffsets.filter((offset) => offset !== reverse);
      if (noReverse.length > 0) {
        allowedOffsets = noReverse;
      }
    }

    if (allowedOffsets.length === 0) {
      allowedOffsets = candidateOffsets;
    }

    const isTopInsert = insertAtTop !== false;
    const baseRows = Array.isArray(rowsForSafety) ? rowsForSafety : this.roadRows;

    // Safety gate 1: reject candidates that would make a local 3-way connection
    // around the top insertion area (runtime path).
    if (isTopInsert) {
      const safeOffsets = allowedOffsets.filter((offset) => {
        const nextCenter = prevCenter + offset;
        return !this.wouldCreateTopThreeWay(prevCenter, nextCenter, width, baseRows);
      });
      if (safeOffsets.length > 0) {
        allowedOffsets = safeOffsets;
      }
    }

    // Safety gate 2: hard-check real vertical connectivity length.
    // If adding the next row makes any column contiguous > 5, reject it.
    const streakSafeOffsets = allowedOffsets.filter((offset) => {
      const nextCenter = prevCenter + offset;
      return !this.wouldExceedVerticalStreak(prevCenter, nextCenter, width, baseRows, isTopInsert);
    });
    if (streakSafeOffsets.length > 0) {
      allowedOffsets = streakSafeOffsets;
    }

    // Hard rule: straight links cannot exceed 5 in a row.
    // If cap is reached and a turn is available, force a turn.
    if (straightCapReached) {
      const turnOffsets = allowedOffsets.filter((offset) => offset !== 0);
      if (turnOffsets.length > 0) {
        allowedOffsets = turnOffsets;
      } else {
        const turnCandidates = candidateOffsets.filter((offset) => offset !== 0);
        if (turnCandidates.length > 0) {
          allowedOffsets = turnCandidates;
        }
      }
    }

    let desiredOffset = 0;
    if (Math.random() < bendChance) {
      desiredOffset = Math.random() < 0.5 ? -1 : 1;
    }

    let chosenOffset = desiredOffset;
    if (!allowedOffsets.includes(chosenOffset)) {
      const turnOffsets = allowedOffsets.filter((offset) => offset !== 0);
      if (desiredOffset === 0 && turnOffsets.length > 0) {
        chosenOffset = turnOffsets[Math.floor(Math.random() * turnOffsets.length)];
      } else if (desiredOffset !== 0 && allowedOffsets.includes(0) && Math.random() > bendChance) {
        chosenOffset = 0;
      } else {
        chosenOffset = allowedOffsets[Math.floor(Math.random() * allowedOffsets.length)];
      }
    }

    return prevCenter + chosenOffset;
  },

  wouldCreateTopThreeWay(prevCenter, nextCenter, width, baseRows) {
    if (!baseRows || baseRows.length === 0) {
      return false;
    }
    const newTopCells = this.buildStepCells(prevCenter, nextCenter, width);
    const localRows = [{ cells: newTopCells }, baseRows[0], baseRows[1]].filter(Boolean);
    // Only row 0(new top) and row 1(old top) can change degree after insertion.
    return this.rowHasThreeWay(localRows, 0) || this.rowHasThreeWay(localRows, 1);
  },

  wouldExceedVerticalStreak(prevCenter, nextCenter, width, baseRows, insertAtTop) {
    if (!baseRows || baseRows.length === 0) {
      return false;
    }
    const newCells = this.buildStepCells(prevCenter, nextCenter, width);
    for (let col = 0; col < this.gridCols; col += 1) {
      if (!newCells[col]) {
        continue;
      }
      let streak = 1;
      if (insertAtTop) {
        for (let rowIndex = 0; rowIndex < baseRows.length; rowIndex += 1) {
          const row = baseRows[rowIndex];
          if (!row || !row.cells || !row.cells[col]) {
            break;
          }
          streak += 1;
        }
      } else {
        for (let rowIndex = baseRows.length - 1; rowIndex >= 0; rowIndex -= 1) {
          const row = baseRows[rowIndex];
          if (!row || !row.cells || !row.cells[col]) {
            break;
          }
          streak += 1;
        }
      }
      if (streak > 5) {
        return true;
      }
    }
    return false;
  },

  buildStepCells(fromCenter, toCenter, width) {
    const cells = new Array(this.gridCols).fill(false);
    if (fromCenter === toCenter) {
      const start = Math.max(0, toCenter - Math.floor(width / 2));
      const end = Math.min(this.gridCols - 1, start + width - 1);
      for (let col = start; col <= end; col += 1) {
        cells[col] = true;
      }
      return cells;
    }
    const start = Math.min(fromCenter, toCenter);
    const end = Math.max(fromCenter, toCenter);
    for (let col = start; col <= end; col += 1) {
      if (col >= 0 && col < this.gridCols) {
        cells[col] = true;
      }
    }
    return cells;
  },

  rowHasThreeWay(rows, rowIndex) {
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return false;
    }
    const row = rows[rowIndex];
    if (!row || !row.cells) {
      return false;
    }
    for (let col = 0; col < this.gridCols; col += 1) {
      if (!row.cells[col]) {
        continue;
      }
      if (this.countConnections(rows, rowIndex, col) > 2) {
        return true;
      }
    }
    return false;
  },

  countConnections(rows, rowIndex, col) {
    const row = rows[rowIndex];
    if (!row || !row.cells || !row.cells[col]) {
      return 0;
    }
    let count = 0;
    if (col > 0 && row.cells[col - 1]) {
      count += 1;
    }
    if (col < this.gridCols - 1 && row.cells[col + 1]) {
      count += 1;
    }
    if (rowIndex > 0 && rows[rowIndex - 1] && rows[rowIndex - 1].cells && rows[rowIndex - 1].cells[col]) {
      count += 1;
    }
    if (
      rowIndex < rows.length - 1 &&
      rows[rowIndex + 1] &&
      rows[rowIndex + 1].cells &&
      rows[rowIndex + 1].cells[col]
    ) {
      count += 1;
    }
    return count;
  },

  updateRoadDirection(direction) {
    if (direction === this.lastRoadDirection) {
      this.roadDirectionStreak += 1;
    } else {
      this.lastRoadDirection = direction;
      this.roadDirectionStreak = 1;
    }
  },

  createRoadRow(center, width) {
    const start = Math.max(0, center - Math.floor(width / 2));
    const end = Math.min(this.gridCols - 1, start + width - 1);
    const columns = [];
    for (let i = start; i <= end; i += 1) {
      columns.push(i);
    }
    return this.createRoadRowFromColumns(columns, center);
  },

  createRoadTransitionRow(fromCenter, toCenter) {
    const start = Math.min(fromCenter, toCenter);
    const end = Math.max(fromCenter, toCenter);
    const columns = [];
    for (let i = start; i <= end; i += 1) {
      columns.push(i);
    }
    return this.createRoadRowFromColumns(columns, toCenter);
  },

  createRoadRowFromColumns(columns, center) {
    const cells = new Array(this.gridCols).fill(false);
    const tones = new Array(this.gridCols).fill("");
    const patterns = new Array(this.gridCols).fill("");
    for (let i = 0; i < columns.length; i += 1) {
      const col = columns[i];
      if (col < 0 || col >= this.gridCols) {
        continue;
      }
      cells[col] = true;
      tones[col] = this.getRandomRoadToneClass();
      patterns[col] = this.getRandomRoadPatternClass();
    }
    return {
      id: `r${this.roadRowIdSeed++}`,
      center,
      width: columns.length,
      cells,
      tones,
      patterns,
    };
  },

  getRandomRoadToneClass() {
    return `road-tone-${Math.floor(Math.random() * ROAD_TONE_COUNT)}`;
  },

  getRandomRoadPatternClass() {
    this.roadCellPatternCounter += 1;
    const shouldUseSelfColor = this.roadCellPatternCounter >= this.nextSelfColorGap;
    if (shouldUseSelfColor) {
      const chosenSelfColorIndex =
        SELF_COLOR_PATTERN_INDEX_LIST[Math.floor(Math.random() * SELF_COLOR_PATTERN_INDEX_LIST.length)];
      this.roadCellPatternCounter = 0;
      this.nextSelfColorGap = this.getNextSelfColorGap();
      return `road-pattern-${chosenSelfColorIndex}`;
    }
    let index = Math.floor(Math.random() * ROAD_PATTERN_COUNT);
    while (SELF_COLOR_PATTERN_INDEXES.has(index)) {
      index = Math.floor(Math.random() * ROAD_PATTERN_COUNT);
    }
    return `road-pattern-${index}`;
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

  getPatternIcon(patternClass) {
    const index = this.getPatternIndex(patternClass);
    if (SELF_COLOR_PATTERN_INDEXES.has(index)) {
      return SELF_COLOR_ICON_POOL[index % SELF_COLOR_ICON_POOL.length];
    }
    return CUTE_ICON_POOL[index % CUTE_ICON_POOL.length];
  },

  toRenderRow(road) {
    return {
      id: road.id,
      cells: road.cells.map((hasRoad, col) => ({
        id: `c${col}`,
        hasRoad,
        toneClass: hasRoad ? road.tones[col] : "",
        patternClass: hasRoad ? road.patterns[col] : "",
        patternIcon: hasRoad ? this.getPatternIcon(road.patterns[col]) : "",
        iconClass: hasRoad && this.isSelfColorPattern(road.patterns[col]) ? "icon-self-color" : "",
        cellClass: hasRoad && this.isSelfColorPattern(road.patterns[col]) ? "bonus-cell" : "",
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

  startForwardStep(fromY, toY) {
    this.verticalMoveAnim = {
      type: "forward",
      fromY,
      toY,
      elapsedMs: 0,
      durationMs: RABBIT_FORWARD_MOVE_DURATION_MS,
    };
    this.rabbitSpringVY = 0;
  },

  startBlockedBump() {
    const startY = this.rabbitRenderY;
    const baseY = this.rabbitY;
    const peakY = Math.min(startY, baseY) - RABBIT_BLOCKED_BUMP_DISTANCE;
    this.verticalMoveAnim = {
      type: "blocked",
      fromY: startY,
      peakY,
      toY: baseY,
      elapsedMs: 0,
      upMs: RABBIT_BLOCKED_BUMP_UP_MS,
      downMs: RABBIT_BLOCKED_BUMP_DOWN_MS,
    };
    this.rabbitSpringVY = 0;
  },

  updateVerticalMove(dt) {
    if (!this.verticalMoveAnim) {
      return null;
    }
    const anim = this.verticalMoveAnim;
    anim.elapsedMs += dt;
    if (anim.type === "forward") {
      const t = Math.min(1, anim.elapsedMs / Math.max(1, anim.durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      const y = anim.fromY + (anim.toY - anim.fromY) * eased;
      if (t >= 1) {
        this.verticalMoveAnim = null;
      }
      return y;
    }

    const totalMs = anim.upMs + anim.downMs;
    const clamped = Math.min(anim.elapsedMs, totalMs);
    if (clamped <= anim.upMs) {
      const t = clamped / Math.max(1, anim.upMs);
      const eased = 1 - Math.pow(1 - t, 2);
      return anim.fromY + (anim.peakY - anim.fromY) * eased;
    }
    const t = (clamped - anim.upMs) / Math.max(1, anim.downMs);
    const eased = t * t * (3 - 2 * t);
    const y = anim.peakY + (anim.toY - anim.peakY) * eased;
    if (clamped >= totalMs) {
      this.verticalMoveAnim = null;
      return anim.toY;
    }
    return y;
  },

  updateRabbitRender(dt) {
    const dtSeconds = Math.min(0.05, dt / 1000);
    const prevX = this.rabbitRenderX;
    const prevY = this.rabbitRenderY;

    const targetX = this.rabbitX;
    const targetY = this.rabbitY;
    const accelX = (targetX - prevX) * RABBIT_SPRING_STIFFNESS_X - this.rabbitSpringVX * RABBIT_SPRING_DAMPING_X;
    this.rabbitSpringVX += accelX * dtSeconds;

    const rawStepX = this.rabbitSpringVX * dtSeconds;
    const stepX = Math.max(-RABBIT_MAX_STEP_X_PER_TICK, Math.min(RABBIT_MAX_STEP_X_PER_TICK, rawStepX));
    if (stepX !== rawStepX) {
      this.rabbitSpringVX = stepX / Math.max(dtSeconds, 0.001);
    }

    let nextRenderX = prevX + stepX;
    let nextRenderY = this.updateVerticalMove(dt);

    if (nextRenderY === null) {
      const accelY = (targetY - prevY) * RABBIT_SPRING_STIFFNESS_Y - this.rabbitSpringVY * RABBIT_SPRING_DAMPING_Y;
      this.rabbitSpringVY += accelY * dtSeconds;
      const rawStepY = this.rabbitSpringVY * dtSeconds;
      let stepY = Math.max(-RABBIT_MAX_STEP_Y_PER_TICK, Math.min(RABBIT_MAX_STEP_Y_PER_TICK, rawStepY));
      stepY = Math.max(stepY, -RABBIT_MAX_UP_STEP_PER_TICK);
      if (stepY !== rawStepY) {
        this.rabbitSpringVY = stepY / Math.max(dtSeconds, 0.001);
      }
      nextRenderY = prevY + stepY;

      const remainingYBefore = targetY - prevY;
      const remainingYAfter = targetY - nextRenderY;
      if (remainingYBefore !== 0 && remainingYBefore * remainingYAfter <= 0) {
        nextRenderY = targetY;
        this.rabbitSpringVY = 0;
      }
    }

    const remainingXBefore = targetX - prevX;
    const remainingXAfter = targetX - nextRenderX;
    if (remainingXBefore !== 0 && remainingXBefore * remainingXAfter <= 0) {
      nextRenderX = targetX;
      this.rabbitSpringVX = 0;
    }

    this.rabbitRenderX = nextRenderX;
    this.rabbitRenderY = nextRenderY;

    // Use pseudo-velocity only for visual tilt/stretch effects.
    this.rabbitRenderVX = stepX / Math.max(dtSeconds, 0.001);
    this.rabbitRenderVY = (nextRenderY - prevY) / Math.max(dtSeconds, 0.001);

    if (
      Math.abs(this.rabbitX - this.rabbitRenderX) < RABBIT_SPRING_SNAP_DISTANCE &&
      Math.abs(this.rabbitSpringVX) < RABBIT_SPRING_SNAP_SPEED
    ) {
      this.rabbitRenderX = this.rabbitX;
      this.rabbitRenderVX = 0;
      this.rabbitSpringVX = 0;
    }
    if (
      Math.abs(this.rabbitY - this.rabbitRenderY) < RABBIT_SPRING_SNAP_DISTANCE &&
      Math.abs(this.rabbitSpringVY) < RABBIT_SPRING_SNAP_SPEED
    ) {
      this.rabbitRenderY = this.rabbitY;
      this.rabbitRenderVY = 0;
      this.rabbitSpringVY = 0;
    }
  },

  canStartAutoJump() {
    const topLimitRow = this.gridRows * RABBIT_TOP_LIMIT_RATIO;
    return this.rabbitY > topLimitRow && Math.abs(this.rabbitRenderY - this.rabbitY) <= RABBIT_AUTO_JUMP_SETTLE_THRESHOLD;
  },

  getPositionSpeedRatio(yNorm, anchorRatio, bottomRatio) {
    const progress = Math.max(
      0,
      Math.min(1, (yNorm - RABBIT_SPEED_ANCHOR_Y) / (1 - RABBIT_SPEED_ANCHOR_Y))
    );
    const easedProgress = Math.pow(progress, 0.72);
    return anchorRatio + (bottomRatio - anchorRatio) * easedProgress;
  },

  getRabbitScreenNormY() {
    const visualY = this.rabbitY + this.scrollAccumulator;
    return Math.max(0, Math.min(1, visualY / Math.max(1, this.gridRows - 1)));
  },

  updateFrameVisual(force, extraData) {
    const now = Date.now();
    const offsetPercent = ((this.scrollAccumulator - 1) * 100) / this.gridRows;
    const rabbitXPercent = ((this.rabbitRenderX + 0.5) * 100) / this.gridCols;
    const rabbitYPercent = ((this.rabbitRenderY + this.scrollAccumulator + 1) * 100) / this.gridRows;
    const tilt = Math.max(-8, Math.min(8, this.rabbitRenderVX * 1.4));
    const stretch = Math.max(0.95, Math.min(1.06, 1 - this.rabbitRenderVY * 0.015));
    const rabbitStyle = `left: ${rabbitXPercent.toFixed(3)}%; top: ${rabbitYPercent.toFixed(
      3
    )}%; --tilt: ${tilt.toFixed(2)}deg; --stretch: ${stretch.toFixed(3)};`;
    const shouldUpdateOffset = force || Math.abs(offsetPercent - this.lastOffsetPercent) >= 0.02;
    const rabbitStyleChanged = force || rabbitStyle !== this.lastRabbitStyle;
    const rabbitUpdateThrottled =
      !force && rabbitStyleChanged && now - this.lastRabbitStyleSetAt < this.rabbitStyleUpdateIntervalMs;
    const shouldUpdateRabbitStyle = rabbitStyleChanged && !rabbitUpdateThrottled;

    const hasExtraData = Boolean(extraData && Object.keys(extraData).length > 0);
    if (!hasExtraData && !shouldUpdateOffset && !shouldUpdateRabbitStyle) {
      return;
    }

    this.lastOffsetPercent = offsetPercent;

    const updateData = {};
    if (shouldUpdateOffset) {
      updateData.boardOffsetPercent = Number(offsetPercent.toFixed(3));
    }
    if (shouldUpdateRabbitStyle) {
      this.lastRabbitStyle = rabbitStyle;
      this.lastRabbitStyleSetAt = now;
      updateData.rabbitStyle = rabbitStyle;
    }
    if (hasExtraData) {
      Object.assign(updateData, extraData);
    }
    this.setData(updateData);
  },

  updateRabbitClass(force) {
    const nextClass = `face-${this.rabbitFacing} motion-${this.rabbitMotion}`;
    if (!force && nextClass === this.lastRabbitClass) {
      return;
    }
    this.lastRabbitClass = nextClass;
    this.setData({
      rabbitClass: nextClass,
    });
  },
});
