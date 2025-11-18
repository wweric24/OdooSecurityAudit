import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
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

function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadUser()
  }, [id])

  const loadUser = async () => {
    try {
      setLoading(true)
      const response = await api.getUser(id)
      setUser(response.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Error loading user: {error}</Alert>
  }

  if (!user) {
    return <Alert severity="info">User not found</Alert>
  }

  const hasAzure = user.azure_id || user.last_seen_in_azure_at
  const hasOdoo = user.odoo_user_id || (user.source_system && user.source_system.startsWith('Odoo'))

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/users')}
        sx={{ mb: 2 }}
      >
        Back to Users
      </Button>

      <Typography variant="h4" gutterBottom>
        {user.name}
      </Typography>

      <Box sx={panelStyle}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{user.email || '-'}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Department
                  </Typography>
                  <Typography variant="body1">{user.department || '-'}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  {user.is_hidden ? (
                    <Chip label="Hidden" size="small" color="warning" />
                  ) : (
                    <Chip label="Visible" size="small" color="success" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Source Systems
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Source System
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
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
                    {!hasAzure && !hasOdoo && (
                      <Typography variant="body2">-</Typography>
                    )}
                  </Box>
                </Box>

                {user.azure_id && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Azure ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {user.azure_id}
                    </Typography>
                  </Box>
                )}

                {user.odoo_user_id && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Odoo User ID
                    </Typography>
                    <Typography variant="body1">{user.odoo_user_id}</Typography>
                  </Box>
                )}

                {user.last_seen_in_azure_at && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Last Seen in Azure
                    </Typography>
                    <Typography variant="body1">
                      {new Date(user.last_seen_in_azure_at).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Groups ({user.group_count || 0})
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {user.groups && user.groups.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Group Name</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {user.groups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell>{group.name}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => navigate(`/groups/${group.id}`)}
                              >
                                View Group
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No groups assigned
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Metadata
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {user.created_at && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Created At
                    </Typography>
                    <Typography variant="body1">
                      {new Date(user.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                )}

                {user.updated_at && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Updated At
                    </Typography>
                    <Typography variant="body1">
                      {new Date(user.updated_at).toLocaleString()}
                    </Typography>
                  </Box>
                )}

                {user.source_system && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Source System (Full)
                    </Typography>
                    <Typography variant="body1">{user.source_system}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default UserDetail

