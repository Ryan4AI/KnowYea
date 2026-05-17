// 云函数：generateTheme - 调用 MiniMax API 生成课程并保存
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

function callMiniMax(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'MiniMax-M2.7',
      messages,
      max_tokens: 4096,
    })
    const req = https.request({
      hostname: 'api.minimaxi.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-cp-c5wSwWsnIcUkewTEe9JhETRKZNyJ1OBnphm_4B1HdOV0LMNh9vP80kJFBKZV5jpCtp22_xyBUtF0zRAwgWaxU4YECc_LL8GPzEj6GVOHmMiovcfwylDgCDM'
      },
      timeout: 60000,
    }, res => {
      let body = ''
      const statusCode = res.statusCode
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          if (statusCode !== 200) {
            reject(new Error(parsed.error?.message || `HTTP ${statusCode}`))
            return
          }
          resolve(parsed)
        } catch(e) {
          reject(new Error('AI响应格式异常'))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('AI响应超时，请重试')) })
    req.write(data)
    req.end()
  })
}

// 日志记录
async function logAIRequest(params) {
  try {
    await db.collection('user_ai_logs').add({ data: {
      type: 'generateTheme',
      openid: params.openid || '',
      themeId: params.themeId || '',
      nodeId: '',
      promptPreview: JSON.stringify(params.messages || []).slice(0, 2000),
      response: (params.response || '').slice(0, 3000),
      score: null,
      durationMs: params.durationMs || 0,
      status: params.status || 'success',
      error: params.error || '',
      isCompleted: false,
      createdAt: Date.now(),
    }})
  } catch(e) {
    console.error('[logAIRequest] 写入失败', e.message)
  }
}

exports.main = async (event, context) => {
  const { openid, profile, themeName } = event
  if (!openid || !profile) {
    return { success: false, error: '缺少必要参数' }
  }

  // 1. 保存/更新用户画像
  try {
    const userRes = await db.collection('users')
      .where({ openid })
      .limit(1)
      .get()

    if (userRes.data && userRes.data.length > 0) {
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: { profile, lastActive: Date.now() }
      })
    } else {
      await db.collection('users').add({
        data: { openid, profile, lastActive: Date.now(), createdAt: Date.now() }
      })
    }
  } catch (e) {
    console.error('保存用户画像失败', e)
  }

  const ageMap = { 1: '18岁以下', 2: '18-25岁', 3: '26-35岁', 4: '36-45岁', 5: '46岁以上' }

  // 用户指定主题 vs 根据画像推荐
  let prompt
  if (themeName) {
    prompt = `根据以下用户画像和学习需求，生成一个「${themeName}」主题的微型课程：

用户信息：
- 年龄：${ageMap[profile.age] || '25-35岁'}
- 职业：${profile.occupation || '职场人士'}
- 兴趣：${(profile.interests || []).join('、') || '通用知识'}

课程主题：${themeName}

注意：
1. 内容要贴合「${themeName}」这个主题，同时考虑用户的职业和兴趣背景
2. 每个节点应是对话内可完成的单一知识点（不是大章节）
3. 完成标准（completionSignal）必须是对话内就可达成的
4. 节点间有递进关系

JSON格式：
{"name":"主题名称","description":"主题描述（一句话概括，吸引人）","tags":["标签"],"nodes":[{"title":"节点标题","learningObjective":"告诉AI讲师要教什么（具体可讲）","completionSignal":"用户怎样才算学会了（对话内可验证）"}]}`
  } else {
    prompt = `根据以下用户画像，推荐一个适合对话式微学习的学习主题：

用户信息：
- 年龄：${ageMap[profile.age] || '25-35岁'}
- 职业：${profile.occupation || '职场人士'}
- 兴趣：${(profile.interests || []).join('、') || '通用知识'}

请生成一个适合该用户的微型课程。注意：
1. 主题与用户的兴趣或职业发展相关
2. 每个节点应是对话内可完成的单一知识点（不是大章节）
3. 完成标准（completionSignal）必须是对话内就可达成的
4. 节点间有递进关系

JSON格式：
{"name":"主题名称","description":"主题描述（一句话概括，吸引人）","tags":["标签"],"nodes":[{"title":"节点标题","learningObjective":"告诉AI讲师要教什么（具体可讲）","completionSignal":"用户怎样才算学会了（对话内可验证）"}]}`
  }

  const systemPrompt = `你是对话式微学习课程设计师。你的任务是为用户设计一个可以在微信小程序中、通过AI对话完成的微型课程。

# 什么是"对话式微学习"
- 用户通过和AI对话来学习，全程在聊天界面完成
- 每个"节点"（课时）是一个完整的对话单元，包含 AI 讲解 + 与用户互动确认理解
- 完成一个节点大约需要 3-5 分钟对话
- 不需要用户做任何线下任务或长期作业

# 节点设计要求
每个节点应该：
✅ 聚焦一个单一概念或知识点（不要塞进太多内容）
✅ 完成标准必须是对话内可以达成的（用户理解了、能回答了就算完成）
✅ 用通俗易懂的语言描述 learningObjective（告诉AI讲师要讲什么）
✅ 不要空泛，要具体可教

# 好的节点示例
[正确] {"title":"什么是 RESTful API","learningObjective":"解释 RESTful API 的核心原则（资源、方法、状态码），让用户理解 REST 和无状态的含义","completionSignal":"用户能说出 REST API 的 3 个关键特征，并理解 GET/POST/PUT/DELETE 的用途"}

[错误] {"title":"RESTful API 深度实践","learningObjective":"熟练运用 RESTful API 设计原则，包括资源命名、版本控制、认证授权等完整体系","completionSignal":"完成一个完整的 REST API 设计"}

错误的例子中，一个节点塞了太多内容，completionSignal 需要"完成一个完整项目"——这不是对话式学习。

# 课程结构
- 节点数量由AI根据内容复杂度自行决定，不设上限
- 节点之间要有逻辑递进：从基础到深入
- 每个节点独立成课，但串联起来覆盖完整的主题

# 输出格式
仅输出以下 JSON 格式，不要任何额外文字（包括不要 markdown 包裹）：`

  const miniMaxMessages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ]

  const startTime = Date.now()

  try {
    const aiRes = await callMiniMax(miniMaxMessages)
    const raw = aiRes.choices?.[0]?.message?.content
    if (!raw) {
      logAIRequest({ openid, messages: miniMaxMessages, response: '', status: 'error', error: 'AI 返回为空', durationMs: Date.now() - startTime })
      return { success: false, error: 'AI 返回为空' }
    }

    // 清理 <think> 和 markdown，提取 JSON
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    // 提取 JSON — 先信任 AI（提示词要求仅输出 JSON），失败再救急
    let themeData = null
    try {
      themeData = JSON.parse(cleaned)
    } catch(e) {
      // 救急：找第一个 { 到最后一个 } 之间
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const candidate = cleaned.slice(firstBrace, lastBrace + 1)
        try {
          themeData = JSON.parse(candidate)
        } catch(e2) {
          // 再救急：依次试每个 { 位置到结尾
          console.log('[generateTheme] direct parse failed, trying fallback. raw(300):', raw.slice(0, 300))
          for (let i = cleaned.indexOf('{'); i >= 0; i = cleaned.indexOf('{', i + 1)) {
            try {
              themeData = JSON.parse(cleaned.slice(i))
              break
            } catch(e3) { /* 继续 */ }
          }
        }
      }
    }

    if (!themeData.name || !themeData.nodes || !themeData.nodes.length) {
      logAIRequest({ openid, messages: miniMaxMessages, response: raw, status: 'error', error: 'JSON格式不正确', durationMs: Date.now() - startTime })
      return { success: false, error: 'AI 返回格式不正确' }
    }

    // 保存到数据库
    const themeId = 'theme_' + Date.now()
    await db.collection('themes').add({
      data: {
        _id: themeId,
        name: themeData.name,
        description: themeData.description || '',
        cover: '',
        totalNodes: themeData.nodes.length,
        tags: themeData.tags || [],
        status: 'published',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    })

    for (let i = 0; i < themeData.nodes.length; i++) {
      const node = themeData.nodes[i]
      const nodeId = `${themeId}_node_${i + 1}`
      await db.collection('nodes').add({
        data: {
          _id: nodeId,
          themeId,
          order: i + 1,
          title: node.title,
          learningObjective: node.learningObjective || '',
          completionSignal: node.completionSignal || '',
          status: 'published',
        }
      })
    }

    await db.collection('user_themes').add({
      data: { openid, themeId, completedNodeIds: [], currentNodeOrder: 1, status: 'learning', startedAt: Date.now(), completedAt: null }
    })
    await db.collection('user_gardens').add({
      data: { openid, themeId, plantLevel: 1, points: 0, decorations: [], updatedAt: Date.now() }
    })

    logAIRequest({ openid, themeId, messages: miniMaxMessages, response: raw, status: 'success', durationMs: Date.now() - startTime })

    return {
      success: true,
      theme: { _id: themeId, name: themeData.name, description: themeData.description, totalNodes: themeData.nodes.length },
    }
  } catch (e) {
    logAIRequest({ openid, messages: miniMaxMessages, response: '', status: 'error', error: e.message, durationMs: Date.now() - startTime })
    console.error('generateTheme 错误:', e.message)
    return { success: false, error: e.message }
  }
}
