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
    visible: false,
  },

  observers: {
    'show, achievement'(show, achievement) {
      if (this._closeTimer) {
        clearTimeout(this._closeTimer)
        this._closeTimer = null
      }
      if (show && achievement) {
        this.setData({ visible: true })
        this._closeTimer = setTimeout(() => {
          this._closeTimer = null
          this.setData({ visible: false })
          this.triggerEvent('close')
        }, 3200)
      } else if (!show) {
        this.setData({ visible: false })
      }
    },
  },

  methods: {
    onClose() {
      if (this._closeTimer) {
        clearTimeout(this._closeTimer)
        this._closeTimer = null
      }
      this.setData({ visible: false })
      this.triggerEvent('close')
    },
  },
})
