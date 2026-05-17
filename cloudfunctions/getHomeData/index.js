// 云函数：getHomeData - 获取首页数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    openid,
    themeId: reqThemeId,
    nodeId: reqNodeId,
    mode,
    messageLimit = 30,
    messageOffset = 0,
  } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  const isReviewMode = mode === 'review'

  try {
    const userRes = await db.collection('users').where({ openid }).limit(1).get()
    const user = userRes.data?.[0] || null

    const userThemesCount = await db.collection('user_themes').where({ openid }).count()
    const profile = user?.profile || {}
    const hasProfile = !!(profile.age || profile.occupation || (profile.interests && profile.interests.length))

    const needsOnboarding = userThemesCount.total === 0 && !hasProfile
    console.log('[DEBUG] userThemesCount.total:', userThemesCount.total, 'hasProfile:', hasProfile, 'needsOnboarding:', needsOnboarding)

    let currentTheme = null
    let currentNode = null
    let messages = []
    let nodeCompleted = false
    let hasMoreMessages = false
    let garden = null

    let themeId = reqThemeId
    let userTheme = null

    if (themeId) {
      const utRes = await db.collection('user_themes')
        .where({ openid, themeId })
        .limit(1)
        .get()
      userTheme = utRes.data?.[0] || null
    } else {
      const utRes = await db.collection('user_themes')
        .where({ openid, status: 'learning' })
        .orderBy('startedAt', 'desc')
        .limit(1)
        .get()
      userTheme = utRes.data?.[0] || null
      themeId = userTheme?.themeId
    }

    if (userTheme && themeId) {
      const themeRes = await db.collection('themes').doc(themeId).get()
      if (themeRes.data) {
        currentTheme = {
          _id: themeId,
          name: themeRes.data.name,
          description: themeRes.data.description,
          totalNodes: themeRes.data.totalNodes,
          completedCount: userTheme.completedNodeIds?.length || 0,
        }
      }

      let nodeQuery
      if (reqNodeId) {
        nodeQuery = db.collection('nodes').doc(reqNodeId).get()
      } else {
        const currentOrder = userTheme.currentNodeOrder || 1
        nodeQuery = db.collection('nodes')
          .where({ themeId, order: currentOrder, status: 'published' })
          .limit(1)
          .get()
      }

      const nodeRes = await nodeQuery
      if (reqNodeId) {
        currentNode = nodeRes.data || null
      } else if (nodeRes.data && nodeRes.data.length > 0) {
        currentNode = nodeRes.data[0]
      }

      if (currentNode && !isReviewMode) {
        // 加载对话历史（按创建时间排序，取最近 messageLimit 条）
        const convRes = await db.collection('user_conversations')
          .where({ openid, themeId, nodeId: currentNode._id })
          .orderBy('createdAt', 'desc')
          .limit(messageLimit)
          .get()

        if (convRes.data && convRes.data.length > 0) {
          // 按时间正序排列（旧的在前面）
          messages = convRes.data.reverse().map(doc => ({
            id: doc.id || doc._id,
            role: doc.role,
            content: doc.content,
            createdAt: doc.createdAt,
            isCompleted: doc.isCompleted || false,
          }))
          hasMoreMessages = convRes.data.length >= messageLimit

          // 检查最后一条 AI 消息是否标记了完成
          const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai')
          if (lastAiMsg && (lastAiMsg.isCompleted || lastAiMsg.content.includes('[完成]'))) {
            nodeCompleted = true
          }
        }
      }
    }

    if (currentTheme) {
      const gardenRes = await db.collection('user_gardens')
        .where({ openid, themeId: currentTheme._id })
        .limit(1)
        .get()
      if (gardenRes.data && gardenRes.data.length > 0) {
        garden = gardenRes.data[0]
      }
    }

    let isFavorited = false
    if (currentNode) {
      const favRes = await db.collection('user_favorites')
        .where({ openid })
        .limit(1)
        .get()
      const nodeIds = favRes.data?.[0]?.nodeIds || []
      isFavorited = nodeIds.includes(currentNode._id)
    }

    const achRes = await db.collection('user_achievements')
      .where({ openid })
      .limit(1)
      .get()
    const achievements = achRes.data?.[0]?.achievements || []

    return {
      success: true,
      currentTheme,
      currentNode,
      messages,
      nodeCompleted,
      hasMoreMessages,
      messageOffset,
      user,
      garden,
      achievements,
      needsOnboarding,
      isReviewMode,
      isFavorited,
    }
  } catch (e) {
    console.error('getHomeData 云函数错误', e)
    return { success: false, error: e.message }
  }
}
