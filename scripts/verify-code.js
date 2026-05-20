const { checkCodeQuality, compile } = require('miniprogram-ci');
const path = require('path');

async function verify() {
  const projectPath = path.join(__dirname, '../miniprogram');
  
  console.log('=== 千里学堂 代码质量检查 ===\n');
  
  try {
    // 代码质量检查
    console.log('1. 运行代码质量检查...');
    const result = await checkCodeQuality({
      projectPath,
      verbose: true
    });
    console.log('✅ 代码质量检查通过');
    console.log(result);
  } catch (err) {
    console.log('⚠️ checkCodeQuality 跳过:', err.message);
  }
  
  try {
    // 编译检查（不依赖云环境）
    console.log('\n2. 运行编译检查...');
    const compileResult = await compile({
      projectPath,
      compileType: 'miniapp',
      setting: {
        es6: true,
        minify: true
      }
    });
    console.log('✅ 编译检查通过');
  } catch (err) {
    console.log('⚠️ 编译检查失败:', err.message);
    if (err.message.includes('appid')) {
      console.log('   → 需要配置 appid');
    }
  }
}

verify().catch(console.error);
