// 云函数：initDatabase - 初始化数据库（预置主题和节点）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 预置主题数据
const PRESET_THEMES = [
  {
    _id: 'theme_economics',
    name: '经济学入门',
    description: '从零开始理解经济学思维',
    cover: '',
    totalNodes: 10,
    tags: ['经济学', '思维模型'],
    status: 'published',
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
  {
    _id: 'theme_psychology',
    name: '心理学基础',
    description: '理解人类行为背后的心理机制',
    cover: '',
    totalNodes: 10,
    tags: ['心理学', '自我认知'],
    status: 'published',
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
  {
    _id: 'theme_thinking',
    name: '思维模型大全',
    description: '掌握高效思考的工具箱',
    cover: '',
    totalNodes: 10,
    tags: ['思维', '效率'],
    status: 'published',
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
  {
    _id: 'theme_business',
    name: '商业分析基础',
    description: '理解商业世界的基本逻辑',
    cover: '',
    totalNodes: 10,
    tags: ['商业', '分析'],
    status: 'published',
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
  {
    _id: 'theme_selfimprovement',
    name: '自我提升指南',
    description: '成为更好的自己',
    cover: '',
    totalNodes: 10,
    tags: ['自我提升', '成长'],
    status: 'published',
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
]

// 预置节点数据（每个主题10个节点）
const PRESET_NODES = {
  theme_economics: [
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
  ],
  theme_psychology: [
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
  ],
  theme_thinking: [
    { title: '第一性原理', learningObjective: '理解第一性原理思维', completionSignal: '能用第一性原理分析问题' },
    { title: '二阶思维', learningObjective: '理解二阶思维', completionSignal: '能分析决策的二阶后果' },
    { title: '概率思维', learningObjective: '理解概率思维', completionSignal: '能估计事件的概率' },
    { title: '逆向思考', learningObjective: '理解逆向思考法', completionSignal: '能从结果倒推原因' },
    { title: '奥卡姆剃刀', learningObjective: '理解简约原则', completionSignal: '能选择更简单的解释' },
    { title: '地图不是领土', learningObjective: '理解模型与现实的区别', completionSignal: '能区分模型和实际情况' },
    { title: '汉隆的剃刀', learningObjective: '理解宽容思维', completionSignal: '能不把愚蠢当恶意' },
    { title: '能力圈', learningObjective: '理解能力圈概念', completionSignal: '能识别自己的能力边界' },
    { title: '系统思维', learningObjective: '理解系统思维', completionSignal: '能识别系统中的反馈循环' },
    { title: '反脆弱', learningObjective: '理解反脆弱概念', completionSignal: '能从冲击中成长' },
  ],
  theme_business: [
    { title: '商业模式画布', learningObjective: '理解商业模式画布', completionSignal: '能描述一个商业模式' },
    { title: '价值主张', learningObjective: '理解价值主张', completionSignal: '能说明产品提供的核心价值' },
    { title: '客户细分', learningObjective: '理解客户细分', completionSignal: '能识别目标客户群' },
    { title: '竞争分析', learningObjective: '理解竞争分析方法', completionSignal: '能分析竞争对手' },
    { title: 'SWOT分析', learningObjective: '理解SWOT分析', completionSignal: '能进行SWOT分析' },
    { title: '波特五力', learningObjective: '理解行业竞争结构', completionSignal: '能分析行业竞争强度' },
    { title: '精益创业', learningObjective: '理解精益创业方法', completionSignal: '能运用MVP验证想法' },
    { title: '增长黑客', learningObjective: '理解增长黑客思维', completionSignal: '能设计增长实验' },
    { title: '单位经济', learningObjective: '理解单位经济模型', completionSignal: '能计算客户终身价值' },
    { title: '护城河', learningObjective: '理解竞争优势来源', completionSignal: '能识别企业的护城河' },
  ],
  theme_selfimprovement: [
    { title: '目标设定', learningObjective: '掌握SMART目标法', completionSignal: '能设定一个SMART目标' },
    { title: '时间管理', learningObjective: '理解时间管理原则', completionSignal: '能优先处理重要事项' },
    { title: '有效沟通', learningObjective: '掌握沟通技巧', completionSignal: '能清晰表达想法' },
    { title: '积极倾听', learningObjective: '理解倾听的重要性', completionSignal: '能进行有效倾听' },
    { title: '情绪管理', learningObjective: '理解情绪调节方法', completionSignal: '能在压力下保持冷静' },
    { title: '自我激励', learningObjective: '掌握激励自己的方法', completionSignal: '能持续保持动力' },
    { title: '习惯养成', learningObjective: '理解习惯形成的机制', completionSignal: '能培养新习惯' },
    { title: '持续学习', learningObjective: '理解学习方法论', completionSignal: '能制定个人学习计划' },
    { title: '压力应对', learningObjective: '掌握压力管理技巧', completionSignal: '能有效应对压力' },
    { title: '人际关系', learningObjective: '理解人际交往原则', completionSignal: '能建立和维护关系' },
  ],
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 仅允许特定操作者调用（生产环境应校验）
  // if (!openid) {
  //   return { success: false, error: '权限不足' }
  // }

  try {
    let themesCreated = 0
    let nodesCreated = 0

    // 批量创建主题
    for (const theme of PRESET_THEMES) {
      // 检查是否已存在
      let exist = false
      try {
        const res = await db.collection('themes').doc(theme._id).get()
        exist = !!res.data
      } catch(e) {
        exist = false
      }
      
      if (!exist) {
        await db.collection('themes').add({
          data: theme,
        })
        themesCreated++
      }

      // 创建节点
      const nodes = PRESET_NODES[theme._id] || []
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const nodeId = `${theme._id}_node_${i + 1}`

        // 检查节点是否已存在
        let nodeExist = false
        try {
          const res = await db.collection('nodes').doc(nodeId).get()
          nodeExist = !!res.data
        } catch(e) {
          nodeExist = false
        }
        
        if (!nodeExist) {
          await db.collection('nodes').add({
            data: {
              _id: nodeId,
              themeId: theme._id,
              order: i + 1,
              title: node.title,
              learningObjective: node.learningObjective,
              completionSignal: node.completionSignal,
              status: 'published',
            },
          })
          nodesCreated++
        }
      }
    }

    return {
      success: true,
      message: `初始化完成：创建了 ${themesCreated} 个主题和 ${nodesCreated} 个节点`,
      themesCreated,
      nodesCreated,
    }
  } catch (e) {
    console.error('initDatabase 云函数错误', e)
    return { success: false, error: e.message }
  }
}