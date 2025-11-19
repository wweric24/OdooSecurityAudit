import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Tabs,
  Tab,
  CssBaseline,
  ThemeProvider,
  createTheme
} from '@mui/material'
import Dashboard from './components/Dashboard'
import Groups from './components/Groups'
import GroupDetail from './components/GroupDetail'
import Users from './components/Users'
import UserDetail from './components/UserDetail'
import Analysis from './components/Analysis'
import Data from './components/Data'
import Comparison from './components/Comparison'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f6f8fb',
    },
  },
})

const tabs = [
  { label: 'Dashboard', path: '/' },
  { label: 'Groups', path: '/groups' },
  { label: 'Users', path: '/users' },
  { label: 'Comparison', path: '/comparison' },
  { label: 'Analysis', path: '/analysis' },
  { label: 'Data', path: '/data' },
]

function AppLayout() {
  const location = useLocation()
  const [currentTab, setCurrentTab] = useState(0)
  const contentContainerSx = {
    width: '100%',
    maxWidth: '1600px',
    px: { xs: 2, sm: 3, lg: 4, xl: 6 },
  }

  useEffect(() => {
    const matchIndex = tabs.findIndex((tab) =>
      tab.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(tab.path)
    )
    setCurrentTab(matchIndex === -1 ? 0 : matchIndex)
  }, [location.pathname])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Odoo Security Management
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#fff' }}>
        <Container maxWidth={false} sx={contentContainerSx}>
          <Tabs value={currentTab} onChange={(event, value) => setCurrentTab(value)}>
            {tabs.map((tab) => (
              <Tab key={tab.path} label={tab.label} component={Link} to={tab.path} />
            ))}
          </Tabs>
        </Container>
      </Box>

      <Container
        maxWidth={false}
        sx={{ flexGrow: 1, py: { xs: 2, md: 4 }, ...contentContainerSx }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/data" element={<Data />} />
          <Route path="/import" element={<Data />} />
        </Routes>
      </Container>
    </Box>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout />
      </Router>
    </ThemeProvider>
  )
}

export default App

