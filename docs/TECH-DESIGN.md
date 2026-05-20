# 千里学堂 - 技术设计文档

> 基于《千里学堂 - 产品开发说明书 v2.0》
> 设计版本：1.0
> 最后更新：2026-05-14

---

## 1. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | 微信小程序（TypeScript）|
| 框架 | 原生组件 + 自定义组件 |
| 状态管理 | mobx-miniprogram |
| 后端 | 微信云开发（云函数 + 云数据库）|
| AI | 腾讯混元 hunyuan（与微信生态集成好）|
| 内容安全 | msgSecCheck |

---

## 2. 项目结构

```
knowledge-capsule/
├── miniprogram/                 # 小程序前端
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── pages/
│   │   ├── learn/              # 学习主页（对话界面）
│   │   ├── themes/             # 全部主题管理
│   │   ├── theme-store/        # 主题库
│   │   ├── profile/            # 个人中心
│   │   ├── history/            # 历史记录
│   │   ├── favorites/          # 收藏夹
│   │   ├── achievements/       # 成就展示
│   │   ├── garden/             # 知识花园
│   │   └── settings/           # 设置
│   ├── components/
│   │   ├── message-card/       # 消息卡片
│   │   ├── concept-card/       # 概念卡片
│   │   ├── example-card/       # 例子卡片
│   │   ├── question-card/      # 题目卡片（选择题/开放题）
│   │   ├── summary-card/       # 总结卡片
│   │   ├── theme-switcher/     # 主题切换弹窗
│   │   ├── plant/              # 植物组件
│   │   └── achievement-popup/  # 成就弹窗
│   └── stores/
│       ├── user.ts             # 用户状态
│       ├── theme.ts            # 主题状态
│       └── conversation.ts      # 对话状态
├── cloudfunctions/             # 云函数
│   ├── login/                  # 匿名登录
│   ├── generateTheme/          # 生成主题
│   ├── sendMessage/            # AI 对话
│   ├── completeNode/           # 完成节点
│   ├── getHomeData/            # 首页数据
│   ├── switchTheme/            # 切换主题
│   ├── addTheme/               # 添加主题
│   ├── getConversations/       # 获取对话历史
│   ├── getThemes/              # 获取主题列表
│   ├── getUserProfile/         # 获取用户信息
│   ├── updateUserProfile/      # 更新用户画像
│   ├── toggleFavorite/         # 收藏/取消收藏
│   ├── getFavorites/          # 获取收藏列表
│   ├── getAchievements/        # 获取成就
│   ├── getGarden/             # 获取花园数据
│   ├── checkAchievement/      # 检查成就
│   └── msgSecCheck/           # 内容安全检测
├── database/                   # 数据库设计
│   └── schema.md
├── docs/
│   └── ai-prompt.md           # AI 对话 prompt 设计
└── README.md
```

---

## 3. 数据库设计

### 3.1 集合定义

#### users（用户表）
```typescript
{
  _id: string,              // 自动生成，等于 openid
  openid: string,           // 微信 openid
  profile: {
    age: number | null,     // 年龄段：1=18以下, 2=18-25, 3=26-35, 4=36-45, 5=45以上
    occupation: string,    // 职业
    interests: string[],    // 兴趣标签
  },
  createdAt: number,        // 创建时间戳
  lastActive: number,       // 最后活跃时间
  settings: {
    notifications: boolean, // 通知开关
  }
}
```

#### themes（主题表）
```typescript
{
  _id: string,
  name: string,             // 主题名称（如"经济学入门"）
  description: string,     // 主题描述
  cover: string,            // 封面图 URL
  totalNodes: number,       // 节点总数（AI 生成时确定）
  tags: string[],          // 标签（如["经济学","思维模型"]）
  status: 'published' | 'draft',  // 状态：已发布/草稿
  createdAt: number,
  updatedAt: number,
}
```

#### nodes（节点表）
```typescript
{
  _id: string,
  themeId: string,          // 关联主题 ID
  order: number,            // 节点顺序（1-based）
  title: string,            // 节点标题（如"沉没成本"）
  learningObjective: string, // 教学目标
  completionSignal: string,  // 完成判定标准
  status: 'published' | 'draft',
}
```

#### user_themes（用户-主题进度表）
```typescript
{
  _id: string,
  openid: string,
  themeId: string,
  completedNodeIds: string[],  // 已完成节点 ID 列表
  currentNodeOrder: number,     // 当前节点顺序
  status: 'learning' | 'completed',  // 学习中/已完成
  startedAt: number,
  completedAt: number | null,
}
```

#### user_conversations（用户对话表）
```typescript
{
  _id: string,
  openid: string,
  themeId: string,
  nodeId: string,
  messages: Message[],      // 消息数组，最多 30 条（分页加载）
  createdAt: number,
  updatedAt: number,
}

interface Message {
  id: string,
  role: 'user' | 'ai',
  content: string,          // 原始内容（含 AI 结构化标记）
  createdAt: number,
}
```

#### user_gardens（用户花园表）
```typescript
{
  _id: string,
  openid: string,
  themeId: string,
  plantLevel: number,       // 植物阶段：1=种子, 2=苗, 3=花, 4=果实
  points: number,          // 累积积分
  decorations: string[],   // 装饰物（如"金牌植物"）
  updatedAt: number,
}
```

#### user_achievements（用户成就表）
```typescript
{
  _id: string,
  openid: string,
  achievements: AchievementRecord[],  // 已解锁成就列表
}

interface AchievementRecord {
  id: string,              // 成就 ID
  unlockedAt: number,      // 解锁时间
}
```

#### user_favorites（用户收藏表）
```typescript
{
  _id: string,
  openid: string,
  nodeIds: string[],       // 收藏的节点 ID 列表
  updatedAt: number,
}
```

### 3.2 预置主题库

初始主题库（AI 预生成）：
1. 经济学入门
2. 心理学基础
3. 思维模型大全
4. 商业分析基础
5. 自我提升指南

---

## 4. 云函数设计

### 4.1 login（登录）
- **触发**：小程序启动时调用
- **逻辑**：获取微信 openid，创建或更新用户记录
- **返回**：{ openid, isNewUser }

### 4.2 generateTheme（生成主题）
- **输入**：{ openid, themeName?: string, profile?: UserProfile }
- **逻辑**：
  1. 调用 AI，输入用户画像或主题名，生成节点序列
  2. 创建 theme 记录
  3. 创建 nodes 记录
  4. 创建 user_themes 记录
  5. 初始化 user_gardens 记录
- **返回**：{ themeId, theme, nodes }

### 4.3 sendMessage（发送消息）
- **输入**：{ openid, themeId, nodeId, content }
- **逻辑**：
  1. 获取该节点的学习目标（learningObjective）和完成信号（completionSignal）
  2. 获取最近对话历史（最多 10 条）
  3. 构造 system prompt，调用 AI
  4. 内容安全检测
  5. 保存用户消息和 AI 回复到 user_conversations
  6. 检查是否包含 [完成] 标记
- **返回**：{ message: AIMessage, isCompleted: boolean }

### 4.4 completeNode（完成节点）
- **输入**：{ openid, themeId, nodeId }
- **逻辑**：
  1. 更新 user_themes：completedNodeIds 添加 nodeId，currentNodeOrder + 1
  2. 更新 user_gardens：points + 10，plantLevel 升级检查
  3. 检查成就解锁
  4. 检查主题是否完成（所有节点完成）
- **返回**：{ completed: boolean, isThemeCompleted: boolean, newPlantLevel?: number, unlockedAchievement?: Achievement }

### 4.5 getHomeData（首页数据）
- **输入**：{ openid }
- **逻辑**：
  1. 获取用户当前主题和节点
  2. 获取对话历史
  3. 获取用户信息
- **返回**：{ currentTheme, currentNode, messages, user }

### 4.6 switchTheme（切换主题）
- **输入**：{ openid, themeId }
- **返回**：{ theme, currentNode, messages }

### 4.7 addTheme（添加主题）
- **输入**：{ openid, themeId }  // 从主题库添加
- **逻辑**：调用 generateTheme，云端生成节点
- **返回**：{ theme, nodes }

### 4.8 toggleFavorite（收藏/取消收藏）
- **输入**：{ openid, nodeId }
- **返回**：{ favorited: boolean }

### 4.9 checkAchievement（检查成就）
- **输入**：{ openid, trigger: string }
- **逻辑**：根据触发条件检查是否解锁新成就
- **返回**：{ unlocked?: Achievement }

### 4.10 getConversations（获取对话历史）
- **输入**：{ openid, themeId, nodeId, offset?: number, limit?: number }
- **返回**：{ messages: Message[], hasMore: boolean }

---

## 5. AI Prompt 设计

### 5.1 角色定义（System Prompt）

```
你是一位专业、耐心、善于引导的AI导师。你的任务是帮助用户通过对话学习一个知识概念。

核心原则：
1. 用通俗易懂的语言解释抽象概念
2. 多用生活中的实际例子
3. 适当提问，确认用户理解程度
4. 鼓励用户思考，不要直接给出答案

输出格式要求：
- 使用结构化标记来区分不同类型的内容
- 每次回复应该简洁（100-200字），适合手机阅读
- 根据教学需要，灵活使用以下标记：

  [概念]...[/概念] - 用于介绍一个新概念的定义
  [例子]...[/例子] - 用于举例说明
  [题目 type="choice"]...[/题目] - 选择题，选项用|A|B|C|D分隔
  [题目 type="open"]...[/题目] - 开放题，让用户自由回答
  [总结]...[/总结] - 用于总结本节点学习内容
  [完成] - 当用户达成学习目标时包含此标记

完成信号：只有当用户能够用自己的话解释概念，并举出一个正确的例子时，才标记 [完成]。

注意：
- 不要一次性输出太多内容
- 每次只讲一个核心概念
- 用户回答后，给出具体的反馈
```

### 5.2 generateTheme 的 AI 调用

**输入**：
```
用户画像：年龄={age}, 职业={occupation}, 兴趣={interests}
请为这个用户生成一个学习主题。

或者：
主题名称：{themeName}
请生成一个适合零基础用户的学习主题。

请以 JSON 格式输出，结构如下：
{
  "name": "主题名称",
  "description": "主题描述（一句话）",
  "totalNodes": 节点数量（5-15）,
  "tags": ["标签1", "标签2"],
  "nodes": [
    {
      "title": "节点标题",
      "learningObjective": "学习目标描述",
      "completionSignal": "完成判定标准"
    }
  ]
}
```

---

## 6. 成就系统设计

| 成就 ID | 名称 | 描述 | 触发条件 |
|---------|------|------|----------|
| first_node | 初学乍道 | 完成第一个节点 | completedNodes >= 1 |
| first_theme | 有始有终 | 完成第一个主题 | completedThemes >= 1 |
| streak_3 | 连胜达人 | 连续学习 3 天 | streak >= 3 |
| streak_7 | 持之以恒 | 连续学习 7 天 | streak >= 7 |
| node_10 | 十全十美 | 完成 10 个节点 | completedNodes >= 10 |
| theme_3 | 三心二意 | 完成 3 个主题 | completedThemes >= 3 |
| favorites_3 | 收藏夹 | 收藏 3 个节点 | favorites >= 3 |
| share | 传播者 | 分享一个节点 | shared >= 1 |

---

## 7. 知识花园设计

植物生长阶段：

| 阶段 | 完成节点数 | 植物形态 | 图标 |
|------|-----------|----------|------|
| 种子 | 0 | 种子在土里 | 🌱 |
| 幼苗 | 1-3 | 小芽冒头 | 🌿 |
| 成长 | 4-6 | 叶子展开 | 🌾 |
| 开花 | 7-9 | 开花中 | 🌸 |
| 结果 | 10+ | 果实成熟 | 🍎 |

主题完成奖励：装饰物（🏆金牌植物）

---

## 8. 开发里程碑

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第 1 周 | 项目搭建 + 登录 + 主题生成 | 能创建主题并查看节点 |
| 第 2 周 | 对话界面 + AI 模拟回复 | 能收发消息，能保存对话 |
| 第 3 周 | 真实 AI 集成 + 完成判定 | AI 对话 + 节点完成逻辑 |
| 第 4 周 | 主题管理（切换/添加/库）| 主题切换流畅 |
| 第 5 周 | 花园 + 成就 + 收藏 + 历史 | 激励体系完整 |
| 第 6 周 | 真机测试 + 修复 + 提交审核 | 发布体验版 |

---

## 9. 风险与应对

| 风险 | 应对 |
|------|------|
| AI 回复质量不稳定 | 强化 prompt，fallback 回复，手动完成节点 |
| 微信审核被拒 | 无诱导分享，无虚拟支付，隐私政策清晰 |
| 成本超支 | 每日调用限制 50 次，低成本模型优先 |
| 内容违规 | msgSecCheck 检测，违规记录人工复查 |
| 用户留存低 | 花园+成就激励，快速迭代社交功能 |

---

## 10. 技术决策汇总

1. **AI 选择**：腾讯混元 hunyuan（推荐）或 GPT-3.5-turbo
2. **状态管理**：mobx-miniprogram
3. **会话历史**：存 30 条，支持滚动加载更多
4. **每日 AI 调用限制**：50 次
5. **节点完成判定**：AI 判断 + 用户手动确认
6. **主题库**：5 个预置主题，支持 AI 动态生成更多