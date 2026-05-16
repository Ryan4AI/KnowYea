// 云函数：debugOpenid - 诊断 openid 获取问题
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  return {
    success: true,
    message: '调试信息',
    wxContext: {
      OPENID: wxContext.OPENID || 'undefined',
      APPID: wxContext.APPID || 'undefined',
      UNIONID: wxContext.UNIONID || 'undefined',
      ENV: wxContext.ENV || 'undefined',
    },
    context: {
      memory: context.memory || 'undefined',
      requestId: context.requestId || 'undefined',
    }
  }
}