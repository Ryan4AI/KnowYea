# 小知也 - 开发进度看板

> 最后更新：2026-05-15 16:01

---

## 📊 整体进度

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目结构 | ✅ 完成 | 20个云函数、9个页面、5个组件 |
| 云开发配置 | ✅ 完成 | appid/环境ID/云函数配置 |
| 数据库设计 | ✅ 完成 | schema.md + 初始化数据 |
| 预置主题 | ✅ 完成 | 5主题x10节点=50节点（initDatabase云函数） |
| AI Prompt | ✅ 完成 | docs/ai-prompt.md |
| 云函数实现 | ✅ 完成 | 全部20个，sendMessage使用模拟AI |
| 小程序前端 | ⚠️ 部分 | learn页面完善中，其他页面待联调 |
| AI真实接入 | ⏳ 待做 | 需配置腾讯混元SECRET |
| 内容安全 | ⏳ 待做 | msgSecCheck生产环境对接 |
| 真机测试 | ⏳ 待做 | 需微信开发者工具导入测试 |
| 提交审核 | ⏳ 待做 | 需准备材料+版权证明 |

---

## ☁️ 云函数清单（20个）

| 云函数 | 状态 | 备注 |
|--------|------|------|
| login | ✅ | 匿名登录，获取openid |
| generateTheme | ✅ | AI生成主题，模拟数据 |
| sendMessage | ✅ | AI对话，模拟回复 |
| completeNode | ✅ | 完成节点判定 |
| getHomeData | ✅ | 首页数据聚合 |
| switchTheme | ✅ | 主题切换 |
| addTheme | ✅ | 从主题库添加 |
| getThemes | ✅ | 用户主题列表 |
| getStoreThemes | ✅ | 主题库 |
| getUserProfile | ✅ | 用户信息 |
| updateUserProfile | ✅ | 更新画像 |
| toggleFavorite | ✅ | 收藏/取消 |
| getFavorites | ✅ | 收藏列表 |
| getGarden | ✅ | 花园数据 |
| getHistory | ✅ | 学习历史 |
| getConversations | ✅ | 对话历史 |
| getAchievements | ✅ | 成就列表 |
| checkAchievement | ✅ | 成就检查 |
| msgSecCheck | ✅ | 内容安全（模拟） |
| initDatabase | ✅ | 初始化5主题+50节点 |

---

## 📱 小程序页面

| 页面 | 状态 | 说明 |
|------|------|------|
| learn | ⚠️ 部分 | 对话界面，消息解析需完善 |
| themes | ⏳ 待联调 | 主题管理页面 |
| theme-store | ⏳ 待联调 | 主题库页面 |
| profile | ⏳ 待联调 | 个人中心 |
| history | ⏳ 待联调 | 历史记录 |
| favorites | ⏳ 待联调 | 收藏夹 |
| achievements | ⏳ 待联调 | 成就展示 |
| garden | ⏳ 待联调 | 知识花园 |
| settings | ⏳ 待联调 | 设置页面 |

---

## 🎨 组件

| 组件 | 状态 | 说明 |
|------|------|------|
| message-card | ✅ | 消息卡片 |
| question-card | ✅ | 题目卡片（选择/开放） |
| theme-switcher | ✅ | 主题切换弹窗 |
| concept-card | ✅ | 概念卡片 |
| example-card | ✅ | 例子卡片 |
| plant | ✅ 2026-05-15 | 植物组件（5阶段emoji展示） |
| achievement-popup | ✅ 2026-05-15 | 成就弹窗（动画+自动关闭） |
| summary-card | ⚠️ 内置 | 在 learn.wxss 中实现 |

---

## 📦 初始化数据

### 预置主题（5个）
1. theme_economics - 经济学入门
2. theme_psychology - 心理学基础
3. theme_thinking - 思维模型大全
4. theme_business - 商业分析基础
5. theme_selfimprovement - 自我提升指南

### 节点分布（每个主题10个节点）
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
2. 导入项目：`/home/admin/workspace/knowledge-capsule/miniprogram`
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
3. **页面联调** - learn页面与其他页面联动

### 中优先级
4. **plant组件** - 知识花园植物展示组件
5. **achievement-popup** - 成就解锁弹窗
6. **内容安全** - msgSecCheck 生产环境对接

### 低优先级
7. **主题封面** - 为5个预置主题添加封面图
8. **用户画像采集** - profile页面完善
9. **隐私政策** - 准备小程序上架所需材料

---

## 📝 备忘

- EnvId: cloudbase-d7gxwljzddd575d93
- AppID: wx7298f8ed5dedc8d8
- 小程序名称: 小知也 / KnowYea
- GitHub: https://github.com/Ryan4AI/KnowYea