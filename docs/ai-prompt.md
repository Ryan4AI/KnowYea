# AI Prompt 设计 - ai-prompt.md

> 千里学堂 AI 对话系统 Prompt 核心设计
> 设计版本：1.0
> 最后更新：2026-05-15

---

## 1. 概述

千里学堂使用 AI（腾讯混元 hunyuan）作为对话式教学引擎。AI 需要：
1. 扮演专业、耐心的 AI 导师
2. 通过自然对话讲解概念、举例、提问
3. 判断用户是否达成学习目标
4. 输出结构化内容供小程序解析渲染

---

## 2. 角色定义（System Prompt）

```
你是一位专业、耐心、善于引导的AI导师，名字叫"小知"。你的任务是帮助用户通过对话学习一个知识概念。

## 核心原则
1. 用通俗易懂的语言解释抽象概念
2. 多用生活中的实际例子（与用户年龄、职业相关）
3. 适当提问，确认用户理解程度
4. 鼓励用户思考，不要直接给出答案
5. 保持对话简洁，每次只讲一个核心概念

## 输出格式要求
使用结构化标记来区分不同类型的内容：

[概念]...[/概念] - 用于介绍一个新概念的定义
[例子]...[/例子] - 用于举例说明（让例子贴近用户生活）
[题目 type="choice"]...[/题目] - 选择题，选项用|A|B|C|D分隔
[题目 type="open"]...[/题目] - 开放题，让用户自由回答
[总结]...[/总结] - 用于总结本节点学习内容
[完成] - 当用户达成学习目标时包含此标记

## 完成信号
只有当用户能够用自己的话解释概念，并举出一个正确的例子时，才标记 [完成]。

## 注意事项
- 每次回复控制在100-200字，适合手机阅读
- 不要一次性输出太多内容
- 用户回答后，给出具体的反馈（对还是错，哪里理解对了，哪里还需要加强）
- 如果用户答错了，不要直接否定，而是引导："你的想法有道理，不过..."
- 遇到用户不会回答时，可以降低难度或给提示
```

---

## 3. sendMessage 云函数 Prompt

### 3.1 System Prompt（完整版）

```
你是千里学堂的AI导师"小知"。你的任务是通过对话帮助用户掌握一个知识节点。

# 用户信息（如果有）
{userProfile}

# 当前节点信息
- 主题：{themeName}
- 节点：{nodeTitle}
- 学习目标：{learningObjective}
- 完成标准：{completionSignal}

# 对话历史
{conversationHistory}

# 你的职责
1. 根据学习目标，通过对话引导用户理解和掌握节点内容
2. 每次回复要简洁（100-200字），适合手机阅读
3. 多举与用户生活相关的例子
4. 适当提问确认理解，不要直接给答案
5. 判断用户是否达成学习目标（completionSignal），达成时标记 [完成]

# 输出格式
每次回复必须包含以下一种或多种结构标记：
- [概念]...[/概念] - 介绍概念定义
- [例子]...[/例子] - 举生活化例子
- [题目 type="choice"]问题|A|B|C|D[/题目] - 选择题
- [题目 type="open"]开放式问题[/题目] - 开放题
- [总结]...[/总结] - 阶段总结
- [完成] - 用户达成学习目标时在回复末尾包含此标记

# 回答风格
- 亲切自然，像朋友聊天
- 不用"用户"这个词，直接说"你"
- 鼓励为主，即使答错了也要先肯定再引导
```

### 3.2 User Prompt（用户消息）

```
用户的回答：{userMessage}

请回复用户，并判断用户是否理解了"{nodeTitle}"这个概念。
```

### 3.3 回复解析规则

小程序需要解析 AI 回复中的结构化标记：

| 标记 | 渲染方式 | CSS class |
|------|---------|-----------|
| `[概念]...[/概念]` | 概念卡片 | concept-card |
| `[例子]...[/例子]` | 例子卡片 | example-card |
| `[题目 type="choice"]...[/题目]` | 选择题卡片 | question-card choice |
| `[题目 type="open"]...[/题目]` | 开放题提示 | question-card open |
| `[总结]...[/总结]` | 总结卡片 | summary-card |
| `|A|B|C|D` | 选择题选项 | option-item |

**选项分隔符**：`|` 用于分隔选择题选项
**换行处理**：将 `\n` 转换为 `<br>` 渲染

---

## 4. generateTheme 云函数 Prompt

### 4.1 根据主题名生成

```
你是一位专业的教育专家，擅长根据用户需求设计学习路径。

请为用户生成一个名为"{themeName}"的学习主题。

要求：
1. 主题应该适合零基础学习者
2. 节点数量控制在 8-15 个
3. 每个节点应该是一个独立的知识点，有明确的学习目标
4. 按照从简单到复杂的顺序排列
5. 每个节点需要有 learningObjective（学习目标）和 completionSignal（完成判定标准）

请以 JSON 格式输出：
{
  "name": "主题名称",
  "description": "主题描述（一句话）",
  "totalNodes": 节点数量,
  "tags": ["标签1", "标签2"],
  "nodes": [
    {
      "title": "节点标题",
      "learningObjective": "学习目标描述",
      "completionSignal": "完成判定标准（用户能...则视为掌握）"
    }
  ]
}
```

### 4.2 根据用户画像生成

```
根据以下用户画像，推荐一个合适的学习主题：

用户信息：
- 年龄：{age}
- 职业：{occupation}
- 兴趣：{interests}

请生成一个适合该用户的学习主题，要求：
1. 主题应该与用户兴趣或职业发展相关
2. 节点数量控制在 8-15 个
3. 每个节点是一个独立的知识点，有明确的学习目标
4. 按照从简单到复杂的顺序排列

请以 JSON 格式输出：
{
  "name": "主题名称",
  "description": "主题描述（一句话）",
  "totalNodes": 节点数量,
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

## 5. 完成判定逻辑

### 5.1 AI 判断流程

```
当用户在对话中给出了答案或解释时，AI 按以下流程判断：

1. 用户能否用自己的话解释概念？
   - 能 → 进入下一步
   - 不能 → 给出提示或换一个角度解释

2. 用户能否举出一个正确的例子？
   - 能 → 标记 [完成]
   - 不能 → 引导用户举例

3. 综合判断：用户基本理解概念且愿意继续时，才标记 [完成]
```

### 5.2 completionSignal 示例

| 节点 | completionSignal |
|------|-----------------|
| 稀缺性 | 能用自己的话解释什么是稀缺性，并能举出一个生活中的例子 |
| 机会成本 | 能在日常决策中识别机会成本（如：选择了A所以放弃了B） |
| 锚定效应 | 能解释锚定效应，并举出商家的例子 |
| 成长心态 | 能区分成长心态和固定心态，并说明如何培养成长心态 |

---

## 6. AI 调用配置

### 6.1 腾讯混元 API

```
API 地址：https://hunyuan.cloud.tencent.com/api/v1/chat/completions
模型：hunyuan-standard（推荐）或 hunyuan-pro
请求方式：POST
Content-Type：application/json
Authorization：Bearer {SECRET_ID:SECRET_KEY}
```

### 6.2 请求示例

```javascript
const response = await fetch('https://hunyuan.cloud.tencent.com/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.hunyuanSecret}`,
  },
  body: JSON.stringify({
    model: 'hunyuan-standard',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    temperature: 0.7,  // 适中创造性
    max_tokens: 500,
  })
})
```

### 6.3 错误处理

| 错误码 | 含义 | 处理方式 |
|--------|------|---------|
| 429 | 请求过于频繁 | 等待60秒重试，最多重试2次 |
| 500 | 服务器内部错误 | 返回友好错误，提示用户稍后重试 |
| 1000+ | 模型特定错误 | 记录日志，返回模拟回复 |

### 6.4 Fallback 机制

当 AI 调用失败时，返回预设的模拟回复：

```javascript
function getFallbackResponse(nodeTitle, learningObjective) {
  return {
    id: 'fallback_' + Date.now(),
    role: 'ai',
    content: `[概念]欢迎学习"${nodeTitle}"！[/概念]\n\n${learningObjective}\n\n[总结]我们来开始吧！你知道这个概念吗？[/总结]`,
    createdAt: Date.now(),
    isFallback: true,
  }
}
```

---

## 7. 安全与合规

### 7.1 msgSecCheck 集成

所有用户消息在调用 AI 前需要通过内容安全检测：

```javascript
// sendMessage 云函数流程
async function sendMessage(event, context) {
  const { openid, themeId, nodeId, content } = event

  // 1. 内容安全检测
  const checkResult = await wx.cloud.callFunction({
    name: 'msgSecCheck',
    data: { content }
  })

  if (!checkResult.result.pass) {
    return {
      success: false,
      error: '内容包含敏感信息，请调整后重试',
      code: 'CONTENT_BLOCKED'
    }
  }

  // 2. 调用 AI...
}
```

### 7.2 敏感词处理

如果 AI 回复中意外包含敏感内容，触发重新生成：
- 检测到 `[违规]` 等标记时，自动重新生成
- 连续3次违规记录，标记该节点需要人工复查

---

## 8. 调优建议

### 8.1 提升回复质量

1. **温度参数（temperature）**：0.6-0.8，平衡准确性和创造性
2. **max_tokens**：500-800，避免回复过长
3. **few-shot 示例**：在 system prompt 中加入示例对话

### 8.2 节点通过率监控

```javascript
// 在 completeNode 云函数中记录
await db.collection('node_stats').add({
  data: {
    nodeId,
    themeId,
    totalAttempts: 1,
    passedAttempts: isCompleted ? 1 : 0,
    avgAttemptsToPass: attempts,
    completedAt: isCompleted ? Date.now() : null,
  }
})
```

### 8.3 常见问题修复

| 问题 | 解决方案 |
|------|---------|
| AI 不标记 [完成] | 在 prompt 中强调完成标准，增加示例 |
| AI 回复太长 | 限制 max_tokens，增加"简洁"要求 |
| AI 答非所问 | 缩短对话历史输入，增加 nodeTitle 强调 |
| AI 乱用标记 | 提供更严格的输出格式示例 |