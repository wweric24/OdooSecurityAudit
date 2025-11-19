import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Button,
  Alert,
  Divider,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material'
import {
  CloudSync as CloudSyncIcon,
  Storage as StorageIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { api } from '../api/client'
import ConfigurableDataGrid from './common/ConfigurableDataGrid'

const syncDescriptions = {
  azure: [
    'Uses Microsoft Graph (client credentials) to pull Entra users, emails, and departments.',
    'Requires Azure app registration with User.Read.All (Application) consent.',
    'Environment variables: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET.',
  ],
  odoo: [
    'Connects to the Odoo Postgres replica to pull groups, users, membership, and inheritance.',
    'Requires read-only DSN (ODOO_POSTGRES_DSN) with SSL enabled.',
    'Ideal to run before comparisons or AI analysis to ensure freshest dataset.',
  ],
}

function Data() {
  const [azureRun, setAzureRun] = useState(null)
  const [odooRun, setOdooRun] = useState(null)
  const [syncMessage, setSyncMessage] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [azureHistory, setAzureHistory] = useState([])
  const [odooHistory, setOdooHistory] = useState([])
  const [exporting, setExporting] = useState(false)
  const [deletingAzure, setDeletingAzure] = useState(false)
  const [deletingOdoo, setDeletingOdoo] = useState(false)
  const [azureDeleteDialogOpen, setAzureDeleteDialogOpen] = useState(false)
  const [odooDeleteDialogOpen, setOdooDeleteDialogOpen] = useState(false)
  const [azureDeletePreview, setAzureDeletePreview] = useState(null)
  const [odooDeletePreview, setOdooDeletePreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Configuration status
  const [configStatus, setConfigStatus] = useState(null)
  const [testingAzure, setTestingAzure] = useState(false)
  const [testingOdoo, setTestingOdoo] = useState(false)
  const [azureTestResult, setAzureTestResult] = useState(null)
  const [odooTestResult, setOdooTestResult] = useState(null)
  const [switchingEnv, setSwitchingEnv] = useState(false)
  // Track which environments have been successfully tested
  const [testedEnvironments, setTestedEnvironments] = useState({
    PREPROD: false,
    PROD: false
  })

  const formatStatsSummary = (stats) => {
    if (!stats) return 'n/a'
    const parts = []
    if (stats.processed) parts.push(`Processed ${stats.processed}`)
    if (stats.groups_processed) parts.push(`Groups ${stats.groups_processed}`)
    if (stats.created || stats.groups_created || stats.users_created) {
      const createdTotal = (stats.created || 0) + (stats.groups_created || 0) + (stats.users_created || 0)
      if (createdTotal) parts.push(`New ${createdTotal}`)
    }
    if (stats.updated || stats.groups_updated || stats.users_updated) {
      const updatedTotal = (stats.updated || 0) + (stats.groups_updated || 0) + (stats.users_updated || 0)
      if (updatedTotal) parts.push(`Updated ${updatedTotal}`)
    }
    if (stats.total_users) parts.push(`Users ${stats.total_users}`)
    if (stats.total_groups) parts.push(`Groups ${stats.total_groups}`)
    return parts.slice(0, 4).join(' | ') || 'n/a'
  }

  const historyColumns = useMemo(
    () => [
      {
        field: 'started_at',
        headerName: 'Started',
        flex: 1,
        valueGetter: (value) =>
          value ? new Date(value).toLocaleString() : 'Unknown',
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 0.8,
        renderCell: (params) =>
          params.value === 'completed' ? (
            <Chip label="Completed" size="small" color="success" />
          ) : params.value === 'failed' ? (
            <Chip label="Failed" size="small" color="error" />
          ) : (
            <Chip label={params.value} size="small" />
          ),
      },
      {
        field: 'stats_text',
        headerName: 'Stats',
        flex: 1.3,
      },
      {
        field: 'differences',
        headerName: 'Change Metrics',
        flex: 1.5,
        sortable: false,
        renderCell: (params) =>
          params.value && params.value.length ? (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {params.value.slice(0, 3).map((diff) => (
                <Chip
                  key={`${params.row.id}-${diff.field}`}
                  label={`${diff.label}: ${diff.delta > 0 ? '+' : ''}${diff.delta}`}
                  size="small"
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="textSecondary">
              No changes
            </Typography>
          ),
      },
      {
        field: 'change_summary',
        headerName: 'Summary',
        flex: 1.6,
      },
    ],
    []
  )

  useEffect(() => {
    loadSyncStatus()
    loadConfigStatus()
    
    // Reload sync status when window regains focus (user switches back to tab)
    const handleFocus = () => {
      loadSyncStatus()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadConfigStatus = async () => {
    try {
      const response = await api.getConfigStatus()
      setConfigStatus(response.data)
    } catch (err) {
      console.warn('Unable to load config status', err)
    }
  }

  const loadSyncStatus = async () => {
    try {
      const [azure, odoo] = await Promise.all([
        api.getSyncStatus({ sync_type: 'azure_users', limit: 5 }),
        api.getSyncStatus({ sync_type: 'odoo_postgres', limit: 5 }),
      ])
      const azureRuns = azure.data.runs || []
      const odooRuns = odoo.data.runs || []
      setAzureRun(azureRuns[0] || null)
      setOdooRun(odooRuns[0] || null)
      setAzureHistory(azureRuns)
      setOdooHistory(odooRuns)
    } catch (err) {
      console.warn('Unable to load sync status', err)
    }
  }

  const handleTestAzure = async () => {
    setTestingAzure(true)
    setAzureTestResult(null)
    try {
      const response = await api.testAzureConnection()
      setAzureTestResult(response.data)
    } catch (err) {
      setAzureTestResult({
        success: false,
        error: err.response?.data?.detail || err.message || 'Test failed',
      })
    } finally {
      setTestingAzure(false)
    }
  }

  const handleTestOdoo = async () => {
    setTestingOdoo(true)
    setOdooTestResult(null)
    setSyncMessage(null)
    setSyncError(null)
    // Get current environment before testing (don't reload config, use current state)
    const currentEnv = configStatus?.odoo?.environment || 'PREPROD'
    try {
      const response = await api.testOdooConnection()
      setOdooTestResult(response.data)
      
      // Mark current environment as tested if successful
      if (response.data.success) {
        setTestedEnvironments(prev => ({
          ...prev,
          [currentEnv]: true
        }))
      }
      
      // Don't reload config status - keep the current environment selected
      // The test result will show the environment that was tested
    } catch (err) {
      setOdooTestResult({
        success: false,
        error: err.response?.data?.detail || err.message || 'Test failed',
        environment: currentEnv
      })
    } finally {
      setTestingOdoo(false)
    }
  }

  const handleEnvironmentChange = async (event, newEnv) => {
    if (!newEnv || newEnv === configStatus?.odoo?.environment) return
    setSwitchingEnv(true)
    try {
      const response = await api.switchOdooEnvironment(newEnv)
      await loadConfigStatus()
      // Clear test result when switching environments - need to re-test
      setOdooTestResult(null)
      
      // Show warning for Production, success for Pre-Production
      if (newEnv === 'PROD') {
        // Always show as warning/error for Production
        const warningMsg = response.data?.warning 
          ? `${response.data.warning}. Please test connection.`
          : `Switched to ${newEnv} environment. Please test connection.`
        setSyncError(warningMsg)
        setSyncMessage(null)
      } else {
        setSyncMessage(`Switched to ${newEnv} environment. Please test connection.`)
        setSyncError(null)
      }
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Failed to switch environment')
      setSyncMessage(null)
    } finally {
      setSwitchingEnv(false)
    }
  }

  const formatRun = (run) => {
    if (!run) return 'No runs yet'
    const timestamp = run.completed_at || run.started_at
    const time = timestamp ? new Date(timestamp).toLocaleString() : 'Unknown time'
    return `${run.status} • ${time}`
  }

  const formatStats = (stats) => {
    if (!stats) return null
    const parts = []
    if (stats.users_created || stats.users_updated) {
      parts.push(`${(stats.users_created || 0) + (stats.users_updated || 0)} users`)
    }
    if (stats.groups_created || stats.groups_updated) {
      parts.push(`${(stats.groups_created || 0) + (stats.groups_updated || 0)} groups`)
    }
    if (stats.processed) {
      parts.push(`${stats.processed} processed`)
    }
    return parts.length > 0 ? parts.join(', ') : null
  }

  const azureHistoryRows = useMemo(
    () =>
      (azureHistory || []).map((run) => ({
        ...run,
        stats_text: formatStatsSummary(run.stats),
      })),
    [azureHistory]
  )

  const odooHistoryRows = useMemo(
    () =>
      (odooHistory || []).map((run) => ({
        ...run,
        stats_text: formatStatsSummary(run.stats),
      })),
    [odooHistory]
  )

  // Color constants for consistency
  const AZURE_COLOR = '#1976d2' // Blue
  const ODOO_COLOR = '#9c27b0' // Light purple (lighter than #7b1fa2)

  const handleAzureSync = async () => {
    try {
      setSyncMessage(null)
      setSyncError(null)
      await api.syncAzureUsers()
      setSyncMessage('Azure directory sync completed successfully.')
      await loadSyncStatus()
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Azure sync failed')
    }
  }

  const handleOdooSync = async () => {
    try {
      setSyncMessage(null)
      setSyncError(null)
      await api.syncOdooDatabase()
      setSyncMessage('Odoo Postgres sync completed successfully.')
      await loadSyncStatus()
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Odoo sync failed')
    }
  }

  const handleDeleteAzureDataClick = async () => {
    setLoadingPreview(true)
    setSyncError(null)
    try {
      const preview = await api.previewAzureDeletion()
      setAzureDeletePreview(preview.data)
      setAzureDeleteDialogOpen(true)
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Failed to load deletion preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleDeleteAzureDataConfirm = async () => {
    setAzureDeleteDialogOpen(false)
    setDeletingAzure(true)
    setSyncError(null)
    try {
      const response = await api.deleteAzureData()
      const deleted = response.data.deleted_users || 0
      const remaining = (azureDeletePreview?.will_remain_users || 0)
      setSyncMessage(
        `Azure data deleted: ${deleted} users removed. ${remaining} users remain (from other sources or manually created).`
      )
      await loadSyncStatus()
      setAzureDeletePreview(null)
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Azure data deletion failed')
    } finally {
      setDeletingAzure(false)
    }
  }

  const handleDeleteOdooDataClick = async () => {
    setLoadingPreview(true)
    setSyncError(null)
    try {
      const preview = await api.previewOdooDeletion()
      setOdooDeletePreview(preview.data)
      setOdooDeleteDialogOpen(true)
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Failed to load deletion preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleDeleteOdooDataConfirm = async () => {
    setOdooDeleteDialogOpen(false)
    setDeletingOdoo(true)
    setSyncError(null)
    try {
      const response = await api.deleteOdooData()
      const deletedGroups = response.data.deleted_groups || 0
      const deletedUsers = response.data.deleted_users || 0
      const remainingGroups = odooDeletePreview?.will_remain_groups ?? 0
      const remainingUsers = odooDeletePreview?.will_remain_users ?? 0
      setSyncMessage(
        `Odoo data deleted: ${deletedGroups} groups and ${deletedUsers} users removed. ${remainingGroups} groups and ${remainingUsers} users remain (from other sources or manually created).`
      )
      await loadSyncStatus()
      setOdooDeletePreview(null)
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Odoo data deletion failed')
    } finally {
      setDeletingOdoo(false)
    }
  }

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleExport = async (type) => {
    try {
      setExporting(true)
      let response
      let filename = 'export.csv'
      if (type === 'groups') {
        response = await api.exportGroups()
        filename = 'groups_export.csv'
      } else if (type === 'users') {
        response = await api.exportUsers()
        filename = 'users_export.csv'
      } else {
        response = await api.exportNonCompliant()
        filename = 'non_compliant_groups.csv'
      }

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'text/csv' })
      downloadBlob(blob, filename)
    } catch (err) {
      setSyncError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data & Integrations
      </Typography>
      <Typography variant="body1" color="textSecondary">
        Refresh Azure users and Odoo security groups directly from their source systems. Run these steps
        anytime before audits or AI analysis to ensure the dataset mirrors production.
      </Typography>

      {syncMessage && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSyncMessage(null)}>
          {syncMessage}
        </Alert>
      )}
      {syncError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSyncError(null)}>
          {syncError}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Configuration Status Panel */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <SettingsIcon color="primary" />
                <Box>
                  <Typography variant="h6">Integration Configuration Status</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Verify your Azure and Odoo connections are properly configured before syncing.
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={3}>
                {/* Azure Status */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      {azureTestResult?.success ? (
                        <CheckCircleIcon color="success" />
                      ) : configStatus?.azure?.configured ? (
                        <ErrorIcon color="warning" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                      <Typography variant="subtitle1" fontWeight="bold">
                        Azure AD
                      </Typography>
                      <Chip
                        label={
                          azureTestResult?.success
                            ? 'Connected'
                            : configStatus?.azure?.configured
                            ? 'Configured'
                            : 'Not Configured'
                        }
                        size="small"
                        color={
                          azureTestResult?.success
                            ? 'success'
                            : configStatus?.azure?.configured
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </Stack>
                    {configStatus?.azure?.configured && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        Tenant: {configStatus.azure.tenant_id}
                      </Typography>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleTestAzure}
                      disabled={!configStatus?.azure?.configured || testingAzure}
                      startIcon={testingAzure ? <CircularProgress size={16} /> : null}
                    >
                      {testingAzure ? 'Testing...' : 'Test Connection'}
                    </Button>
                    {azureTestResult && (
                      <Alert
                        severity={azureTestResult.success ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                        onClose={() => setAzureTestResult(null)}
                      >
                        {azureTestResult.success
                          ? azureTestResult.message
                          : azureTestResult.error}
                      </Alert>
                    )}
                  </Paper>
                </Grid>

                {/* Odoo Status */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      {odooTestResult?.success ? (
                        <CheckCircleIcon color="success" />
                      ) : configStatus?.odoo?.configured ? (
                        <ErrorIcon color="warning" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                      <Typography variant="subtitle1" fontWeight="bold">
                        Odoo Database
                      </Typography>
                      <Chip
                        label={
                          odooTestResult?.success
                            ? 'Connected'
                            : configStatus?.odoo?.configured
                            ? 'Configured'
                            : 'Not Configured'
                        }
                        size="small"
                        color={
                          odooTestResult?.success
                            ? 'success'
                            : configStatus?.odoo?.configured
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </Stack>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        Environment:
                      </Typography>
                      <ToggleButtonGroup
                        value={configStatus?.odoo?.environment || 'PREPROD'}
                        exclusive
                        onChange={handleEnvironmentChange}
                        size="small"
                        disabled={switchingEnv}
                      >
                        <ToggleButton value="PREPROD" color="info">
                          {testedEnvironments.PREPROD && (
                            <CheckCircleIcon sx={{ mr: 0.5, fontSize: 16 }} color="success" />
                          )}
                          Pre-Production
                        </ToggleButton>
                        <ToggleButton value="PROD" color="warning">
                          {testedEnvironments.PROD && (
                            <CheckCircleIcon sx={{ mr: 0.5, fontSize: 16 }} color="success" />
                          )}
                          Production
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleTestOdoo}
                      disabled={testingOdoo}
                      startIcon={testingOdoo ? <CircularProgress size={16} /> : null}
                    >
                      {testingOdoo ? 'Testing...' : 'Test Connection'}
                    </Button>
                    {configStatus?.odoo?.environment === 'PROD' && !configStatus?.odoo?.has_prod && (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                        Production environment not configured. Set ODOO_PROD_DSN in .env
                      </Typography>
                    )}
                    {configStatus?.odoo?.environment === 'PREPROD' && !configStatus?.odoo?.has_preprod && (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                        Pre-Production environment not configured. Set ODOO_PREPROD_DSN in .env
                      </Typography>
                    )}
                    {odooTestResult && (
                      <Alert
                        severity={odooTestResult.success ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                        onClose={() => setOdooTestResult(null)}
                      >
                        {odooTestResult.success ? (
                          <Box>
                            {odooTestResult.message}
                            <br />
                            <Typography variant="caption">
                              Groups: {odooTestResult.odoo_groups} | Users: {odooTestResult.odoo_active_users}
                            </Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              {odooTestResult.environment === 'PROD' ? 'Production' : 'Pre-Production'} Connection Failed
                            </Typography>
                            {odooTestResult.error}
                            {odooTestResult.environment === 'PROD' && !configStatus?.odoo?.has_prod && (
                              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                Production environment not configured. Set ODOO_PROD_DSN in .env
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Alert>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <CloudSyncIcon sx={{ color: AZURE_COLOR }} />
                <Box>
                  <Typography variant="h6">Azure Directory Sync</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pull users and departments directly from Microsoft Entra ID.
                  </Typography>
                </Box>
                {azureRun?.status === 'completed' && (
                  <CheckCircleIcon sx={{ color: 'success.main', ml: 'auto' }} />
                )}
                {azureRun?.status === 'failed' && (
                  <ErrorIcon sx={{ color: 'error.main', ml: 'auto' }} />
                )}
              </Stack>
              {syncDescriptions.azure.map((line) => (
                <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                  • {line}
                </Typography>
              ))}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mt: 2 }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  variant="contained"
                  sx={{ bgcolor: AZURE_COLOR, '&:hover': { bgcolor: '#1565c0' } }}
                  onClick={handleAzureSync}
                  disabled={!configStatus?.azure?.configured}
                >
                  Sync Azure Directory
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteAzureDataClick}
                  disabled={deletingAzure || loadingPreview}
                >
                  {deletingAzure ? 'Deleting...' : loadingPreview ? 'Loading...' : 'Delete Azure Data'}
                </Button>
              </Stack>
              {!configStatus?.azure?.configured && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  Configure Azure credentials in .env to enable
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Sync History
              </Typography>
              {azureRun ? (
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip
                      label={formatRun(azureRun)}
                      variant="outlined"
                      color={azureRun.status === 'failed' ? 'error' : azureRun.status === 'completed' ? 'success' : 'default'}
                      size="small"
                    />
                    {azureRun.status === 'completed' && (
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                    )}
                    {azureRun.status === 'failed' && (
                      <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                    )}
                  </Stack>
                  {azureRun.stats && (
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                      {formatStats(azureRun.stats)}
                    </Typography>
                  )}
                  {azureRun.change_summary && (
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                      {azureRun.change_summary}
                    </Typography>
                  )}
                  {azureRun.error && (
                    <Alert severity="error" sx={{ mt: 1 }} size="small">
                      {azureRun.error}
                    </Alert>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No sync runs yet
                </Typography>
              )}
              {azureHistoryRows.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <ConfigurableDataGrid
                    storageKey="azure-sync-history"
                    columns={historyColumns}
                    rows={azureHistoryRows}
                    height={320}
                    getRowId={(row) => row.id}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <StorageIcon sx={{ color: ODOO_COLOR }} />
                <Box>
                  <Typography variant="h6">
                    Odoo Postgres Sync
                    {configStatus?.odoo?.environment && (
                      <Chip
                        label={configStatus.odoo.environment_display}
                        size="small"
                        color={configStatus.odoo.environment === 'PROD' ? 'warning' : 'info'}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Query the remote Odoo database for groups, users, and inheritance chains.
                  </Typography>
                </Box>
                {odooRun?.status === 'completed' && (
                  <CheckCircleIcon sx={{ color: 'success.main', ml: 'auto' }} />
                )}
                {odooRun?.status === 'failed' && (
                  <ErrorIcon sx={{ color: 'error.main', ml: 'auto' }} />
                )}
              </Stack>
              {syncDescriptions.odoo.map((line) => (
                <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                  • {line}
                </Typography>
              ))}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mt: 2 }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  variant="contained"
                  sx={{ bgcolor: ODOO_COLOR, '&:hover': { bgcolor: '#7b1fa2' } }}
                  onClick={handleOdooSync}
                  disabled={!configStatus?.odoo?.configured}
                >
                  Sync Odoo DB
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteOdooDataClick}
                  disabled={deletingOdoo || loadingPreview}
                >
                  {deletingOdoo ? 'Deleting...' : loadingPreview ? 'Loading...' : 'Delete Odoo Data'}
                </Button>
              </Stack>
              {!configStatus?.odoo?.configured && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  Configure Odoo DSN in .env to enable
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Sync History
              </Typography>
              {odooRun ? (
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip
                      label={formatRun(odooRun)}
                      variant="outlined"
                      color={odooRun.status === 'failed' ? 'error' : odooRun.status === 'completed' ? 'success' : 'default'}
                      size="small"
                    />
                    {odooRun.status === 'completed' && (
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                    )}
                    {odooRun.status === 'failed' && (
                      <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                    )}
                  </Stack>
                  {odooRun.stats && (
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                      {formatStats(odooRun.stats)}
                    </Typography>
                  )}
                  {odooRun.change_summary && (
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                      {odooRun.change_summary}
                    </Typography>
                  )}
                  {odooRun.error && (
                    <Alert severity="error" sx={{ mt: 1 }} size="small">
                      {odooRun.error}
                    </Alert>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No sync runs yet
                </Typography>
              )}
              {odooHistoryRows.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <ConfigurableDataGrid
                    storageKey="odoo-sync-history"
                    columns={historyColumns}
                    rows={odooHistoryRows}
                    height={320}
                    getRowId={(row) => row.id}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <DownloadIcon color="primary" />
                <Box>
                  <Typography variant="h6">Exports & Reports</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Download curated CSVs for audits, Excel reviews, or offline analysis.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('groups')}
                  disabled={exporting}
                >
                  Export Groups CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('users')}
                  disabled={exporting}
                >
                  Export Users CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('noncompliant')}
                  disabled={exporting}
                >
                  Export Non-Compliant CSV
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Azure Delete Confirmation Dialog */}
      <Dialog
        open={azureDeleteDialogOpen}
        onClose={() => setAzureDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete Azure Data</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete all users synced from Azure/Entra ID. This action cannot be undone.
          </DialogContentText>
          {azureDeletePreview && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  What will be deleted:
                </Typography>
                <Typography variant="body2">
                  • {azureDeletePreview.will_delete_users} users (with Azure ID or source_system = "Azure")
                </Typography>
                <Typography variant="body2">
                  • {azureDeletePreview.will_delete_memberships} group memberships
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                  What will remain:
                </Typography>
                <Typography variant="body2">
                  • {azureDeletePreview.will_remain_users} users from other sources (Odoo sync or manually created)
                </Typography>
              </Alert>
              <Typography variant="caption" color="textSecondary">
                Note: Only users explicitly marked as Azure-sourced will be deleted. Users without azure_id or with a different source_system will remain.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAzureDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAzureDataConfirm}
            color="error"
            variant="contained"
            disabled={deletingAzure}
          >
            {deletingAzure ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Odoo Delete Confirmation Dialog */}
      <Dialog
        open={odooDeleteDialogOpen}
        onClose={() => setOdooDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete Odoo Data</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete all groups and users synced from Odoo Postgres. This action cannot be undone.
          </DialogContentText>
          {odooDeletePreview && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  What will be deleted:
                </Typography>
                <Typography variant="body2">
                  • {odooDeletePreview.will_delete_groups} groups (with Odoo ID or source_system like "Odoo%")
                </Typography>
                <Typography variant="body2">
                  • {odooDeletePreview.will_delete_users} users (with odoo_user_id or source_system like "Odoo%")
                </Typography>
                <Typography variant="body2">
                  • {odooDeletePreview.will_delete_memberships} group memberships
                </Typography>
                <Typography variant="body2">
                  • {odooDeletePreview.will_delete_access_rights} access rights
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                  What will remain:
                </Typography>
                <Typography variant="body2">
                  • {odooDeletePreview.will_remain_groups} groups from other sources (Azure sync or manually created)
                </Typography>
                <Typography variant="body2">
                  • {odooDeletePreview.will_remain_users} users from other sources (Azure sync or manually created)
                </Typography>
              </Alert>
              <Typography variant="caption" color="textSecondary">
                Note: Only records explicitly marked as Odoo-sourced will be deleted. Groups/users without odoo_id or with a different source_system will remain.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOdooDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteOdooDataConfirm}
            color="error"
            variant="contained"
            disabled={deletingOdoo}
          >
            {deletingOdoo ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Data
