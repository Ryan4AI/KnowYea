Component({
  properties: {
    themes: { type: Array, value: [] },
    currentThemeId: { type: String, value: '' }
  },

  methods: {
    onThemeChange(e) {
      const themeId = e.currentTarget.dataset.id
      this.triggerEvent('themechange', { themeId })
    }
  }
})