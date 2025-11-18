import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  InputAdornment,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { api } from '../api/client'
import ConfigurableDataGrid from './common/ConfigurableDataGrid'

const panelStyle = {
  backgroundColor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 3 },
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
}

const STATUS_OPTIONS = ['Under Review', 'Confirmed', 'Active', 'Deprecated', 'Legacy']
const BULK_FIELD_DEFAULTS = {
  status: false,
  who_requires: false,
  why_required: false,
  last_audit_date: false,
  notes: false,
}
const BULK_VALUE_DEFAULTS = {
  status: 'Under Review',
  who_requires: '',
  why_required: '',
  last_audit_date: '',
  notes: '',
}

function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [modules, setModules] = useState([])
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedGroups, setSelectedGroups] = useState([])
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkFields, setBulkFields] = useState(BULK_FIELD_DEFAULTS)
  const [bulkValues, setBulkValues] = useState(BULK_VALUE_DEFAULTS)
  const [bulkErrors, setBulkErrors] = useState({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const limit = 50
  const fallbackModules = ['Project', 'Accounting', 'Employees', 'Sales', 'Purchasing']

  const tableColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Group',
        flex: 1.3,
        renderCell: (params) => (
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={600}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {params.row.module || 'Unassigned Module'}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'parent_groups',
        headerName: 'Inherited From',
        flex: 1.2,
        sortable: false,
        renderCell: (params) =>
          params.value && params.value.length ? (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {params.value.slice(0, 3).map((parent) => (
                <Chip key={parent.id} label={parent.name} size="small" />
              ))}
              {params.value.length > 3 && (
                <Chip label={`+${params.value.length - 3}`} size="small" variant="outlined" />
              )}
            </Stack>
          ) : (
            <Typography variant="caption" color="textSecondary">
              -
            </Typography>
          ),
      },
      {
        field: 'access_level',
        headerName: 'Access Level',
        flex: 0.7,
        valueGetter: (value) => value ?? '-',
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 0.8,
        renderCell: (params) => (
          <Chip
            label={params.value || 'Under Review'}
            size="small"
            color={
              params.value === 'Confirmed'
                ? 'success'
                : params.value === 'Active'
                ? 'info'
                : params.value === 'Deprecated' || params.value === 'Legacy'
                ? 'default'
                : 'warning'
            }
          />
        ),
      },
      {
        field: 'user_count',
        headerName: 'Users',
        width: 110,
        valueGetter: (value) => value ?? 0,
      },
      {
        field: 'is_documented',
        headerName: 'Documentation',
        flex: 0.9,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Documented" size="small" color="success" />
          ) : (
            <Chip label="Undocumented" size="small" color="error" />
          ),
      },
      {
        field: 'follows_naming_convention',
        headerName: 'Compliance',
        flex: 0.9,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Compliant" size="small" color="success" />
          ) : (
            <Chip label="Non-Compliant" size="small" color="warning" />
          ),
      },
    ],
    []
  )

  useEffect(() => {
    loadGroups()
  }, [page, search, statusFilter, moduleFilter])

  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await api.getModules()
        setModules(response.data.modules || [])
      } catch (err) {
        console.warn('Failed to load modules', err)
      }
    }
    loadModules()
    loadStats()
  }, [])

  useEffect(() => {
    setSelectedGroups([])
  }, [page, search, statusFilter, moduleFilter])

  const loadStats = async () => {
    try {
      const response = await api.getStats()
      setStats(response.data)
    } catch (err) {
      console.warn('Failed to load stats', err)
    }
  }

  const loadGroups = async () => {
    try {
      setLoading(true)
      const params = {
        skip: (page - 1) * limit,
        limit,
      }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (moduleFilter) params.module = moduleFilter

      const response = await api.getGroups(params)
      setGroups(response.data.groups)
      setTotal(response.data.total)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (event, value) => {
    setPage(value)
  }

  const handleSelectionChange = (selectionModel) => {
    const normalized = selectionModel.map((id) => Number(id))
    setSelectedGroups(normalized)
  }

  const openBulkDialog = () => {
    setBulkFields({ ...BULK_FIELD_DEFAULTS })
    setBulkValues({ ...BULK_VALUE_DEFAULTS })
    setBulkErrors({})
    setBulkDialogOpen(true)
  }

  const closeBulkDialog = () => {
    if (!bulkSaving) {
      setBulkDialogOpen(false)
      setBulkErrors({})
    }
  }

  const handleBulkFieldToggle = (field) => (event) => {
    const checked = event.target.checked
    setBulkFields((prev) => ({ ...prev, [field]: checked }))
    if (!checked) {
      setBulkErrors((prev) => ({ ...prev, [field]: null, form: null }))
    }
  }

  const handleBulkValueChange = (field) => (event) => {
    const value = event.target.value
    setBulkValues((prev) => ({ ...prev, [field]: value }))
    setBulkErrors((prev) => ({ ...prev, [field]: null, form: null }))
  }

  const handleBulkSubmit = async () => {
    const payload = { group_ids: selectedGroups }
    const errors = {}
    let hasField = false

    if (bulkFields.status) {
      hasField = true
      payload.status = bulkValues.status
    }
    if (bulkFields.who_requires) {
      if (!bulkValues.who_requires.trim()) {
        errors.who_requires = 'Required'
      } else {
        hasField = true
        payload.who_requires = bulkValues.who_requires.trim()
      }
    }
    if (bulkFields.why_required) {
      if (!bulkValues.why_required.trim()) {
        errors.why_required = 'Required'
      } else {
        hasField = true
        payload.why_required = bulkValues.why_required.trim()
      }
    }
    if (bulkFields.last_audit_date) {
      if (!bulkValues.last_audit_date) {
        errors.last_audit_date = 'Select a date'
      } else {
        hasField = true
        payload.last_audit_date = bulkValues.last_audit_date
      }
    }
    if (bulkFields.notes) {
      hasField = true
      payload.notes = bulkValues.notes.trim()
    }

    if (!hasField) {
      errors.form = 'Select at least one field to update'
    }

    if (Object.keys(errors).length) {
      setBulkErrors(errors)
      return
    }

    try {
      setBulkSaving(true)
      await api.bulkUpdateGroups(payload)
      setActionMessage(`Updated ${selectedGroups.length} group(s)`)
      setSelectedGroups([])
      setBulkDialogOpen(false)
      await Promise.all([loadGroups(), loadStats()])
    } catch (err) {
      setBulkErrors({
        form: err.response?.data?.detail || err.message || 'Bulk update failed',
      })
    } finally {
      setBulkSaving(false)
    }
  }

  if (loading && groups.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  const documentationPercentage =
    stats && stats.total_groups
      ? Math.round((stats.documented_groups / stats.total_groups) * 100)
      : 0

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Security Groups</Typography>
      </Stack>

      <Box sx={panelStyle}>
        {stats && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1">Documentation Progress</Typography>
            <LinearProgress
              variant="determinate"
              value={documentationPercentage}
              sx={{ mt: 1, height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" color="textSecondary">
              {stats.documented_groups} of {stats.total_groups} groups documented (
              {documentationPercentage}%)
            </Typography>
          </Box>
        )}

        {actionMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {actionMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Module</InputLabel>
            <Select
              value={moduleFilter}
              label="Module"
              onChange={(e) => {
                setModuleFilter(e.target.value)
                setPage(1)
              }}
            >
              <MenuItem value="">All</MenuItem>
              {(modules.length ? modules : fallbackModules.map((name) => ({ name }))).map(
                (module) => (
                  <MenuItem key={module.name} value={module.name}>
                    {module.name}
                    {module.count ? ` (${module.count})` : ''}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="body2" color="textSecondary">
            {selectedGroups.length} group(s) selected
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={openBulkDialog}
              disabled={selectedGroups.length === 0}
            >
              Bulk Update Documentation
            </Button>
            {selectedGroups.length > 0 && (
              <Button variant="text" onClick={() => setSelectedGroups([])}>
                Clear Selection
              </Button>
            )}
          </Stack>
        </Stack>

        <ConfigurableDataGrid
          storageKey="groups-grid"
          columns={tableColumns}
          rows={groups}
          loading={loading}
          height={640}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectedGroups}
          onRowSelectionModelChange={handleSelectionChange}
          onRowClick={(params) => {
            if (params?.id) {
              navigate(`/groups/${params.id}`)
            }
          }}
          onRowDoubleClick={(params) => {
            if (params?.id) {
              navigate(`/groups/${params.id}`)
            }
          }}
          getRowId={(row) => row.id}
          sx={{
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />

        {total > limit && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(total / limit)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Box>

      <Dialog open={bulkDialogOpen} onClose={closeBulkDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Update Documentation ({selectedGroups.length} groups)</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Only checked fields will be updated. Existing values will be overwritten.
          </Alert>
          {bulkErrors.form && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {bulkErrors.form}
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox checked={bulkFields.status} onChange={handleBulkFieldToggle('status')} />
            }
            label="Update Status"
          />
          <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={!bulkFields.status}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={bulkValues.status}
              onChange={handleBulkValueChange('status')}
            >
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={bulkFields.who_requires}
                onChange={handleBulkFieldToggle('who_requires')}
              />
            }
            label="Update Who Requires Access"
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            sx={{ mb: 2 }}
            disabled={!bulkFields.who_requires}
            value={bulkValues.who_requires}
            onChange={handleBulkValueChange('who_requires')}
            error={Boolean(bulkErrors.who_requires)}
            helperText={
              bulkFields.who_requires
                ? bulkErrors.who_requires || 'Specify roles or departments that need this group.'
                : ' '
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={bulkFields.why_required}
                onChange={handleBulkFieldToggle('why_required')}
              />
            }
            label="Update Why Access is Required"
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            sx={{ mb: 2 }}
            disabled={!bulkFields.why_required}
            value={bulkValues.why_required}
            onChange={handleBulkValueChange('why_required')}
            error={Boolean(bulkErrors.why_required)}
            helperText={
              bulkFields.why_required
                ? bulkErrors.why_required || 'Document the business justification.'
                : ' '
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={bulkFields.last_audit_date}
                onChange={handleBulkFieldToggle('last_audit_date')}
              />
            }
            label="Update Last Audit Date"
          />
          <TextField
            fullWidth
            type="date"
            sx={{ mb: 2 }}
            disabled={!bulkFields.last_audit_date}
            value={bulkValues.last_audit_date}
            onChange={handleBulkValueChange('last_audit_date')}
            error={Boolean(bulkErrors.last_audit_date)}
            helperText={
              bulkFields.last_audit_date
                ? bulkErrors.last_audit_date || 'Use the reviewed-on date.'
                : ' '
            }
            InputLabelProps={{ shrink: true }}
          />

          <FormControlLabel
            control={
              <Checkbox checked={bulkFields.notes} onChange={handleBulkFieldToggle('notes')} />
            }
            label="Update Notes"
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            disabled={!bulkFields.notes}
            value={bulkValues.notes}
            onChange={handleBulkValueChange('notes')}
            helperText={bulkFields.notes ? 'Optional additional context.' : ' '}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkDialog} disabled={bulkSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleBulkSubmit} disabled={bulkSaving}>
            {bulkSaving ? 'Updating...' : 'Apply Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Groups
