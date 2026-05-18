# 小知也 - 开发进度看板

> 最后更新：2026-05-18 16:00

---

## 📊 整体进度

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目结构 | ✅ 完成 | 20个云函数、9个页面、8个组件 |
| 云开发配置 | ✅ 完成 | appid/环境ID/云函数配置 |
| 数据库设计 | ✅ 完成 | schema.md + 初始化数据 |
| 预置主题 | ✅ 完成 | 5主题x10节点=50节点（initDatabase云函数） |
| AI Prompt | ✅ 完成 | docs/ai-prompt.md |
| 云函数实现 | ✅ 完成 | 全部20个，sendMessage使用模拟AI |
| 小程序前端 | ✅ 完成 | 所有页面和组件完整实现 |
| AI真实接入 | ⏳ 待做 | 需配置腾讯混元SECRET |
| 内容安全 | ⏳ 待做 | msgSecCheck生产环境对接 |
| 真机测试 | ⏳ 待做 | 需微信开发者工具导入测试 |
| 提交审核 | ⏳ 待做 | 需准备材料+版权证明 |

---

## ☁️ 云函数清单（16个）

| 云函数 | 状态 | 备注 |
|--------|------|------|
| login | ✅ | 匿名登录，获取openid |
| getUser | ✅ | 用户信息 |
| updateProfile | ✅ | 更新用户画像 |
| sendMessage | ✅ | AI对话 |
| getMessages | ✅ | 对话历史 |
| getCourses | ✅ | 用户课程列表 |
| createCourse | ✅ | 创建课程 |
| deleteCourse | ✅ | 删除课程 |
| completeLesson | ✅ | 完成节点判定 |
| getHistory | ✅ | 学习历史 |
| getTags | ✅ | 标签/主题库 |
| getRecommendation | ✅ | 推荐 |
| clearUsers | ✅ | 清理用户数据 |
| setupCollections | ✅ | 初始化集合 |
| setupDatabase | ✅ | 数据库初始化 |
| initCollections | ✅ | 集合初始化 |

---

## 📱 小程序页面

| 页面 | 状态 | 说明 |
|------|------|------|
| learn | ✅ | 对话界面，完整实现 |
| themes | ✅ | 主题管理页面 |
| theme-store | ✅ | 主题库页面 |
| profile | ✅ | 个人中心 |
| history | ✅ | 历史记录 |
| favorites | ✅ | 收藏夹 |
| achievements | ✅ | 成就展示 |
| garden | ✅ | 知识花园 |
| settings | ✅ | 设置页面 |

---

## 🎨 组件

| 组件 | 状态 | 说明 |
|------|------|------|
| message-card | ✅ | 消息卡片 |
| question-card | ✅ | 题目卡片（选择/开放） |
| theme-switcher | ✅ | 主题切换弹窗 |
| concept-card | ✅ | 概念卡片 |
| example-card | ✅ | 例子卡片 |
| summary-card | ✅ | 总结卡片 |
| plant | ✅ | 植物组件（5阶段emoji展示） |
| achievement-popup | ✅ | 成就弹窗（动画+自动关闭） |

---

## 📝 更新日志

### 2026-05-16 08:02
- 新增 `.gitignore`（过滤 node_modules、credentials、debug 文件等）
- 新增 `docs/PRIVACY-POLICY.md`（小程序上架必需的隐私政策文档）
- GitHub 已同步（commit ab770b4a）
- 代码审查：message-card 支持 [概念] 标签解析，question-card 支持选择/开放题
- 项目就绪，等待微信开发者工具导入测试

### 2026-05-16 04:02
- 代码审查：全部20个云函数、9个页面、8个组件完整
- GitHub已同步（commit 8debfe63）
- 验证所有云函数package.json依赖完整
- 确认登录流程Promise化正确
- 检查消息解析逻辑（learn页面直接渲染block，message-card独立使用）
- 确认主题切换弹窗、成就弹窗、植物组件正常工作

### 2026-05-16 00:01
- 补全 concept-card/example-card/summary-card 四个文件（js/json/wxml/wxss）
- 修改 app.js 登录后自动调用 initDatabase 云函数
- 所有 8 个组件全部完整

### 2026-05-15 16:01
- plant 组件（plant.js/json/wxml/wxss，5阶段emoji展示）
- achievement-popup 组件（achievement-popup.js/json/wxml/wxss，弹窗动画+3秒自动关闭）

### 2026-05-15 12:01
- 新增 `docs/ai-prompt.md`（AI Prompt 完整设计文档）
- 新增 `docs/PROGRESS.md`（开发进度看板）

### 2026-05-15 00:06
- 新增 `initDatabase` 云函数，包含5个预置主题和共50个节点

### 2026-05-14 16:01
- 生成 TabBar 占位图标（6个PNG）
- 修复小程序图标缺失问题

### 2026-05-14 12:01
- 补充5个空云函数（getConversations, getAchievements, checkAchievement, msgSecCheck, updateUserProfile）

### 2026-05-14 11:29
- 补全所有云函数 package.json，创建 project.config.json

### 2026-05-14 02:54
- 初始化项目结构

---

## 📦 初始化数据

### 预置主题（5个）
1. theme_economics - 经济学入门
2. theme_psychology - 心理学基础
3. theme_thinking - 思维模型大全
4. theme_business - 商业分析基础
5. theme_selfimprovement - 自我提升指南

### 节点分布（每个主题10个节点，共50个）
- database/init-data/themes.json
- database/init-data/nodes.json (经济学)
- database/init-data/nodes_psychology.json
- database/init-data/nodes_thinking.json
- database/init-data/nodes_business.json
- database/init-data/nodes_selfimprovement.json

---

## 🔧 云函数部署指南

### 步骤1：配置云开发环境
```bash
# 确认 cloudbaserc.json
{
  "envId": "cloudbase-d7gxwljzddd575d93"
}

# 确认 project.config.json
{
  "appid": "wx7298f8ed5dedc8d8",
  "projectname": "KnowYea"
}
```

### 步骤2：安装依赖（每个云函数目录）
```bash
cd cloudfunctions/login
npm install
# 对每个云函数重复此步骤
```

### 步骤3：微信开发者工具导入
1. 打开微信开发者工具
2. 导入项目：`/home/admin/workspace/knowyea/miniprogram`
3. 填写 AppID：`wx7298f8ed5dedc8d8`
4. 确认云开发环境：`cloudbase-d7gxwljzddd575d93`

### 步骤4：上传云函数
1. 右键点击 `cloudfunctions/` 目录
2. 选择"上传并部署"
3. 等待所有云函数部署完成

### 步骤5：初始化数据库
1. 在微信开发者工具中打开云开发控制台
2. 调用 initDatabase 云函数（可通过小程序自动触发或手动调用）
3. 验证 themes 和 nodes 集合有数据

---

## 🚀 下一步工作

### 高优先级
1. **真机测试** - 导入微信开发者工具，测试登录+主题选择
2. **AI接入** - 配置腾讯混元 API Secret
3. **内容安全** - msgSecCheck 生产环境对接

### 中优先级
4. **隐私政策** - 准备小程序上架所需材料
5. **图标优化** - 为5个预置主题添加实际封面图

### 低优先级
6. **用户画像完善** - profile页面与AI推荐联动

---

### 2026-05-18 16:00
- 修复 garden 页面：添加本周学习日历数据加载（timelineDays/timelineTotal）
- 修复 garden 页面：onCourseTap 正确传递 courseId 
- 修复 learn.js：支持 courseId URL 参数、加载 courseContext 从 lessonSummary
- 修复 garden.wxss/achievements.wxss：硬编码色值统一为 CSS 变量
- 清理 profile.js：移除不存在的 profile.ageRange 引用

### 2026-05-17 00:02
- 修复 submit_audit API：添加必填 item_list 字段，修正 versiondesc → version_desc
- 修复 project.config.json：添加 cloudfunctionRoot 配置
- 创建 cloudfunctionTemplate/ 目录
- 全部 24 个云函数目录均有 package.json ✅

### 2026-05-17 12:05
- **云函数全量重新部署完成**：23个云函数全部通过 miniprogram-ci `cloud.uploadFunction()` 部署到腾讯云
  - 核心 AI 函数：sendMessage (19KB) / generateTheme (20KB) / getHomeData (1.8KB) / completeNode (2KB)
  - 其余函数：login, getThemes, getStoreThemes, getUserProfile, toggleFavorite, getFavorites, getGarden, getHistory, getConversations, initDatabase, switchTheme, updateUserProfile, msgSecCheck, clearUserData, setupCollections, addTheme, checkAchievement, getAchievements, debugOnboarding, debugOpenid
- **发现 submit_audit API 问题**：AppID 是第三方平台应用，API 返回 86000（should be called only from third party）
- **解决方案**：需通过微信开发者工具或小程序管理后台手动提交审核（先生本地操作）

## 📝 备忘

- EnvId: cloudbase-d7gxwljzddd575d93
- AppID: wx7298f8ed5dedc8d8
- 小程序名称: 小知也 / KnowYea
- GitHub: https://github.com/Ryan4AI/KnowYea
- 项目目录: /home/admin/workspace/knowyea/