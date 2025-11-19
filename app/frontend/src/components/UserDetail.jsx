import React, { useState, useEffect, useMemo } from 'react'
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
  Stack,
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material'
import { api } from '../api/client'
import ConfigurableDataGrid from './common/ConfigurableDataGrid'

const panelStyle = {
  backgroundColor: '#fff',
  borderRadius: 3,
  p: { xs: 2.5, md: 3.5, xl: 4 },
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  width: '100%',
  maxWidth: '1600px',
  mx: 'auto',
}

// Color constants
const AZURE_COLOR = '#1976d2' // Blue
const ODOO_COLOR = '#9c27b0' // Light purple

const formatLastAuditLabel = (value) => {
  if (!value) return 'Not Audited'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

const getStatusChipColor = (status) => {
  if (!status) return 'default'
  const normalized = status.toLowerCase()
  if (normalized.includes('active') || normalized.includes('confirm')) return 'success'
  if (normalized.includes('deprecated') || normalized.includes('legacy')) return 'warning'
  if (normalized.includes('pending') || normalized.includes('review')) return 'info'
  if (normalized.includes('risk') || normalized.includes('issue')) return 'error'
  return 'default'
}

function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const groupRows = useMemo(() => {
    if (!user || !Array.isArray(user.groups)) {
      return []
    }

    return user.groups
      .filter(Boolean)
      .map((group, index) => {
        const resolvedId =
          typeof group.id === 'number' || typeof group.id === 'string'
            ? group.id
            : `group-${index}`

        return {
          id: resolvedId,
          groupId: group.id ?? null,
          name: group.name || `Group ${index + 1}`,
          module: group.module || 'Unassigned Module',
          status: group.status || 'Not Set',
          source_system: group.source_system || 'Unknown Source',
          is_documented: Boolean(group.is_documented),
          follows_naming_convention: Boolean(group.follows_naming_convention),
          has_required_fields: Boolean(group.has_required_fields),
          last_audit_date: group.last_audit_date || null,
          is_overdue_audit: Boolean(group.is_overdue_audit),
        }
      })
  }, [user])

  const groupColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Security Group',
        flex: 1.4,
        minWidth: 200,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={600}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'module',
        headerName: 'Application / Module',
        flex: 1.1,
        minWidth: 170,
        valueGetter: (params) => params.value || 'Unassigned Module',
        renderCell: (params) => (
          <Typography variant="body2" color="textSecondary">
            {params.value || 'Unassigned Module'}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 0.8,
        minWidth: 130,
        renderCell: (params) =>
          params.value ? (
            <Chip
              label={params.value}
              size="small"
              color={getStatusChipColor(params.value)}
              variant="outlined"
            />
          ) : (
            <Typography variant="caption" color="textSecondary">
              -
            </Typography>
          ),
      },
      {
        field: 'documentation',
        headerName: 'Documentation Health',
        flex: 1.3,
        minWidth: 220,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label={params.row.is_documented ? 'Documented' : 'Missing Docs'}
              size="small"
              color={params.row.is_documented ? 'success' : 'warning'}
            />
            <Chip
              label={params.row.follows_naming_convention ? 'Naming OK' : 'Naming Gap'}
              size="small"
              color={params.row.follows_naming_convention ? 'info' : 'default'}
              variant={params.row.follows_naming_convention ? 'filled' : 'outlined'}
            />
          </Stack>
        ),
      },
      {
        field: 'last_audit_date',
        headerName: 'Last Audit',
        flex: 0.9,
        minWidth: 170,
        valueGetter: (params) => params.row.last_audit_date,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2">
              {formatLastAuditLabel(params.row.last_audit_date)}
            </Typography>
            {params.row.is_overdue_audit && (
              <Chip label="Overdue" size="small" color="error" variant="outlined" />
            )}
          </Stack>
        ),
      },
      {
        field: 'source_system',
        headerName: 'Source',
        flex: 0.8,
        minWidth: 140,
        valueGetter: (params) => params.value || 'Unknown Source',
        renderCell: (params) => (
          <Typography variant="body2">{params.value || 'Unknown Source'}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const targetId = params.row.groupId ?? params.row.id
          return (
            <Button
              size="small"
              variant="outlined"
              disabled={!params.row.groupId}
              onClick={(event) => {
                event.stopPropagation()
                if (!params.row.groupId) {
                  return
                }
                navigate(`/groups/${params.row.groupId}`)
              }}
            >
              View Group
            </Button>
          )
        },
      },
    ],
    [navigate]
  )

  const groupTableHeight = Math.min(
    600,
    Math.max(320, 120 + Math.max(groupRows.length, 1) * 48)
  )

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

                {groupRows.length > 0 ? (
                  <ConfigurableDataGrid
                    storageKey={`user-${user.id}-groups`}
                    columns={groupColumns}
                    rows={groupRows}
                    height={groupTableHeight}
                    density="compact"
                    hideFooter={groupRows.length <= 10}
                    disableRowSelectionOnClick
                    onRowClick={(params) => {
                      if (!params || !params.row || !params.row.groupId) {
                        return
                      }
                      navigate(`/groups/${params.row.groupId}`)
                    }}
                    sx={{
                      '& .MuiDataGrid-row': {
                        cursor: 'pointer',
                      },
                    }}
                  />
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

