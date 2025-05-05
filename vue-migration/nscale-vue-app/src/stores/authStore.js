import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null,
    userRole: localStorage.getItem('userRole') || 'user',
    loading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.userRole === 'admin'
  },
  
  actions: {
    async login(email, password) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.post('/api/auth/login', {
          email,
          password
        })
        
        // Token und Rolle speichern
        this.token = response.data.token
        this.userRole = response.data.user_role || 'user'
        
        // In localStorage persistieren
        localStorage.setItem('token', this.token)
        localStorage.setItem('userRole', this.userRole)
        
        // Axios-Header für zukünftige Anfragen setzen
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        
        return true
      } catch (error) {
        this.error = error.response?.data?.detail || 'Login fehlgeschlagen'
        return false
      } finally {
        this.loading = false
      }
    },
    
    async logout() {
      // Token zurücksetzen
      this.token = ''
      this.userRole = 'user'
      this.user = null
      
      // LocalStorage bereinigen
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      
      // Axios-Header zurücksetzen
      delete axios.defaults.headers.common['Authorization']
    },
    
    async loadUserData() {
      if (!this.token) return
      
      try {
        const response = await axios.get('/api/auth/user')
        this.user = response.data
        this.userRole = response.data.role || 'user'
        localStorage.setItem('userRole', this.userRole)
      } catch (error) {
        // Bei Fehler ausloggen (Token könnte ungültig sein)
        if (error.response?.status === 401) {
          this.logout()
        }
      }
    },
    
    // Token aus localStorage wiederherstellen
    initAuth() {
      const token = localStorage.getItem('token')
      const userRole = localStorage.getItem('userRole')
      
      if (token) {
        this.token = token
        this.userRole = userRole || 'user'
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        // Benutzerinformationen laden
        this.loadUserData()
      }
    }
  }
})