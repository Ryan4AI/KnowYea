// pages/profile/profile.js — 画像收集 / 编辑（纯表单）
const app = getApp()
const { callGenerateTheme, startProgressSimulation } = require('../../services/course-generator')

const AGE_OPTIONS = ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上']

const OCCUPATION_OPTIONS = [
  '学生', '教师/教育', '产品经理', '设计师', '前端工程师',
  '后端工程师', 'AI与算法工程师', '其他技术岗位', '市场/运营',
  '销售/商务', '管理/高管', '金融/投资', '医疗/健康',
  '法律/合规', '自由职业者', '创业者', '其他',
]

let InterestTags = []
let _tagsLoadingStarted = false

function getRecommendedTags(age, occupation) {
  if (InterestTags.length === 0) return []

  const AGE_BASE = {
    '18岁以下': ['编程', 'AI', '外语', '写作', '思维模型'],
    '18-25岁': ['编程', 'AI', '外语', '写作', '思维模型'],
    '26-35岁': ['AI', '编程', '职场进阶', '沟通表达', '思维模型'],
    '36-45岁': ['项目管理', '商业分析', '领导力', '投资理财', '沟通表达'],
    '46岁以上': ['人文历史', '投资理财', '心理成长', '领导力', '健身健康'],
  }

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

  const occTags = OCCUPATION_MAP[occupation] || OCCUPATION_MAP['其他']
  const ageTags = AGE_BASE[age] || []
  const merged = [...occTags]
  for (const t of ageTags) {
    if (!merged.includes(t)) merged.push(t)
  }
  return merged.slice(0, 12).map(n => InterestTags.indexOf(n)).filter(i => i >= 0)
}

Page({
  data: {
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

  _hasProfile: false,

  onLoad(opts) {
    if (opts && opts.forceForm === '1') {
      this.setData({ showForm: true })
    }
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

  loadProfile() {
    if (!app.globalData.openid) return
    wx.cloud.callFunction({
      name: 'getUser',
      data: { openid: app.globalData.openid },
      success: res => {
        if (res.result && res.result.success) {
          const userData = res.result.data?.user
          const profile = userData?.profile || { age: userData?.age, occupation: userData?.occupation, interests: userData?.interests || [] }
          if (profile && profile.occupation) {
            this.backfillForm(profile)
            this._hasProfile = true
          }
        }
      },
      fail: () => {},
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
      showTags: true,
    })
  },

  onAgeChange(e) {
    const ageIndex = Number(e.detail.value)
    const age = AGE_OPTIONS[ageIndex]
    const occIndex = this.data.profileForm.occupationIndex
    const occupation = OCCUPATION_OPTIONS[occIndex]
    if (age && occupation) {
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

    // 编辑模式（已有画像）→ 只保存，跳回
    if (this._hasProfile) {
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

    // 首次设置 → 进度条 + 保存画像 + 生成课程
    const keyword = interests.join('、').substring(0, 50)
    this.setData({ genOverlay: true })
    this._cancelProgress = startProgressSimulation((stage, progress) => {
      this.setData({ genStage: stage, genProgress: progress })
    })

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
        }
      },
      fail: () => {
        wx.showToast({ title: '画像保存失败', icon: 'none' })
      }
    })

    const profile = { age: AGE_OPTIONS[profileForm.ageIndex], occupation: OCCUPATION_OPTIONS[profileForm.occupationIndex], interests }
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
    wx.cloud.callFunction({
      name: 'deleteCourse',
      data: { openid: app.globalData.openid, courseId: oldTheme.id },
    })
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
})
