import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Stack,
  LinearProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import {
  JournalEntry,
  PsychoeducationModule,
  Intervention,
} from '../../types/clientPortal';

interface JournalPageProps {
  onNavigateBack?: () => void;
}

export const JournalPage: React.FC<JournalPageProps> = ({ onNavigateBack }) => {
  const portal = useClientPortal();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [modules, setModules] = useState<Map<string, PsychoeducationModule>>(new Map());
  const [interventions, setInterventions] = useState<Map<string, Intervention>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<JournalEntry> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [entriesData, modulesData, interventionsData] = await Promise.all([
        portal.listJournalEntries(),
        portal.listModules(),
        portal.listInterventions(),
      ]);

      setEntries(entriesData);

      const moduleMap = new Map<string, PsychoeducationModule>();
      modulesData.forEach((mod) => moduleMap.set(mod.id, mod));
      setModules(moduleMap);

      const interventionMap = new Map<string, Intervention>();
      interventionsData.forEach((int) => interventionMap.set(int.id, int));
      setInterventions(interventionMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journal entries');
      console.error('[JournalPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewEntry = () => {
    setEditingEntry({
      id: `journal-${Date.now()}`,
      learned: '',
      meaning: '',
      nextSessionNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setIsEditing(true);
  };

  const handleSaveEntry = async () => {
    if (!editingEntry || !editingEntry.id) return;

    try {
      const updated = await portal.upsertJournalEntry({
        ...editingEntry,
        id: editingEntry.id,
        updatedAt: new Date().toISOString(),
      });

      setIsEditing(false);
      setEditingEntry(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
      console.error('[JournalPage] Error saving entry:', err);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingEntry(null);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Journal
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {onNavigateBack && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onNavigateBack}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
      )}

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
            Journal
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Reflect on your learning and track your progress
          </Typography>
        </Box>
        {!isEditing && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleStartNewEntry}
          >
            New Entry
          </Button>
        )}
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Edit Form */}
      {isEditing && editingEntry && (
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {entries.find((e) => e.id === editingEntry.id) ? 'Edit Entry' : 'New Entry'}
            </Typography>

            <Stack spacing={3}>
              <TextField
                label="What I learned"
                multiline
                rows={4}
                value={editingEntry.learned || ''}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, learned: e.target.value })
                }
                placeholder="What insights did you gain from this module or intervention?"
                fullWidth
              />

              <TextField
                label="What it means for me"
                multiline
                rows={4}
                value={editingEntry.meaning || ''}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, meaning: e.target.value })
                }
                placeholder="How does this apply to your life? What patterns do you notice?"
                fullWidth
              />

              <TextField
                label="Notes for next session"
                multiline
                rows={4}
                value={editingEntry.nextSessionNotes || ''}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, nextSessionNotes: e.target.value })
                }
                placeholder="What do you want to discuss with your therapist?"
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={handleSaveEntry}>
                Save Entry
              </Button>
              <Button variant="outlined" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Journal Entries List */}
      {entries.length === 0 && !isEditing ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No journal entries yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start journaling to track your insights and progress
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleStartNewEntry}>
            Create First Entry
          </Button>
        </Card>
      ) : (
        <Stack spacing={2}>
          {entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              modules={modules}
              interventions={interventions}
              onEdit={() => handleEditEntry(entry)}
            />
          ))}
        </Stack>
      )}

      {/* Info Card */}
      {!isEditing && entries.length > 0 && (
        <Card sx={{ mt: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Journaling Tips
            </Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1, '& li': { mb: 0.5 } }}>
              <li>
                <Typography variant="body2">
                  Be honest and specific about your experiences
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Notice patterns in your thoughts and behaviors
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Use your notes to prepare for therapy sessions
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Review past entries to see your progress over time
                </Typography>
              </li>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Safety Footer */}
      <Box
        sx={{
          mt: 4,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
          borderLeft: 4,
          borderColor: 'warning.main',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <strong>Privacy Note:</strong> Your journal entries are private and stored securely.
          Your therapist cannot access them unless you choose to share.
        </Typography>
      </Box>
    </Box>
  );
};

// Journal Entry Card Component
interface JournalEntryCardProps {
  entry: JournalEntry;
  modules: Map<string, PsychoeducationModule>;
  interventions: Map<string, Intervention>;
  onEdit: () => void;
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({
  entry,
  modules,
  interventions,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState(false);

  const relatedModule = entry.linkedModuleId ? modules.get(entry.linkedModuleId) : null;
  const relatedIntervention = entry.linkedInterventionSessionId
    ? interventions.get(entry.linkedInterventionSessionId)
    : null;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {new Date(entry.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5} mt={0.5}>
              {relatedModule && (
                <Chip label={relatedModule.title} size="small" variant="outlined" />
              )}
              {relatedIntervention && (
                <Chip label={relatedIntervention.title} size="small" variant="outlined" />
              )}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Stack>
        </Stack>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {entry.learned && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  What I learned
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {entry.learned}
                </Typography>
              </Box>
            )}

            {entry.meaning && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  What it means for me
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {entry.meaning}
                </Typography>
              </Box>
            )}

            {entry.nextSessionNotes && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Notes for next session
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {entry.nextSessionNotes}
                </Typography>
              </Box>
            )}
          </Stack>
        </Collapse>

        {!expanded && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {entry.learned || entry.meaning || entry.nextSessionNotes || 'No content'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
