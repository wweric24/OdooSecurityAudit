import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window?.location?.hostname ? `http://${window.location.hostname}:3200` : 'http://localhost:3200')

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

  // Sync operations
  syncAzureUsers: () => {
    return client.post('/api/sync/azure-users')
  },

  syncOdooDatabase: () => {
    return client.post('/api/sync/odoo-db')
  },

  getSyncStatus: (params = {}) => {
    return client.get('/api/sync/status', { params })
  },

  // Statistics
  getStats: () => {
    return client.get('/api/stats')
  },

  // Configuration
  getConfigStatus: () => {
    return client.get('/api/config/status')
  },

  testAzureConnection: () => {
    return client.post('/api/config/test-azure')
  },

  testOdooConnection: () => {
    return client.post('/api/config/test-odoo')
  },

  switchOdooEnvironment: (environment) => {
    return client.post(`/api/config/switch-environment?environment=${environment}`)
  },

  // Comparison (Azure vs Odoo)
  runComparison: () => {
    return client.post('/api/comparison/run')
  },

  getComparisonSummary: () => {
    return client.get('/api/comparison/summary')
  },

  getComparisonResults: (discrepancyType = null) => {
    const params = discrepancyType ? { discrepancy_type: discrepancyType } : {}
    return client.get('/api/comparison/results', { params })
  },

  resolveDiscrepancy: (resultId, notes = null) => {
    const params = notes ? { notes } : {}
    return client.post(`/api/comparison/resolve/${resultId}`, null, { params })
  },

  // CRUD Permissions
  getGroupPermissions: (groupId) => {
    return client.get(`/api/groups/${groupId}/permissions`)
  },

  // Department filtering
  getDepartments: () => {
    return client.get('/api/departments')
  },

  getUsersByDepartment: (department) => {
    return client.get('/api/users/by-department', { params: { department } })
  },
}

export default client

