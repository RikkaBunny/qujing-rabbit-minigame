/**
 * 曲径小兔版 - page-logic.js
 * 游戏核心逻辑：状态机、道路生成、得分系统
 */

// 游戏状态常量
const GameState = {
  START: 'start',
  PLAYING: 'playing',
  GAMEOVER: 'gameover'
};

// 游戏配置
const CONFIG = {
  roadCellSize: 40,
  initialSpeed: 2,
  maxSpeed: 5,
  minRoadWidth: 2,
  maxRoadWidth: 3
};

/**
 * 游戏逻辑类
 * 管理游戏状态、道路生成、得分、难度等
 */
class GameLogic {
  constructor() {
    this.state = GameState.START;
    this.score = 0;
    this.highScore = 0;
    this.consecutiveForward = 0;
    this.gameTime = 0;
    this.roadSpeed = CONFIG.initialSpeed;
    
    // 兔子位置（网格坐标）
    this.rabbit = {
      gridX: 0,
      gridY: 0,
      x: 0,
      y: 0
    };
    
    // 道路数据
    this.road = [];
    this.roadOffset = 0;
    
    // 回调函数
    this.onStateChange = null;
    this.onScoreChange = null;
    this.onGameOver = null;
  }
  
  /**
   * 初始化游戏
   */
  init(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.cols = Math.floor(canvasWidth / CONFIG.roadCellSize);
    this.rows = Math.ceil(canvasHeight / CONFIG.roadCellSize) + 2;
    
    // 读取最高分
    this.highScore = this.loadHighScore();
  }
  
  /**
   * 开始新游戏
   */
  start() {
    this.state = GameState.PLAYING;
    this.score = 0;
    this.consecutiveForward = 0;
    this.gameTime = 0;
    this.roadSpeed = CONFIG.initialSpeed;
    this.roadOffset = 0;
    
    // 初始化兔子位置（屏幕中间偏上）
    this.rabbit.gridX = Math.floor(this.cols / 2);
    this.rabbit.gridY = 3;
    
    // 生成初始道路
    this.generateInitialRoad();
    
    // 通知状态变化
    this.notifyStateChange();
    
    console.log('🎮 游戏开始!');
  }
  
  /**
   * 生成初始道路
   */
  generateInitialRoad() {
    this.road = [];
    let roadPos = Math.floor(this.cols / 2);
    const roadWidth = CONFIG.maxRoadWidth;
    
    for (let row = 0; row < this.rows; row++) {
      const rowData = this.generateRoadRow(row, roadPos, roadWidth);
      this.road.push(rowData);
      
      // 更新下一行的道路位置
      roadPos = this.getNextRoadPos(roadPos);
    }
  }
  
  /**
   * 生成单行道路
   */
  generateRoadRow(row, roadPos, roadWidth) {
    const rowData = [];
    const halfWidth = Math.floor(roadWidth / 2);
    
    for (let col = 0; col < this.cols; col++) {
      if (col >= roadPos - halfWidth && col <= roadPos + halfWidth) {
        rowData.push(1); // 有路
      } else {
        rowData.push(0); // 无路
      }
    }
    
    return rowData;
  }
  
  /**
   * 计算下一行道路位置
   */
  getNextRoadPos(currentPos) {
    // 随机偏移 -1, 0, +1
    const offset = Math.floor(Math.random() * 3) - 1;
    let newPos = currentPos + offset;
    
    // 边界限制
    newPos = Math.max(1, Math.min(this.cols - 2, newPos));
    
    return newPos;
  }
  
  /**
   * 更新游戏（每帧调用）
   */
  update(deltaTime) {
    if (this.state !== GameState.PLAYING) return;
    
    this.gameTime += deltaTime / 1000;
    
    // 更新道路
    this.updateRoad();
    
    // 检测碰撞/失败
    this.checkCollision();
    
    // 更新难度
    this.updateDifficulty();
  }
  
  /**
   * 更新道路
   */
  updateRoad() {
    this.roadOffset += this.roadSpeed;
    
    // 移动超过一个格子
    if (this.roadOffset >= CONFIG.roadCellSize) {
      this.roadOffset = 0;
      this.road.shift();
      
      // 生成新行
      const lastRow = this.road[this.road.length - 1];
      const lastRoadPos = lastRow.indexOf(1);
      const newRoadPos = this.getNextRoadPos(lastRoadPos);
      const newRow = this.generateRoadRow(this.road.length, newRoadPos, CONFIG.maxRoadWidth);
      this.road.push(newRow);
    }
  }
  
  /**
   * 检测碰撞/失败
   */
  checkCollision() {
    // 检查兔子当前格子是否有路
    const rabbitRow = this.road[this.rabbit.gridY];
    if (!rabbitRow || rabbitRow[this.rabbit.gridX] === 0) {
      // 兔子站在无路上 - 失败
      this.gameOver();
      return;
    }
    
    // 检查兔子是否超出屏幕
    const rabbitPixelY = 100 + this.rabbit.gridY * CONFIG.roadCellSize + this.roadOffset;
    if (rabbitPixelY > this.canvasHeight - 60) {
      this.gameOver();
    }
  }
  
  /**
   * 更新难度
   */
  updateDifficulty() {
    // 根据游戏时间调整速度
    if (this.gameTime > 120) {
      this.roadSpeed = 5;
    } else if (this.gameTime > 60) {
      this.roadSpeed = 4;
    } else if (this.gameTime > 30) {
      this.roadSpeed = 3;
    } else {
      this.roadSpeed = CONFIG.initialSpeed;
    }
  }
  
  /**
   * 兔子向左移动
   */
  moveLeft() {
    if (this.state !== GameState.PLAYING) {
      this.start();
      return;
    }
    
    // 重置连续前进计数
    this.consecutiveForward = 0;
    
    // 移动
    this.rabbit.gridX = Math.max(0, this.rabbit.gridX - 1);
    
    // 检测新位置是否有路
    this.checkCurrentPosition();
  }
  
  /**
   * 兔子向右移动
   */
  moveRight() {
    if (this.state !== GameState.PLAYING) {
      this.start();
      return;
    }
    
    // 重置连续前进计数
    this.consecutiveForward = 0;
    
    // 移动
    this.rabbit.gridX = Math.min(this.cols - 1, this.rabbit.gridX + 1);
    
    // 检测新位置是否有路
    this.checkCurrentPosition();
  }
  
  /**
   * 检测当前位置
   */
  checkCurrentPosition() {
    const rabbitRow = this.road[this.rabbit.gridY];
    if (rabbitRow && rabbitRow[this.rabbit.gridX] === 1) {
      // 当前位置有路
      this.onValidMove();
    } else {
      // 当前位置无路
      this.gameOver();
    }
  }
  
  /**
   * 有效移动后的得分
   */
  onValidMove() {
    this.consecutiveForward++;
    
    // 计算得分倍率
    const multiplier = Math.min(Math.floor(this.consecutiveForward / 5) + 1, 5);
    
    // 增加分数
    this.score += multiplier;
    
    // 通知得分变化
    if (this.onScoreChange) {
      this.onScoreChange(this.score, multiplier);
    }
  }
  
  /**
   * 游戏结束
   */
  gameOver() {
    this.state = GameState.GAMEOVER;
    
    // 更新最高分
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore(this.highScore);
    }
    
    // 通知游戏结束
    if (this.onGameOver) {
      this.onGameOver(this.score, this.highScore);
    }
    
    console.log(`💀 游戏结束! 得分: ${this.score}, 最高分: ${this.highScore}`);
  }
  
  /**
   * 加载最高分
   */
  loadHighScore() {
    try {
      return wx.getStorageSync('highScore') || 0;
    } catch (e) {
      return 0;
    }
  }
  
  /**
   * 保存最高分
   */
  saveHighScore(score) {
    try {
      wx.setStorageSync('highScore', score);
    } catch (e) {
      console.error('保存最高分失败:', e);
    }
  }
  
  /**
   * 通知状态变化
   */
  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
  
  /**
   * 获取游戏状态
   */
  getState() {
    return this.state;
  }
  
  /**
   * 获取当前得分
   */
  getScore() {
    return this.score;
  }
  
  /**
   * 获取最高分
   */
  getHighScore() {
    return this.highScore;
  }
  
  /**
   * 获取道路数据
   */
  getRoad() {
    return this.road;
  }
  
  /**
   * 获取道路偏移
   */
  getRoadOffset() {
    return this.roadOffset;
  }
  
  /**
   * 获取兔子位置
   */
  getRabbit() {
    return this.rabbit;
  }
  
  /**
   * 获取当前速度
   */
  getSpeed() {
    return this.roadSpeed;
  }
}

// 导出模块
module.exports = {
  GameLogic,
  GameState,
  CONFIG
};
