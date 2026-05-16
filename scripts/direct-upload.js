/**
 * 直接上传小程序到微信
 * 用法: node scripts/direct-upload.js [version] [desc]
 */
const path = require('path')
const { Project, upload } = require('miniprogram-ci')

async function main() {
  const keyFile = path.join(__dirname, '../credentials/private.wx7298f8ed5dedc8d8.key')
  const appid = 'wx7298f8ed5dedc8d8'
  const version = process.argv[2] || '1.0.0'
  const desc = process.argv[3] || '服务器直接上传'

  console.log('=== 小知也 直接上传 ===')
  console.log('Key:', keyFile)
  console.log('AppID:', appid)
  console.log('Version:', version)

  try {
    const project = new Project({
      appid,
      type: 'miniProgram',
      projectPath: path.join(__dirname, '../miniprogram'),
      privateKeyPath: keyFile,
      ignores: ['node_modules/**'],
    })

    console.log('开始上传...')
    const result = await upload({
      project,
      version,
      desc,
      robot: 1,
    })
    console.log('上传结果:', JSON.stringify(result, null, 2))
    console.log('✅ 成功!')
  } catch (e) {
    console.error('上传失败:', e.message)
    if (e.stack) console.error(e.stack)
    process.exit(1)
  }
}

main()