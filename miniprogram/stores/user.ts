// stores/user.ts - 用户状态
import { makeAutoObservable } from 'mobx-miniprogram'

export const userStore = makeAutoObservable({
  openid: '',
  isLogin: false,
  profile: {
    age: null,
    occupation: '',
    interests: [],
  },
  settings: {
    notifications: true,
  },

  setUserInfo(openid, isNewUser = false) {
    this.openid = openid
    this.isLogin = true
  },

  setProfile(profile) {
    this.profile = { ...this.profile, ...profile }
  },

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings }
  },

  logout() {
    this.openid = ''
    this.isLogin = false
  },
})