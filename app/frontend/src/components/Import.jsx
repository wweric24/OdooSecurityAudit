import React, { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { Upload as UploadIcon } from '@mui/icons-material'
import { api } from '../api/client'

function Import() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    try {
      setUploading(true)
      setError(null)
      const response = await api.importCSV(file)
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Import CSV
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Odoo Security Groups Export
          </Typography>

          <Box sx={{ mt: 3, mb: 3 }}>
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="csv-file-input"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="csv-file-input">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                disabled={uploading}
              >
                Select CSV File
              </Button>
            </label>
            {file && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {file.name}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            sx={{ mt: 2 }}
          >
            {uploading ? 'Uploading...' : 'Upload and Process'}
          </Button>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Import completed successfully!
              </Alert>

              <Typography variant="h6" gutterBottom>
                Import Summary
              </Typography>

              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Groups Imported</TableCell>
                      <TableCell align="right">{result.groups_imported}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Groups Created</TableCell>
                      <TableCell align="right">{result.groups_created}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Users Created</TableCell>
                      <TableCell align="right">{result.users_created}</TableCell>
                    </TableRow>
                    {result.validation && (
                      <>
                        <TableRow>
                          <TableCell>Follows Naming Convention</TableCell>
                          <TableCell align="right">
                            {result.validation.statistics.follows_naming_convention}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Has Purpose</TableCell>
                          <TableCell align="right">
                            {result.validation.statistics.has_purpose}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Has Users</TableCell>
                          <TableCell align="right">
                            {result.validation.statistics.has_users}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {result.validation?.errors?.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Errors Found:
                  </Typography>
                  <ul>
                    {result.validation.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {result.validation?.warnings?.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Warnings:
                  </Typography>
                  <ul>
                    {result.validation.warnings.slice(0, 10).map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default Import

