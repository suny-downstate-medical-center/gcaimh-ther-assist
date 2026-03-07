import React, { useState } from 'react';
import { Box, Drawer, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { MenuBook as JournalIcon } from '@mui/icons-material';
import { JournalPanel } from './JournalPanel';

interface ClientPortalLayoutProps {
  children: React.ReactNode;
  showJournalPanel?: boolean;
  contextModuleId?: string;
  contextInterventionId?: string;
}

export const ClientPortalLayout: React.FC<ClientPortalLayoutProps> = ({
  children,
  showJournalPanel = true,
  contextModuleId,
  contextInterventionId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileJournalOpen, setMobileJournalOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {showJournalPanel && !isMobile && (
        <JournalPanel
          contextModuleId={contextModuleId}
          contextInterventionId={contextInterventionId}
        />
      )}
      {showJournalPanel && isMobile && (
        <>
          <IconButton
            onClick={() => setMobileJournalOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1100,
              bgcolor: 'primary.main',
              color: 'white',
              width: 56,
              height: 56,
              boxShadow: 3,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <JournalIcon />
          </IconButton>
          <Drawer
            anchor="right"
            open={mobileJournalOpen}
            onClose={() => setMobileJournalOpen(false)}
            PaperProps={{ sx: { width: { xs: '100%', sm: 360 } } }}
          >
            <JournalPanel
              contextModuleId={contextModuleId}
              contextInterventionId={contextInterventionId}
              onClose={() => setMobileJournalOpen(false)}
            />
          </Drawer>
        </>
      )}
      <Box sx={{ flex: 1, overflow: 'auto' }}>{children}</Box>
    </Box>
  );
};
