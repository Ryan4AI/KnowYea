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
    '思维模型': {
      name: '思维模型大全',
      description: '掌握高效思考的工具箱',
      totalNodes: 10,
      tags: ['思维', '效率'],
      nodes: [
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
      ]
    },
    '商业': {
      name: '商业分析基础',
      description: '理解商业世界的基本逻辑',
      totalNodes: 10,
      tags: ['商业', '分析'],
      nodes: [
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
      ]
    },
    '自我提升': {
      name: '自我提升指南',
      description: '成为更好的自己',
      totalNodes: 10,
      tags: ['自我提升', '成长'],
      nodes: [
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
      ]
    },
    '科技': {
      name: '科技趋势入门',
      description: '理解改变世界的前沿科技',
      totalNodes: 10,
      tags: ['科技', '趋势'],
      nodes: [
        { title: '人工智能', learningObjective: '理解AI的基本概念', completionSignal: '能解释什么是AI及其应用' },
        { title: '机器学习', learningObjective: '理解机器学习的原理', completionSignal: '能区分监督学习和无监督学习' },
        { title: '区块链', learningObjective: '理解区块链的核心概念', completionSignal: '能解释去中心化和分布式账本' },
        { title: '云计算', learningObjective: '理解云计算的基本概念', completionSignal: '能区分IaaS、PaaS、SaaS' },
        { title: '大数据', learningObjective: '理解大数据的特征', completionSignal: '能说出大数据的4V特征' },
        { title: '物联网', learningObjective: '理解物联网的概念', completionSignal: '能举例说明IoT的应用场景' },
        { title: '5G通信', learningObjective: '理解5G技术的特点', completionSignal: '能说明5G相对4G的优势' },
        { title: '量子计算', learningObjective: '了解量子计算基础', completionSignal: '能解释量子叠加和量子纠缠' },
        { title: '元宇宙', learningObjective: '理解元宇宙概念', completionSignal: '能描述元宇宙的关键特征' },
        { title: '碳中和', learningObjective: '理解碳中和的意义', completionSignal: '能解释碳中和的实现路径' },
      ]
    },
    '历史': {
      name: '世界历史概览',
      description: '从历史中汲取智慧',
      totalNodes: 10,
      tags: ['历史', '智慧'],
      nodes: [
        { title: '古埃及文明', learningObjective: '了解古埃及文明成就', completionSignal: '能说出古埃及的三大贡献' },
        { title: '古希腊民主', learningObjective: '理解古希腊民主制度', completionSignal: '能说明雅典民主的特点' },
        { title: '罗马帝国', learningObjective: '了解罗马帝国的兴衰', completionSignal: '能分析罗马衰亡的原因' },
        { title: '文艺复兴', learningObjective: '理解文艺复兴的意义', completionSignal: '能说明人文主义的核心思想' },
        { title: '启蒙运动', learningObjective: '理解启蒙运动的影响', completionSignal: '能解释启蒙思想家的主要观点' },
        { title: '工业革命', learningObjective: '理解工业革命的意义', completionSignal: '能说明蒸汽机对社会的改变' },
        { title: '两次世界大战', learningObjective: '了解世界大战的影响', completionSignal: '能分析一战和二战的区别' },
        { title: '冷战史', learningObjective: '理解冷战的基本特征', completionSignal: '能说明美苏对抗的主要形式' },
        { title: '全球化进程', learningObjective: '理解全球化的演变', completionSignal: '能分析全球化的利弊' },
        { title: '科技革命', learningObjective: '理解第三次科技革命', completionSignal: '能说明互联网对世界的影响' },
      ]
    },
    '哲学': {
      name: '哲学入门',
      description: '思考思考本身',
      totalNodes: 10,
      tags: ['哲学', '思维'],
      nodes: [
        { title: '哲学是什么', learningObjective: '理解哲学的基本问题', completionSignal: '能说出哲学研究的三个基本问题' },
        { title: '唯心与唯物', learningObjective: '理解唯心主义和唯物主义', completionSignal: '能区分两种基本世界观' },
        { title: '存在主义', learningObjective: '理解存在主义核心思想', completionSignal: '能解释"存在先于本质"' },
        { title: '怀疑论', learningObjective: '理解怀疑论的观点', completionSignal: '能说明笛卡尔的方法论怀疑' },
        { title: '伦理学基础', learningObjective: '了解伦理学基本问题', completionSignal: '能区分功利主义和义务论' },
        { title: '自由意志', learningObjective: '理解自由意志问题', completionSignal: '能分析决定论与自由意志' },
        { title: '知识论', learningObjective: '理解知识的标准', completionSignal: '能解释知识=信念+证据+真理' },
        { title: '美学', learningObjective: '了解美学基本概念', completionSignal: '能说明什么是美的本质' },
        { title: '语言哲学', learningObjective: '理解语言与思想的关系', completionSignal: '能解释维特根斯坦的语言游戏' },
        { title: '人生意义', learningObjective: '思考人生的意义', completionSignal: '能提出自己对人意义的理解' },
      ]
    },
    '管理': {
      name: '管理学基础',
      description: '从做事到成事',
      totalNodes: 10,
      tags: ['管理', '职场'],
      nodes: [
        { title: '管理的本质', learningObjective: '理解管理的四大职能', completionSignal: '能说明计划组织领导控制' },
        { title: '目标管理', learningObjective: '理解MBO目标管理', completionSignal: '能运用OKR进行目标管理' },
        { title: '领导力', learningObjective: '理解领导力模型', completionSignal: '能区分领导与管理的区别' },
        { title: '团队建设', learningObjective: '掌握团队建设方法', completionSignal: '能识别团队发展的五个阶段' },
        { title: '决策制定', learningObjective: '理解决策方法', completionSignal: '能运用决策树做选择' },
        { title: '时间管理', learningObjective: '掌握时间管理工具', completionSignal: '能用四象限法则规划时间' },
        { title: '有效沟通', learningObjective: '掌握沟通技巧', completionSignal: '能运用非暴力沟通' },
        { title: '绩效管理', learningObjective: '理解绩效管理流程', completionSignal: '能设计简单的KPI体系' },
        { title: '变革管理', learningObjective: '理解变革管理理论', completionSignal: '能运用ADKAR模型推动变革' },
        { title: '项目管理', learningObjective: '掌握项目管理基础', completionSignal: '能用甘特图规划项目' },
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