import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
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
import Analysis from './components/Analysis'
import Import from './components/Import'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App() {
  const [currentTab, setCurrentTab] = useState(0)

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Odoo Security Management
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Container>
              <Tabs value={currentTab} onChange={handleTabChange}>
                <Tab label="Dashboard" component={Link} to="/" />
                <Tab label="Groups" component={Link} to="/groups" />
                <Tab label="Users" component={Link} to="/users" />
                <Tab label="Analysis" component={Link} to="/analysis" />
                <Tab label="Import" component={Link} to="/import" />
              </Tabs>
            </Container>
          </Box>

          <Container sx={{ flexGrow: 1, py: 3 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/users" element={<Users />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/import" element={<Import />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App

