/**
 * 完整自动化：上传 + 提交审核 + 发布
 * 用法: node scripts/auto-submit.js [version] [desc]
 */
const path = require('path')
const { Project, upload } = require('miniprogram-ci')

const APPID = 'wx7298f8ed5dedc8d8'
const APPSECRET = '6acfa723bf1f05ce01ac6c2c1dee7df2'

async function getAccessToken() {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`
  const res = await fetch(url)
  const json = await res.json()
  if (!json.access_token) throw new Error(`获取token失败: ${JSON.stringify(json)}`)
  return json.access_token
}

async function submitAudit(accessToken, version) {
  const url = `https://api.weixin.qq.com/wxa/submit_audit?access_token=${accessToken}`
  // item_list 为必填项，指定审核入口页面
  const body = {
    item_list: [
      {
        address: 'pages/learn/learn',
        tag: '学习',
        first_class: '教育',
        second_class: '在线教育',
        title: '千里学堂',
      },
    ],
    version_desc: `v${version}`,
    feedback_info: '千里学堂是一款AI驱动的碎片化学习工具，通过对话式教学帮助用户体系化学习',
    feedback_stuff: 'feedback@knowyea.com',
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return json
}

async function main() {
  const version = process.argv[2] || '1.0.1'
  const desc = process.argv[3] || '服务器自动上传'

  console.log('=== 千里学堂 自动化流程 ===')
  console.log('Version:', version)

  try {
    // Step 1: 上传代码
    console.log('\n[1/2] 上传代码...')
    const project = new Project({
      appid: APPID,
      type: 'miniProgram',
      projectPath: path.join(__dirname, '../miniprogram'),
      privateKeyPath: path.join(__dirname, '../credentials/private.wx7298f8ed5dedc8d8.key'),
      ignores: ['node_modules/**'],
    })

    const uploadResult = await upload({
      project,
      version,
      desc,
      robot: 1,
    })
    console.log('上传完成:', JSON.stringify(uploadResult))

    // Step 2: 提交审核
    console.log('\n[2/2] 提交审核...')
    const token = await getAccessToken()
    console.log('AccessToken 获取成功')

    const auditResult = await submitAudit(token, version)
    console.log('审核提交结果:', JSON.stringify(auditResult, null, 2))

    if (auditResult.errcode === 0) {
      console.log('\n✅ 全部完成！审核ID:', auditResult.auditid)
    } else {
      console.log('\n⚠️ 审核提交失败:', auditResult.errmsg)
    }
  } catch (e) {
    console.error('流程失败:', e.message)
    process.exit(1)
  }
}

main()