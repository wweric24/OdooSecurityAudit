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
} from '@mui/material'
import {
  CloudSync as CloudSyncIcon,
  Storage as StorageIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
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

  useEffect(() => {
    loadSyncStatus()
  }, [])

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
        <Alert severity="success" sx={{ mt: 2 }}>
          {syncMessage}
        </Alert>
      )}
      {syncError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {syncError}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
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
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleAzureSync}>
                Sync Azure Directory
              </Button>
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
                  <Typography variant="h6">Odoo Postgres Sync</Typography>
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
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleOdooSync}>
                Sync Odoo DB
              </Button>
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
