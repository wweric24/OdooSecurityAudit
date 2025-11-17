import React, { useState, useEffect } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material'
import { api } from '../api/client'

const panelStyle = {
  backgroundColor: '#fff',
  borderRadius: 3,
  p: { xs: 2, md: 3 },
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await api.getStats()
      setStats(response.data)
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
    return <Alert severity="error">Error loading statistics: {error}</Alert>
  }

  if (!stats) {
    return <Alert severity="info">No data available. Please import a CSV file.</Alert>
  }

  const StatCard = ({ title, value, subtitle, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" color={color}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Box sx={panelStyle}>
        <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Groups"
            value={stats.total_groups}
            subtitle={`${stats.documented_groups} documented, ${stats.undocumented_groups} undocumented`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.total_users}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Compliance"
            value={`${stats.compliance_percentage}%`}
            subtitle={`${stats.follows_naming_convention} groups follow naming convention`}
            color={stats.compliance_percentage >= 80 ? 'success' : 'warning'}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Status"
            value={stats.confirmed}
            subtitle={`${stats.under_review} under review`}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Documentation Status
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Documented: <strong>{stats.documented_groups}</strong>
                </Typography>
                <Typography variant="body1" color="warning.main">
                  Undocumented: <strong>{stats.undocumented_groups}</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Group Status
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Confirmed: <strong>{stats.confirmed}</strong>
                </Typography>
                <Typography variant="body1" color="warning.main">
                  Under Review: <strong>{stats.under_review}</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default Dashboard

