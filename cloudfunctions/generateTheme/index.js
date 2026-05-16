// 云函数：generateTheme - 调用 MiniMax API 生成课程并保存
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

function callMiniMax(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'MiniMax-M2.7',
      messages: [
        { role: 'system', content: '你是教育专家。根据用户画像推荐学习主题，仅输出 JSON，不要任何解释或 markdown 包裹。' },
        { role: 'user', content: prompt }
      ],
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
      timeout: 30000,
    }, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          resolve(parsed)
        } catch(e) {
          reject(new Error('解析MiniMax响应失败: ' + body.slice(0,200)))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('MiniMax 请求超时')) })
    req.write(data)
    req.end()
  })
}

exports.main = async (event, context) => {
  const { openid, profile } = event
  if (!openid || !profile) {
    return { success: false, error: '缺少必要参数' }
  }

  const ageMap = { 1: '18岁以下', 2: '18-25岁', 3: '26-35岁', 4: '36-45岁', 5: '45岁以上' }
  const prompt = `根据以下用户画像，推荐一个合适的学习主题：

用户信息：
- 年龄：${ageMap[profile.age] || '25-35岁'}
- 职业：profile.occupation || '职场人士'
- 兴趣：${(profile.interests || []).join('、') || '通用知识'}

请生成一个适合该用户的学习主题。要求与用户的兴趣或职业发展相关，节点数量由AI根据内容复杂度自行决定，不设上限。

请严格以 JSON 格式输出（不要用 markdown 代码块）：
{"name":"主题名称","description":"主题描述","tags":["标签"],"nodes":[{"title":"节点标题","learningObjective":"学习目标","completionSignal":"完成标准"}]}`

  try {
    const aiRes = await callMiniMax(prompt)
    const raw = aiRes.choices?.[0]?.message?.content
    if (!raw) {
      return { success: false, error: 'AI 返回为空' }
    }

    // 清理 <think> 和 markdown，提取 JSON
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    const themeData = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)

    if (!themeData.name || !themeData.nodes || !themeData.nodes.length) {
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

    return {
      success: true,
      theme: { _id: themeId, name: themeData.name, description: themeData.description, totalNodes: themeData.nodes.length },
    }
  } catch (e) {
    console.error('generateTheme 错误:', e.message)
    return { success: false, error: e.message }
  }
}
