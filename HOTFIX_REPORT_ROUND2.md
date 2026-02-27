# HOTFIX Report - Round 2

**Date**: 2026-02-27  
**Issue**: 编译 `minigame/app.json` 和 `minigame/game.json` 时报错，环境被错误识别为 `mp` (小程序)

---

## 问题根因

当微信开发者工具误以「小程序 (mp)」模式打开小游戏项目时，会按照小程序规范校验 `app.json` 和 `game.json`，导致以下错误：
- `app.json` 缺少 `pages` 字段 → 小程序页面校验失败
- `game.json` 包含非游戏字段 → 小程序环境不兼容

---

## 修复内容

### 1. `project.config.json` - 明确项目根目录配置

**修改**:
```json
{
  "compileType": "game",
  "minigameRoot": "minigame/",
  "miniprogramRoot": ""
}
```

**为什么能规避报错**:
- `minigameRoot` 明确告诉工具小游戏代码位置
- `miniprogramRoot` 设为空字符串，避免工具寻找小程序代码
- 即使工具错误识别为 mp 模式，也能通过路径配置找到正确资源

---

### 2. `minigame/game.json` - 最小合法配置

**修改**:
```json
{
  "deviceOrientation": "portrait"
}
```

**为什么能规避报错**:
- 移除了 `networkTimeout`、`subpackages`、`workers`、`preloadRule` 等小程序/小游戏特定字段
- 只保留最基础的 `deviceOrientation`，小游戏和小程序均支持
- 避免 mp 模式下校验不存在的字段

---

### 3. `minigame/app.json` - 兼容两种模式

**修改**:
```json
{
  "pages": ["pages/index/index"],
  "window": {
    "navigationBarTitleText": "曲径小兔"
  },
  "deviceOrientation": "portrait"
}
```

**为什么能规避报错**:
- 添加 `pages` 字段满足小程序基础校验（必须有页面）
- 使用 `window` 而非 `game` 特定配置，兼容 mp 模式
- 保留 `deviceOrientation` 作为兜底

**新增占位页面**:
- `minigame/pages/index/index.js`
- `minigame/pages/index/index.json`
- `minigame/pages/index/index.wxml`
- `minigame/pages/index/index.wxss`

> 💡 这些文件是空壳，仅用于通过校验，不影响实际游戏逻辑（游戏通过 `main.js` + `game.js` 独立运行）

---

### 4. README.md - 排查文档

新增「导入后若仍显示 mp 环境」章节，包含：
- 清除缓存步骤
- 重新导入指引
- 配置文件检查清单
- 重启开发者工具建议

---

## 测试建议

1. 以「小游戏」模式导入项目 → 应正常运行
2. 以「小程序」模式导入项目 → 应能通过校验，不报配置错误

---

**Commit**: `fix: harden WeChat project config for mp/game mode compatibility`
