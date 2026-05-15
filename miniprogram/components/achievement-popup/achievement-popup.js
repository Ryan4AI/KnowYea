// components/achievement-popup/achievement-popup.js
Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    achievement: {
      type: Object,
      value: null,
    },
  },

  data: {
    // 控制弹窗显示
    visible: false,
  },

  observers: {
    show(newVal) {
      if (newVal && this.data.achievement) {
        this.setData({ visible: true })
        // 3秒后自动关闭
        setTimeout(() => {
          this.setData({ visible: false })
          this.triggerEvent('close')
        }, 3000)
      }
    },
  },

  methods: {
    onClose() {
      this.setData({ visible: false })
      this.triggerEvent('close')
    },
  },
})