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
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  CompareArrows as CompareIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Done as DoneIcon,
} from '@mui/icons-material'
import { api } from '../api/client'

function Comparison() {
  const [summary, setSummary] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [summaryRes, resultsRes] = await Promise.all([
        api.getComparisonSummary(),
        api.getComparisonResults(),
      ])
      setSummary(summaryRes.data)
      setResults(resultsRes.data.results || [])
    } catch (err) {
      console.warn('Unable to load comparison data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRunComparison = async () => {
    setRunning(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await api.runComparison()
      setSuccess(
        `Comparison completed: ${response.data.stats.total_discrepancies} discrepancies found`
      )
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Comparison failed')
    } finally {
      setRunning(false)
    }
  }

  const handleResolve = async (resultId) => {
    try {
      await api.resolveDiscrepancy(resultId, 'Marked as resolved')
      await loadData()
    } catch (err) {
      setError('Failed to mark as resolved')
    }
  }

  const getFilteredResults = () => {
    if (activeTab === 0) return results
    if (activeTab === 1) return results.filter((r) => r.discrepancy_type === 'azure_only')
    if (activeTab === 2) return results.filter((r) => r.discrepancy_type === 'odoo_only')
    if (activeTab === 3) return results.filter((r) => r.discrepancy_type === 'name_mismatch')
    return results
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'azure_only':
        return 'In Azure Only'
      case 'odoo_only':
        return 'In Odoo Only'
      case 'name_mismatch':
        return 'Name Mismatch'
      default:
        return type
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'azure_only':
        return 'info'
      case 'odoo_only':
        return 'warning'
      case 'name_mismatch':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Azure vs Odoo Comparison
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Compare user data between Azure Active Directory and Odoo to identify discrepancies. This
        helps ensure both systems are synchronized and highlights potential stale accounts or
        missing users.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Summary Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <CompareIcon color="primary" fontSize="large" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">Comparison Summary</Typography>
                  {summary?.has_data ? (
                    <Typography variant="body2" color="textSecondary">
                      Last comparison:{' '}
                      {new Date(summary.last_comparison).toLocaleString()}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No comparison has been run yet
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  startIcon={running ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  onClick={handleRunComparison}
                  disabled={running}
                >
                  {running ? 'Running...' : 'Run Comparison'}
                </Button>
              </Stack>

              {summary?.has_data && (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}
                    >
                      <Typography variant="h4" color="info.main">
                        {summary.azure_only}
                      </Typography>
                      <Typography variant="body2">In Azure Only</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Missing from Odoo
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}
                    >
                      <Typography variant="h4" color="warning.main">
                        {summary.odoo_only}
                      </Typography>
                      <Typography variant="body2">In Odoo Only</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Missing from Azure
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}
                    >
                      <Typography variant="h4" color="error.main">
                        {summary.name_mismatches}
                      </Typography>
                      <Typography variant="body2">Name Mismatches</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Data inconsistencies
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor:
                          summary.total_discrepancies === 0 ? 'success.50' : 'grey.100',
                      }}
                    >
                      <Typography
                        variant="h4"
                        color={
                          summary.total_discrepancies === 0 ? 'success.main' : 'text.primary'
                        }
                      >
                        {summary.total_discrepancies === 0 ? (
                          <CheckCircleIcon fontSize="inherit" />
                        ) : (
                          summary.total_discrepancies
                        )}
                      </Typography>
                      <Typography variant="body2">Total Issues</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {summary.total_discrepancies === 0
                          ? 'All synced!'
                          : 'Needs attention'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results Table */}
        {summary?.has_data && results.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Discrepancy Details
                </Typography>

                <Tabs
                  value={activeTab}
                  onChange={(e, v) => setActiveTab(v)}
                  sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                >
                  <Tab label={`All (${results.length})`} />
                  <Tab
                    label={`Azure Only (${results.filter((r) => r.discrepancy_type === 'azure_only').length})`}
                  />
                  <Tab
                    label={`Odoo Only (${results.filter((r) => r.discrepancy_type === 'odoo_only').length})`}
                  />
                  <Tab
                    label={`Mismatches (${results.filter((r) => r.discrepancy_type === 'name_mismatch').length})`}
                  />
                </Tabs>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>User Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Azure Value</TableCell>
                        <TableCell>Odoo Value</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredResults().map((result) => (
                        <TableRow
                          key={result.id}
                          sx={{
                            bgcolor: result.resolved ? 'action.hover' : 'inherit',
                            opacity: result.resolved ? 0.7 : 1,
                          }}
                        >
                          <TableCell>
                            <Chip
                              label={getTypeLabel(result.discrepancy_type)}
                              size="small"
                              color={getTypeColor(result.discrepancy_type)}
                            />
                          </TableCell>
                          <TableCell>{result.user_name}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {result.user_email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{result.azure_value}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{result.odoo_value}</Typography>
                          </TableCell>
                          <TableCell>
                            {result.resolved ? (
                              <Chip label="Resolved" size="small" color="success" />
                            ) : (
                              <Chip
                                label="Open"
                                size="small"
                                icon={<WarningIcon />}
                                color="warning"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {!result.resolved && (
                              <Tooltip title="Mark as resolved">
                                <IconButton
                                  size="small"
                                  onClick={() => handleResolve(result.id)}
                                >
                                  <DoneIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* No Results Message */}
        {summary?.has_data && results.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="success" icon={<CheckCircleIcon />}>
              No discrepancies found! Azure and Odoo user data are synchronized.
            </Alert>
          </Grid>
        )}

        {/* Instructions when no data */}
        {!summary?.has_data && (
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                Before running a comparison:
              </Typography>
              <ol style={{ margin: 0, paddingLeft: '1.5em' }}>
                <li>Go to the Data tab and sync Azure users</li>
                <li>Sync Odoo database to pull users from PostgreSQL</li>
                <li>Return here and click "Run Comparison"</li>
              </ol>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default Comparison
