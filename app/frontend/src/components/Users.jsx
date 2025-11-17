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
} from '@mui/material'
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

  useEffect(() => {
    loadUsers()
  }, [search])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search

      const response = await api.getUsers(params)
      setUsers(response.data.users)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
        <TextField
          label="Search Users"
          variant="outlined"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 3, maxWidth: 400 }}
        />

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
              <TableCell>Department</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Groups</TableCell>
              <TableCell>Group Names</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.department || '-'}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
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
            ))}
          </TableBody>
        </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

export default Users

