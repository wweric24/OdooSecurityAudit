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
} from '@mui/material'
import { ArrowBack as ArrowBackIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { api } from '../api/client'

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

  useEffect(() => {
    loadGroup()
  }, [id])

  const loadGroup = async () => {
    try {
      setLoading(true)
      const response = await api.getGroup(id)
      setGroup(response.data)
      setFormData({
        status: response.data.status || 'Under Review',
        who_requires: response.data.who_requires || '',
        why_required: response.data.why_required || '',
        notes: response.data.notes || '',
        last_audit_date: response.data.last_audit_date || '',
      })
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handleSave = async () => {
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
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!group) return
    setFormData({
      status: group.status || 'Under Review',
      who_requires: group.who_requires || '',
      why_required: group.why_required || '',
      notes: group.notes || '',
      last_audit_date: group.last_audit_date || '',
    })
    setSaveError(null)
    setSuccessMessage(null)
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

      <Grid container spacing={3} sx={{ mt: 1 }}>
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
                  Required Fields
                </Typography>
                {group.has_required_fields ? (
                  <Chip label="Complete" size="small" color="success" />
                ) : (
                  <Chip label="Incomplete" size="small" color="warning" />
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
                  <MenuItem value="Under Review">Under Review</MenuItem>
                  <MenuItem value="Confirmed">Confirmed</MenuItem>
                  <MenuItem value="Deprecated">Deprecated</MenuItem>
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
                helperText="Specify teams, roles, or users that require this access."
              />

              <TextField
                label="Why Access is Required"
                multiline
                minRows={3}
                value={formData.why_required}
                onChange={handleFieldChange('why_required')}
                fullWidth
                sx={{ mb: 2 }}
                helperText="Business justification for access."
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
      </Grid>
    </Box>
  )
}

export default GroupDetail

