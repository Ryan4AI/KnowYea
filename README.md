# 千里学堂

> 每天几分钟，慢慢变强

基于微信小程序的 AI 对话式碎片学习工具。

---

## 产品概述

**定位**：AI 驱动的体系化碎片学习工具
**目标用户**：努力上进、渴望系统学习但缺乏整块时间的职场人、学生
**Slogan**：每天几分钟，慢慢变强

### 核心体验

- 📚 **打开即学**：进入小程序直接开始学习，零决策成本
- 💬 **对话式教学**：AI 导师通过自然对话讲解概念、举例、提问
- 🎯 **个性化推荐**：根据用户画像动态适配内容和例子
- 🌱 **体系化路线**：节点按顺序解锁，逐步掌握完整知识体系
- 🏆 **轻量激励**：知识花园（植物成长）和成就系统

---

## 技术架构

### 前端
- 微信小程序（TypeScript）
- 原生组件 + 自定义组件
- mobx-miniprogram 状态管理

### 后端
- 微信云开发（云函数 + 云数据库）
- AI：腾讯混元 hunyuan（与微信生态集成）

### 数据库集合
- `users` - 用户信息
- `themes` - 主题库
- `nodes` - 节点元数据
- `user_themes` - 用户主题进度
- `user_conversations` - 对话历史
- `user_gardens` - 花园数据
- `user_achievements` - 成就记录
- `user_favorites` - 收藏列表

---

## 页面结构

```
pages/
├── learn/          # 学习主页（对话界面）
├── themes/         # 全部主题管理
├── theme-store/    # 主题库
├── profile/        # 个人中心
├── history/        # 历史记录
├── favorites/      # 收藏夹
├── achievements/   # 成就展示
├── garden/         # 知识花园
└── settings/       # 设置
```

---

## 云函数

| 云函数 | 功能 |
|--------|------|
| login | 匿名登录 |
| generateTheme | AI 生成主题 |
| sendMessage | AI 对话 |
| completeNode | 完成节点 |
| getHomeData | 首页数据 |
| switchTheme | 切换主题 |
| addTheme | 添加主题 |
| getThemes | 获取主题列表 |
| getStoreThemes | 获取主题库 |
| getUserProfile | 获取用户信息 |
| toggleFavorite | 收藏/取消收藏 |
| getFavorites | 获取收藏列表 |
| getGarden | 获取花园数据 |
| getHistory | 获取历史记录 |

---

## 开发

### 本地开发

1. 安装微信开发者工具
2. 导入 `miniprogram` 目录
3. 配置云开发环境
4. 上传云函数到云端

### 云函数部署

```bash
# 登录微信开发者工具后，右键云函数目录，选择"上传并部署"
```

### AI 配置

生产环境需要在 `sendMessage` 和 `generateTheme` 中接入腾讯混元 API：
- API 地址：`https://hunyuan.cloud.tencent.com/api/v1/chat/completions`
- 模型：`hunyuan-standard`

---

## 开发里程碑

| 周次 | 任务 |
|------|------|
| 第 1 周 | 项目搭建 + 登录 + 主题生成 |
| 第 2 周 | 对话界面 + AI 模拟回复 |
| 第 3 周 | 真实 AI 集成 + 完成判定 |
| 第 4 周 | 主题管理（切换/添加/库）|
| 第 5 周 | 花园 + 成就 + 收藏 + 历史 |
| 第 6 周 | 真机测试 + 提交审核 |

---

## 产品文档

- [产品说明书](./docs/产品说明书.md)
- [技术设计文档](./docs/TECH-DESIGN.md)
- [数据库设计](./database/schema.md)