import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Stack,
} from '@mui/material'
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

function Analysis() {
  const [compliance, setCompliance] = useState(null)
  const [gaps, setGaps] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  useEffect(() => {
    loadAnalysis()
  }, [])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      const [complianceRes, gapsRes] = await Promise.all([
        api.getCompliance(),
        api.getGapAnalysis(),
      ])
      setCompliance(complianceRes.data)
      setGaps(gapsRes.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  const handleExportNonCompliant = async () => {
    try {
      setExporting(true)
      setExportError(null)
      const response = await api.exportNonCompliant()
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'text/csv' })
      downloadBlob(blob, 'non_compliant_groups.csv')
    } catch (err) {
      setExportError(err.message || 'Failed to export analysis data')
    } finally {
      setExporting(false)
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
    return <Alert severity="error">Error loading analysis: {error}</Alert>
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
        <Typography variant="h4">Analysis & Compliance</Typography>
        <Button variant="contained" onClick={handleExportNonCompliant} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export Non-Compliant'}
        </Button>
      </Stack>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {exportError}
        </Alert>
      )}

      <Box sx={panelStyle}>
      <Grid container spacing={3}>
        {compliance && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Analysis
                </Typography>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Total Groups
                      </Typography>
                      <Typography variant="h5">{compliance.total_groups}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Follows Naming Convention
                      </Typography>
                      <Typography variant="h5">
                        {compliance.follows_naming_convention}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Odoo Doc Fields
                      </Typography>
                      <Typography variant="h5">
                        {compliance.has_required_fields}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Compliance Percentage
                      </Typography>
                      <Typography variant="h5">
                        <Chip
                          label={`${compliance.compliance_percentage}%`}
                          color={
                            compliance.compliance_percentage >= 80
                              ? 'success'
                              : compliance.compliance_percentage >= 50
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {compliance.non_compliant_groups.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Non-Compliant Groups ({compliance.non_compliant_groups.length})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Group Name</TableCell>
                            <TableCell>Issues</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {compliance.non_compliant_groups.slice(0, 20).map((group) => (
                            <TableRow key={group.id}>
                              <TableCell>{group.name}</TableCell>
                              <TableCell>
                                {group.issues.map((issue, idx) => (
                                  <Chip
                                    key={idx}
                                    label={issue}
                                    size="small"
                                    color="error"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {gaps && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Documentation Gaps
                </Typography>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Undocumented Groups
                      </Typography>
                      <Typography variant="h5" color="error">
                        {gaps.undocumented_groups}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Missing "Who"
                      </Typography>
                      <Typography variant="h5" color="warning.main">
                        {gaps.missing_who}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Missing "Why"
                      </Typography>
                      <Typography variant="h5" color="warning.main">
                        {gaps.missing_why}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Overdue Audits
                      </Typography>
                      <Typography variant="h5" color="error">
                        {gaps.overdue_audit}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
      </Box>
    </Box>
  )
}

export default Analysis

