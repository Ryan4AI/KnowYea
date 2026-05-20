const { upload, CIProject } = require('miniprogram-ci');
const path = require('path');

const projectPath = path.join(__dirname, '../miniprogram');

// 不指定 type，让系统从 project.config.json 自动检测
const project = new CIProject({
  projectPath,
  appid: 'wx7298f8ed5dedc8d8',
  privateKeyPath: path.join(__dirname, '../credentials/private.wx7298f8ed5dedc8d8.key')
});

async function uploadCode() {
  console.log('=== 千里学堂 上传小程序 ===');
  
  try {
    const result = await upload({
      project,
      version: '1.0.1',
      desc: '自动化上传 ' + new Date().toLocaleString('zh-CN'),
      onProgressUpdate: (info) => {
        if (info.status === 'done') {
          console.log('✅', info.message);
        } else {
          console.log('进度:', info.message || info.id);
        }
      }
    });
    console.log('✅ 上传成功:', result);
  } catch (err) {
    console.log('❌ 上传失败:', err.message);
  }
}

uploadCode();
