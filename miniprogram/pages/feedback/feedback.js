// pages/feedback/feedback.js — 意见反馈
const app = getApp()

Page({
  data: {
    content: '',
    contact: '',
    submitting: false,
  },

  onSubmit() {
    const { content, contact } = this.data
    if (content.trim().length < 2) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }
    if (!app.globalData.openid) {
      wx.showToast({ title: '登录异常', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.cloud.callFunction({
      name: 'submitFeedback',
      data: { openid: app.globalData.openid, content: content.trim(), contact: contact.trim() },
      success: res => {
        this.setData({ submitting: false })
        if (res.result?.success) {
          wx.showModal({
            title: '✅ 提交成功',
            content: '感谢你的反馈！我们会认真阅读每一条建议。',
            showCancel: false,
            success: () => wx.navigateBack({ delta: 1 }),
          })
        } else {
          wx.showToast({ title: res.result?.error || '提交失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ submitting: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      },
    })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },
})
