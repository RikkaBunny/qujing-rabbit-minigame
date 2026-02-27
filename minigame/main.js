/**
 * 曲径小兔版 - main.js
 * 微信小游戏入口文件
 * 负责初始化游戏环境和启动游戏逻辑
 */

// 全局变量
let gameInstance = null;

/**
 * 游戏初始化
 * 微信小游戏框架入口
 */
function main() {
  console.log('🐰 曲径小兔版 - 初始化中...');
  
  // 创建设置按钮
  const button = wx.createButton({
    text: '开始游戏',
    style: {
      left: 100,
      top: 300,
      width: 175,
      height: 50,
      backgroundColor: '#4CAF50',
      color: '#ffffff',
      fontSize: 20,
      borderRadius: 10
    }
  });
  
  // 监听按钮点击
  button.onTap((res) => {
    console.log('🎮 游戏开始!');
    // 隐藏按钮
    button.hide();
    
    // 加载并运行游戏
    loadGame();
  });
  
  // 显示按钮
  button.show();
  
  // 尝试加载游戏（如果之前有保存的状态）
  tryLoadGame();
}

/**
 * 加载游戏
 */
function loadGame() {
  // 这里可以加载游戏资源
  // 目前直接运行 game.js
  
  // 触发 game.js 中的初始化
  if (typeof gameInit === 'function') {
    gameInit();
  }
}

/**
 * 尝试加载之前保存的游戏状态
 */
function tryLoadGame() {
  // 读取保存的最高分
  try {
    const highScore = wx.getStorageSync('highScore');
    console.log(`📊 最高分: ${highScore || 0}`);
  } catch (e) {
    console.log('📊 首次游戏，无历史记录');
  }
}

/**
 * 保存游戏数据
 */
function saveGameData(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

/**
 * 读取游戏数据
 */
function loadGameData(key, defaultValue) {
  try {
    return wx.getStorageSync(key) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// 导出模块
module.exports = {
  main,
  saveGameData,
  loadGameData
};
