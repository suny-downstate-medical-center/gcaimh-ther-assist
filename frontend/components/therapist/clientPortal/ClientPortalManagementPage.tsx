/**
 * ClientPortalManagementPage — Therapist ↔ Client Portal Bridge
 *
 * Feature flag : THERAPIST_CLIENT_PORTAL_BRIDGE  (utils/featureFlags.ts)
 * Access        : Patient detail view → "Client Portal" button
 * Mock          : TherapistClientBridgeMockProvider  (no backend required)
 * Mocked        : All data (homework, interventions, outcomes, publish state, activity log)
 *
 * Tabs: Plan | Outcomes | Publish | Content | Activity
 * Default tab  : Plan
 */

import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Chip, Drawer,
  TextField, Select, MenuItem as MuiMenuItem, FormControl, InputLabel,
  Button, Alert, Skeleton, Divider, FormHelperText,
  Autocomplete, Stack,
} from '@mui/material';
import {
  ArrowBack, Assignment, Assessment, Publish, LibraryBooks, History, Add, Quiz,
} from '@mui/icons-material';
import { useTherapistBridge, TherapistClientBridgeProviderWrapper } from '../../../contexts/TherapistClientBridgeContext';
import { BridgeClient, ModuleForAssignment, InterventionForAssignment, InterventionFrequency, QuestionnaireDefinition, QuestionnaireCadence } from '../../../types/therapistClientBridge';
import PlanPanel from './panels/PlanPanel';
import OutcomesPanel from './panels/OutcomesPanel';
import PublishPanel from './panels/PublishPanel';
import ContentPanel from './panels/ContentPanel';
import ActivityPanel from './panels/ActivityPanel';
import QuestionnairesPanel from './panels/QuestionnairesPanel';

// ---------------------------------------------------------------------------
// Sub-components: Assign drawers
// ---------------------------------------------------------------------------

interface AssignHomeworkDrawerProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  preselectedModuleId?: string;
  onSuccess: () => void;
}

function AssignHomeworkDrawer({ open, onClose, clientId, preselectedModuleId, onSuccess }: AssignHomeworkDrawerProps) {
  const bridge = useTherapistBridge();
  const [modules, setModules] = useState<ModuleForAssignment[]>([]);
  const [selected, setSelected] = useState<ModuleForAssignment | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      bridge.listModulesForAssignment().then(m => {
        setModules(m);
        if (preselectedModuleId) {
          const mod = m.find(x => x.id === preselectedModuleId) ?? null;
          setSelected(mod);
        } else {
          setSelected(null);
        }
        setDueAt('');
        setNote('');
        setError(null);
      });
    }
  }, [open, preselectedModuleId]);

  const handleSubmit = async () => {
    if (!selected) { setError('Please select a module.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await bridge.upsertHomework(clientId, {
        moduleId: selected.id,
        moduleTitle: selected.title,
        moduleCategory: selected.category,
        estimatedMinutes: selected.estimatedMinutes,
        dueAt: dueAt || undefined,
        status: 'ASSIGNED',
        note: note || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: { xs: 2, md: 3 } } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>Assign Homework</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Select a psychoeducation module for the client to review between sessions.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Autocomplete
        options={modules}
        getOptionLabel={m => m.title}
        value={selected}
        onChange={(_, v) => setSelected(v)}
        renderOption={(props, m) => (
          <li {...props} key={m.id}>
            <Box>
              <Typography sx={{ fontSize: '14px' }}>{m.title}</Typography>
              <Typography variant="caption" color="text.secondary">{m.category} · {m.estimatedMinutes} min</Typography>
            </Box>
          </li>
        )}
        renderInput={params => (
          <TextField {...params} label="Module" size="small" placeholder="Search modules…" />
        )}
        sx={{ mb: 2.5 }}
      />

      {selected && (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '13px' }}>{selected.summary}</Alert>
      )}

      <TextField
        label="Due date (optional)"
        type="date"
        size="small"
        value={dueAt}
        onChange={e => setDueAt(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 2.5 }}
        fullWidth
      />

      <TextField
        label="Note to client (optional)"
        multiline
        rows={2}
        size="small"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="e.g. Focus on work-related scenarios…"
        sx={{ mb: 3 }}
        fullWidth
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button fullWidth variant="outlined" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button fullWidth variant="contained" onClick={handleSubmit} disabled={submitting || !selected}
          sx={{ background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)' }}>
          {submitting ? 'Assigning…' : 'Assign homework'}
        </Button>
      </Box>
    </Drawer>
  );
}

interface AssignInterventionDrawerProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  preselectedInterventionId?: string;
  onSuccess: () => void;
}

function AssignInterventionDrawer({ open, onClose, clientId, preselectedInterventionId, onSuccess }: AssignInterventionDrawerProps) {
  const bridge = useTherapistBridge();
  const [tools, setTools] = useState<InterventionForAssignment[]>([]);
  const [selected, setSelected] = useState<InterventionForAssignment | null>(null);
  const [frequency, setFrequency] = useState<InterventionFrequency | ''>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      bridge.listInterventionsForAssignment().then(t => {
        setTools(t);
        if (preselectedInterventionId) {
          const tool = t.find(x => x.id === preselectedInterventionId) ?? null;
          setSelected(tool);
        } else {
          setSelected(null);
        }
        setFrequency('');
        setNote('');
        setError(null);
      });
    }
  }, [open, preselectedInterventionId]);

  const handleSubmit = async () => {
    if (!selected) { setError('Please select a tool.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await bridge.assignIntervention(clientId, {
        interventionId: selected.id,
        interventionTitle: selected.title,
        interventionType: selected.type,
        frequency: frequency || undefined,
        status: 'ACTIVE',
        note: note || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: { xs: 2, md: 3 } } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>Assign Tool / Intervention</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Select a therapeutic tool for the client to practice between sessions.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Autocomplete
        options={tools}
        getOptionLabel={t => t.title}
        value={selected}
        onChange={(_, v) => setSelected(v)}
        renderOption={(props, t) => (
          <li {...props} key={t.id}>
            <Box>
              <Typography sx={{ fontSize: '14px' }}>{t.title}</Typography>
              <Typography variant="caption" color="text.secondary">{t.type}</Typography>
            </Box>
          </li>
        )}
        renderInput={params => (
          <TextField {...params} label="Tool / Intervention" size="small" placeholder="Search tools…" />
        )}
        sx={{ mb: 2.5 }}
      />

      {selected && (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '13px' }}>{selected.description}</Alert>
      )}

      <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
        <InputLabel>Frequency (optional)</InputLabel>
        <Select
          value={frequency}
          label="Frequency (optional)"
          onChange={e => setFrequency(e.target.value as InterventionFrequency | '')}
        >
          <MuiMenuItem value=""><em>Not specified</em></MuiMenuItem>
          <MuiMenuItem value="DAILY">Daily</MuiMenuItem>
          <MuiMenuItem value="TWICE_DAILY">Twice daily</MuiMenuItem>
          <MuiMenuItem value="WEEKLY">Weekly</MuiMenuItem>
          <MuiMenuItem value="AS_NEEDED">As needed</MuiMenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Note to client (optional)"
        multiline
        rows={2}
        size="small"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="e.g. Use before bed to reduce tension…"
        sx={{ mb: 3 }}
        fullWidth
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button fullWidth variant="outlined" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button fullWidth variant="contained" onClick={handleSubmit} disabled={submitting || !selected}
          sx={{ background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)' }}>
          {submitting ? 'Assigning…' : 'Assign tool'}
        </Button>
      </Box>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Assign questionnaire drawer
// ---------------------------------------------------------------------------

interface AssignQuestionnaireDrawerProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

function AssignQuestionnaireDrawer({ open, onClose, clientId, onSuccess }: AssignQuestionnaireDrawerProps) {
  const bridge = useTherapistBridge();
  const [definitions, setDefinitions] = useState<QuestionnaireDefinition[]>([]);
  const [selected, setSelected] = useState<QuestionnaireDefinition | null>(null);
  const [cadence, setCadence] = useState<QuestionnaireCadence | ''>('WEEKLY');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      bridge.listQuestionnaireDefinitions().then(d => {
        setDefinitions(d);
        setSelected(null);
        setCadence('WEEKLY');
        setNote('');
        setError(null);
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selected) { setError('Please select a questionnaire.'); return; }
    if (!cadence) { setError('Please select a cadence.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await bridge.assignQuestionnaire(clientId, {
        questionnaireId: selected.id,
        cadence: cadence as QuestionnaireCadence,
        note: note || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: { xs: 2, md: 3 } } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>Assign Questionnaire</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Select a standardized measure to track client progress over time.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Autocomplete
        options={definitions}
        getOptionLabel={d => `${d.shortName} — ${d.name}`}
        value={selected}
        onChange={(_, v) => setSelected(v)}
        renderOption={(props, d) => (
          <li {...props} key={d.id}>
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{d.shortName}</Typography>
              <Typography variant="caption" color="text.secondary">{d.name} · {d.itemCount} items · ~{d.estimatedMinutes} min</Typography>
            </Box>
          </li>
        )}
        renderInput={params => (
          <TextField {...params} label="Questionnaire" size="small" placeholder="Search measures…" />
        )}
        sx={{ mb: 2.5 }}
      />

      {selected && (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '13px' }}>
          {selected.description}
          <br />
          <strong>Max score:</strong> {selected.maxScore} · <strong>Category:</strong> {selected.category}
        </Alert>
      )}

      <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
        <InputLabel>Cadence</InputLabel>
        <Select
          value={cadence}
          label="Cadence"
          onChange={e => setCadence(e.target.value as QuestionnaireCadence | '')}
        >
          <MuiMenuItem value="WEEKLY">Weekly</MuiMenuItem>
          <MuiMenuItem value="BIWEEKLY">Every 2 weeks</MuiMenuItem>
          <MuiMenuItem value="MONTHLY">Monthly</MuiMenuItem>
          <MuiMenuItem value="SESSION">Each session</MuiMenuItem>
        </Select>
        <FormHelperText>How often the client should complete this measure</FormHelperText>
      </FormControl>

      <TextField
        label="Note (optional)"
        multiline
        rows={2}
        size="small"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="e.g. Focus on anxiety symptoms before social events…"
        sx={{ mb: 3 }}
        fullWidth
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button fullWidth variant="outlined" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button fullWidth variant="contained" onClick={handleSubmit} disabled={submitting || !selected || !cadence}
          sx={{ background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)' }}>
          {submitting ? 'Assigning…' : 'Assign questionnaire'}
        </Button>
      </Box>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Main page inner (needs context)
// ---------------------------------------------------------------------------

interface PageInnerProps {
  clientId: string;
  clientName?: string;
  onNavigateBack: () => void;
}

const STATUS_CHIP: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success', paused: 'warning', inactive: 'error',
};

function PageInner({ clientId, clientName, onNavigateBack }: PageInnerProps) {
  const bridge = useTherapistBridge();
  const [client, setClient] = useState<BridgeClient | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [tab, setTab] = useState(0);
  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  // Drawer state
  const [homeworkDrawerOpen, setHomeworkDrawerOpen] = useState(false);
  const [homeworkPreselect, setHomeworkPreselect] = useState<string | undefined>();
  const [interventionDrawerOpen, setInterventionDrawerOpen] = useState(false);
  const [interventionPreselect, setInterventionPreselect] = useState<string | undefined>();
  const [questionnaireDrawerOpen, setQuestionnaireDrawerOpen] = useState(false);
  const [questionnaireRefreshKey, setQuestionnaireRefreshKey] = useState(0);

  useEffect(() => {
    bridge.listClients()
      .then(clients => setClient(clients.find(c => c.id === clientId) ?? null))
      .finally(() => setLoadingClient(false));
  }, [clientId]);

  const handlePlanRefresh = () => {
    setPlanRefreshKey(k => k + 1);
    setActivityRefreshKey(k => k + 1);
  };

  const handleQuestionnaireRefresh = () => {
    setQuestionnaireRefreshKey(k => k + 1);
    setActivityRefreshKey(k => k + 1);
  };

  const openAssignQuestionnaire = () => {
    setQuestionnaireDrawerOpen(true);
  };

  const openAssignHomework = (moduleId?: string) => {
    setHomeworkPreselect(moduleId);
    setHomeworkDrawerOpen(true);
    setTab(0); // switch to plan
  };

  const openAssignIntervention = (interventionId?: string) => {
    setInterventionPreselect(interventionId);
    setInterventionDrawerOpen(true);
    setTab(0);
  };

  const TABS = [
    { label: 'Plan',            icon: <Assignment sx={{ fontSize: 16 }} /> },
    { label: 'Questionnaires',  icon: <Quiz sx={{ fontSize: 16 }} /> },
    { label: 'Outcomes',        icon: <Assessment sx={{ fontSize: 16 }} /> },
    { label: 'Publish',         icon: <Publish sx={{ fontSize: 16 }} /> },
    { label: 'Content',         icon: <LibraryBooks sx={{ fontSize: 16 }} /> },
    { label: 'Activity',        icon: <History sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background-gradient)' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 }, gap: 3, maxWidth: 1200, mx: 'auto', width: '100%' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={onNavigateBack}
            sx={{ color: '#0b57d0', textTransform: 'none', fontWeight: 500 }}
          >
            Back
          </Button>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {loadingClient ? (
              <Skeleton variant="text" width={200} height={40} />
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {client?.name ?? clientName ?? 'Client'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
                  {client?.status && (
                    <Chip
                      label={client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      size="small"
                      color={STATUS_CHIP[client.status] ?? 'default'}
                    />
                  )}
                  {client?.primaryConcern && (
                    <Typography variant="body1" color="text.secondary">
                      {client.primaryConcern}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Between-session plan management
                  </Typography>
                </Stack>
              </>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => openAssignHomework()}
            sx={{
              borderRadius: 2,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
              py: 1.25,
              px: 3,
              fontWeight: 600,
            }}
          >
            Assign homework
          </Button>
        </Box>

        {/* Tab bar */}
        <Card sx={{ borderRadius: 3, overflow: 'visible' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              '& .MuiTab-root': { minHeight: 56, fontSize: '14px', textTransform: 'none', fontWeight: 500 },
              '& .Mui-selected': { color: '#0b57d0', fontWeight: 700 },
              '& .MuiTabs-indicator': { backgroundColor: '#0b57d0', height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            {TABS.map(t => (
              <Tab key={t.label} label={t.label} icon={t.icon} iconPosition="start" sx={{ gap: 1 }} />
            ))}
          </Tabs>
        </Card>

        {/* Panel area */}
        <Card sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, flex: 1 }}>
          {tab === 0 && (
            <PlanPanel
              clientId={clientId}
              onAssignHomework={() => openAssignHomework()}
              onAssignIntervention={() => openAssignIntervention()}
              refreshKey={planRefreshKey}
            />
          )}
          {tab === 1 && (
            <QuestionnairesPanel
              clientId={clientId}
              onAssignQuestionnaire={openAssignQuestionnaire}
              refreshKey={questionnaireRefreshKey}
            />
          )}
          {tab === 2 && <OutcomesPanel clientId={clientId} />}
          {tab === 3 && <PublishPanel clientId={clientId} />}
          {tab === 4 && (
            <ContentPanel
              clientId={clientId}
              onAssignHomework={id => openAssignHomework(id)}
              onAssignIntervention={id => openAssignIntervention(id)}
            />
          )}
          {tab === 5 && <ActivityPanel clientId={clientId} refreshKey={activityRefreshKey} />}
        </Card>
      </Box>

      {/* Assign homework drawer */}
      <AssignHomeworkDrawer
        open={homeworkDrawerOpen}
        onClose={() => setHomeworkDrawerOpen(false)}
        clientId={clientId}
        preselectedModuleId={homeworkPreselect}
        onSuccess={handlePlanRefresh}
      />

      {/* Assign intervention drawer */}
      <AssignInterventionDrawer
        open={interventionDrawerOpen}
        onClose={() => setInterventionDrawerOpen(false)}
        clientId={clientId}
        preselectedInterventionId={interventionPreselect}
        onSuccess={handlePlanRefresh}
      />

      {/* Assign questionnaire drawer */}
      <AssignQuestionnaireDrawer
        open={questionnaireDrawerOpen}
        onClose={() => setQuestionnaireDrawerOpen(false)}
        clientId={clientId}
        onSuccess={handleQuestionnaireRefresh}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Exported wrapper (adds context provider)
// ---------------------------------------------------------------------------

interface ClientPortalManagementPageProps {
  clientId: string;
  clientName?: string;
  onNavigateBack: () => void;
}

const ClientPortalManagementPage: React.FC<ClientPortalManagementPageProps> = (props) => (
  <TherapistClientBridgeProviderWrapper>
    <PageInner {...props} />
  </TherapistClientBridgeProviderWrapper>
);

export default ClientPortalManagementPage;
