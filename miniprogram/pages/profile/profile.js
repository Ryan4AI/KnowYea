// pages/profile/profile.js — 个人中心：画像收集 / 编辑 / 统计展示
const app = getApp()
const { loadInterestTags, callGenerateTheme, startProgressSimulation } = require('../../services/course-generator')

const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']

const OCCUPATION_OPTIONS = [
  '学生', '教师/教育', '产品经理', '设计师', '前端工程师',
  '后端工程师', 'AI与算法工程师', '其他技术岗位', '市场/运营',
  '销售/商务', '管理/高管', '金融/投资', '医疗/健康',
  '法律/合规', '自由职业者', '创业者', '其他',
]

let InterestTags = [] // 从云函数动态加载
let _tagsLoadingStarted = false

function getRecommendedTags(age, occupation) {
  if (InterestTags.length === 0) return []

  // 年龄基础推荐（5个）
  const AGE_BASE = {
    '18岁以下': ['编程', 'AI', '外语', '写作', '思维模型'],
    '18-25岁': ['编程', 'AI', '外语', '写作', '思维模型'],
    '26-35岁': ['AI', '编程', '职场进阶', '沟通表达', '思维模型'],
    '36-45岁': ['项目管理', '商业分析', '领导力', '投资理财', '沟通表达'],
    '46岁以上': ['人文历史', '投资理财', '心理成长', '领导力', '健身健康'],
  }

  // 职业定向推荐（7个）
  const OCCUPATION_MAP = {
    '学生':           ['编程', 'AI', '外语', '写作', '思维模型', '设计', '心理成长'],
    '教师/教育':      ['心理成长', '沟通表达', '人文历史', '写作', '思维模型', '领导力', '投资理财'],
    '产品经理':       ['产品', '项目管理', '商业分析', '沟通表达', '思维模型', '科技前沿', '领导力'],
    '设计师':         ['设计', '思维模型', '科技前沿', '沟通表达', '心理成长', '编程', '写作'],
    '前端工程师':     ['编程', 'AI', '科技前沿', '设计', '产品', '思维模型', '沟通表达'],
    '后端工程师':     ['编程', 'AI', '数据', '科技前沿', '思维模型', '项目管理', '职场进阶'],
    'AI与算法工程师': ['AI', '编程', '数据', '科技前沿', '思维模型', '项目管理', '职场进阶'],
    '其他技术岗位':   ['AI', '编程', '科技前沿', '思维模型', '职场进阶', '项目管理', '沟通表达'],
    '市场/运营':      ['沟通表达', '营销', '商业分析', '心理成长', '写作', '思维模型', '产品'],
    '销售/商务':      ['沟通表达', '营销', '商业分析', '投资理财', '心理成长', '思维模型', '写作'],
    '管理/高管':      ['领导力', '商业分析', '项目管理', '沟通表达', '思维模型', '投资理财', '心理成长'],
    '金融/投资':      ['投资理财', '商业分析', '数据', '思维模型', '科技前沿', 'AI', '沟通表达'],
    '医疗/健康':      ['健身健康', '心理成长', '沟通表达', '数据', '科技前沿', '思维模型', '写作'],
    '法律/合规':      ['思维模型', '人文历史', '沟通表达', '写作', '心理成长', '商业分析', '外语'],
    '自由职业者':     ['创业', '投资理财', '设计', '写作', '思维模型', '沟通表达', 'AI'],
    '创业者':         ['创业', '商业分析', '领导力', '项目管理', '营销', '沟通表达', '投资理财'],
    '其他':           ['思维模型', '沟通表达', '职场进阶', '科技前沿', '写作', 'AI', '项目管理'],
  }

  // 合并：职业标签优先（排在前面），年龄标签补位去重
  const occTags = OCCUPATION_MAP[occupation] || OCCUPATION_MAP['其他']
  const ageTags = AGE_BASE[age] || []
  const merged = [...occTags]
  for (const t of ageTags) {
    if (!merged.includes(t)) merged.push(t)
  }
  // 取前12个实际存在的标签，返回索引
  return merged.slice(0, 12).map(n => InterestTags.indexOf(n)).filter(i => i >= 0)
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
    showTags: false,
    profileForm: {
      ageIndex: 2,
      occupationIndex: -1,
      interestIndexes: [],
    },
    ageOptions: AGE_OPTIONS,
    occupationOptions: OCCUPATION_OPTIONS,
    interestOptions: [],
    customInterests: [],
    _customInputValue: '',
    isSaving: false,
    genOverlay: false,
    genStage: '',
    genProgress: 0,
    genResult: null,
  },

  onLoad(opts) {
    if (opts && opts.edit === '1') {
      this.setData({ isEditing: true })
    }
    if (opts && opts.forceForm === '1') {
      this.setData({ showForm: true })
    }
    // 从云函数加载标签列表
    if (!_tagsLoadingStarted) {
      _tagsLoadingStarted = true
      wx.cloud.callFunction({
        name: 'getTags', data: {},
        success: r => {
          const tags = (r.result?.data || []).map(t => t.name || t).filter(t => t)
          if (tags.length > 0) InterestTags = tags
          this.setData({ interestOptions: InterestTags })
        },
        fail: () => {},
      })
    }
  },

  onShow() {
    this.loadProfile()
  },

  // ---- 数据加载 ----
  loadProfile() {
    if (!app.globalData.openid) return

    wx.cloud.callFunction({
      name: 'getUser',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result && res.result.success) {
          const userData = res.result.data?.user
          const profile = userData?.profile || { age: userData?.age, occupation: userData?.occupation, interests: userData?.interests || [] }
          if (!profile || !profile.occupation || this.data.isEditing) {
            // 没画像 或 编辑模式 → 显示表单
            if (profile && this.data.isEditing) {
              this.backfillForm(profile)
            }
            this.setData({ showForm: true })
            return
          }
          // 有画像 → 显示统计
          const stats = res.result.data?.stats || userData || { completedNodes: 0, completedThemes: 0, totalPoints: 0, streak: 0 }
          const interests = profile.interests || userData?.interests || []
          const slogan = `${profile.occupation || ''}${interests.length > 0 ? ' · ' + interests.join('、') : ''}`
          this.setData({
            user: userData,
            userProfile: profile,
            stats,
            achievements: res.result.data?.achievements || [],
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
    const ageIndex = AGE_OPTIONS.indexOf(profile.age)
    const occIndex = OCCUPATION_OPTIONS.indexOf(profile.occupation)
    const hasExistingInterests = (profile.interests || []).length > 0
    const interestIndexes = hasExistingInterests
      ? (profile.interests || []).map(t => InterestTags.indexOf(t)).filter(i => i >= 0)
      : []
    const customInterests = (profile.interests || []).filter(t => InterestTags.indexOf(t) < 0)
    this.setData({
      'profileForm.ageIndex': ageIndex >= 0 ? ageIndex : 2,
      'profileForm.occupationIndex': occIndex >= 0 ? occIndex : -1,
      'profileForm.interestIndexes': interestIndexes,
      customInterests,
      showTags: true, // 编辑已有画像时直接显示标签
    })
  },

  // ---- 表单交互 ----
  onAgeChange(e) {
    const ageIndex = Number(e.detail.value)
    const age = AGE_OPTIONS[ageIndex]
    const occIndex = this.data.profileForm.occupationIndex
    const occupation = OCCUPATION_OPTIONS[occIndex]
    if (age && occupation) {
      // 年龄和职业都选好了 → 展示并推荐标签
      const tags = getRecommendedTags(age, occupation)
      this.setData({
        'profileForm.ageIndex': ageIndex,
        'profileForm.interestIndexes': tags,
        showTags: true,
      })
    } else {
      this.setData({ 'profileForm.ageIndex': ageIndex })
    }
  },

  onOccupationChange(e) {
    const occIndex = Number(e.detail.value)
    const occupation = OCCUPATION_OPTIONS[occIndex]
    const age = AGE_OPTIONS[this.data.profileForm.ageIndex]
    if (age && occupation) {
      const tags = getRecommendedTags(age, occupation)
      this.setData({
        'profileForm.occupationIndex': occIndex,
        'profileForm.interestIndexes': tags,
        showTags: true,
      })
    } else {
      this.setData({ 'profileForm.occupationIndex': occIndex })
    }
  },

  onRemoveTag(e) {
    const index = Number(e.currentTarget.dataset.index)
    const indexes = this.data.profileForm.interestIndexes.filter(i => i !== index)
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

    const interests = [
      ...profileForm.interestIndexes.map(i => InterestTags[i]),
      ...customInterests,
    ]
    const profile = {
      ageRange: AGE_OPTIONS[profileForm.ageIndex],
      occupation: OCCUPATION_OPTIONS[profileForm.occupationIndex],
      interests,
    }

    // 编辑模式（已有画像）→ 只保存，跳回
    if (this.data.userProfile) {
      this.setData({ isSaving: true })
      wx.cloud.callFunction({
        name: 'updateProfile',
        data: {
          openid: app.globalData.openid,
          age: AGE_OPTIONS[profileForm.ageIndex],
          occupation: OCCUPATION_OPTIONS[profileForm.occupationIndex],
          tags: interests,
        },
        success: res => {
          this.setData({ isSaving: false })
          if (res.result?.success) {
            wx.navigateBack({ delta: 1 })
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        },
        fail: () => {
          this.setData({ isSaving: false })
          wx.showToast({ title: '网络错误', icon: 'none' })
        },
      })
      return
    }

    // 首次设置 → 立即显示进度条，并行保存画像 + 生成课程
    // 取所有兴趣标签提交给 AI，让 AI 综合设计课程内容
    const keyword = interests.join('、').substring(0, 50)
    this.setData({ genOverlay: true })
    this._cancelProgress = startProgressSimulation((stage, progress) => {
      this.setData({ genStage: stage, genProgress: progress })
    })

    // 保存画像（后台执行，不阻塞）
    wx.cloud.callFunction({
      name: 'updateProfile',
      data: {
        openid: app.globalData.openid,
        age: AGE_OPTIONS[profileForm.ageIndex],
        occupation: OCCUPATION_OPTIONS[profileForm.occupationIndex],
        tags: interests,
      },
      success: res => {
        if (res.result?.success) {
          app.globalData.profileUpdated = Date.now()
        } else {
          wx.showToast({ title: '画像保存失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '画像保存失败', icon: 'none' })
      }
    })

    // 生成课程（与保存并行）
    callGenerateTheme(app.globalData.openid, profile, keyword).then(r => {
      this._cancelProgress?.()
      if (r.success) {
        const theme = r.theme
        this.setData({
          genOverlay: false,
          genResult: theme,
          genStage: '',
          genProgress: 0,
        })
      } else {
        this.setData({ genStage: '❌ ' + (r.error || '生成失败'), genOverlay: false })
        wx.showToast({ title: r.error || '生成失败', icon: 'none' })
      }
    }).catch(() => {
      this._cancelProgress?.()
      this.setData({ genOverlay: false })
      wx.showToast({ title: '网络错误', icon: 'none' })
    })
  },

  onConfirmCourse() {
    const theme = this.data.genResult
    if (!theme) return
    this.setData({ genResult: null })
    wx.redirectTo({ url: '/pages/learn/learn?courseId=' + theme.id })
  },

  onRegenerateCourse() {
    const oldTheme = this.data.genResult
    if (!oldTheme) return
    this.setData({ genResult: null })
    // 先删除旧课程（后台执行）
    wx.cloud.callFunction({
      name: 'deleteCourse',
      data: { openid: app.globalData.openid, courseId: oldTheme.id },
    })
    // 重新走生成流程
    const { profileForm } = this.data
    const interests = profileForm.interestIndexes.map(i => this.data.interestOptions[i]).concat(this.data.customInterests)
    const profile = { age: AGE_OPTIONS[profileForm.ageIndex], occupation: OCCUPATION_OPTIONS[profileForm.occupationIndex], interests }
    const keyword = interests.join('、').substring(0, 50)
    this.setData({ genOverlay: true })
    this._cancelProgress = startProgressSimulation((stage, progress) => {
      this.setData({ genStage: stage, genProgress: progress })
    })
    callGenerateTheme(app.globalData.openid, profile, keyword).then(r => {
      this._cancelProgress?.()
      if (r.success) {
        this.setData({
          genOverlay: false,
          genResult: r.theme,
          genStage: '',
          genProgress: 0,
        })
      } else {
        this.setData({ genStage: '❌ ' + (r.error || '生成失败'), genOverlay: false })
        wx.showToast({ title: r.error || '生成失败', icon: 'none' })
      }
    }).catch(() => {
      this._cancelProgress?.()
      this.setData({ genOverlay: false })
      wx.showToast({ title: '网络错误', icon: 'none' })
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
      achievements: '/pages/achievements/achievements',
      garden: '/pages/garden/garden',
    }
    const page = e.currentTarget.dataset.page
    if (routes[page]) wx.navigateTo({ url: routes[page] })
  },
})
