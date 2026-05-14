// 云函数：generateTheme - 生成主题
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// AI 调用配置
const HUNYUAN_API = 'https://hunyuan.cloud.tencent.com/api/v1/chat/completions'
const MODEL = 'hunyuan-standard'

exports.main = async (event, context) => {
  const { openid, themeName, profile, tags } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    // 构造 AI prompt
    let systemPrompt = `你是一位专业的教育专家，擅长根据用户需求设计学习路径。`
    let userPrompt = ''

    if (themeName) {
      // 根据主题名生成
      userPrompt = `请为用户生成一个名为"${themeName}"的学习主题。

要求：
1. 主题应该适合零基础学习者
2. 节点数量控制在 8-15 个
3. 每个节点应该是一个独立的知识点，有明确的学习目标
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
      "completionSignal": "完成判定标准（用户能...则视为掌握）"
    }
  ]
}`
    } else if (profile) {
      // 根据用户画像生成
      const ageMap = { 1: '18岁以下', 2: '18-25岁', 3: '26-35岁', 4: '36-45岁', 5: '45岁以上' }
      const age = ageMap[profile.age] || '25-35岁'
      const occupation = profile.occupation || '职场人士'
      const interests = profile.interests?.join('、') || '通用知识'

      userPrompt = `根据以下用户画像，推荐一个合适的学习主题：

用户信息：
- 年龄：${age}
- 职业：${occupation}
- 兴趣：${interests}

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
}`
    } else {
      return { success: false, error: '缺少 themeName 或 profile' }
    }

    // 调用 AI（这里使用模拟响应，生产环境需要真实调用）
    let themeData
    try {
      // TODO: 生产环境调用腾讯混元 API
      // const response = await callAI(systemPrompt, userPrompt)
      // themeData = JSON.parse(response)

      // 临时使用模拟数据
      themeData = getSimulatedTheme(themeName || profile?.interests?.[0] || '通用知识')
    } catch (e) {
      console.error('AI 调用失败', e)
      return { success: false, error: 'AI 生成失败' }
    }

    // 创建主题记录
    const themeId = 'theme_' + Date.now()
    await db.collection('themes').add({
      data: {
        _id: themeId,
        name: themeData.name,
        description: themeData.description,
        cover: '',
        totalNodes: themeData.totalNodes,
        tags: tags || themeData.tags || [],
        status: 'published',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    })

    // 创建节点记录
    const nodeIds = []
    for (let i = 0; i < themeData.nodes.length; i++) {
      const node = themeData.nodes[i]
      const nodeId = `${themeId}_node_${i + 1}`

      await db.collection('nodes').add({
        data: {
          _id: nodeId,
          themeId,
          order: i + 1,
          title: node.title,
          learningObjective: node.learningObjective,
          completionSignal: node.completionSignal,
          status: 'published',
        }
      })
      nodeIds.push(nodeId)
    }

    // 创建用户主题进度记录
    await db.collection('user_themes').add({
      data: {
        openid,
        themeId,
        completedNodeIds: [],
        currentNodeOrder: 1,
        status: 'learning',
        startedAt: Date.now(),
        completedAt: null,
      }
    })

    // 初始化用户花园记录
    await db.collection('user_gardens').add({
      data: {
        openid,
        themeId,
        plantLevel: 1, // 种子阶段
        points: 0,
        decorations: [],
        updatedAt: Date.now(),
      }
    })

    // 返回结果
    return {
      success: true,
      theme: {
        _id: themeId,
        name: themeData.name,
        description: themeData.description,
        totalNodes: themeData.totalNodes,
      },
      nodes: themeData.nodes.map((n, i) => ({
        _id: nodeIds[i],
        order: i + 1,
        title: n.title,
        learningObjective: n.learningObjective,
        completionSignal: n.completionSignal,
      })),
    }
  } catch (e) {
    console.error('generateTheme 云函数错误', e)
    return { success: false, error: e.message }
  }
}

// 模拟数据（生产环境删除）
function getSimulatedTheme(keyword) {
  const themes = {
    '经济学': {
      name: '经济学入门',
      description: '从零开始理解经济学思维',
      totalNodes: 10,
      tags: ['经济学', '思维模型'],
      nodes: [
        { title: '稀缺性', learningObjective: '理解稀缺性的概念', completionSignal: '能用例子解释什么是稀缺性' },
        { title: '机会成本', learningObjective: '理解机会成本的含义', completionSignal: '能说出做选择时的机会成本' },
        { title: '供需关系', learningObjective: '理解供给和需求的互动', completionSignal: '能解释价格如何由供需决定' },
        { title: '弹性', learningObjective: '理解需求弹性的概念', completionSignal: '能区分弹性大小不同的商品' },
        { title: '规模经济', learningObjective: '理解规模经济的含义', completionSignal: '能用例子解释规模经济' },
        { title: '市场结构', learningObjective: '了解不同市场结构', completionSignal: '能区分完全竞争和垄断' },
        { title: '外部性', learningObjective: '理解外部性的概念', completionSignal: '能举例说明正负外部性' },
        { title: '公共物品', learningObjective: '理解公共物品的特征', completionSignal: '能区分公共物品和私人物品' },
        { title: '信息不对称', learningObjective: '理解信息不对称的影响', completionSignal: '能举出信息不对称的例子' },
        { title: '行为经济学', learningObjective: '了解行为经济学基本概念', completionSignal: '能解释一个行为经济学现象' },
      ]
    },
    '心理学': {
      name: '心理学基础',
      description: '理解人类行为背后的心理机制',
      totalNodes: 10,
      tags: ['心理学', '自我认知'],
      nodes: [
        { title: '认知偏差', learningObjective: '了解常见认知偏差', completionSignal: '能举出两种认知偏差的例子' },
        { title: '从众效应', learningObjective: '理解从众心理', completionSignal: '能解释从众效应的原因' },
        { title: '锚定效应', learningObjective: '理解锚定效应', completionSignal: '能用例子解释锚定效应' },
        { title: '损失厌恶', learningObjective: '理解损失厌恶', completionSignal: '能解释为什么人们害怕损失' },
        { title: '确认偏差', learningObjective: '理解确认偏差', completionSignal: '能说明确认偏差如何影响判断' },
        { title: '心理账户', learningObjective: '理解心理账户', completionSignal: '能解释心理账户的概念' },
        { title: '峰终定律', learningObjective: '理解峰终定律', completionSignal: '能用例子解释峰终定律' },
        { title: '框架效应', learningObjective: '理解框架效应', completionSignal: '能说明表述方式如何影响选择' },
        { title: '自我认知', learningObjective: '了解自我认知的陷阱', completionSignal: '能识别自我认知中的偏见' },
        { title: '成长心态', learningObjective: '理解成长心态', completionSignal: '能区分成长心态和固定心态' },
      ]
    },
  }

  // 根据关键词选择主题
  for (const key in themes) {
    if (keyword.includes(key)) {
      return themes[key]
    }
  }

  // 默认返回经济学主题
  return themes['经济学']
}