import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  LinearProgress,
  Alert,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  MenuBook as MenuBookIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useClientPortal } from '../../contexts/ClientPortalContext';
import { PsychoeducationModule } from '../../types/clientPortal';

interface LibraryPageProps {
  onNavigateToModule?: (moduleId: string) => void;
  onNavigateBack?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onNavigateToModule, onNavigateBack }) => {
  const portal = useClientPortal();
  const [modules, setModules] = useState<PsychoeducationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await portal.listModules();
      setModules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules');
      console.error('[LibraryPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories and tags
  const categories = Array.from(new Set(modules.map((m) => m.category).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(modules.flatMap((m) => m.tags)));

  // Filter modules
  const filteredModules = modules.filter((module) => {
    const categoryMatch = categoryFilter === 'ALL' || module.category === categoryFilter;
    const tagMatch = tagFilter === 'ALL' || module.tags.includes(tagFilter);
    const searchMatch =
      !searchQuery ||
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.summary || '').toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && tagMatch && searchMatch;
  });

  // Group by category
  const modulesByCategory = filteredModules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, PsychoeducationModule[]>);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Psychoeducation Library
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Back Button */}
      {onNavigateBack && (
        <Button startIcon={<ArrowBackIcon />} onClick={onNavigateBack} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
      )}

      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
        Psychoeducation Library
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Browse evidence-based modules to learn about mental health, cognitive patterns, and
        coping strategies.
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 200 } }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            label="Category"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="ALL">All Categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 200 } }}>
          <InputLabel>Tag</InputLabel>
          <Select
            value={tagFilter}
            label="Tag"
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <MenuItem value="ALL">All Tags</MenuItem>
            {allTags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                {tag}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Search modules"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
          }}
          sx={{ flexGrow: 1 }}
        />
      </Stack>

      {/* Module Cards */}
      {filteredModules.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <MenuBookIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No modules found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {categoryFilter !== 'ALL' || tagFilter !== 'ALL' || searchQuery
              ? 'Try adjusting your filters'
              : 'No modules available'}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={4}>
          {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
            <Box key={category}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                {category}
              </Typography>
              <Stack spacing={2}>
                {categoryModules.map((module) => (
                  <Card key={module.id}>
                    <CardContent>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 1 }}>
                        {module.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {module.summary}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                        {module.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Stack>

                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {module.estimatedMinutes} minutes
                        </Typography>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        onClick={() => onNavigateToModule?.(module.id)}
                      >
                        Learn More
                      </Button>
                    </CardActions>
                  </Card>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Info Card */}
      <Card sx={{ mt: 4, bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            How to Use the Library
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0, '& li': { mb: 0.5 } }}>
            <li>
              <Typography variant="body2">
                Browse modules to learn about mental health concepts at your own pace
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Your therapist may assign specific modules as homework
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Use filters and search to find topics relevant to your goals
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Journal about insights after completing modules
              </Typography>
            </li>
          </Box>
        </CardContent>
      </Card>

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
          <strong>Important:</strong> These educational materials are meant to complement
          therapy, not replace it. Always discuss what you learn with your therapist.
        </Typography>
      </Box>
    </Box>
  );
};
