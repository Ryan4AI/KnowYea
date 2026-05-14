# 数据库设计 - schema.md

> 知识胶囊 云开发数据库集合定义

---

## 集合总览

| 集合名 | 说明 | 索引 |
|--------|------|------|
| users | 用户信息 | openid (unique) |
| themes | 主题库 | status |
| nodes | 节点元数据 | themeId+order (unique) |
| user_themes | 用户主题进度 | openid+themeId (unique) |
| user_conversations | 对话历史 | openid+themeId+nodeId |
| user_gardens | 花园数据 | openid+themeId (unique) |
| user_achievements | 成就记录 | openid (unique) |
| user_favorites | 收藏列表 | openid (unique) |

---

## users（用户表）

```json
{
  "_id": "auto (openid)",
  "openid": "string (unique, required)",
  "profile": {
    "age": "number|null (1-5代表年龄段)",
    "occupation": "string|null",
    "interests": "string[]"
  },
  "createdAt": "number (时间戳)",
  "lastActive": "number (时间戳)",
  "settings": {
    "notifications": "boolean (default: true)"
  }
}
```

**索引**：
- openid: unique

---

## themes（主题表）

```json
{
  "_id": "string",
  "name": "string",
  "description": "string",
  "cover": "string (云存储URL)",
  "totalNodes": "number",
  "tags": "string[]",
  "status": "string (published|draft)",
  "createdAt": "number",
  "updatedAt": "number"
}
```

**索引**：
- status: 普通索引

---

## nodes（节点表）

```json
{
  "_id": "string",
  "themeId": "string",
  "order": "number",
  "title": "string",
  "learningObjective": "string",
  "completionSignal": "string",
  "status": "string (published|draft)"
}
```

**索引**：
- themeId+order: unique（确保每个主题内节点顺序唯一）

---

## user_themes（用户主题进度）

```json
{
  "_id": "string",
  "openid": "string",
  "themeId": "string",
  "completedNodeIds": "string[]",
  "currentNodeOrder": "number (default: 1)",
  "status": "string (learning|completed)",
  "startedAt": "number",
  "completedAt": "number|null"
}
```

**索引**：
- openid+themeId: unique
- openid: 普通索引

---

## user_conversations（用户对话表）

```json
{
  "_id": "string",
  "openid": "string",
  "themeId": "string",
  "nodeId": "string",
  "messages": [
    {
      "id": "string",
      "role": "string (user|ai)",
      "content": "string",
      "createdAt": "number"
    }
  ],
  "createdAt": "number",
  "updatedAt": "number"
}
```

**索引**：
- openid+themeId+nodeId: 普通索引

---

## user_gardens（用户花园表）

```json
{
  "_id": "string",
  "openid": "string",
  "themeId": "string",
  "plantLevel": "number (1-4: 种子/苗/花/果实)",
  "points": "number (default: 0)",
  "decorations": "string[]",
  "updatedAt": "number"
}
```

**索引**：
- openid+themeId: unique

---

## user_achievements（用户成就表）

```json
{
  "_id": "string",
  "openid": "string",
  "achievements": [
    {
      "id": "string (成就ID)",
      "unlockedAt": "number (时间戳)"
    }
  ]
}
```

**索引**：
- openid: unique

---

## user_favorites（用户收藏表）

```json
{
  "_id": "string",
  "openid": "string",
  "nodeIds": "string[]",
  "updatedAt": "number"
}
```

**索引**：
- openid: unique

---

## 初始化数据

### 默认主题库（themes）

```json
[
  {
    "_id": "theme_economics",
    "name": "经济学入门",
    "description": "从零开始理解经济学思维",
    "cover": "",
    "totalNodes": 0,
    "tags": ["经济学", "思维模型"],
    "status": "published",
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  },
  {
    "_id": "theme_psychology",
    "name": "心理学基础",
    "description": "理解人类行为背后的心理机制",
    "cover": "",
    "totalNodes": 0,
    "tags": ["心理学", "自我认知"],
    "status": "published",
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  },
  {
    "_id": "theme_thinking",
    "name": "思维模型大全",
    "description": "掌握高效思考的工具箱",
    "cover": "",
    "totalNodes": 0,
    "tags": ["思维", "效率"],
    "status": "published",
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  },
  {
    "_id": "theme_business",
    "name": "商业分析基础",
    "description": "理解商业世界的基本逻辑",
    "cover": "",
    "totalNodes": 0,
    "tags": ["商业", "分析"],
    "status": "published",
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  },
  {
    "_id": "theme_selfimprovement",
    "name": "自我提升指南",
    "description": "成为更好的自己",
    "cover": "",
    "totalNodes": 0,
    "tags": ["自我提升", "成长"],
    "status": "published",
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  }
]
```

### 成就定义（achievements）

```json
[
  { "id": "first_node", "name": "初学乍道", "description": "完成第一个节点", "icon": "🌱", "trigger": "completedNodes >= 1" },
  { "id": "first_theme", "name": "有始有终", "description": "完成第一个主题", "icon": "🌿", "trigger": "completedThemes >= 1" },
  { "id": "streak_3", "name": "连胜达人", "description": "连续学习 3 天", "icon": "🔥", "trigger": "streak >= 3" },
  { "id": "streak_7", "name": "持之以恒", "description": "连续学习 7 天", "icon": "💪", "trigger": "streak >= 7" },
  { "id": "node_10", "name": "十全十美", "description": "完成 10 个节点", "icon": "🏆", "trigger": "completedNodes >= 10" },
  { "id": "theme_3", "name": "三心二意", "description": "完成 3 个主题", "icon": "🎯", "trigger": "completedThemes >= 3" },
  { "id": "favorites_3", "name": "收藏家", "description": "收藏 3 个节点", "icon": "❤️", "trigger": "favorites >= 3" },
  { "id": "share", "name": "传播者", "description": "分享一个节点", "icon": "📤", "trigger": "shared >= 1" }
]
```

---

## 数据库权限配置

| 集合 | 读权限 | 写权限 |
|------|--------|--------|
| users | 仅创建者 | 仅创建者 |
| themes | 所有用户 | 仅管理员 |
| nodes | 所有用户 | 仅管理员 |
| user_themes | 仅创建者 | 仅创建者 |
| user_conversations | 仅创建者 | 仅创建者 |
| user_gardens | 仅创建者 | 仅创建者 |
| user_achievements | 仅创建者 | 仅创建者 |
| user_favorites | 仅创建者 | 仅创建者 |

云开发控制台设置：
- user_themes: {"read": "doc._openid == auth.openid", "write": "doc._openid == auth.openid"}
- user_conversations: {"read": "doc._openid == auth.openid", "write": "doc._openid == auth.openid"}
- user_gardens: {"read": "doc._openid == auth.openid", "write": "doc._openid == auth.openid"}
- user_achievements: {"read": "doc._openid == auth.openid", "write": "doc._openid == auth.openid"}
- user_favorites: {"read": "doc._openid == auth.openid", "write": "doc._openid == auth.openid"}