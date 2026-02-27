/**
 * 曲径小兔版 - 微信小游戏入口 v2
 * 微信小游戏骨架：初始化 Canvas、加载资源、启动游戏
 * 
 * v2 新增：
 * - 音效系统（WebAudio beep降级方案 + 微信小游戏兼容）
 * - 雪花粒子特效
 * - 微信分享能力
 * - 兔子动画增强
 * - 结算面板增强
 * 
 * 微信小游戏兼容：
 * - requestAnimationFrame 回退 setTimeout
 * - 触摸事件使用 wx.onTouchStart
 * - 音效使用 wx.createInnerAudioContext / wx.vibrateShort
 * - 移除 window / alert 等浏览器 API
 */

// 游戏循环兼容性：确保 requestAnimationFrame 不可用时有 setTimeout 回退
const gameLoopFrame = typeof requestAnimationFrame !== 'undefined' 
  ? (cb) => requestAnimationFrame(cb)
  : (cb) => setTimeout(cb, 1000 / 60);

// 游戏全局配置
const GAME_CONFIG = {
  width: 375,      // 画布宽度
  height: 667,    // 画布高度
  roadCellSize: 40, // 道路格子大小
  fps: 60,
  // v2 新增配置
  snowflakeCount: 50,      // 雪花数量
  snowflakeCountLowPerf: 20, // 低性能模式雪花数量
  enableSound: true,        // 是否启用音效
  lowPerformanceMode: false // 低性能模式标记
};

let canvas, ctx;
let game;
let audioManager; // v2 音效管理器

/**
 * v2 音效管理器 - WebAudio beep 降级方案
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.init();
  }
  
  init() {
    // 微信小游戏环境检测
    const isWeChatMinigame = typeof wx !== 'undefined' && wx.createCanvas;
    
    if (isWeChatMinigame) {
      // 微信小游戏：使用 wx.createInnerAudioContext
      try {
        this.innerAudioContext = wx.createInnerAudioContext();
        this.innerAudioContext.volume = 0.3;
        this.enabled = true;
      } catch (e) {
        console.warn('wx.createInnerAudioContext failed, sound disabled');
        this.enabled = false;
      }
    } else {
      // 浏览器环境：尝试创建 WebAudio Context
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('WebAudio not supported, sound disabled');
        this.enabled = false;
      }
    }
  }
  
  /**
   * 播放 beep 音效
   * @param {number} frequency - 频率 (Hz)
   * @param {number} duration - 持续时间 (ms)
   * @param {string} type - 波形类型 (sine, square, sawtooth, triangle)
   */
  playBeep(frequency = 440, duration = 100, type = 'sine') {
    if (!this.enabled) return;
    
    // 微信小游戏环境
    if (this.innerAudioContext) {
      try {
        // 使用微信音频上下文播放简单提示音
        // 注意：微信 InnerAudioContext 不支持直接生成波形，使用占位
        // 实际项目中可使用 wx.vibrateShort 或预置音频文件
        if (wx.vibrateShort) {
          wx.vibrateShort({ type: 'light' });
        }
      } catch (e) {
        // 忽略播放错误
      }
      return;
    }
    
    // 浏览器环境：WebAudio
    if (!this.ctx) return;
    
    // 恢复 AudioContext（浏览器自动播放策略）
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    try {
      const oscillator = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      
      // 音量渐变避免爆音
      gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration / 1000);
      
      oscillator.start(this.ctx.currentTime);
      oscillator.stop(this.ctx.currentTime + duration / 1000);
    } catch (e) {
      // 忽略播放错误
    }
  }
  
  /**
   * 前进音效 - 短促高音
   */
  playForwardSound() {
    this.playBeep(660, 80, 'sine');
  }
  
  /**
   * 左右移动音效 - 中音
   */
  playMoveSound() {
    this.playBeep(440, 60, 'triangle');
  }
  
  /**
   * 得分提升音效 - 上升音阶
   */
  playScoreUpSound() {
    this.playBeep(523, 100, 'sine'); // C5
    setTimeout(() => this.playBeep(659, 100, 'sine'), 50); // E5
  }
  
  /**
   * 游戏结束音效 - 下降音
   */
  playGameOverSound() {
    this.playBeep(400, 200, 'sawtooth');
    setTimeout(() => this.playBeep(300, 300, 'sawtooth'), 150);
  }
}

/**
 * v2 雪花粒子系统
 */
class SnowflakeSystem {
  constructor(config) {
    this.config = config;
    this.snowflakes = [];
    this.init();
  }
  
  init() {
    const count = this.config.lowPerformanceMode 
      ? this.config.snowflakeCountLowPerf 
      : this.config.snowflakeCount;
    
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        x: Math.random() * this.config.width,
        y: Math.random() * this.config.height,
        size: 2 + Math.random() * 3,
        speed: 1 + Math.random() * 2,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }
  
  update() {
    this.snowflakes.forEach(flake => {
      flake.y += flake.speed;
      flake.wobble += 0.02;
      flake.x += Math.sin(flake.wobble) * 0.5;
      
      // 超出底部则重置到顶部
      if (flake.y > this.config.height) {
        flake.y = -5;
        flake.x = Math.random() * this.config.width;
      }
      
      // 左右循环
      if (flake.x < 0) flake.x = this.config.width;
      if (flake.x > this.config.width) flake.x = 0;
    });
  }
  
  render(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.snowflakes.forEach(flake => {
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  /**
   * 切换性能模式
   * @param {boolean} lowPerf - 是否低性能模式
   */
  setLowPerformanceMode(lowPerf) {
    if (lowPerf && this.snowflakes.length > this.config.snowflakeCountLowPerf) {
      // 减少粒子
      this.snowflakes = this.snowflakes.slice(0, this.config.snowflakeCountLowPerf);
    } else if (!lowPerf && this.snowflakes.length < this.config.snowflakeCount) {
      // 增加粒子
      const currentCount = this.snowflakes.length;
      for (let i = 0; i < this.config.snowflakeCount - currentCount; i++) {
        this.snowflakes.push({
          x: Math.random() * this.config.width,
          y: Math.random() * this.config.height,
          size: 2 + Math.random() * 3,
          speed: 1 + Math.random() * 2,
          wobble: Math.random() * Math.PI * 2
        });
      }
    }
  }
}

/**
 * 微信小游戏初始化入口
 */
function gameInit() {
  // 获取 Canvas
  canvas = wx.createCanvas();
  ctx = canvas.getContext('2d');
  
  // 设置画布尺寸
  canvas.width = GAME_CONFIG.width;
  canvas.height = GAME_CONFIG.height;
  
  // v2 初始化音效管理器
  audioManager = new AudioManager();
  GAME_CONFIG.enableSound = audioManager.enabled;
  
  // 初始化游戏逻辑
  game = new Game(ctx, GAME_CONFIG);
  
  // 启动游戏循环
  game.start();
  
  // 注册触摸事件
  registerTouchEvents();
  
  console.log('🎮 曲径小兔版 v2 已启动');
}

/**
 * 注册触摸事件（左右按钮 + 分享按钮区域）
 */
function registerTouchEvents() {
  // 检测微信小游戏环境
  const isWeChatMinigame = typeof wx !== 'undefined' && wx.onTouchStart;
  
  if (isWeChatMinigame) {
    // 微信小游戏：使用 wx.onTouchStart
    wx.onTouchStart((e) => {
      const touch = e.touches[0];
      if (!touch) return;
      
      const x = touch.clientX;
      const y = touch.clientY;
      
      // 左下角按钮区域
      if (x < 100 && y > GAME_CONFIG.height - 120) {
        game.onLeftButtonClick();
      }
      // 右下角按钮区域
      else if (x > GAME_CONFIG.width - 100 && y > GAME_CONFIG.height - 120) {
        game.onRightButtonClick();
      }
      // v2: 分享按钮区域（游戏结束页面）
      else if (game && game.state === 'gameover' && x > 80 && x < GAME_CONFIG.width - 80 && y > 340 && y < 380) {
        game.onShareButtonClick();
      }
    });
  } else {
    // 浏览器环境：使用 addEventListener
    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      
      const x = touch.clientX;
      const y = touch.clientY;
      
      // 左下角按钮区域
      if (x < 100 && y > GAME_CONFIG.height - 120) {
        game.onLeftButtonClick();
      }
      // 右下角按钮区域
      else if (x > GAME_CONFIG.width - 100 && y > GAME_CONFIG.height - 120) {
        game.onRightButtonClick();
      }
      // v2: 分享按钮区域（游戏结束页面）
      else if (game && game.state === 'gameover' && x > 80 && x < GAME_CONFIG.width - 80 && y > 340 && y < 380) {
        game.onShareButtonClick();
      }
    });
    
    // 兼容 PC 鼠标点击
    canvas.addEventListener('mousedown', (e) => {
      const x = e.offsetX;
      const y = e.offsetY;
      
      // 左下角按钮区域
      if (x < 100 && y > GAME_CONFIG.height - 120) {
        game.onLeftButtonClick();
      }
      // 右下角按钮区域
      else if (x > GAME_CONFIG.width - 100 && y > GAME_CONFIG.height - 120) {
        game.onRightButtonClick();
      }
      // v2: 分享按钮区域
      else if (game && game.state === 'gameover' && x > 80 && x < GAME_CONFIG.width - 80 && y > 340 && y < 380) {
        game.onShareButtonClick();
      }
    });
  }
}

/**
 * v2 微信分享能力
 */
function wxShareAppMessage(title, query) {
  // 检测微信环境
  if (typeof wx !== 'undefined' && wx.shareAppMessage) {
    wx.shareAppMessage({
      title: title || '曲径小兔 - 森林跑酷',
      query: query || '',
      imageUrl: '' // 可选：自定义分享图片
    });
  } else if (typeof wx !== 'undefined' && wx.showModal) {
    // 微信环境但无分享API，显示模态框
    wx.showModal({
      title: '分享功能',
      content: '分享功能仅在微信中可用\n当前得分: ' + (game ? game.score : 0),
      showCancel: false
    });
  } else {
    // 非微信环境降级提示
    console.log('📤 分享功能: ' + (title || '曲径小兔 - 森林跑酷'));
  }
}

/**
 * 游戏主类
 */
class Game {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.state = 'start'; // start, playing, gameover
    this.score = 0;
    this.highScore = wx.getStorageSync('highScore') || 0;
    
    // v2: 雪花粒子系统
    this.snowSystem = new SnowflakeSystem(config);
    
    // v2: 兔子动画状态
    this.rabbitAnimState = {
      isMoving: false,
      moveDirection: 0, // -1 left, 1 right, 0 forward
      animFrame: 0,
      lastScore: 0 // 用于检测得分变化
    };
    
    // 小兔子位置
    this.rabbit = {
      x: Math.floor(config.width / 2),
      y: config.height - 150,
      gridX: Math.floor(config.width / config.roadCellSize / 2),
      gridY: 3
    };
    
    // 道路数据
    this.road = [];
    this.roadSpeed = 2;
    this.roadOffset = 0;
    this.consecutiveForward = 0; // 连续前进计数
    
    // 初始化道路
    this.initRoad();
  }
  
  /**
   * 初始化道路
   */
  initRoad() {
    this.road = [];
    const cols = Math.floor(this.config.width / this.config.roadCellSize);
    const rows = Math.ceil(this.config.height / this.config.roadCellSize) + 2;
    
    // 初始道路位置（中间）
    let roadPos = Math.floor(cols / 2);
    const roadWidth = 3;
    
    for (let row = 0; row < rows; row++) {
      const rowData = [];
      for (let col = 0; col < cols; col++) {
        // 道路宽度内的格子有路
        if (col >= roadPos - Math.floor(roadWidth / 2) && 
            col <= roadPos + Math.floor(roadWidth / 2)) {
          rowData.push(1); // 有路
        } else {
          rowData.push(0); // 无路
        }
      }
      this.road.push(rowData);
      
      // 随机偏移
      roadPos += Math.floor(Math.random() * 3) - 1;
      roadPos = Math.max(1, Math.min(cols - 2, roadPos));
    }
  }
  
  /**
   * 开始游戏
   */
  start() {
    this.state = 'playing';
    this.score = 0;
    this.roadSpeed = 2;
    this.consecutiveForward = 0;
    this.rabbit.gridX = Math.floor((this.config.width / this.config.roadCellSize) / 2);
    this.rabbit.gridY = 3;
    this.rabbit.y = this.config.height - 150;
    this.rabbitAnimState = {
      isMoving: false,
      moveDirection: 0,
      animFrame: 0,
      lastScore: 0
    };
    this.initRoad();
    this.gameLoop();
  }
  
  /**
   * 游戏主循环
   */
  gameLoop() {
    if (this.state !== 'playing') return;
    
    this.update();
    this.render();
    
    // 使用兼容的游戏循环帧函数
    gameLoopFrame(() => this.gameLoop());
  }
  
  /**
   * 更新游戏状态
   */
  update() {
    // v2: 更新雪花粒子
    this.snowSystem.update();
    
    // 道路向下移动
    this.roadOffset += this.roadSpeed;
    
    // v2: 兔子动画帧更新
    this.rabbitAnimState.animFrame += 0.1;
    
    // 移动超过一个格子，重新生成
    if (this.roadOffset >= this.config.roadCellSize) {
      this.roadOffset = 0;
      this.road.shift(); // 移除最上面一行
      
      // 生成新行
      const cols = Math.floor(this.config.width / this.config.roadCellSize);
      const lastRow = this.road[this.road.length - 1];
      let lastRoadPos = lastRow.indexOf(1);
      if (lastRoadPos === -1) lastRoadPos = Math.floor(cols / 2);
      
      // 随机偏移
      const offset = Math.floor(Math.random() * 3) - 1;
      let newRoadPos = lastRoadPos + offset;
      newRoadPos = Math.max(1, Math.min(cols - 2, newRoadPos));
      
      const newRow = [];
      for (let col = 0; col < cols; col++) {
        if (col >= newRoadPos - 1 && col <= newRoadPos + 1) {
          newRow.push(1);
        } else {
          newRow.push(0);
        }
      }
      this.road.push(newRow);
    }
    
    // 检测小兔子前方是否有路
    const rabbitRow = this.road[this.rabbit.gridY];
    if (rabbitRow && rabbitRow[this.rabbit.gridX] === 1) {
      // 前方有路，自动前进
      this.consecutiveForward++;
      const multiplier = Math.min(Math.floor(this.consecutiveForward / 5) + 1, 5);
      this.score += multiplier;
      
      // v2: 播放前进音效（得分变化时）
      if (this.score !== this.rabbitAnimState.lastScore) {
        audioManager.playForwardSound();
        this.rabbitAnimState.lastScore = this.score;
        
        // v2: 得分提升提示音（连击时）
        if (multiplier > 1) {
          audioManager.playScoreUpSound();
        }
      }
    }
    
    // 小兔子随道路下移
    this.rabbit.y += this.roadSpeed;
    
    // 失败检测 - 超出屏幕底部
    if (this.rabbit.y > this.config.height - 60) {
      this.gameOver();
    }
    
    // 难度递增
    const gameTime = this.score * 0.1;
    if (gameTime > 120) {
      this.roadSpeed = 5;
    } else if (gameTime > 60) {
      this.roadSpeed = 4;
    } else if (gameTime > 30) {
      this.roadSpeed = 3;
    }
  }
  
  /**
   * 渲染画面
   */
  render() {
    const { ctx, config } = this;
    
    // 清空画布 - 森林背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#87CEEB');   // 天空蓝
    gradient.addColorStop(0.5, '#90EE90'); // 浅绿
    gradient.addColorStop(1, '#228B22');  // 深绿
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // v2: 渲染雪花粒子（在背景和道路之间）
    this.snowSystem.render(ctx);
    
    // 绘制道路
    this.renderRoad();
    
    // 绘制小兔子
    this.renderRabbit();
    
    // 绘制UI
    this.renderUI();
    
    // 绘制按钮
    this.renderButtons();
  }
  
  /**
   * 渲染道路
   */
  renderRoad() {
    const { ctx, config, road, roadOffset } = this;
    const cellSize = config.roadCellSize;
    
    for (let row = 0; row < road.length; row++) {
      const y = row * cellSize - roadOffset + 100; // 从屏幕上方开始
      
      for (let col = 0; col < road[row].length; col++) {
        if (road[row][col] === 1) {
          const x = col * cellSize;
          
          // 道路格子 - 棕色泥土
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          
          // 草边效果
          ctx.strokeStyle = '#32CD32';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
      }
    }
  }
  
  /**
   * 渲染小兔子 - v2 增强动画版
   */
  renderRabbit() {
    const { ctx, rabbit, config, rabbitAnimState } = this;
    const x = rabbit.gridX * config.roadCellSize + config.roadCellSize / 2;
    const y = rabbit.y;
    const size = 30;
    
    // v2: 计算动画偏移（弹跳效果）
    const bounceOffset = Math.sin(rabbitAnimState.animFrame * 2) * 3;
    const squishScale = 1 + Math.sin(rabbitAnimState.animFrame * 2) * 0.05;
    
    // v2: 左右移动时的倾斜效果
    let tiltAngle = 0;
    if (rabbitAnimState.moveDirection === -1) {
      tiltAngle = -0.1;
    } else if (rabbitAnimState.moveDirection === 1) {
      tiltAngle = 0.1;
    }
    
    ctx.save();
    ctx.translate(x, y + bounceOffset);
    ctx.rotate(tiltAngle);
    ctx.scale(squishScale, 1 / squishScale);
    
    // 兔子身体（白色椭圆）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 2, size / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // v2: 身体阴影/立体感
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.ellipse(0, 3, size / 2.5, size / 3, 0, 0, Math.PI);
    ctx.fill();
    
    // 兔子头部
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -5, size / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 兔子长耳朵 - v2 动态摆动
    const earWobble = Math.sin(rabbitAnimState.animFrame * 3) * 2;
    // 左耳朵
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-6, -20 + earWobble, 4, 12, -0.2 + tiltAngle, 0, Math.PI * 2);
    ctx.fill();
    // 右耳朵
    ctx.beginPath();
    ctx.ellipse(6, -20 - earWobble, 4, 12, 0.2 + tiltAngle, 0, Math.PI * 2);
    ctx.fill();
    
    // 耳朵内部（粉色）
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(-6, -20 + earWobble, 2, 8, -0.2 + tiltAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -20 - earWobble, 2, 8, 0.2 + tiltAngle, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛（红色）- v2 眨眼动画
    const blinkFrame = Math.floor(rabbitAnimState.animFrame * 0.5) % 60;
    const isBlinking = blinkFrame === 0;
    
    if (isBlinking) {
      // 眨眼：画横线
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(-2, -6);
      ctx.moveTo(2, -6);
      ctx.lineTo(6, -6);
      ctx.stroke();
    } else {
      // 正常：画圆点
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(-4, -6, 2, 0, Math.PI * 2);
      ctx.arc(4, -6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 鼻子（粉色）
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.arc(0, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // v2: 腮红
    ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-10, -2, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(10, -2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * 渲染UI
   */
  renderUI() {
    const { ctx, config, score, highScore } = this;
    
    // 分数背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 10, 150, 60);
    
    // 当前分数
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText(`得分: ${score}`, 20, 35);
    
    // 最高分
    ctx.font = '14px Arial';
    ctx.fillText(`最高: ${highScore}`, 20, 55);
    
    // v2: 连击提示
    if (this.consecutiveForward > 5) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`x${Math.min(Math.floor(this.consecutiveForward / 5) + 1, 5)} 连击!`, 170, 35);
    }
  }
  
  /**
   * 渲染控制按钮
   */
  renderButtons() {
    const { ctx, config } = this;
    const btnY = config.height - 80;
    const btnSize = 50;
    
    // 左按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(40, btnY, btnSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('←', 28, btnY + 8);
    
    // 右按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(config.width - 40, btnY, btnSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.fillText('→', config.width - 52, btnY + 8);
  }
  
  /**
   * 左按钮点击
   */
  onLeftButtonClick() {
    if (this.state === 'playing') {
      // 重置连续前进计数
      this.consecutiveForward = 0;
      this.rabbitAnimState.lastScore = this.score;
      
      // v2: 移动音效
      audioManager.playMoveSound();
      
      // v2: 动画状态
      this.rabbitAnimState.isMoving = true;
      this.rabbitAnimState.moveDirection = -1;
      setTimeout(() => this.rabbitAnimState.moveDirection = 0, 200);
      
      // 向左移动
      this.rabbit.gridX = Math.max(0, this.rabbit.gridX - 1);
    } else if (this.state === 'start' || this.state === 'gameover') {
      this.start();
    }
  }
  
  /**
   * 右按钮点击
   */
  onRightButtonClick() {
    if (this.state === 'playing') {
      // 重置连续前进计数
      this.consecutiveForward = 0;
      this.rabbitAnimState.lastScore = this.score;
      
      // v2: 移动音效
      audioManager.playMoveSound();
      
      // v2: 动画状态
      this.rabbitAnimState.isMoving = true;
      this.rabbitAnimState.moveDirection = 1;
      setTimeout(() => this.rabbitAnimState.moveDirection = 0, 200);
      
      // 向右移动
      const maxCol = Math.floor(this.config.width / this.config.roadCellSize) - 1;
      this.rabbit.gridX = Math.min(maxCol, this.rabbit.gridX + 1);
    } else if (this.state === 'start' || this.state === 'gameover') {
      this.start();
    }
  }
  
  /**
   * v2: 分享按钮点击
   */
  onShareButtonClick() {
    const shareTitle = `曲径小兔 - 森林跑酷 🎮`;
    const shareQuery = `score=${this.score}&highScore=${this.highScore}`;
    wxShareAppMessage(shareTitle, shareQuery);
  }
  
  /**
   * 游戏结束
   */
  gameOver() {
    this.state = 'gameover';
    
    // v2: 播放游戏结束音效
    audioManager.playGameOverSound();
    
    // 保存最高分
    if (this.score > this.highScore) {
      this.highScore = this.score;
      wx.setStorageSync('highScore', this.highScore);
    }
    
    this.renderGameOver();
  }
  
  /**
   * 渲染游戏结束画面 - v2 增强版
   */
  renderGameOver() {
    const { ctx, config, score, highScore } = this;
    
    // 遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, config.width, config.height);
    
    // 游戏结束面板
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(30, 150, config.width - 60, 280);
    
    // 标题
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('游戏结束', 110, 200);
    
    // 得分区域
    ctx.fillStyle = '#333333';
    ctx.font = '22px Arial';
    ctx.fillText(`本次得分: ${score}`, 60, 260);
    
    // v2: 历史最高分显示
    ctx.font = '18px Arial';
    if (score >= highScore) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`🏆 历史最高: ${highScore}`, 60, 295);
    } else {
      ctx.fillStyle = '#666666';
      ctx.fillText(`历史最高: ${highScore}`, 60, 295);
    }
    
    // v2: 分享战绩按钮
    const btnX = 80;
    const btnY = 340;
    const btnW = config.width - 160;
    const btnH = 40;
    
    // 按钮背景
    ctx.fillStyle = '#07C160'; // 微信绿
    ctx.fillRect(btnX, btnY, btnW, btnH);
    
    // 按钮文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    const shareText = '📤 分享战绩';
    const textWidth = ctx.measureText(shareText).width;
    ctx.fillText(shareText, btnX + (btnW - textWidth) / 2, btnY + 26);
    
    // 提示重新开始
    ctx.font = '14px Arial';
    ctx.fillStyle = '#999999';
    ctx.fillText('点击任意按钮重新开始', 70, 410);
  }
  
  /**
   * 渲染开始画面
   */
  renderStart() {
    const { ctx, config, highScore } = this;
    
    // v2: 背景渲染时也显示雪花
    const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#90EE90');
    gradient.addColorStop(1, '#228B22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // v2: 雪花粒子
    this.snowSystem.render(ctx);
    
    // 标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('曲径', 120, 200);
    ctx.font = '20px Arial';
    ctx.fillText('小兔版 v2', 140, 240);
    
    // 最高分
    ctx.font = '18px Arial';
    ctx.fillText(`最高分: ${highScore}`, 130, 300);
    
    // 提示
    ctx.font = '16px Arial';
    ctx.fillText('点击下方按钮开始游戏', 80, 400);
    
    // 绘制可爱的小兔子
    this.renderRabbitAt(187, 320);
    
    // 绘制按钮
    this.renderButtons();
  }
  
  /**
   * 在指定位置渲染小兔子
   */
  renderRabbitAt(x, y) {
    const size = 50;
    
    // 身体
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y, size / 2, size / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 头部
    ctx.beginPath();
    ctx.arc(x, y - 8, size / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 耳朵
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 28, 5, 15, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 8, y - 28, 5, 15, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // 耳朵内部
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 28, 3, 10, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 8, y - 28, 3, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(x - 5, y - 8, 3, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻子
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.arc(x, y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // v2: 腮红
    ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x - 15, y - 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 15, y - 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 启动游戏
gameInit();
