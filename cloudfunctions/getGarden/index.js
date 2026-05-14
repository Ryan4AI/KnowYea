// 云函数：getGarden - 获取花园数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, themeId } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    let query = { openid }
    if (themeId) {
      query.themeId = themeId
    }

    // 获取花园数据
    const gardenRes = await db.collection('user_gardens')
      .where(query)
      .get()

    if (!gardenRes.data || gardenRes.data.length === 0) {
      return { success: true, gardens: [] }
    }

    // 获取每个主题的名称
    const gardens = []
    for (const garden of gardenRes.data) {
      const themeRes = await db.collection('themes').doc(garden.themeId).get()

      // 植物阶段名称和图标
      const plantLevels = [
        { level: 1, emoji: '🌱', name: '种子' },
        { level: 2, emoji: '🌿', name: '幼苗' },
        { level: 3, emoji: '🌾', name: '成长' },
        { level: 4, emoji: '🍎', name: '果实' },
      ]

      const plantInfo = plantLevels.find(p => p.level === garden.plantLevel) || plantLevels[0]

      gardens.push({
        themeId: garden.themeId,
        themeName: themeRes.data?.name || '',
        plantLevel: garden.plantLevel,
        plantEmoji: plantInfo.emoji,
        plantName: plantInfo.name,
        points: garden.points,
        decorations: garden.decorations || [],
      })
    }

    return { success: true, gardens }
  } catch (e) {
    console.error('getGarden 云函数错误', e)
    return { success: false, error: e.message }
  }
}