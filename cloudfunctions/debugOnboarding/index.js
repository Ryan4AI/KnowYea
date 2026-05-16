const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  if (!openid) return { error: 'no openid' }
  
  const userRes = await db.collection('users').where({ openid }).limit(1).get()
  const utCount = await db.collection('user_themes').where({ openid }).count()
  const user = userRes.data?.[0]
  const profile = user?.profile || {}
  const hasProfile = !!(profile.age || profile.occupation || (profile.interests && profile.interests.length))
  const needsOnboarding = utCount.total === 0 || !hasProfile
  
  return {
    openid,
    userExists: !!user,
    userThemesCount: utCount.total,
    profile,
    hasProfile,
    needsOnboarding,
  }
}
