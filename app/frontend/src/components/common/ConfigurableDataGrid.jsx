import React, { useMemo, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
  Box,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  TextField,
  Typography,
  Divider,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  FileDownload as FileDownloadIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material'
import { DataGrid, useGridApiRef } from '@mui/x-data-grid'

const storageKeyFor = (base, suffix) => (base ? `table:${base}:${suffix}` : null)

const toGridRowSelectionModel = (value) => {
  if (value == null) {
    return { type: 'include', ids: new Set() }
  }
  if (Array.isArray(value)) {
    return { type: 'include', ids: new Set(value) }
  }
  if (value instanceof Set) {
    return { type: 'include', ids: new Set(value) }
  }
  if (typeof value === 'object' && 'ids' in value) {
    const idsValue =
      value.ids instanceof Set ? new Set(value.ids) : new Set(Array.from(value.ids || []))
    return { type: value.type === 'exclude' ? 'exclude' : 'include', ids: idsValue }
  }
  return { type: 'include', ids: new Set() }
}

const gridSelectionModelFormat = (value) => {
  if (Array.isArray(value)) return 'array'
  if (value instanceof Set) return 'set'
  if (value && typeof value === 'object' && 'ids' in value) return 'grid'
  return null
}

const readSetting = (storageKey, suffix, fallback) => {
  const key = storageKeyFor(storageKey, suffix)
  if (!key || typeof window === 'undefined') {
    return fallback
  }
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const ConfigurableDataGrid = ({
  storageKey,
  columns,
  rows = [],
  loading = false,
  height = 560,
  actions = null,
  density = 'standard',
  ...dataGridProps
}) => {
  const {
    checkboxSelection,
    onColumnVisibilityModelChange: externalVisibilityChange,
    onColumnOrderChange: externalOrderChange,
    componentsProps,
    slotProps,
    pagination: paginationProp,
    paginationModel,
    onPaginationModelChange,
    pageSizeOptions,
    hideFooter: hideFooterProp,
    rowSelectionModel,
    onRowSelectionModelChange,
    ...restDataGridProps
  } = dataGridProps
  const apiRef = useGridApiRef()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickFilter, setQuickFilter] = useState(() =>
    readSetting(storageKey, 'quickFilter', '')
  )
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() =>
    readSetting(storageKey, 'visibility', {})
  )
  const [columnOrder, setColumnOrder] = useState(() =>
    readSetting(storageKey, 'order', null)
  )
  const [draggingField, setDraggingField] = useState(null)

  useEffect(() => {
    if (!columnOrder) return
    const currentFields = columns.map((col) => col.field)
    const missing = currentFields.filter((field) => !columnOrder.includes(field))
    if (missing.length > 0) {
      setColumnOrder([...columnOrder, ...missing])
    }
  }, [columns, columnOrder])

  useEffect(() => {
    if (apiRef.current && typeof quickFilter === 'string') {
      apiRef.current.setQuickFilterValues(
        quickFilter.trim() ? [quickFilter.trim()] : []
      )
    }
  }, [quickFilter, apiRef])

  const orderedColumns = useMemo(() => {
    if (!columnOrder || columnOrder.length === 0) {
      return columns
    }
    const columnMap = new Map(columns.map((col) => [col.field, col]))
    const ordered = columnOrder
      .map((field) => columnMap.get(field))
      .filter(Boolean)
    columns.forEach((col) => {
      if (!columnOrder.includes(col.field)) {
        ordered.push(col)
      }
    })
    return ordered
  }, [columns, columnOrder])
  const orderedColumnFields = useMemo(
    () => orderedColumns.map((col) => col.field),
    [orderedColumns]
  )

  const checkboxSelectionEnabled = Boolean(checkboxSelection && rows.length)
  const hasControlledRowSelection =
    checkboxSelectionEnabled && rowSelectionModel !== undefined && rowSelectionModel !== null
  const selectionModelFormat = hasControlledRowSelection
    ? gridSelectionModelFormat(rowSelectionModel)
    : null
  const normalizedRowSelectionModel = useMemo(() => {
    if (!hasControlledRowSelection) return undefined
    return toGridRowSelectionModel(rowSelectionModel)
  }, [hasControlledRowSelection, rowSelectionModel])
  const handleRowSelectionModelChange = useCallback(
    (model, details) => {
      if (typeof onRowSelectionModelChange !== 'function') return
      if (selectionModelFormat === 'array') {
        onRowSelectionModelChange(Array.from(model?.ids ?? []), details)
      } else if (selectionModelFormat === 'set') {
        onRowSelectionModelChange(new Set(model?.ids ?? []), details)
      } else {
        onRowSelectionModelChange(model, details)
      }
    },
    [onRowSelectionModelChange, selectionModelFormat]
  )
  const rowSelectionProps =
    checkboxSelectionEnabled && typeof onRowSelectionModelChange === 'function'
      ? hasControlledRowSelection
        ? {
            rowSelectionModel: normalizedRowSelectionModel,
            onRowSelectionModelChange: handleRowSelectionModelChange,
          }
        : { onRowSelectionModelChange }
      : hasControlledRowSelection
      ? { rowSelectionModel: normalizedRowSelectionModel }
      : {}

  const persistSetting = (suffix, value) => {
    const key = storageKeyFor(storageKey, suffix)
    if (!key || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* no-op */
    }
  }

  const applyColumnOrder = (nextOrder) => {
    setColumnOrder(nextOrder)
    persistSetting('order', nextOrder)
  }

  const handleExport = () => {
    if (!apiRef.current) return
    apiRef.current.exportDataAsCsv({
      fileName: `${storageKey || 'table-export'}-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}`,
    })
  }

  const handleColumnVisibilityChange = (model, details) => {
    setColumnVisibilityModel(model)
    persistSetting('visibility', model)
    if (typeof externalVisibilityChange === 'function') {
      externalVisibilityChange(model, details)
    }
  }

  const refreshColumnOrderSnapshot = () => {
    if (!apiRef.current) return
    const orderedFields = apiRef.current.getAllColumns().map((col) => col.field)
    applyColumnOrder(orderedFields)
  }

  const handleColumnOrderChange = (params, event, details) => {
    refreshColumnOrderSnapshot()
    if (typeof externalOrderChange === 'function') {
      externalOrderChange(params, event, details)
    }
  }

  const reorderColumnsByFields = (sourceField, targetField = null, dropAfter = false) => {
    if (!sourceField) return
    const baseOrder = [...orderedColumnFields]
    if (!baseOrder.length) return
    const fromIndex = baseOrder.indexOf(sourceField)
    if (fromIndex === -1) return
    const [moved] = baseOrder.splice(fromIndex, 1)
    if (targetField) {
      let targetIndex = baseOrder.indexOf(targetField)
      if (targetIndex === -1) {
        baseOrder.push(moved)
      } else {
        if (dropAfter) {
          targetIndex += 1
        }
        baseOrder.splice(targetIndex, 0, moved)
      }
    } else {
      baseOrder.push(moved)
    }
    applyColumnOrder(baseOrder)
  }

  const handleDragStart = (field) => (event) => {
    setDraggingField(field)
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', field)
    }
  }

  const handleDragEnd = () => {
    setDraggingField(null)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleColumnDrop = (field) => (event) => {
    event.preventDefault()
    if (!draggingField) return
    const rect = event.currentTarget.getBoundingClientRect()
    const pointerY = event.clientY ?? event.nativeEvent?.clientY ?? 0
    const dropAfter = pointerY - rect.top > rect.height / 2
    reorderColumnsByFields(draggingField, field, dropAfter)
    setDraggingField(null)
  }

  const handleDropToEnd = (event) => {
    event.preventDefault()
    if (!draggingField) return
    reorderColumnsByFields(draggingField, null, true)
    setDraggingField(null)
  }

  const isPaginationEnabled =
    paginationProp ?? Boolean(paginationModel || onPaginationModelChange || pageSizeOptions)

  const resolvedPageSizeOptions = pageSizeOptions || [25, 50, 100]
  const resolvedHideFooter =
    typeof hideFooterProp === 'boolean' ? hideFooterProp : !isPaginationEnabled

  const mergedComponentsProps = useMemo(() => {
    const base = { ...(componentsProps || {}) }
    base.footer = { ...(componentsProps?.footer || {}) }
    if (isPaginationEnabled) {
      base.pagination = { ...(componentsProps?.pagination || {}) }
    } else if (base.pagination) {
      delete base.pagination
    }
    return base
  }, [componentsProps, isPaginationEnabled])

  const mergedSlotProps = useMemo(() => {
    const base = { ...(slotProps || {}) }
    base.footer = { ...(slotProps?.footer || {}) }
    if (isPaginationEnabled) {
      const paginationSlot = { ...(slotProps?.pagination || {}) }
      if (!paginationSlot.size) {
        paginationSlot.size = 'medium'
      }
      base.pagination = paginationSlot
    } else if (base.pagination) {
      delete base.pagination
    }
    return base
  }, [slotProps, isPaginationEnabled])

  const handleQuickFilterChange = (event) => {
    const value = event.target.value
    setQuickFilter(value)
    persistSetting('quickFilter', value)
  }

  const handleToggleColumn = (field, checked) => {
    const nextModel = {
      ...columnVisibilityModel,
      [field]: checked,
    }
    setColumnVisibilityModel(nextModel)
    persistSetting('visibility', nextModel)
  }

  const handleResetView = () => {
    setColumnVisibilityModel({})
    setQuickFilter('')
    applyColumnOrder(columns.map((col) => col.field))
    persistSetting('visibility', {})
    persistSetting('quickFilter', '')
    if (apiRef.current) {
      apiRef.current.setQuickFilterValues([])
    }
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        {actions}
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsOpen(true)}
        >
          Configure Filters
        </Button>
      </Stack>
      <Box sx={{ height, width: '100%' }}>
        <DataGrid
          apiRef={apiRef}
          rows={rows}
          columns={orderedColumns}
          loading={loading}
    columnVisibilityModel={columnVisibilityModel}
    onColumnVisibilityModelChange={handleColumnVisibilityChange}
    onColumnOrderChange={handleColumnOrderChange}
          disableColumnReorder={false}
          disableColumnResize={false}
          density={density}
          hideFooter={resolvedHideFooter}
          {...(isPaginationEnabled
            ? {
                pagination: true,
                paginationModel,
                onPaginationModelChange,
                pageSizeOptions: resolvedPageSizeOptions,
              }
            : {})}
          checkboxSelection={checkboxSelectionEnabled}
          {...(checkboxSelectionEnabled ? rowSelectionProps : {})}
          componentsProps={mergedComponentsProps}
          slotProps={mergedSlotProps}
          {...restDataGridProps}
        />
      </Box>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure Table View</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Quick Filter
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Filter across all columns"
            value={quickFilter}
            onChange={handleQuickFilterChange}
          />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Columns (drag to reorder)
          </Typography>
          <Stack spacing={1}>
            {orderedColumns.map((column) => {
              const isDragging = draggingField === column.field
              return (
                <Box
                  key={column.field}
                  onDragOver={handleDragOver}
                  onDrop={handleColumnDrop(column.field)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    bgcolor: isDragging ? 'action.hover' : 'transparent',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'text.secondary',
                      cursor: 'grab',
                    }}
                    draggable
                    onDragStart={handleDragStart(column.field)}
                    onDragEnd={handleDragEnd}
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </Box>
                  <FormControlLabel
                    sx={{ flex: 1, m: 0 }}
                    control={
                      <Checkbox
                        checked={columnVisibilityModel[column.field] !== false}
                        onChange={(event) =>
                          handleToggleColumn(column.field, event.target.checked)
                        }
                      />
                    }
                    label={column.headerName || column.field}
                  />
                </Box>
              )
            })}
          </Stack>
          {orderedColumns.length > 0 && (
            <Box
              onDragOver={handleDragOver}
              onDrop={handleDropToEnd}
              sx={{
                mt: 1,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
                textAlign: 'center',
                fontSize: 12,
                color: 'text.secondary',
              }}
            >
              Drop here to move a column to the end
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetView}>Reset</Button>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

ConfigurableDataGrid.propTypes = {
  storageKey: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  rows: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  height: PropTypes.number,
  actions: PropTypes.node,
  density: PropTypes.oneOf(['compact', 'standard', 'comfortable']),
}

export default ConfigurableDataGrid
