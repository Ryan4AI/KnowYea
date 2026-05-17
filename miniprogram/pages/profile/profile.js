// pages/profile/profile.js — 个人中心：画像收集 / 编辑 / 统计展示
const app = getApp()

const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']

const OCCUPATION_OPTIONS = [
  '学生', '教师/教育', '产品经理', '设计师', '前端工程师',
  '后端工程师', 'AI与算法工程师', '其他技术岗位', '市场/运营',
  '销售/商务', '管理/高管', '金融/投资', '医疗/健康',
  '法律/合规', '自由职业者', '创业者', '其他',
]

const InterestTags = [
  '职场技能', '项目管理', '沟通表达', '领导力',
  '思维模型', '逻辑思考', '决策判断',
  'AI入门', '编程开发', '科技前沿',
  '投资理财', '商业分析', '创业知识',
  '心理学', '哲学思辨', '历史文化',
  '学习方法', '时间管理', '情绪管理',
]

function getRecommendedTags(occupation) {
  const map = {
    '学生':           ['学习方法', '时间管理', '思维模型', '心理学'],
    '教师/教育':      ['心理学', '沟通表达', '学习方法', '逻辑思考'],
    '产品经理':       ['思维模型', '项目管理', '商业分析', '决策判断'],
    '设计师':         ['思维模型', '心理学', '沟通表达', '科技前沿'],
    '前端工程师':     ['编程开发', 'AI入门', '科技前沿', '学习方法'],
    '后端工程师':     ['AI入门', '编程开发', '科技前沿', '逻辑思考'],
    'AI与算法工程师': ['AI入门', '编程开发', '科技前沿', '决策判断'],
    '其他技术岗位':   ['科技前沿', '编程开发', 'AI入门', '逻辑思考'],
    '市场/运营':      ['沟通表达', '心理学', '商业分析', '思维模型'],
    '销售/商务':      ['沟通表达', '心理学', '决策判断', '情绪管理'],
    '管理/高管':      ['领导力', '决策判断', '商业分析', '思维模型'],
    '金融/投资':      ['投资理财', '商业分析', '逻辑思考', '决策判断'],
    '医疗/健康':      ['心理学', '情绪管理', '沟通表达', '学习方法'],
    '法律/合规':      ['逻辑思考', '沟通表达', '决策判断', '哲学思辨'],
    '自由职业者':     ['时间管理', '学习方法', '沟通表达', '投资理财'],
    '创业者':         ['创业知识', '商业分析', '领导力', '思维模型'],
    '其他':           ['学习方法', '思维模型', '时间管理', '沟通表达'],
  }
  return map[occupation] || ['学习方法', '思维模型', '时间管理', '沟通表达']
}

Page({
  data: {
    // 展示态
    user: null,
    userProfile: null,
    stats: { completedNodes: 0, completedThemes: 0, totalPoints: 0, streak: 0 },
    achievements: [],
    recentThemes: [],
    profileSlogan: '',
    // 编辑态
    showForm: false,
    isEditing: false,
    profileForm: {
      ageIndex: 2,
      occupationIndex: -1,
      interestIndexes: [],
    },
    ageOptions: AGE_OPTIONS,
    occupationOptions: OCCUPATION_OPTIONS,
    interestOptions: InterestTags,
    customInterests: [],
    _customInputValue: '',
    isSaving: false,
  },

  onLoad(opts) {
    if (opts && opts.edit === '1') {
      this.setData({ isEditing: true })
    }
  },

  onShow() {
    this.loadProfile()
  },

  // ---- 数据加载 ----
  loadProfile() {
    if (!app.globalData.openid) return

    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result && res.result.success) {
          const profile = res.result.user?.profile
          if (!profile || this.data.isEditing) {
            // 没画像 或 编辑模式 → 显示表单
            if (profile && this.data.isEditing) {
              this.backfillForm(profile)
            }
            this.setData({ showForm: true })
            return
          }
          // 有画像 → 显示统计
          const stats = res.result.stats || { completedNodes: 0, completedThemes: 0, totalPoints: 0, streak: 0 }
          const interests = profile.interests || []
          const slogan = `${profile.occupation || ''}${interests.length > 0 ? ' · ' + interests.join('、') : ''}`
          this.setData({
            user: res.result.user,
            userProfile: profile,
            stats,
            achievements: res.result.achievements || [],
            profileSlogan: slogan,
            showForm: false,
          })
        }
      },
      fail: err => {
        console.error('加载个人中心失败', err)
      },
    })
  },

  backfillForm(profile) {
    const ageIndex = AGE_OPTIONS.indexOf(profile.ageRange || profile.age)
    const occIndex = OCCUPATION_OPTIONS.indexOf(profile.occupation)
    const interestIndexes = (profile.interests || [])
      .map(t => InterestTags.indexOf(t))
      .filter(i => i >= 0)
    const customInterests = (profile.interests || []).filter(t => InterestTags.indexOf(t) < 0)
    const tags = OCCUPATION_OPTIONS[occIndex] ? getRecommendedTags(OCCUPATION_OPTIONS[occIndex]) : []
    this.setData({
      'profileForm.ageIndex': ageIndex >= 0 ? ageIndex : 2,
      'profileForm.occupationIndex': occIndex >= 0 ? occIndex : -1,
      'profileForm.interestIndexes': interestIndexes,
      customInterests,
    })
  },

  // ---- 表单交互 ----
  onAgeChange(e) {
    this.setData({ 'profileForm.ageIndex': Number(e.detail.value) })
  },

  onOccupationChange(e) {
    const occIndex = Number(e.detail.value)
    const occupation = OCCUPATION_OPTIONS[occIndex]
    const tags = getRecommendedTags(occupation)
    const recIndexes = tags.map(t => InterestTags.indexOf(t)).filter(i => i >= 0)
    this.setData({
      'profileForm.occupationIndex': occIndex,
      'profileForm.interestIndexes': recIndexes,
    })
  },

  onInterestToggle(e) {
    const index = Number(e.currentTarget.dataset.index)
    const indexes = [...this.data.profileForm.interestIndexes]
    const pos = indexes.indexOf(index)
    if (pos >= 0) indexes.splice(pos, 1)
    else indexes.push(index)
    this.setData({ 'profileForm.interestIndexes': indexes })
  },

  // 添加自定义兴趣（输入框+按钮模式）
  onCustomInterestAdd() {
    const val = (this.data._customInputValue || '').trim()
    if (!val) {
      wx.showToast({ title: '请输入兴趣', icon: 'none' })
      return
    }
    if (val.length > 8) {
      wx.showToast({ title: '最多8个字', icon: 'none' })
      return
    }
    const customs = [...this.data.customInterests]
    if (customs.indexOf(val) >= 0) {
      wx.showToast({ title: '已添加过了', icon: 'none' })
      return
    }
    customs.push(val)
    this.setData({ customInterests: customs, _customInputValue: '' })
  },

  // 绑定输入值
  onCustomInterestInput(e) {
    this.setData({ _customInputValue: e.detail.value })
  },

  onRemoveCustom(e) {
    const index = e.currentTarget.dataset.index
    const customs = [...this.data.customInterests]
    customs.splice(index, 1)
    this.setData({ customInterests: customs })
  },

  onCustomInterestConfirm(e) {
    const val = (e.detail.value || '').trim()
    if (!val) return
    if (val.length > 8) {
      wx.showToast({ title: '最多8个字', icon: 'none' })
      return
    }
    const customs = [...this.data.customInterests]
    if (customs.indexOf(val) >= 0) {
      wx.showToast({ title: '已添加过了', icon: 'none' })
      return
    }
    customs.push(val)
    this.setData({ customInterests: customs })
  },

  onRemoveCustom(e) {
    const index = Number(e.currentTarget.dataset.index)
    const customs = [...this.data.customInterests]
    customs.splice(index, 1)
    this.setData({ customInterests: customs })
  },

  // ---- 保存 ----
  onSaveProfile() {
    const { profileForm, customInterests } = this.data
    if (profileForm.occupationIndex < 0) {
      wx.showToast({ title: '请选择职业', icon: 'none' })
      return
    }
    if (!app.globalData.openid) {
      wx.showToast({ title: '登录异常', icon: 'none' })
      return
    }

    this.setData({ isSaving: true })
    const interests = [
      ...profileForm.interestIndexes.map(i => InterestTags[i]),
      ...customInterests,
    ]
    const profile = {
      ageRange: AGE_OPTIONS[profileForm.ageIndex],
      occupation: OCCUPATION_OPTIONS[profileForm.occupationIndex],
      interests,
    }

    wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: { openid: app.globalData.openid, profile },
      success: res => {
        this.setData({ isSaving: false })
        if (res.result?.success) {
          app.globalData.profileUpdated = Date.now()
          // 首次设置 → 去课程商店生成课程
          if (!this.data.userProfile) {
            app.setLearnContext({ mode: 'generate' })
            wx.redirectTo({ url: '/pages/learn/learn' })
          } else {
            wx.navigateBack({ delta: 1 })
          }
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ isSaving: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
    })
  },

  onGoEditProfile() {
    this.setData({ isEditing: true })
    const profile = this.data.userProfile
    if (profile) this.backfillForm(profile)
    this.setData({ showForm: true })
  },

  // ---- 导航 ----
  onNavigateTo(e) {
    const routes = {
      history: '/pages/history/history',
      favorites: '/pages/favorites/favorites',
      achievements: '/pages/achievements/achievements',
      garden: '/pages/garden/garden',
      settings: '/pages/settings/settings',
    }
    const page = e.currentTarget.dataset.page
    if (routes[page]) wx.navigateTo({ url: routes[page] })
  },
})
