import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Card,
  CardContent,
  Stack,
  Chip,
  Collapse,
  Divider,
  Button,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { JournalEntry } from '../../types/clientPortal';

interface JournalPanelProps {
  contextModuleId?: string;
  contextInterventionId?: string;
  onClose?: () => void;
}

export const JournalPanel: React.FC<JournalPanelProps> = ({
  contextModuleId,
  contextInterventionId,
  onClose,
}) => {
  const portal = useClientPortal();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<Partial<JournalEntry>>({
    id: '',
    keyInsights: '',
    personalApplication: '',
    discussionTopics: '',
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await portal.listJournalEntries();
      setEntries(data.slice(0, 5)); // Show recent 5
    } catch (err) {
      console.error('[JournalPanel] Error loading entries:', err);
    }
  };

  const handleStartNewEntry = () => {
    const newEntry: Partial<JournalEntry> = {
      id: `journal-${Date.now()}`,
      keyInsights: '',
      personalApplication: '',
      discussionTopics: '',
      moduleId: contextModuleId,
      interventionId: contextInterventionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentEntry(newEntry);
    setIsEditing(true);
  };

  const handleSaveEntry = async () => {
    if (!currentEntry.id) return;

    try {
      await portal.upsertJournalEntry({
        ...currentEntry,
        id: currentEntry.id,
        updatedAt: new Date().toISOString(),
      });
      setIsEditing(false);
      setCurrentEntry({
        id: '',
        keyInsights: '',
        personalApplication: '',
        discussionTopics: '',
      });
      await loadEntries();
    } catch (err) {
      console.error('[JournalPanel] Error saving entry:', err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentEntry({
      id: '',
      keyInsights: '',
      personalApplication: '',
      discussionTopics: '',
    });
  };

  if (!isExpanded) {
    return (
      <Box
        sx={{
          width: 48,
          height: '100vh',
          position: 'sticky',
          top: 0,
          bgcolor: 'grey.100',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconButton onClick={() => setIsExpanded(true)} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 360,
        height: '100vh',
        position: 'sticky',
        top: 0,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Journal
        </Typography>
        <IconButton onClick={() => { onClose ? onClose() : setIsExpanded(false); }} size="small">
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {isEditing ? (
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              New Entry
            </Typography>

            {(contextModuleId || contextInterventionId) && (
              <Chip
                label={contextModuleId ? 'Module' : 'Intervention'}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}

            <TextField
              label="What I learned"
              multiline
              rows={3}
              value={currentEntry.keyInsights || ''}
              onChange={(e) =>
                setCurrentEntry({ ...currentEntry, keyInsights: e.target.value })
              }
              placeholder="Key insights from this session..."
              fullWidth
              size="small"
            />

            <TextField
              label="What it means for me"
              multiline
              rows={3}
              value={currentEntry.personalApplication || ''}
              onChange={(e) =>
                setCurrentEntry({ ...currentEntry, personalApplication: e.target.value })
              }
              placeholder="How this relates to my life..."
              fullWidth
              size="small"
            />

            <TextField
              label="Notes for next session"
              multiline
              rows={2}
              value={currentEntry.discussionTopics || ''}
              onChange={(e) =>
                setCurrentEntry({ ...currentEntry, discussionTopics: e.target.value })
              }
              placeholder="Topics to discuss..."
              fullWidth
              size="small"
            />

            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" onClick={handleSaveEntry} fullWidth>
                Save
              </Button>
              <Button variant="outlined" size="small" onClick={handleCancel} fullWidth>
                Cancel
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              fullWidth
              onClick={handleStartNewEntry}
              sx={{ mb: 2 }}
            >
              New Entry
            </Button>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
              Recent Entries
            </Typography>

            {entries.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No entries yet. Start journaling to track your progress.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {entries.map((entry) => (
                  <Card key={entry.id} variant="outlined" sx={{ cursor: 'pointer' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        onClick={() =>
                          setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)
                        }
                      >
                        <Typography variant="caption" color="text.secondary">
                          {new Date(entry.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Typography>
                        <IconButton size="small">
                          {expandedEntryId === entry.id ? (
                            <ExpandLessIcon fontSize="small" />
                          ) : (
                            <ExpandMoreIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Stack>

                      <Collapse in={expandedEntryId === entry.id} timeout="auto" unmountOnExit>
                        <Stack spacing={1} sx={{ mt: 1 }}>
                          {entry.keyInsights && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                What I learned
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {entry.keyInsights}
                              </Typography>
                            </Box>
                          )}

                          {entry.personalApplication && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                What it means
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {entry.personalApplication}
                              </Typography>
                            </Box>
                          )}

                          {entry.discussionTopics && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                Next session
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {entry.discussionTopics}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Collapse>

                      {expandedEntryId !== entry.id && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.75rem',
                            mt: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {entry.keyInsights || entry.personalApplication || entry.discussionTopics}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}
      </Box>

      {/* Privacy Notice */}
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary">
          🔒 Your journal is private and secure
        </Typography>
      </Box>
    </Box>
  );
};
