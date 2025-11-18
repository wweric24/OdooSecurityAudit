import React, { useState, useEffect } from 'react'
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
  LinearProgress,
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
} from '@mui/material'
import {
  CloudSync as CloudSyncIcon,
  Storage as StorageIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { api } from '../api/client'

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
  import: [
    'Upload the CSV export generated from Odoo security reports.',
    'The importer validates naming standards, purpose fields, and user assignments.',
    'Use this when you cannot connect directly to Postgres or need to load historical snapshots.',
  ],
}

function Data() {
  const [azureRun, setAzureRun] = useState(null)
  const [odooRun, setOdooRun] = useState(null)
  const [syncMessage, setSyncMessage] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)
  const [exporting, setExporting] = useState(false)

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

  useEffect(() => {
    loadSyncStatus()
    loadConfigStatus()
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
        api.getSyncStatus({ sync_type: 'azure_users', limit: 1 }),
        api.getSyncStatus({ sync_type: 'odoo_postgres', limit: 1 }),
      ])
      setAzureRun(azure.data.runs?.[0] || null)
      setOdooRun(odoo.data.runs?.[0] || null)
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
    try {
      const response = await api.testOdooConnection()
      setOdooTestResult(response.data)
      // Mark current environment as tested if successful
      if (response.data.success) {
        const currentEnv = configStatus?.odoo?.environment || 'PREPROD'
        setTestedEnvironments(prev => ({
          ...prev,
          [currentEnv]: true
        }))
      }
    } catch (err) {
      setOdooTestResult({
        success: false,
        error: err.response?.data?.detail || err.message || 'Test failed',
      })
    } finally {
      setTestingOdoo(false)
    }
  }

  const handleEnvironmentChange = async (event, newEnv) => {
    if (!newEnv || newEnv === configStatus?.odoo?.environment) return
    setSwitchingEnv(true)
    try {
      await api.switchOdooEnvironment(newEnv)
      await loadConfigStatus()
      // Clear test result when switching environments - need to re-test
      setOdooTestResult(null)
      setSyncMessage(`Switched to ${newEnv} environment. Please test connection.`)
    } catch (err) {
      setSyncError(err.response?.data?.detail || err.message || 'Failed to switch environment')
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

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setImportError(null)
      setImportResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setImportError('Please select a CSV file to import.')
      return
    }
    try {
      setUploading(true)
      setImportError(null)
      const response = await api.importCSV(file)
      setImportResult(response.data)
      setSyncMessage('CSV import completed.')
    } catch (err) {
      setImportError(err.response?.data?.detail || err.message || 'Import failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data & Integrations
      </Typography>
      <Typography variant="body1" color="textSecondary">
        Refresh Azure users, Odoo security groups, and CSV imports from a single workspace. Run these
        steps anytime before audits or AI analysis to ensure the dataset is aligned with production.
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
                      disabled={!configStatus?.odoo?.configured || testingOdoo}
                      startIcon={testingOdoo ? <CircularProgress size={16} /> : null}
                    >
                      {testingOdoo ? 'Testing...' : 'Test Connection'}
                    </Button>
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
                          odooTestResult.error
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
                <CloudSyncIcon color="primary" />
                <Box>
                  <Typography variant="h6">Azure Directory Sync</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pull users and departments directly from Microsoft Entra ID.
                  </Typography>
                </Box>
              </Stack>
              {syncDescriptions.azure.map((line) => (
                <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                  • {line}
                </Typography>
              ))}
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={handleAzureSync}
                disabled={!configStatus?.azure?.configured}
              >
                Sync Azure Directory
              </Button>
              {!configStatus?.azure?.configured && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  Configure Azure credentials in .env to enable
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Last Run:
              </Typography>
              <Chip
                label={formatRun(azureRun)}
                variant="outlined"
                color={azureRun?.status === 'failed' ? 'error' : 'default'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <StorageIcon color="primary" />
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
              </Stack>
              {syncDescriptions.odoo.map((line) => (
                <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                  • {line}
                </Typography>
              ))}
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={handleOdooSync}
                disabled={!configStatus?.odoo?.configured}
              >
                Sync Odoo DB
              </Button>
              {!configStatus?.odoo?.configured && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  Configure Odoo DSN in .env to enable
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Last Run:
              </Typography>
              <Chip
                label={formatRun(odooRun)}
                variant="outlined"
                color={odooRun?.status === 'failed' ? 'error' : 'default'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <UploadFileIcon color="primary" />
                <Box>
                  <Typography variant="h6">CSV Import</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Upload the latest Odoo export when direct database access isn’t available.
                  </Typography>
                </Box>
              </Stack>
              {syncDescriptions.import.map((line) => (
                <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                  • {line}
                </Typography>
              ))}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 2 }}>
                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="data-tab-csv-input"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="data-tab-csv-input">
                  <Button variant="outlined" component="span" startIcon={<UploadFileIcon />}>
                    Select CSV File
                  </Button>
                </label>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload & Process'}
                </Button>
                {file && (
                  <Typography variant="body2" color="textSecondary">
                    Selected: {file.name}
                  </Typography>
                )}
              </Box>
              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                </Box>
              )}
              {importError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {importError}
                </Alert>
              )}
              {importResult && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Import completed successfully!
                  </Alert>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Metric</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Groups Imported</TableCell>
                          <TableCell align="right">{importResult.groups_imported}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Groups Created</TableCell>
                          <TableCell align="right">{importResult.groups_created}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Users Created</TableCell>
                          <TableCell align="right">{importResult.users_created}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
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
    </Box>
  )
}

export default Data
