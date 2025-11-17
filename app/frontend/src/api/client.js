import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const api = {
  // Import
  importCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/api/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Groups
  getGroups: (params = {}) => {
    return client.get('/api/groups', { params })
  },

  getGroup: (id) => {
    return client.get(`/api/groups/${id}`)
  },

  updateGroup: (id, payload) => {
    return client.patch(`/api/groups/${id}`, payload)
  },

  getModules: () => {
    return client.get('/api/modules')
  },

  exportGroups: (params = {}) => {
    return client.get('/api/export/groups', {
      params,
      responseType: 'blob',
    })
  },

  // Users
  getUsers: (params = {}) => {
    return client.get('/api/users', { params })
  },

  exportUsers: (params = {}) => {
    return client.get('/api/export/users', {
      params,
      responseType: 'blob',
    })
  },

  // Inheritance
  getInheritance: () => {
    return client.get('/api/inheritance')
  },

  // Analysis
  getCompliance: () => {
    return client.get('/api/analysis/compliance')
  },

  getGapAnalysis: () => {
    return client.get('/api/analysis/gaps')
  },

  exportNonCompliant: () => {
    return client.get('/api/export/analysis/non-compliant', {
      responseType: 'blob',
    })
  },

  // Statistics
  getStats: () => {
    return client.get('/api/stats')
  },
}

export default client

