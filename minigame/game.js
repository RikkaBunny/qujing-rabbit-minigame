/**
 * 曲径小兔版 - 微信小游戏入口
 * 微信小游戏骨架：初始化 Canvas、加载资源、启动游戏
 */

// 游戏全局配置
const GAME_CONFIG = {
  width: 375,      // 画布宽度
  height: 667,    // 画布高度
  roadCellSize: 40, // 道路格子大小
  fps: 60
};

let canvas, ctx;
let game;

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
  
  // 初始化游戏逻辑
  game = new Game(ctx, GAME_CONFIG);
  
  // 启动游戏循环
  game.start();
  
  // 注册触摸事件
  registerTouchEvents();
  
  console.log('🎮 曲径小兔版 v1 已启动');
}

/**
 * 注册触摸事件（左右按钮）
 */
function registerTouchEvents() {
  // 左按钮区域
  canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
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
  });
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
    
    requestAnimationFrame(() => this.gameLoop());
  }
  
  /**
   * 更新游戏状态
   */
  update() {
    // 道路向下移动
    this.roadOffset += this.roadSpeed;
    
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
   * 渲染小兔子
   */
  renderRabbit() {
    const { ctx, rabbit, config } = this;
    const x = rabbit.gridX * config.roadCellSize + config.roadCellSize / 2;
    const y = rabbit.y;
    const size = 30;
    
    // 兔子身体（白色椭圆）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y, size / 2, size / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 兔子头部
    ctx.beginPath();
    ctx.arc(x, y - 5, size / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 兔子长耳朵
    ctx.fillStyle = '#FFFFFF';
    // 左耳朵
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 20, 4, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 右耳朵
    ctx.beginPath();
    ctx.ellipse(x + 6, y - 20, 4, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // 耳朵内部（粉色）
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 20, 2, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 6, y - 20, 2, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛（红色）
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(x - 4, y - 6, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 6, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻子（粉色）
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.arc(x, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
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
      
      // 向右移动
      const maxCol = Math.floor(this.config.width / this.config.roadCellSize) - 1;
      this.rabbit.gridX = Math.min(maxCol, this.rabbit.gridX + 1);
    } else if (this.state === 'start' || this.state === 'gameover') {
      this.start();
    }
  }
  
  /**
   * 游戏结束
   */
  gameOver() {
    this.state = 'gameover';
    
    // 保存最高分
    if (this.score > this.highScore) {
      this.highScore = this.score;
      wx.setStorageSync('highScore', this.highScore);
    }
    
    this.renderGameOver();
  }
  
  /**
   * 渲染游戏结束画面
   */
  renderGameOver() {
    const { ctx, config, score, highScore } = this;
    
    // 遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, config.width, config.height);
    
    // 游戏结束面板
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(50, 200, config.width - 100, 200);
    
    // 标题
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('游戏结束', 120, 250);
    
    // 得分
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText(`得分: ${score}`, 100, 300);
    ctx.fillText(`最高分: ${highScore}`, 100, 330);
    
    // 提示
    ctx.font = '14px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('点击任意按钮重新开始', 80, 370);
  }
  
  /**
   * 渲染开始画面
   */
  renderStart() {
    const { ctx, config, highScore } = this;
    
    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#90EE90');
    gradient.addColorStop(1, '#228B22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // 标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('曲径', 120, 200);
    ctx.font = '20px Arial';
    ctx.fillText('小兔版', 145, 240);
    
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
  }
}

// 启动游戏
gameInit();
