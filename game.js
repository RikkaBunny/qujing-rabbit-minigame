/**
 * 曲径小兔版 - 微信小游戏入口（根目录兜底）
 * 
 * 此文件为根目录兜底入口，解决以下问题：
 * 1. 微信开发者工具按 game 模式编译时，需要根目录有 game.js
 * 2. 开发者误按 mp 模式时，需要根目录有 game.json 和 app.json
 * 
 * 实际游戏逻辑在 ./minigame/game.js 中执行
 */

// 转发到 minigame 目录的实际入口
require('./minigame/game.js');
