# 根目录兜底入口文件说明

## 为什么要加根目录兜底入口？

微信开发者工具对游戏项目和小程序项目的入口文件检查逻辑不同：

### 问题场景

1. **game 模式** - 编译 game.json 时，devtools 期望根目录有 `game.js` 作为入口
2. **mp 模式（误按）** - 编译时检查 `app.json` 和 `pages/index` 目录

### 我们的解决方案

本项目在根目录添加了兜底入口文件，无论开发者按 game 还是 mp，都不会因为入口文件缺失报错：

| 文件 | 作用 |
|------|------|
| `game.js` | 转发到 `./minigame/game.js`，实际游戏逻辑 |
| `game.json` | 小游戏配置（deviceOrientation） |
| `app.json` | 小程序配置（pages + window） |

### 实际游戏代码位置

- **小游戏入口**：`minigame/game.js` - 包含完整游戏逻辑
- **小游戏配置**：`minigame/game.json`
- **小程序兼容**：`minigame/app.json` + `minigame/pages/index/`

### 配置说明 (project.config.json)

```json
{
  "compileType": "game",
  "minigameRoot": "minigame/",
  "miniprogramRoot": "minigame/"
}
```

双 Root 设置确保无论哪种模式都能正确定位到 `minigame/` 目录。

---
**生成时间**: 2026-02-27
**问题**: 微信开发者工具 "少文件" 报错
**修复轮次**: Round 3
