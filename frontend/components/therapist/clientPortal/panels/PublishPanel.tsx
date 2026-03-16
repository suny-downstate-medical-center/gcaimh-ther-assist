import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Switch, FormControlLabel, Button, Card, CardContent,
  Chip, Skeleton, Alert, Divider, List, ListItem, ListItemText, Stack,
} from '@mui/material';
import { Visibility, Publish, VisibilityOff } from '@mui/icons-material';
import { useTherapistBridge } from '../../../../contexts/TherapistClientBridgeContext';
import { PublishDraft, PublishSections } from '../../../../types/therapistClientBridge';
import EmptyState from '../shared/EmptyState';

interface PublishPanelProps {
  clientId: string;
}

const SECTION_LABELS: Record<keyof PublishSections, string> = {
  themes: 'Session themes',
  keyMoments: 'Key moments',
  homeworkList: 'Homework list',
  riskLabel: 'Risk level label',
  nextSteps: 'Next steps',
};

function PreviewPane({ draft }: { draft: PublishDraft }) {
  const { sections, content } = draft;
  return (
    <Card sx={{ bgcolor: '#f8fafd', borderLeft: 4, borderColor: 'info.main' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <Visibility sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
            Client view preview
          </Typography>
        </Stack>

        {sections.themes && content.themes.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Session Themes</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75}>
              {content.themes.map((t, i) => <Chip key={i} label={t} size="small" variant="outlined" />)}
            </Stack>
          </Box>
        )}

        {sections.keyMoments && content.keyMoments.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Key Moments</Typography>
            <List dense disablePadding>
              {content.keyMoments.map((m, i) => (
                <ListItem key={i} sx={{ pl: 0, py: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#0b57d0', mr: 1.5, flexShrink: 0, mt: '7px' }} />
                  <ListItemText primary={m} primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {sections.homeworkList && content.homeworkList.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Between-Session Plan</Typography>
            <List dense disablePadding>
              {content.homeworkList.map((h, i) => (
                <ListItem key={i} sx={{ pl: 0, py: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#128937', mr: 1.5, flexShrink: 0, mt: '7px' }} />
                  <ListItemText primary={h} primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {sections.nextSteps && content.nextSteps.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Next Steps</Typography>
            <List dense disablePadding>
              {content.nextSteps.map((s, i) => (
                <ListItem key={i} sx={{ pl: 0, py: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', mr: 1.5, flexShrink: 0, mt: '7px' }} />
                  <ListItemText primary={s} primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {sections.riskLabel && content.riskLabel && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Risk level visible to client: </Typography>
            <Chip label={content.riskLabel} size="small" sx={{ ml: 0.5 }} />
          </Box>
        )}

        {!sections.themes && !sections.keyMoments && !sections.homeworkList && !sections.nextSteps && (
          <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No sections selected — nothing will be visible to the client.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const PublishPanel: React.FC<PublishPanelProps> = ({ clientId }) => {
  const bridge = useTherapistBridge();
  const [draft, setDraft] = useState<PublishDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setLoading(true);
    bridge.getPublishDraft(clientId)
      .then(setDraft)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleSectionToggle = async (key: keyof PublishSections) => {
    if (!draft) return;
    const updated = await bridge.updatePublishDraft(clientId, draft.id, {
      sections: { ...draft.sections, [key]: !draft.sections[key] },
    });
    setDraft(updated);
  };

  const handlePublish = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      await bridge.publishToClient(clientId, draft.id);
      const updated = await bridge.getPublishDraft(clientId);
      setDraft(updated);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      await bridge.unpublishFromClient(clientId, draft.id);
      const updated = await bridge.getPublishDraft(clientId);
      setDraft(updated);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={60} />)}</Box>;
  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>Could not load draft: {error}</Alert>;
  if (!draft) return (
    <EmptyState icon={<Publish />} title="No session summary draft" description="A patient-safe summary will appear here after a session is processed." />
  );

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            What the client will see
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Session {draft.sessionDate ? formatDate(draft.sessionDate) : draft.sessionId} — Toggle sections below, then publish.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {draft.published ? (
            <Chip icon={<Publish sx={{ fontSize: '16px !important' }} />} label="Published" color="success" />
          ) : (
            <Chip label="Draft" variant="outlined" />
          )}
          {draft.publishedAt && (
            <Typography variant="body2" color="text.secondary">{formatDate(draft.publishedAt)}</Typography>
          )}
        </Stack>
      </Stack>

      {/* Section toggles */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
            Include in client summary
          </Typography>
          <Stack spacing={0.5}>
            {(Object.keys(SECTION_LABELS) as (keyof PublishSections)[]).map(key => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={draft.sections[key]}
                    onChange={() => handleSectionToggle(key)}
                    color="primary"
                  />
                }
                label={<Typography variant="body1">{SECTION_LABELS[key]}</Typography>}
                sx={{ ml: 0 }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Preview toggle */}
      <Button
        variant="text"
        startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
        onClick={() => setShowPreview(p => !p)}
        sx={{ alignSelf: 'flex-start', color: '#5f6368' }}
      >
        {showPreview ? 'Hide preview' : 'Preview as client'}
      </Button>

      {showPreview && <PreviewPane draft={draft} />}

      <Divider />

      {/* Publish controls */}
      <Stack direction="row" spacing={2}>
        {draft.published ? (
          <Button
            variant="outlined"
            color="error"
            size="large"
            startIcon={<VisibilityOff />}
            onClick={handleUnpublish}
            disabled={publishing}
            sx={{ borderRadius: 2, py: 1.25 }}
          >
            Unpublish from client portal
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={<Publish />}
            onClick={handlePublish}
            disabled={publishing}
            sx={{ borderRadius: 2, py: 1.25, px: 4, background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)', fontWeight: 600 }}
          >
            Publish to client
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default PublishPanel;
