import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
} from '@mui/material'
import {
  DataGrid,
  GridToolbar,
  GridActionsCellItem,
} from '@mui/x-data-grid'
import {
  Clear as ClearIcon,
  VisibilityOff as HideIcon,
  Visibility as UnhideIcon,
} from '@mui/icons-material'
import { api } from '../api/client'

const panelStyle = {
  backgroundColor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 3 },
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
}

// Color constants
const AZURE_COLOR = '#1976d2' // Blue
const ODOO_COLOR = '#9c27b0' // Light purple

function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')  // 'Azure', 'Odoo', or ''
  const [emailFilter, setEmailFilter] = useState('')
  const [rowSelectionModel, setRowSelectionModel] = useState([])
  const [showHidden, setShowHidden] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 })

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [search, selectedDepartment, sourceFilter, emailFilter, showHidden])

  const loadDepartments = async () => {
    try {
      const response = await api.getDepartments()
      setDepartments(response.data.departments || [])
    } catch (err) {
      console.warn('Unable to load departments', err)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)

      if (selectedDepartment) {
        // Use department-specific endpoint
        const response = await api.getUsersByDepartment(selectedDepartment, { include_hidden: showHidden })
        let filteredUsers = response.data.users

        // Apply client-side filters
        if (search) {
          filteredUsers = filteredUsers.filter(u =>
            u.name?.toLowerCase().includes(search.toLowerCase())
          )
        }
        if (emailFilter) {
          filteredUsers = filteredUsers.filter(u =>
            u.email?.toLowerCase().includes(emailFilter.toLowerCase())
          )
        }
        if (sourceFilter) {
          filteredUsers = filteredUsers.filter(u => {
            if (sourceFilter === 'Azure') return u.azure_id || u.last_seen_in_azure_at
            if (sourceFilter === 'Odoo') return u.odoo_user_id || (u.source_system && u.source_system.startsWith('Odoo'))
            return true
          })
        }
        setUsers(filteredUsers)
      } else {
        // Use general users endpoint with all filters
        const params = { include_hidden: showHidden, limit: 1000 }
        if (search) params.search = search
        const response = await api.getUsers(params)
        let filteredUsers = response.data.users

        // Apply client-side filters
        if (emailFilter) {
          filteredUsers = filteredUsers.filter(u =>
            u.email?.toLowerCase().includes(emailFilter.toLowerCase())
          )
        }
        if (sourceFilter) {
          filteredUsers = filteredUsers.filter(u => {
            if (sourceFilter === 'Azure') return u.azure_id || u.last_seen_in_azure_at
            if (sourceFilter === 'Odoo') return u.odoo_user_id || (u.source_system && u.source_system.startsWith('Odoo'))
            return true
          })
        }
        setUsers(filteredUsers)
      }
      setError(null)
      setRowSelectionModel([]) // Clear selection when data refreshes
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedDepartment('')
    setSourceFilter('')
    setEmailFilter('')
  }

  const handleHide = async () => {
    try {
      setError(null)
      const response = await api.hideUsers(rowSelectionModel)
      setActionSuccess(`Successfully hid ${response.data.hidden_count} user(s)`)
      setTimeout(() => setActionSuccess(null), 3000)
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to hide users')
    }
  }

  const handleUnhide = async () => {
    try {
      setError(null)
      const response = await api.unhideUsers(rowSelectionModel)
      setActionSuccess(`Successfully unhid ${response.data.unhidden_count} user(s)`)
      setTimeout(() => setActionSuccess(null), 3000)
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to unhide users')
    }
  }

  // Format user data for DataGrid
  const rows = useMemo(() => {
    if (!users || !Array.isArray(users) || users.length === 0) return []
    return users
      .filter(user => user && user.id) // Filter out any invalid users
      .map((user) => {
        const hasAzure = user.azure_id || user.last_seen_in_azure_at
        const hasOdoo = user.odoo_user_id || (user.source_system && user.source_system.startsWith('Odoo'))
        
        return {
          id: user.id,
        name: user.name,
        email: user.email || '',
        department: user.department || '',
        source_system: user.source_system || '',
        azure_id: user.azure_id || '',
        odoo_user_id: user.odoo_user_id || '',
        last_seen_in_azure_at: user.last_seen_in_azure_at || '',
        created_at: user.created_at || '',
        updated_at: user.updated_at || '',
        is_hidden: user.is_hidden || false,
        group_count: user.group_count || 0,
        groups: user.groups || [],
        // Computed fields for display
        hasAzure,
        hasOdoo,
        sourceDisplay: hasAzure && hasOdoo ? 'Both' : hasAzure ? 'Azure AD' : hasOdoo ? (user.source_system && user.source_system.includes('Production') ? user.source_system.replace('Odoo (', '').replace(')', '') : 'Odoo') : 'None',
        groupsDisplay: user.groups?.slice(0, 10).map(g => g.name).join(', ') || '',
        groupsCount: user.groups?.length || 0,
      }
    })
  }, [users])

  // Reset selection when rows change to prevent state issues
  useEffect(() => {
    if (rows.length === 0) {
      setRowSelectionModel([])
    } else if (rowSelectionModel.length > 0) {
      // Filter out any selected IDs that don't exist in current rows
      const validIds = rows.map(r => r.id)
      const filteredSelection = rowSelectionModel.filter(id => validIds.includes(id))
      if (filteredSelection.length !== rowSelectionModel.length) {
        setRowSelectionModel(filteredSelection)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length])

  // Define columns with all user fields
  const columns = [
    {
      field: 'select',
      headerName: '',
      width: 50,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Checkbox
          checked={rowSelectionModel.includes(params.row.id)}
          onChange={(e) => {
            e.stopPropagation()
            if (e.target.checked) {
              setRowSelectionModel([...rowSelectionModel, params.row.id])
            } else {
              setRowSelectionModel(rowSelectionModel.filter(id => id !== params.row.id))
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      renderHeader: () => (
        <Checkbox
          checked={rows.length > 0 && rowSelectionModel.length === rows.length}
          indeterminate={rowSelectionModel.length > 0 && rowSelectionModel.length < rows.length}
          onChange={(e) => {
            if (e.target.checked) {
              setRowSelectionModel(rows.map(r => r.id))
            } else {
              setRowSelectionModel([])
            }
          }}
        />
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 250,
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'department',
      headerName: 'Department',
      width: 180,
      flex: 0.8,
      minWidth: 120,
    },
    {
      field: 'sourceDisplay',
      headerName: 'Source',
      width: 180,
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => {
        const user = users.find(u => u.id === params.row.id)
        if (!user) return '-'
        const hasAzure = user.azure_id || user.last_seen_in_azure_at
        const hasOdoo = user.odoo_user_id || (user.source_system && user.source_system.startsWith('Odoo'))
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {hasAzure && (
              <Chip
                label="Azure AD"
                size="small"
                sx={{
                  bgcolor: AZURE_COLOR,
                  color: 'white',
                  fontWeight: 500
                }}
              />
            )}
            {hasOdoo && (
              <Chip
                label={user.source_system && user.source_system.includes('Production') 
                  ? user.source_system.replace('Odoo (', '').replace(')', '') 
                  : 'Odoo'}
                size="small"
                sx={{
                  bgcolor: ODOO_COLOR,
                  color: 'white',
                  fontWeight: 500
                }}
              />
            )}
            {!hasAzure && !hasOdoo && <Typography variant="body2">-</Typography>}
          </Box>
        )
      },
    },
    {
      field: 'group_count',
      headerName: 'Groups',
      width: 100,
      flex: 0.5,
      minWidth: 80,
      type: 'number',
      renderCell: (params) => (
        <Chip label={params.value} size="small" />
      ),
    },
    {
      field: 'groupsDisplay',
      headerName: 'Group Names',
      width: 400,
      flex: 2,
      minWidth: 300,
      renderCell: (params) => {
        const user = users.find(u => u.id === params.row.id)
        if (!user || !user.groups || user.groups.length === 0) return '-'
        
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {user.groups.slice(0, 5).map((group) => (
              <Chip
                key={group.id}
                label={group.name}
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/groups/${group.id}`)
                }}
                sx={{ cursor: 'pointer' }}
              />
            ))}
            {user.groups.length > 5 && (
              <Chip
                label={`+${user.groups.length - 5} more`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        )
      },
    },
    {
      field: 'azure_id',
      headerName: 'Azure ID',
      width: 200,
      flex: 1,
      minWidth: 150,
      hideable: true,
    },
    {
      field: 'odoo_user_id',
      headerName: 'Odoo User ID',
      width: 150,
      flex: 0.8,
      minWidth: 120,
      hideable: true,
      type: 'number',
    },
    {
      field: 'source_system',
      headerName: 'Source System',
      width: 200,
      flex: 1,
      minWidth: 150,
      hideable: true,
    },
    {
      field: 'last_seen_in_azure_at',
      headerName: 'Last Seen (Azure)',
      width: 200,
      flex: 1,
      minWidth: 150,
      hideable: true,
      type: 'dateTime',
      valueGetter: (value) => value ? new Date(value) : null,
      renderCell: (params) => {
        if (!params.value) return '-'
        return new Date(params.value).toLocaleString()
      },
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 200,
      flex: 1,
      minWidth: 150,
      hideable: true,
      type: 'dateTime',
      valueGetter: (value) => value ? new Date(value) : null,
      renderCell: (params) => {
        if (!params.value) return '-'
        return new Date(params.value).toLocaleString()
      },
    },
    {
      field: 'updated_at',
      headerName: 'Updated At',
      width: 200,
      flex: 1,
      minWidth: 150,
      hideable: true,
      type: 'dateTime',
      valueGetter: (value) => value ? new Date(value) : null,
      renderCell: (params) => {
        if (!params.value) return '-'
        return new Date(params.value).toLocaleString()
      },
    },
    {
      field: 'is_hidden',
      headerName: 'Hidden',
      width: 100,
      flex: 0.5,
      minWidth: 80,
      hideable: true,
      type: 'boolean',
      renderCell: (params) => (
        params.value ? <Chip label="Hidden" size="small" color="warning" /> : '-'
      ),
    },
  ]

  if (loading && users.length === 0) {
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
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Users</Typography>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel>View</InputLabel>
          <Select
            value={showHidden ? 'hidden' : 'visible'}
            label="View"
            onChange={(e) => setShowHidden(e.target.value === 'hidden')}
          >
            <MenuItem value="visible">Visible Users</MenuItem>
            <MenuItem value="hidden">Hidden Users</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Box sx={panelStyle}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <TextField
            label="Search Name"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200 }}
            placeholder="Filter by name..."
          />
          <TextField
            label="Search Email"
            variant="outlined"
            size="small"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            sx={{ minWidth: 200 }}
            placeholder="Filter by email..."
          />
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              label="Department"
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>Source</InputLabel>
            <Select
              value={sourceFilter}
              label="Source"
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <MenuItem value="">All Sources</MenuItem>
              <MenuItem value="Azure">Azure AD</MenuItem>
              <MenuItem value="Odoo">Odoo</MenuItem>
            </Select>
          </FormControl>
          {(search || selectedDepartment || sourceFilter || emailFilter) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          )}
        </Stack>

        {selectedDepartment && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing {users.length} users in <strong>{selectedDepartment}</strong> department
          </Alert>
        )}

        {actionSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {actionSuccess}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {rowSelectionModel.length > 0 && (
          <Paper sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {rowSelectionModel.length} user(s) selected
              </Typography>
              {!showHidden && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<HideIcon />}
                  onClick={handleHide}
                  color="warning"
                >
                  Hide Selected
                </Button>
              )}
              {showHidden && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<UnhideIcon />}
                  onClick={handleUnhide}
                  color="primary"
                >
                  Unhide Selected
                </Button>
              )}
            </Stack>
          </Paper>
        )}

        <Box sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : rows.length > 0 ? (
            <DataGrid
              key={`users-grid-${rows.length}`}
              rows={rows}
              columns={columns}
              loading={false}
              disableRowSelectionOnClick={true}
              onRowClick={(params) => {
                if (params && params.id) {
                  navigate(`/users/${params.id}`)
                }
              }}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[25, 50, 100]}
              hideFooter={true}
              disableMultipleRowSelection={false}
              rowHeight={52}
              keepNonExistentRowsSelected={false}
              initialState={{
                columns: {
                  columnVisibilityModel: {
                    azure_id: false,
                    odoo_user_id: false,
                    source_system: false,
                    last_seen_in_azure_at: false,
                    created_at: false,
                    updated_at: false,
                    is_hidden: false,
                  },
                },
              }}
              slots={{
                toolbar: GridToolbar,
              }}
              componentsProps={{
                footer: {
                  sx: { display: 'none' }, // Hide footer to avoid selection state issues
                },
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: false,
                  printOptions: { disableToolbarButton: true },
                },
              }}
              getRowId={(row) => {
                if (!row || typeof row.id === 'undefined') {
                  console.warn('Row missing id:', row)
                  return `temp-${Math.random()}`
                }
                return String(row.id)
              }}
              disableColumnFilter={false}
              disableColumnSelector={false}
              disableDensitySelector={false}
              sx={{
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="textSecondary">
                No users found
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default Users
