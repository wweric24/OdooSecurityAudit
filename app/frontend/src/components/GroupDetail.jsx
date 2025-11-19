import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { api } from '../api/client'

const panelStyle = {
  backgroundColor: '#fff',
  borderRadius: 3,
  p: { xs: 2.5, md: 3.5, xl: 4 },
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  width: '100%',
  maxWidth: '1600px',
  mx: 'auto',
}

const STATUS_OPTIONS = ['Active', 'Confirmed', 'Deprecated', 'Legacy']
const EMPTY_PERMISSIONS = {
  direct_permissions: [],
  inherited_permissions: [],
  effective_permissions: [],
  summary: {},
}

function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    status: '',
    who_requires: '',
    why_required: '',
    notes: '',
    last_audit_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const formatDateTime = (value) => {
    if (!value) return 'Not captured'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
  }

  useEffect(() => {
    loadGroup()
  }, [id])

  useEffect(() => {
    if (group) {
      loadPermissions()
    }
  }, [group])

  const loadGroup = async () => {
    try {
      setLoading(true)
      const response = await api.getGroup(id)
      setGroup(response.data)
      setFormData({
        status: response.data.status || 'Active',
        who_requires: response.data.who_requires || '',
        why_required: response.data.why_required || '',
        notes: response.data.notes || '',
        last_audit_date: response.data.last_audit_date || '',
      })
      setValidationErrors({})
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true)
      const response = await api.getGroupPermissions(id)
      setPermissions({
        direct_permissions: response.data.direct_permissions || [],
        inherited_permissions: response.data.inherited_permissions || [],
        effective_permissions: response.data.effective_permissions || [],
        summary: response.data.summary || {},
      })
    } catch (err) {
      console.warn('Unable to load permissions', err)
      setPermissions(EMPTY_PERMISSIONS)
    } finally {
      setLoadingPermissions(false)
    }
  }

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  const handleSave = async () => {
    const errors = {}
    if (!formData.who_requires?.trim()) {
      errors.who_requires = 'Who Requires Access is required'
    }
    if (!formData.why_required?.trim()) {
      errors.why_required = 'Why Access is Required is required'
    }
    if (Object.keys(errors).length) {
      setValidationErrors(errors)
      return
    }

    try {
      setSaving(true)
      setSaveError(null)
      setSuccessMessage(null)
      const payload = {
        status: formData.status,
        who_requires: formData.who_requires,
        why_required: formData.why_required,
        notes: formData.notes,
        last_audit_date: formData.last_audit_date || null,
      }
      const response = await api.updateGroup(id, payload)
      setGroup(response.data)
      setSuccessMessage('Group documentation updated')
      setValidationErrors({})
    } catch (err) {
      setSaveError(err.response?.data?.detail || err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!group) return
    setFormData({
      status: group.status || 'Active',
      who_requires: group.who_requires || '',
      why_required: group.why_required || '',
      notes: group.notes || '',
      last_audit_date: group.last_audit_date || '',
    })
    setSaveError(null)
    setSuccessMessage(null)
    setValidationErrors({})
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Error loading group: {error}</Alert>
  }

  if (!group) {
    return <Alert severity="info">Group not found</Alert>
  }

  const effectivePermissions = permissions.effective_permissions || []
  const permissionSummary = permissions.summary || {}
  const metadataChecklist = [
    { label: 'Created By', value: group.odoo_created_by },
    { label: 'Created On', value: group.odoo_created_at ? formatDateTime(group.odoo_created_at) : null },
    { label: 'Last Updated By', value: group.odoo_updated_by },
    { label: 'Last Updated On', value: group.odoo_updated_at ? formatDateTime(group.odoo_updated_at) : null },
  ]
  const documentationTextSections = [
    { label: 'Group Purpose', value: group.purpose },
    { label: 'Allowed Functions', value: group.allowed_functions },
    { label: 'Allowed Records', value: group.allowed_records },
    { label: 'Allowed Fields', value: group.allowed_fields },
    { label: 'User Access', value: group.user_access },
    { label: 'Transitivity / Inherited Notes', value: group.inheritance_notes || (group.parent_groups?.length ? 'Parent groups listed below' : '') },
  ]

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/groups')}
        sx={{ mb: 2 }}
      >
        Back to Groups
      </Button>

      <Typography variant="h4" gutterBottom>
        {group.name}
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

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
                  Module
                </Typography>
                <Typography variant="body1">{group.module || '-'}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Access Level
                </Typography>
                <Typography variant="body1">
                  {group.access_level || '-'}
                  {group.hierarchy_level && ` (Level ${group.hierarchy_level})`}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={group.status || 'Not specified'}
                  size="small"
                  color={
                    group.status === 'Confirmed'
                      ? 'success'
                      : group.status === 'Active'
                      ? 'info'
                      : group.status === 'Deprecated' || group.status === 'Legacy'
                      ? 'default'
                      : 'default'
                  }
                />
                {group.is_archived && (
                  <Chip label="Archived" size="small" variant="outlined" sx={{ ml: 1 }} />
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Purpose
                </Typography>
                <Typography variant="body1">{group.purpose || '-'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance Status
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Naming Convention
                </Typography>
                {group.follows_naming_convention ? (
                  <Chip label="Compliant" size="small" color="success" />
                ) : (
                  <Chip label="Non-compliant" size="small" color="error" />
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Odoo Doc Fields
                </Typography>
                {group.has_required_fields ? (
                  <Chip label="Complete" size="small" color="success" />
                ) : (
                  <Chip label="Missing" size="small" color="warning" />
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Documentation
                </Typography>
                {group.is_documented ? (
                  <Chip label="Documented" size="small" color="success" />
                ) : (
                  <Chip label="Undocumented" size="small" color="error" />
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Last Audit
                </Typography>
                <Typography variant="body1">
                  {group.last_audit_date || 'Not set'}
                  {group.is_overdue_audit && (
                    <Chip label="Overdue" size="small" color="error" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Odoo Documentation Fields
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                These metadata and documentation fields determine whether the group is considered
                documented.
              </Typography>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ flexWrap: 'wrap', mb: 2 }}
              >
                {metadataChecklist.map((field) => (
                  <Box
                    key={field.label}
                    sx={{
                      border: '1px solid',
                      borderColor: field.value ? 'success.light' : 'warning.light',
                      borderRadius: 2,
                      p: 1.5,
                      minWidth: { xs: '100%', md: 220 },
                    }}
                  >
                    <Typography variant="caption" color="textSecondary">
                      {field.label}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        color={field.value ? 'success' : 'warning'}
                        icon={field.value ? <CheckIcon fontSize="small" /> : <CloseIcon fontSize="small" />}
                        label={field.value ? 'Documented' : 'Missing'}
                      />
                      <Typography variant="body2">
                        {field.value || 'Not captured'}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Grid container spacing={2}>
                {documentationTextSections.map((section) => (
                  <Grid item xs={12} md={6} key={section.label}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2">{section.label}</Typography>
                      <Chip
                        size="small"
                        color={section.value ? 'success' : 'warning'}
                        label={section.value ? 'Documented' : 'Missing'}
                      />
                    </Stack>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ whiteSpace: 'pre-line' }}
                    >
                      {section.value || 'Not documented'}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Documentation & Status</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={handleFieldChange('status')}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Who Requires Access"
                multiline
                minRows={3}
                value={formData.who_requires}
                onChange={handleFieldChange('who_requires')}
                fullWidth
                sx={{ mb: 2 }}
                required
                error={Boolean(validationErrors.who_requires)}
                helperText={
                  validationErrors.who_requires ||
                  'Specify teams, roles, or users that require this access.'
                }
              />

              <TextField
                label="Why Access is Required"
                multiline
                minRows={3}
                value={formData.why_required}
                onChange={handleFieldChange('why_required')}
                fullWidth
                sx={{ mb: 2 }}
                required
                error={Boolean(validationErrors.why_required)}
                helperText={
                  validationErrors.why_required || 'Business justification for access.'
                }
              />

              <TextField
                label="Last Audit Date"
                type="date"
                value={formData.last_audit_date || ''}
                onChange={handleFieldChange('last_audit_date')}
                fullWidth
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Notes"
                multiline
                minRows={2}
                value={formData.notes}
                onChange={handleFieldChange('notes')}
                fullWidth
                sx={{ mb: 2 }}
              />

              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outlined" onClick={handleReset} disabled={saving}>
                  Reset
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned Users ({group.users.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {group.users.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No users assigned
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {group.who_requires && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Who Requires Access
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">{group.who_requires}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {group.why_required && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Why Required
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">{group.why_required}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Group Relationships
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Parent Groups
                  </Typography>
                  {group.parent_groups.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {group.parent_groups.map((parent) => (
                        <Chip key={parent.id} label={parent.name} variant="outlined" />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No parent groups recorded
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Child Groups
                  </Typography>
                  {group.child_groups.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {group.child_groups.map((child) => (
                        <Chip key={child.id} label={child.name} variant="outlined" />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No child groups recorded
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* CRUD Permissions Section */}
        <Grid item xs={12}>
          <Accordion defaultExpanded={effectivePermissions.length > 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Access Rights (CRUD Permissions)
                {effectivePermissions.length > 0 && (
                  <Chip
                    label={effectivePermissions.length}
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {loadingPermissions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : effectivePermissions.length > 0 ? (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This group provides access to {permissionSummary.models_covered || 0} model(s).
                    Effective permissions include direct and inherited access rights.
                  </Alert>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    <Chip
                      label={`Direct rules: ${permissionSummary.direct_count || 0}`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`Inherited rules: ${permissionSummary.inherited_count || 0}`}
                      color="info"
                      variant="outlined"
                    />
                  </Stack>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Model</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="center">Create</TableCell>
                          <TableCell align="center">Read</TableCell>
                          <TableCell align="center">Update</TableCell>
                          <TableCell align="center">Delete</TableCell>
                          <TableCell>Sources</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {effectivePermissions.map((perm, index) => (
                          <TableRow
                            key={`${perm.model_name || perm.model_description || 'model'}-${index}`}
                          >
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                              >
                                {perm.model_name || 'Unknown'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {perm.model_description || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {perm.perm_create ? (
                                <CheckIcon color="success" fontSize="small" />
                              ) : (
                                <CloseIcon color="disabled" fontSize="small" />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {perm.perm_read ? (
                                <CheckIcon color="success" fontSize="small" />
                              ) : (
                                <CloseIcon color="disabled" fontSize="small" />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {perm.perm_write ? (
                                <CheckIcon color="success" fontSize="small" />
                              ) : (
                                <CloseIcon color="disabled" fontSize="small" />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {perm.perm_unlink ? (
                                <CheckIcon color="success" fontSize="small" />
                              ) : (
                                <CloseIcon color="disabled" fontSize="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {perm.source_groups.map((source, index) => {
                                  const label = source.is_inherited
                                    ? `Inherited: ${source.group_name || 'Parent'}`
                                    : 'Direct'
                                  const tooltip = `Create: ${
                                    source.perm_create ? 'Yes' : 'No'
                                  } | Read: ${source.perm_read ? 'Yes' : 'No'} | Update: ${
                                    source.perm_write ? 'Yes' : 'No'
                                  } | Delete: ${source.perm_unlink ? 'Yes' : 'No'}`
                                  return (
                                    <Tooltip key={`${source.group_id}-${index}`} title={tooltip}>
                                      <Chip
                                        size="small"
                                        label={label}
                                        color={source.is_inherited ? 'info' : 'success'}
                                      />
                                    </Tooltip>
                                  )
                                })}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Alert severity="warning">
                  No CRUD permissions found for this group. This data is populated when you sync
                  from Odoo PostgreSQL database (requires access to ir.model.access table).
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
      </Box>
    </Box>
  )
}

export default GroupDetail

