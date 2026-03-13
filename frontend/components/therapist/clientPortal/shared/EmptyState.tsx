import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, px: 3, textAlign: 'center' }}>
    <Box sx={{ mb: 3, color: 'text.secondary', '& .MuiSvgIcon-root': { fontSize: 64 } }}>
      {icon}
    </Box>
    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
      {title}
    </Typography>
    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 400, mb: actionLabel ? 3 : 0 }}>
      {description}
    </Typography>
    {actionLabel && onAction && (
      <Button
        variant="contained"
        onClick={onAction}
        sx={{
          borderRadius: 2,
          background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
          fontWeight: 600,
          py: 1,
          px: 3,
        }}
      >
        {actionLabel}
      </Button>
    )}
  </Box>
);

export default EmptyState;
