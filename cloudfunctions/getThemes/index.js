// 云函数：getThemes - 获取用户主题列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    // 获取用户的所有主题
    const userThemesRes = await db.collection('user_themes')
      .where({ openid })
      .get()

    if (!userThemesRes.data || userThemesRes.data.length === 0) {
      return { success: true, themes: [] }
    }

    // 获取主题详情
    const themes = []
    for (const ut of userThemesRes.data) {
      const themeRes = await db.collection('themes').doc(ut.themeId).get()
      if (!themeRes.data) continue

      const theme = themeRes.data

      // 获取花园数据
      const gardenRes = await db.collection('user_gardens')
        .where({ openid, themeId: ut.themeId })
        .limit(1)
        .get()

      const garden = gardenRes.data?.[0] || {}

      // 获取节点完成信息
      const completedCount = ut.completedNodeIds?.length || 0

      // 植物阶段名称
      const plantNames = ['', '种子', '幼苗', '成长', '开花', '果实']
      const plantName = plantNames[garden.plantLevel] || '种子'

      themes.push({
        _id: theme._id,
        name: theme.name,
        description: theme.description,
        cover: theme.cover,
        totalNodes: theme.totalNodes,
        tags: theme.tags || [],
        status: ut.status,
        completedCount,
        currentNodeOrder: ut.currentNodeOrder,
        progressPercent: Math.round((completedCount / theme.totalNodes) * 100) || 0,
        plantEmoji: garden.plantLevel >= 4 ? '🍎' : garden.plantLevel >= 3 ? '🌸' : garden.plantLevel >= 2 ? '🌾' : garden.plantLevel >= 1 ? '🌿' : '🌱',
        plantName,
        points: garden.points || 0,
        decorations: garden.decorations || [],
        startedAt: ut.startedAt,
        completedAt: ut.completedAt,
      })
    }

    // 按状态和开始时间排序
    themes.sort((a, b) => {
      if (a.status === 'learning' && b.status === 'completed') return -1
      if (a.status === 'completed' && b.status === 'learning') return 1
      return (b.startedAt || 0) - (a.startedAt || 0)
    })

    return { success: true, themes }
  } catch (e) {
    console.error('getThemes 云函数错误', e)
    return { success: false, error: e.message }
  }
}