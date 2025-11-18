import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material'
import {
  CompareArrows as CompareIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Done as DoneIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { api } from '../api/client'
import ConfigurableDataGrid from './common/ConfigurableDataGrid'

const FETCH_LIMIT = 1000

const discrepancyChip = (type) => {
  switch (type) {
    case 'azure_only':
      return { label: 'In Azure Only', color: 'info' }
    case 'odoo_only':
      return { label: 'In Odoo Only', color: 'warning' }
    case 'name_mismatch':
      return { label: 'Name Mismatch', color: 'error' }
    default:
      return { label: type || 'Unknown', color: 'default' }
  }
}

function Comparison() {
  const [summary, setSummary] = useState(null)
  const [results, setResults] = useState([])
  const [resultsLoading, setResultsLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({
    discrepancyType: 'all',
    status: 'open',
  })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const response = await api.getComparisonSummary()
      setSummary(response.data)
    } catch (err) {
      console.warn('Unable to load comparison summary', err)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const buildParams = useCallback(() => {
    const params = {
      order_by: 'comparison_date',
      order_dir: 'desc',
      limit: FETCH_LIMIT,
    }
    if (filters.discrepancyType !== 'all') {
      params.discrepancy_type = filters.discrepancyType
    }
    if (filters.status !== 'all') {
      params.resolved = filters.status === 'resolved'
    }
    if (search) {
      params.search = search
    }
    return params
  }, [filters, search])

  const loadResults = useCallback(async () => {
    setResultsLoading(true)
    setError(null)
    try {
      const response = await api.getComparisonResults(buildParams())
      setResults(response.data.results || [])
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Unable to load comparison results')
      setResults([])
    } finally {
      setResultsLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput.trim())
    }, 400)
    return () => clearTimeout(handler)
  }, [searchInput])

  const handleRunComparison = async () => {
    setRunning(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await api.runComparison()
      setSuccess(
        `Comparison completed: ${response.data.stats.total_discrepancies} discrepancies found`
      )
      await Promise.all([loadSummary(), loadResults()])
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Comparison failed')
    } finally {
      setRunning(false)
    }
  }

  const handleResolve = useCallback(async (resultId) => {
    try {
      await api.resolveDiscrepancy(resultId, 'Marked as resolved')
      await Promise.all([loadSummary(), loadResults()])
    } catch (err) {
      setError('Failed to mark as resolved')
    }
  }, [loadResults, loadSummary])

  const tableColumns = useMemo(() => [
    {
      field: 'discrepancy_type',
      headerName: 'Type',
      flex: 1,
      renderCell: (params) => {
        const cfg = discrepancyChip(params.value)
        return <Chip size="small" label={cfg.label} color={cfg.color} />
      },
    },
    { field: 'user_name', headerName: 'User Name', flex: 1.2 },
    {
      field: 'user_email',
      headerName: 'Email',
      flex: 1.2,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'azure_value', headerName: 'Azure Value', flex: 1.5 },
    { field: 'odoo_value', headerName: 'Odoo Value', flex: 1.5 },
    {
      field: 'comparison_date',
      headerName: 'Detected',
      flex: 1,
      valueGetter: (value) =>
        value ? new Date(value).toLocaleString() : 'Unknown',
    },
    {
      field: 'resolved',
      headerName: 'Status',
      flex: 0.8,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Resolved" size="small" color="success" />
        ) : (
          <Chip label="Open" size="small" color="warning" icon={<WarningIcon />} />
        ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        params.row.resolved ? null : (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<DoneIcon />}
            onClick={(event) => {
              event.stopPropagation()
              handleResolve(params.row.id)
            }}
          >
            Resolve
          </Button>
        ),
    },
  ], [handleResolve])

  const filterTabs = [
    { value: 'all', label: `All (${summary?.total_discrepancies ?? 0})` },
    { value: 'azure_only', label: `Azure Only (${summary?.azure_only ?? 0})` },
    { value: 'odoo_only', label: `Odoo Only (${summary?.odoo_only ?? 0})` },
    { value: 'name_mismatch', label: `Mismatches (${summary?.name_mismatches ?? 0})` },
  ]

  const initialLoading =
    summaryLoading && resultsLoading && !summary && results.length === 0

  if (initialLoading) {
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

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Comparison Summary
                  </Typography>
                  {summary?.has_data ? (
                    <Typography variant="body2">
                      Last comparison:{' '}
                      <strong>
                        {summary.last_comparison
                          ? new Date(summary.last_comparison).toLocaleString()
                          : 'Unknown'}
                      </strong>
                    </Typography>
                  ) : (
                    <Typography variant="body2">{summary?.message}</Typography>
                  )}
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<CompareIcon />}
                    onClick={handleRunComparison}
                    disabled={running}
                  >
                    {running ? 'Running...' : 'Run Comparison'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      loadSummary()
                      loadResults()
                    }}
                    disabled={running}
                  >
                    Refresh
                  </Button>
                </Stack>
              </Stack>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {success}
                </Alert>
              )}

              {summary?.has_data && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {[
                    { label: 'Azure Only', value: summary?.azure_only ?? 0 },
                    { label: 'Odoo Only', value: summary?.odoo_only ?? 0 },
                    { label: 'Name Mismatches', value: summary?.name_mismatches ?? 0 },
                    { label: 'Open Discrepancies', value: summary?.open_discrepancies ?? 0 },
                    { label: 'Resolved', value: summary?.resolved_discrepancies ?? 0 },
                    { label: 'Total', value: summary?.total_discrepancies ?? 0 },
                  ].map((metric) => (
                    <Grid item xs={12} sm={6} md={3} lg={2} key={metric.label}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary">
                            {metric.label}
                          </Typography>
                          <Typography variant="h5">{metric.value}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {!summary?.has_data && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Before running a comparison:
                  </Typography>
                  <ol style={{ margin: 0, paddingLeft: '1.5em' }}>
                    <li>Sync Azure users from the Data tab</li>
                    <li>Sync Odoo PostgreSQL data</li>
                    <li>Return here and click "Run Comparison"</li>
                  </ol>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {summary?.has_data && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Discrepancy Details
                </Typography>

                <Tabs
                  value={filters.discrepancyType}
                  onChange={(e, v) => {
                    setFilters((prev) => ({ ...prev, discrepancyType: v }))
                  }}
                  sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                >
                  {filterTabs.map((tab) => (
                    <Tab key={tab.value} label={tab.label} value={tab.value} />
                  ))}
                </Tabs>

                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', md: 'center' }}
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexGrow: 1 }}>
                    <TextField
                      label="Search by name or email"
                      size="small"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 220 }}
                    />

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filters.status}
                        label="Status"
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, status: e.target.value }))
                        }
                      >
                        <MenuItem value="open">Open Only</MenuItem>
                        <MenuItem value="resolved">Resolved Only</MenuItem>
                        <MenuItem value="all">All</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>

                <ConfigurableDataGrid
                  storageKey="comparison-grid"
                  columns={tableColumns}
                  rows={results}
                  loading={resultsLoading}
                  height={600}
                  getRowId={(row) => row.id}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {summary?.has_data && results.length === 0 && !resultsLoading && (
          <Grid item xs={12}>
            <Alert severity="success" icon={<CheckCircleIcon />}>
              No discrepancies found! Azure and Odoo user data are synchronized.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default Comparison
