import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Chip, Card, CardContent,
  Button, Skeleton, Alert, Tabs, Tab, Menu, MenuItem, Stack,
} from '@mui/material';
import { Search, Send, MenuBook, FitnessCenter, Schedule } from '@mui/icons-material';
import { useTherapistBridge } from '../../../../contexts/TherapistClientBridgeContext';
import { ModuleForAssignment, InterventionForAssignment } from '../../../../types/therapistClientBridge';
import EmptyState from '../shared/EmptyState';

interface ContentPanelProps {
  clientId: string;
  onAssignHomework: (moduleId?: string) => void;
  onAssignIntervention: (interventionId?: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  COGNITIVE: '#e8f0fe', EMOTIONAL: '#fce8e6', BEHAVIORAL: '#e6f4ea', TRAUMA: '#fef7e0', GENERAL: '#f1f3f4',
};
const CATEGORY_TEXT: Record<string, string> = {
  COGNITIVE: '#0b57d0', EMOTIONAL: '#b3261e', BEHAVIORAL: '#128937', TRAUMA: '#b16300', GENERAL: '#5f6368',
};
const TYPE_LABEL: Record<string, string> = {
  BREATHWORK: 'Breathwork', GROUNDING: 'Grounding', COGNITIVE: 'Cognitive', EXPOSURE: 'Exposure',
  MINDFULNESS: 'Mindfulness', BODY_AWARENESS: 'Body', SOUND: 'Sound', METACOGNITIVE: 'Meta', MOVEMENT: 'Movement',
};

function ModuleCard({ mod, onSend }: { mod: ModuleForAssignment; onSend: (id: string) => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  return (
    <Card
      sx={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 1 }}>{mod.title}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={1}>
              <Chip label={mod.category} size="small" sx={{ bgcolor: CATEGORY_COLORS[mod.category] ?? '#f1f3f4', color: CATEGORY_TEXT[mod.category] ?? '#5f6368' }} />
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">{mod.estimatedMinutes} min</Typography>
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{mod.summary}</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {mod.tags.slice(0, 3).map(t => <Chip key={t} label={t} size="small" variant="outlined" />)}
            </Stack>
          </Box>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={e => setAnchorEl(e.currentTarget)}
            sx={{ borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Send
          </Button>
        </Stack>
      </CardContent>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { onSend(mod.id); setAnchorEl(null); }}>
          <MenuBook fontSize="small" sx={{ mr: 1 }} /> Assign as homework
        </MenuItem>
      </Menu>
    </Card>
  );
}

function InterventionCard({ tool, onSend }: { tool: InterventionForAssignment; onSend: (id: string) => void }) {
  const durMin = tool.durationSeconds ? Math.round(tool.durationSeconds / 60) : null;
  return (
    <Card
      sx={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 1 }}>{tool.title}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={1}>
              <Chip label={TYPE_LABEL[tool.type] ?? tool.type} size="small" variant="outlined" />
              {durMin && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Schedule fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">{durMin} min</Typography>
                </Stack>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">{tool.description}</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={() => onSend(tool.id)}
            sx={{ borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Assign
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

const ContentPanel: React.FC<ContentPanelProps> = ({ clientId, onAssignHomework, onAssignIntervention }) => {
  const bridge = useTherapistBridge();
  const [modules, setModules] = useState<ModuleForAssignment[]>([]);
  const [tools, setTools] = useState<InterventionForAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([bridge.listModulesForAssignment(), bridge.listInterventionsForAssignment()])
      .then(([m, t]) => { setModules(m); setTools(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  const q = query.toLowerCase();
  const filteredModules = modules.filter(m =>
    !q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q))
  );
  const filteredTools = tools.filter(t =>
    !q || t.title.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  );

  if (loading) return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={100} />)}</Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>Could not load content: {error}</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Send module to client</Typography>
        <Typography variant="body1" color="text.secondary">
          Search the library and assign a module or tool directly to this client's portal.
        </Typography>
      </Box>

      <TextField
        placeholder="Search modules or tools…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ maxWidth: 480 }}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
        borderBottom: '1px solid #e0e0e0',
        '& .MuiTab-root': { textTransform: 'none', fontSize: '14px', fontWeight: 500 },
        '& .Mui-selected': { fontWeight: 700 },
      }}>
        <Tab label={`Modules (${filteredModules.length})`} />
        <Tab label={`Tools (${filteredTools.length})`} />
      </Tabs>

      <Stack spacing={2}>
        {tab === 0 && (
          filteredModules.length === 0
            ? <EmptyState icon={<MenuBook />} title="No modules match" description='Try a different search term.' />
            : filteredModules.map(m => <ModuleCard key={m.id} mod={m} onSend={id => onAssignHomework(id)} />)
        )}
        {tab === 1 && (
          filteredTools.length === 0
            ? <EmptyState icon={<FitnessCenter />} title="No tools match" description='Try a different search term.' />
            : filteredTools.map(t => <InterventionCard key={t.id} tool={t} onSend={id => onAssignIntervention(id)} />)
        )}
      </Stack>
    </Box>
  );
};

export default ContentPanel;
