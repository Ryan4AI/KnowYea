const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '../miniprogram');

console.log('=== 小知也 静态代码检查 ===\n');

let passed = 0, failed = 0;

function check(name, fn) {
  try {
    const result = fn();
    if (result === true || result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}: ${result}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// 1. app.json 存在且合法
check('app.json 存在', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8');
  const json = JSON.parse(content);
  if (!json.pages || !Array.isArray(json.pages) || json.pages.length === 0) {
    return 'pages 数组为空或缺失';
  }
  if (!json.appid) return '缺少 appid';
  return true;
});

// 2. 所有 pages 路径存在
check('所有页面文件存在', () => {
  const app = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
  const missing = [];
  for (const page of app.pages) {
    const js = path.join(projectRoot, page + '.js');
    const wxml = path.join(projectRoot, page + '.wxml');
    const json = path.join(projectRoot, page + '.json');
    if (!fs.existsSync(js)) missing.push(`${page}.js`);
    if (!fs.existsSync(wxml)) missing.push(`${page}.wxml`);
    if (!fs.existsSync(json)) missing.push(`${page}.json`);
  }
  return missing.length === 0 ? true : `缺失: ${missing.join(', ')}`;
});

// 3. TabBar 图标存在
check('TabBar 图标文件存在', () => {
  const app = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
  if (!app.tabBar || !app.tabBar.list) return true;
  const missing = [];
  for (const item of app.tabBar.list) {
    if (item.iconPath && !fs.existsSync(path.join(projectRoot, item.iconPath))) {
      missing.push(item.iconPath);
    }
    if (item.selectedIconPath && !fs.existsSync(path.join(projectRoot, item.selectedIconPath))) {
      missing.push(item.selectedIconPath);
    }
  }
  return missing.length === 0 ? true : `缺失: ${missing.join(', ')}`;
});

// 4. sitemap.json 存在（微信要求）
check('sitemap.json 存在', () => {
  return fs.existsSync(path.join(projectRoot, 'sitemap.json')) ? true : '建议添加 sitemap.json';
});

// 5. project.config.json 存在
check('project.config.json 存在', () => {
  const p = JSON.parse(fs.readFileSync(path.join(projectRoot, 'project.config.json'), 'utf8'));
  if (!p.appid) return '缺少 appid';
  return true;
});

// 6. 云开发配置
check('cloudbaserc.json 存在', () => {
  return fs.existsSync(path.join(projectRoot, 'cloudbaserc.json'));
});

// 7. JS 语法检查（所有页面）
check('所有页面 JS 语法正确', () => {
  const app = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
  const errors = [];
  for (const page of app.pages) {
    const jsPath = path.join(projectRoot, page + '.js');
    const content = fs.readFileSync(jsPath, 'utf8');
    try {
      new Function(content);
    } catch (err) {
      errors.push(`${page}.js: ${err.message}`);
    }
  }
  return errors.length === 0 ? true : errors.join('; ');
});

console.log(`\n📊 结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
