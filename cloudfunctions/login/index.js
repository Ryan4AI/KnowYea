// 云函数：login - 匿名登录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 成就定义
const ACHIEVEMENTS = {
  first_node: { id: 'first_node', name: '初学乍道', description: '完成第一个节点', icon: '🌱' },
  first_theme: { id: 'first_theme', name: '有始有终', description: '完成第一个主题', icon: '🌿' },
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log('wxContext:', JSON.stringify(wxContext))
  
  const openid = wxContext.OPENID
  console.log('openid:', openid)

  if (!openid) {
    return { success: false, error: '无法获取 openid' }
  }

  try {
    // 查询用户是否存在
    const userRes = await db.collection('users').where({ openid }).limit(1).get()

    if (userRes.data && userRes.data.length > 0) {
      // 用户已存在，更新最后活跃时间
      await db.collection('users').where({ openid }).update({
        data: { lastActive: Date.now() }
      })

      return {
        success: true,
        openid,
        isNewUser: false,
      }
    } else {
      // 新用户，创建记录
      await db.collection('users').add({
        data: {
          openid,
          profile: {
            age: null,
            occupation: '',
            interests: [],
          },
          createdAt: Date.now(),
          lastActive: Date.now(),
          settings: {
            notifications: true,
          }
        }
      })

      // 初始化成就表
      await db.collection('user_achievements').add({
        data: {
          openid,
          achievements: [],
        }
      })

      // 初始化收藏表
      await db.collection('user_favorites').add({
        data: {
          openid,
          nodeIds: [],
          updatedAt: Date.now(),
        }
      })

      return {
        success: true,
        openid,
        isNewUser: true,
      }
    }
  } catch (e) {
    console.error('login 云函数错误', e)
    return { success: false, error: e.message }
  }
}