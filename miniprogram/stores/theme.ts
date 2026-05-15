// stores/theme.ts - 主题状态
import { makeAutoObservable } from 'mobx-miniprogram'

export const themeStore = makeAutoObservable({
  currentTheme: null,     // 当前学习的theme对象
  currentNode: null,      // 当前学习的node对象
  userThemes: [],         // 用户的主题列表
  storeThemes: [],        // 主题库
  currentNodeOrder: 1,    // 当前节点顺序
  completedNodeIds: [],   // 已完成节点ID列表

  setCurrentTheme(theme, node, completedNodeIds = [], currentNodeOrder = 1) {
    this.currentTheme = theme
    this.currentNode = node
    this.completedNodeIds = completedNodeIds
    this.currentNodeOrder = currentNodeOrder
  },

  setUserThemes(themes) {
    this.userThemes = themes
  },

  setStoreThemes(themes) {
    this.storeThemes = themes
  },

  goToNode(node, nodeOrder) {
    this.currentNode = node
    this.currentNodeOrder = nodeOrder
  },

  completeNode(nodeId) {
    if (!this.completedNodeIds.includes(nodeId)) {
      this.completedNodeIds.push(nodeId)
    }
    this.currentNodeOrder += 1
  },

  clearTheme() {
    this.currentTheme = null
    this.currentNode = null
    this.currentNodeOrder = 1
    this.completedNodeIds = []
  },
})