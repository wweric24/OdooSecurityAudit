import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import cytoscape from 'cytoscape'
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

  const renderSignalChips = (signals) => {
    if (!signals || signals.length === 0) {
      return (
        <Typography variant="caption" color="textSecondary">
          No flags
        </Typography>
      )
    }
    return (
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
        {signals.map((signal, index) => (
          <Chip
            key={`${signal.label}-${index}`}
            label={signal.label}
            size="small"
            color={signal.color || 'default'}
            variant={signal.color ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
    )
  }

  const matrixRows = useMemo(() => {
    if (!stats?.department_group_matrix) return []
    return stats.department_group_matrix.map((row, index) => ({
      id: `${row.department || 'Unknown'}-${row.group}-${index}`,
      department: row.department || 'Unassigned',
      group: row.group,
      user_count: row.user_count,
    }))
  }, [stats])

  const inheritanceRows = useMemo(() => {
    if (!stats?.inheritance_highlights) return []
    return stats.inheritance_highlights.map((row) => ({
      id: row.id,
      name: row.name,
      child_count: row.child_count,
    }))
  }, [stats])

  const inheritanceColumns = useMemo(
    () => [
      { field: 'name', headerName: 'Group', flex: 1.2 },
      { field: 'child_count', headerName: 'Child Groups', width: 150 },
    ],
    []
  )

  const userRiskRows = useMemo(() => {
    if (!stats?.user_risk_summary) return []
    const threshold = stats.heavy_user_threshold || 0
    return stats.user_risk_summary.map((user, index) => {
      const signals = []
      if (user.is_over_threshold) {
        signals.push({ label: `>${threshold} groups`, color: 'warning' })
      }
      if ((user.undocumented_assignments || 0) > 0) {
        signals.push({
          label: `${user.undocumented_assignments} undocumented`,
          color: 'error',
        })
      }
      return {
        id: user.id || `user-risk-${index}`,
        name: user.name || user.email || 'Unknown User',
        department: user.department || 'Unassigned',
        group_count: user.group_count || 0,
        undocumented_assignments: user.undocumented_assignments || 0,
        signals,
      }
    })
  }, [stats])

  const userRiskColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'User / Department',
        flex: 1.4,
        renderCell: (params) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {params.row.department}
            </Typography>
          </Box>
        ),
      },
      { field: 'group_count', headerName: 'Groups', width: 110 },
      {
        field: 'signals',
        headerName: 'Flags',
        flex: 1.4,
        sortable: false,
        renderCell: (params) => renderSignalChips(params.value),
      },
    ],
    []
  )

  const groupRiskRows = useMemo(() => {
    if (!stats?.group_risk_summary) return []
    return stats.group_risk_summary.map((group, index) => {
      const signals = []
      if (group.status && group.status.toLowerCase().includes('review')) {
        signals.push({ label: group.status, color: 'warning' })
      }
      if (group.is_documented === false) {
        signals.push({ label: 'Undocumented', color: 'error' })
      }
      return {
        id: group.id || `group-risk-${index}`,
        name: group.name || 'Unknown Group',
        module: group.module || 'Unassigned Module',
        status: group.status || 'Unknown',
        user_count: group.user_count || 0,
        signals,
      }
    })
  }, [stats])

  const groupRiskColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Group / Module',
        flex: 1.4,
        renderCell: (params) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {params.row.module}
            </Typography>
          </Box>
        ),
      },
      { field: 'user_count', headerName: 'Users', width: 110 },
      { field: 'status', headerName: 'Status', width: 140 },
      {
        field: 'signals',
        headerName: 'Flags',
        flex: 1.3,
        sortable: false,
        renderCell: (params) => renderSignalChips(params.value),
      },
    ],
    []
  )

  const moduleSummary = useMemo(() => {
    if (!stats?.module_summary) return []
    return stats.module_summary.map((row) => ({
      module: row.module || 'Unassigned',
      user_count: row.user_count || 0,
    }))
  }, [stats])
  const chartColors = ['#1976d2', '#26a69a', '#ff7043', '#8e24aa', '#0097a7']

  const statusBreakdown = useMemo(() => {
    if (!stats?.status_breakdown) return []
    return stats.status_breakdown.map((row) => ({
      status: row.status || 'Unspecified',
      count: row.count || 0,
    }))
  }, [stats])

  const matrixByDepartment = useMemo(() => {
    const grouped = new Map()
    matrixRows.forEach((entry) => {
      const dept = entry.department || 'Unassigned'
      if (!grouped.has(dept)) {
        grouped.set(dept, [])
      }
      grouped.get(dept).push(entry)
    })
    return Array.from(grouped.entries()).sort((a, b) => {
      const sum = (list) => list.reduce((acc, item) => acc + (item.user_count || 0), 0)
      return sum(b[1]) - sum(a[1])
    })
  }, [matrixRows])

  const topMatrixDepartments = useMemo(
    () => matrixByDepartment.slice(0, 4),
    [matrixByDepartment]
  )

  const maxMatrixValue = useMemo(() => {
    if (topMatrixDepartments.length === 0) return 1
    return (
      topMatrixDepartments.reduce((max, [, combos]) => {
        const localMax = combos.reduce(
          (comboMax, combo) => Math.max(comboMax, combo.user_count || 0),
          0
        )
        return Math.max(max, localMax)
      }, 0) || 1
    )
  }, [topMatrixDepartments])

  const inheritanceGraphElements = useMemo(() => {
    const graph = stats?.inheritance_graph || {}
    const nodes = graph.nodes || []
    const edges = graph.edges || []
    const nodeElements = nodes.map((node) => ({
      data: {
        id: `node-${node.id}`,
        label: node.name || 'Group',
        module: node.module || 'Unassigned',
        role: node.role || 'group',
      },
    }))
    const edgeElements = edges.map((edge) => ({
      data: {
        id: `edge-${edge.id || `${edge.source}-${edge.target}`}`,
        source: `node-${edge.source}`,
        target: `node-${edge.target}`,
      },
    }))
    return [...nodeElements, ...edgeElements]
  }, [stats])

  const cytoscapeStyles = useMemo(
    () => [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          color: '#fff',
          'font-size': 10,
          width: 60,
          height: 60,
          'background-color': '#1976d2',
          'border-width': 2,
          'border-color': '#ffffff',
        },
      },
      {
        selector: 'node[role = "child"]',
        style: {
          'background-color': '#26a69a',
        },
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#b0bec5',
          'target-arrow-color': '#b0bec5',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
        },
      },
    ],
    []
  )

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

  const StatCard = ({ title, value, subtitle, color = 'primary' }) => {
    const formattedValue =
      typeof value === 'number' ? value.toLocaleString() : value ?? '-'
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" color={color}>
            {formattedValue}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    )
  }
  const getHeatColor = (value) => {
    if (!value) return 'rgba(148, 163, 184, 0.25)'
    const normalized = Math.min(1, value / maxMatrixValue)
    const alpha = 0.25 + normalized * 0.65
    return `rgba(25, 118, 210, ${alpha})`
  }

  const CytoscapeGraph = ({ elements, stylesheet }) => {
    const containerRef = useRef(null)

    useEffect(() => {
      if (!containerRef.current || !elements?.length) return undefined
      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: stylesheet,
        layout: { name: 'cose', animate: false },
      })
      return () => cy.destroy()
    }, [elements, stylesheet])

    return <Box ref={containerRef} sx={{ width: '100%', height: 420 }} />
  }

  const statsGridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: { xs: 2, md: 3 },
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Box sx={panelStyle}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Box sx={statsGridStyles}>
            <StatCard
              title="Total Groups"
              value={stats.total_groups}
              subtitle={`${stats.documented_groups} documented, ${stats.undocumented_groups} undocumented`}
            />
            <StatCard title="Total Users" value={stats.total_users} />
            <StatCard
              title="Role Assignments"
              value={stats.total_memberships ?? 0}
              subtitle={`Avg ${stats.avg_groups_per_user ?? 0} groups per user`}
            />
            <StatCard
              title="Compliance"
              value={`${stats.compliance_percentage}%`}
              subtitle={`${stats.follows_naming_convention} groups follow naming convention`}
              color={stats.compliance_percentage >= 80 ? 'success' : 'warning'}
            />
            <StatCard
              title="Undocumented Exposure"
              value={stats.undocumented_memberships ?? 0}
              subtitle={`${stats.users_with_undocumented_groups ?? 0} users / ${stats.active_undocumented_groups ?? 0} groups`}
              color="error"
            />
          </Box>

          <Grid container spacing={{ xs: 2, md: 3, xl: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Documentation Status
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {stats.documented_groups} documented / {stats.total_groups} total
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={((stats.documented_groups || 0) / (stats.total_groups || 1)) * 100}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Undocumented Groups
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {stats.undocumented_groups}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Status Breakdown
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Manual statuses captured across your synced groups.
                  </Typography>
                  {statusBreakdown.length > 0 ? (
                    <Stack spacing={1}>
                      {statusBreakdown.map((item) => (
                        <Box key={item.status} sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">{item.status}</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {item.count}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(item.count / (stats.total_groups || 1)) * 100}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No status data captured yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Assignment Density
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: 32, fontWeight: 600 }}>
                    {stats.avg_groups_per_user ?? 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    heavy user threshold&nbsp;
                    <strong>{stats.heavy_user_threshold || 0}</strong> groups
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    total memberships:&nbsp;
                    <strong>{(stats.total_memberships || 0).toLocaleString()}</strong>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={7}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Module Distribution
                  </Typography>
                  {moduleSummary.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={moduleSummary} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                        <XAxis dataKey="module" angle={-20} textAnchor="end" interval={0} height={60} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="user_count" radius={[4, 4, 0, 0]}>
                          {moduleSummary.map((entry, index) => (
                            <Cell key={`cell-${entry.module}-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Module-level statistics are unavailable until more assignments are synced.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Matrix Snapshot
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Quick view of the busiest department ↔ group combos.
                  </Typography>
                  {topMatrixDepartments.length > 0 ? (
                    <Stack spacing={2}>
                      {topMatrixDepartments.map(([dept, combos]) => {
                        const sortedCombos = [...combos].sort(
                          (a, b) => (b.user_count || 0) - (a.user_count || 0)
                        )
                        return (
                          <Box key={dept}>
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                              {dept}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                              {sortedCombos.slice(0, 4).map((combo) => (
                                <Box
                                  key={`${dept}-${combo.group}`}
                                  sx={{
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 1.5,
                                    backgroundColor: getHeatColor(combo.user_count),
                                    color: '#fff',
                                    minWidth: 140,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {combo.group}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {combo.user_count} users
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No department/group data available yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    High-Risk Users
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                    Heaviest access footprints or undocumented assignments (threshold:{' '}
                    {stats.heavy_user_threshold || 0} groups).
                  </Typography>
                  {userRiskRows.length > 0 ? (
                    <ConfigurableDataGrid
                      storageKey="dashboard-user-risks"
                      columns={userRiskColumns}
                      rows={userRiskRows}
                      height={360}
                      hideFooter
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No risk signals yet. Sync data to populate this view.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    High-Impact Groups
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                    Groups with the most users or outstanding documentation tasks.
                  </Typography>
                  {groupRiskRows.length > 0 ? (
                    <ConfigurableDataGrid
                      storageKey="dashboard-group-risks"
                      columns={groupRiskColumns}
                      rows={groupRiskRows}
                      height={360}
                      hideFooter
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No high-impact groups identified.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk & Inheritance Highlights
                  </Typography>
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Typography variant="body1">
                      Groups without users: <strong>{stats.groups_without_users || 0}</strong>
                    </Typography>
                    {stats.orphaned_group_samples && stats.orphaned_group_samples.length > 0 && (
                      <Typography variant="caption" color="textSecondary">
                        Examples: {stats.orphaned_group_samples.map((g) => g.name).join(', ')}
                      </Typography>
                    )}
                  </Box>
                  {inheritanceRows.length > 0 ? (
                    <ConfigurableDataGrid
                      storageKey="dashboard-inheritance"
                      columns={inheritanceColumns}
                      rows={inheritanceRows}
                      height={360}
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No inheritance data captured yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Group Relationship Map
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Explore inherited access paths for the most connected groups.
                  </Typography>
                  {inheritanceGraphElements.length > 0 ? (
                    <CytoscapeGraph
                      elements={inheritanceGraphElements}
                      stylesheet={cytoscapeStyles}
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Relationship data will appear once inheritance links are synced.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </Box>
  )
}

export default Dashboard

