// 云函数：getAchievements - 获取用户成就
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 成就定义
const ACHIEVEMENT_DEFS = [
  { id: 'first_node', name: '初学乍道', description: '完成第一个节点', icon: '🌱', trigger: 'completedNodes >= 1' },
  { id: 'first_theme', name: '有始有终', description: '完成第一个主题', icon: '🌿', trigger: 'completedThemes >= 1' },
  { id: 'streak_3', name: '连胜达人', description: '连续学习 3 天', icon: '🔥', trigger: 'streak >= 3' },
  { id: 'streak_7', name: '持之以恒', description: '连续学习 7 天', icon: '💪', trigger: 'streak >= 7' },
  { id: 'node_10', name: '十全十美', description: '完成 10 个节点', icon: '🏆', trigger: 'completedNodes >= 10' },
  { id: 'theme_3', name: '三心二意', description: '完成 3 个主题', icon: '🎯', trigger: 'completedThemes >= 3' },
  { id: 'favorites_3', name: '收藏家', description: '收藏 3 个节点', icon: '❤️', trigger: 'favorites >= 3' },
  { id: 'share', name: '传播者', description: '分享一个节点', icon: '📤', trigger: 'shared >= 1' },
]

exports.main = async (event, context) => {
  const { openid } = event

  if (!openid) {
    return { success: false, error: '缺少 openid' }
  }

  try {
    const achRes = await db.collection('user_achievements')
      .where({ openid })
      .limit(1)
      .get()

    let userAchievements = []
    if (achRes.data && achRes.data.length > 0) {
      userAchievements = achRes.data[0].achievements || []
    }

    // 合并成就定义和用户数据
    const result = ACHIEVEMENT_DEFS.map(def => {
      const userRecord = userAchievements.find(a => a.id === def.id)
      return {
        ...def,
        unlocked: !!userRecord,
        unlockedAt: userRecord?.unlockedAt || null,
      }
    })

    return { success: true, achievements: result }
  } catch (e) {
    console.error('getAchievements 云函数错误', e)
    return { success: false, error: e.message }
  }
}