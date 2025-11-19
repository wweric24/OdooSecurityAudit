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

  bulkUpdateGroups: (payload) => {
    return client.post('/api/groups/bulk-update', payload)
  },

  // Users
  getUsers: (params = {}) => {
    return client.get('/api/users', { params })
  },

  getUser: (id) => {
    return client.get(`/api/users/${id}`)
  },

  exportUsers: (params = {}) => {
    return client.get('/api/export/users', {
      params,
      responseType: 'blob',
    })
  },

  hideUsers: (userIds) => {
    return client.post('/api/users/hide', { user_ids: userIds })
  },

  unhideUsers: (userIds) => {
    return client.post('/api/users/unhide', { user_ids: userIds })
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

  previewAzureDeletion: () => {
    return client.get('/api/sync/azure-users/preview')
  },

  deleteAzureData: () => {
    return client.delete('/api/sync/azure-users')
  },

  previewOdooDeletion: () => {
    return client.get('/api/sync/odoo-db/preview')
  },

  deleteOdooData: () => {
    return client.delete('/api/sync/odoo-db')
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

  getComparisonResults: (params = {}) => {
    return client.get('/api/comparison/results', { params })
  },

  resolveDiscrepancy: (resultId, notes = null) => {
    const params = notes ? { notes } : {}
    return client.post(`/api/comparison/resolve/${resultId}`, null, { params })
  },

  exportComparisonResults: (params = {}) => {
    return client.get('/api/export/comparison', {
      params,
      responseType: 'blob',
    })
  },

  // CRUD Permissions
  getGroupPermissions: (groupId) => {
    return client.get(`/api/groups/${groupId}/permissions`)
  },

  // Department filtering
  getDepartments: () => {
    return client.get('/api/departments')
  },

  getUsersByDepartment: (department, params = {}) => {
    return client.get('/api/users/by-department', { params: { department, ...params } })
  },
}

export default client

