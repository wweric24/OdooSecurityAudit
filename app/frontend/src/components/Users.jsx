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
  CircularProgress,
  Alert,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material'
import { Clear as ClearIcon } from '@mui/icons-material'
import { api } from '../api/client'

const panelStyle = {
  backgroundColor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 3 },
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
}

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

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [search, selectedDepartment, sourceFilter, emailFilter])

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
        const response = await api.getUsersByDepartment(selectedDepartment)
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
            if (sourceFilter === 'Odoo') return u.odoo_user_id || u.source_system === 'Odoo'
            return true
          })
        }
        setUsers(filteredUsers)
      } else {
        // Use general users endpoint with all filters
        const params = {}
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
            if (sourceFilter === 'Odoo') return u.odoo_user_id || u.source_system === 'Odoo'
            return true
          })
        }
        setUsers(filteredUsers)
      }
      setError(null)
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Groups</TableCell>
              <TableCell>Group Names</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const hasAzure = user.azure_id || user.last_seen_in_azure_at
              const hasOdoo = user.odoo_user_id || user.source_system === 'Odoo'

              return (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {hasAzure && (
                        <Chip
                          label="Azure AD"
                          size="small"
                          sx={{
                            bgcolor: '#1976d2',
                            color: 'white',
                            fontWeight: 500
                          }}
                        />
                      )}
                      {hasOdoo && (
                        <Chip
                          label="Odoo"
                          size="small"
                          sx={{
                            bgcolor: '#7b1fa2',
                            color: 'white',
                            fontWeight: 500
                          }}
                        />
                      )}
                      {!hasAzure && !hasOdoo && '-'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={user.group_count} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {user.groups.slice(0, 5).map((group) => (
                        <Chip
                          key={group.id}
                          label={group.name}
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/groups/${group.id}`)}
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

export default Users

