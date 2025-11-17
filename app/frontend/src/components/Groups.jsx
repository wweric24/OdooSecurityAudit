import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
} from '@mui/material'
import { api } from '../api/client'

function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [modules, setModules] = useState([])
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50
  const fallbackModules = ['Project', 'Accounting', 'Employees', 'Sales', 'Purchasing']

  useEffect(() => {
    loadGroups()
  }, [page, search, statusFilter, moduleFilter])

  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await api.getModules()
        setModules(response.data.modules || [])
      } catch (err) {
        // Non-blocking: log to console but keep fallback list
        console.warn('Failed to load modules', err)
      }
    }
    loadModules()
  }, [])

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

  const handleExport = async () => {
    try {
      setExporting(true)
      setExportError(null)
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (moduleFilter) params.module = moduleFilter

      const response = await api.exportGroups(params)
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'text/csv' })
      downloadBlob(blob, 'groups_export.csv')
    } catch (err) {
      setExportError(err.message || 'Failed to export groups')
    } finally {
      setExporting(false)
    }
  }

  if (loading && groups.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

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
        <Button variant="contained" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </Stack>

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
            <MenuItem value="Under Review">Under Review</MenuItem>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
            <MenuItem value="Deprecated">Deprecated</MenuItem>
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {exportError}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Module</TableCell>
              <TableCell>Inherited From</TableCell>
              <TableCell>Access Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Compliance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <TableRow
                key={group.id}
                hover
                onClick={() => navigate(`/groups/${group.id}`)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.module || '-'}</TableCell>
                <TableCell>
                  {group.parent_groups && group.parent_groups.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {group.parent_groups.map((parent) => (
                        <Chip
                          key={parent.id}
                          label={parent.name}
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/groups/${parent.id}`)
                          }}
                          clickable
                        />
                      ))}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{group.access_level || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={group.status}
                    size="small"
                    color={
                      group.status === 'Confirmed'
                        ? 'success'
                        : group.status === 'Under Review'
                        ? 'warning'
                        : 'default'
                    }
                  />
                  {group.is_archived && (
                    <Chip
                      label="Archived"
                      size="small"
                      color="default"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell>{group.user_count}</TableCell>
                <TableCell>
                  {group.follows_naming_convention ? (
                    <Chip label="Compliant" size="small" color="success" />
                  ) : (
                    <Chip label="Non-compliant" size="small" color="error" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
  )
}

export default Groups

