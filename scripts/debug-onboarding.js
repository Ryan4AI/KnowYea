const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function checkOnboarding(openid) {
  console.log('检查用户状态:', openid)
  
  // 查询 users
  const userRes = await db.collection('users').where({ openid }).limit(1).get()
  console.log('users 记录:', userRes.data)
  
  // 查询 user_themes
  const utRes = await db.collection('user_themes').where({ openid }).count()
  console.log('user_themes 数量:', utRes.total)
  
  // 判断 needsOnboarding
  const user = userRes.data?.[0] || null
  const profile = user?.profile || {}
  const hasProfile = !!(profile.age || profile.occupation || (profile.interests && profile.interests.length))
  const needsOnboarding = utRes.total === 0 || !hasProfile
  
  console.log('\n判断结果:')
  console.log('- user_themes.total === 0:', utRes.total === 0)
  console.log('- hasProfile:', hasProfile)
  console.log('- needsOnboarding:', needsOnboarding)
}

const wxContext = cloud.getWXContext()
checkOnboarding(wxContext.OPENID).catch(console.error)
