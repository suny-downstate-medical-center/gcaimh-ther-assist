import React from 'react';
import {
  Stack, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, IconButton, Chip, Box,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import {
  SchedulingFilters as FiltersType, APPOINTMENT_TYPES, APPOINTMENT_STATUSES, MODALITIES,
  AppointmentType, AppointmentStatus, Modality,
} from './types';

interface Props {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
  compact?: boolean;
}

const SchedulingFiltersBar: React.FC<Props> = ({ filters, onChange, compact }) => {
  const set = (patch: Partial<FiltersType>) => onChange({ ...filters, ...patch });

  const activeCount = [
    filters.status !== 'all',
    filters.appointmentType !== 'all',
    filters.modality !== 'all',
    !!filters.dateFrom,
    !!filters.dateTo,
  ].filter(Boolean).length;

  return (
    <Stack spacing={compact ? 1.5 : 2}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Search patients or notes..."
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
          sx={{ minWidth: 220, flex: 1 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" color="action" /></InputAdornment>,
            endAdornment: filters.search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => set({ search: '' })}><Clear fontSize="small" /></IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={e => set({ status: e.target.value as AppointmentStatus | 'all' })}>
            <MenuItem value="all">All statuses</MenuItem>
            {APPOINTMENT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filters.appointmentType} label="Type" onChange={e => set({ appointmentType: e.target.value as AppointmentType | 'all' })}>
            <MenuItem value="all">All types</MenuItem>
            {APPOINTMENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Modality</InputLabel>
          <Select value={filters.modality} label="Modality" onChange={e => set({ modality: e.target.value as Modality | 'all' })}>
            <MenuItem value="all">All modes</MenuItem>
            {MODALITIES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>

        {!compact && (
          <>
            <TextField size="small" type="date" label="From" value={filters.dateFrom} onChange={e => set({ dateFrom: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
            <TextField size="small" type="date" label="To" value={filters.dateTo} onChange={e => set({ dateTo: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
          </>
        )}
      </Stack>

      {activeCount > 0 && (
        <Box>
          <Chip
            label={`${activeCount} filter${activeCount > 1 ? 's' : ''} active`}
            size="small"
            onDelete={() => onChange({ search: filters.search, status: 'all', appointmentType: 'all', modality: 'all', dateFrom: '', dateTo: '' })}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}
    </Stack>
  );
};

export default SchedulingFiltersBar;
