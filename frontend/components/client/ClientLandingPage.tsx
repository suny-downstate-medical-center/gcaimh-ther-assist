import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Stack,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Login as LoginIcon,
} from '@mui/icons-material';

interface ClientLandingPageProps {
  onNavigateToDashboard: () => void;
}

export const ClientLandingPage: React.FC<ClientLandingPageProps> = ({
  onNavigateToDashboard,
}) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={4} alignItems="center">
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography
              variant="h2"
              sx={{
                color: 'white',
                fontWeight: 700,
                mb: 1,
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              Welcome
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 400,
              }}
            >
              Your Mental Wellness Journey
            </Typography>
          </Box>

          {/* Login Placeholder */}
          <Card
            sx={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={2} alignItems="center">
                <LoginIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center' }}>
                  Login
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Authentication coming soon
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Personal Mental Wellness Dashboard Card */}
          <Card
            sx={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
            }}
            onClick={onNavigateToDashboard}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <DashboardIcon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Personal Mental Wellness Dashboard
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ textAlign: 'center' }}
                >
                  Access your personalized wellness tools, track your progress, and continue
                  your journey toward better mental health
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={onNavigateToDashboard}
                  sx={{
                    mt: 2,
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                  }}
                >
                  Enter Dashboard
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};
