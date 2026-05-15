Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    themes: {
      type: Array,
      value: [],
    },
    currentThemeId: {
      type: String,
      value: '',
    },
  },

  methods: {
    onClose() {
      this.triggerEvent('close')
    },

    onSelectTheme(e) {
      const themeId = e.currentTarget.dataset.id
      if (!themeId || themeId === this.data.currentThemeId) {
        this.onClose()
        return
      }
      this.triggerEvent('themechange', { themeId })
    },

    onGoThemeStore() {
      this.triggerEvent('addtheme')
    },

    noop() {},
  },
})
