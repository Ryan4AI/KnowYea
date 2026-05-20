// 云函数：getUser - 读 users 文档 + user_achievements + user_tags
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ACH_META = {
  first_lesson: { name: '初学乍道', description: '完成第一个课时', icon: '🌱' },
  five_lessons: { name: '三心二意', description: '完成 5 个课时', icon: '🎯' },
  ten_lessons: { name: '十全十美', description: '完成 10 个课时', icon: '🏆' },
  streak_3: { name: '持之以恒', description: '连续学习 3 天', icon: '🔥' },
  streak_7: { name: '连胜达人', description: '连续学习 7 天', icon: '⚡' },
  first_course: { name: '有始有终', description: '完成第一个课程', icon: '🎓' },
}

exports.main = async (event, context) => {
  const { openid } = event
  if (!openid) return { success: false, error: '缺少 openid' }

  try {
    // 读用户
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, error: '用户不存在' }
    }
    const user = userRes.data[0]

    // 读成就列表
    const achievRes = await db.collection('user_achievements').where({ openid }).get()
    const achievements = (achievRes.data || []).map(a => {
      const meta = ACH_META[a.achievementId] || {}
      return { id: a.achievementId, name: meta.name, description: meta.description, icon: meta.icon, unlocked: true, unlockedAt: a.unlockedAt }
    })

    // 读兴趣标签
    const tagRes = await db.collection('user_tags').where({ openid }).get()
    const tags = tagRes.data.map(t => t.tagName)

    return {
      success: true,
      data: {
        user: {
          _id: user._id,
          openid: user.openid,
          nickName: user.nickName || '',
          avatarUrl: user.avatarUrl || '',
          age: user.age,
          occupation: user.occupation || '',
          interests: user.interests || [],
          profile: {
            age: user.age,
            occupation: user.occupation || '',
            interests: user.interests || [],
          },
          plantLevel: user.plantLevel || 1,
          points: user.points || 0,
          streak: user.streak || 0,
          completedLessons: user.completedLessons || 0,
          completedCourses: user.completedCourses || 0,
          decorations: user.decorations || [],
          lastStudyDate: user.lastStudyDate,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        stats: {
          completedNodes: user.completedLessons || 0,
          completedThemes: user.completedCourses || 0,
          totalPoints: user.points || 0,
          streak: user.streak || 0,
          plantLevel: user.plantLevel || 1,
        },
        achievements,
        tags,
      }
    }
  } catch (e) {
    return { success: false, error: e.message }
  }
}