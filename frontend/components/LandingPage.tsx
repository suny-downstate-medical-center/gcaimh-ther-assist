// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Container,
  AppBar,
  Toolbar,
  Avatar,
  Button,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  People,
  CalendarToday,
  Add,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  onNavigateToPatients: () => void;
  onNavigateToSchedule: () => void;
  onNavigateToNewSession: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToPatients,
  onNavigateToSchedule,
  onNavigateToNewSession,
}) => {
  const { currentUser, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleClose();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  const tiles = [
    {
      title: 'Patients',
      icon: <People sx={{ 
        fontSize: 48, 
        color: 'white',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
      }} />,
      description: 'View and manage patient records and session histories',
      onClick: onNavigateToPatients,
      gradient: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
    },
    {
      title: 'Schedule',
      icon: <CalendarToday sx={{ 
        fontSize: 48, 
        color: 'white',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
      }} />,
      description: 'Manage appointments and session scheduling',
      onClick: onNavigateToSchedule,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      title: 'New Session',
      icon: <Add sx={{ 
        fontSize: 48, 
        color: 'white',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
      }} />,
      description: 'Start a new therapy session with real-time analysis',
      onClick: onNavigateToNewSession,
      gradient: 'linear-gradient(135deg, #673ab7 0%, #512da8 100%)',
    },
  ];

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'var(--background-gradient)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(11, 87, 208, 0.95) 0%, rgba(0, 99, 155, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
        py: 4,
        position: 'relative',
      }}>
        <Container maxWidth="lg">
          {/* User Menu - Positioned absolutely in top right */}
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            right: 16,
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            zIndex: 10,
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'white',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Welcome, {currentUser?.displayName?.split(' ')[0] || currentUser?.email}!
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{ color: 'white' }}
            >
              {currentUser?.photoURL ? (
                <Avatar 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || currentUser.email || 'User'}
                >
                  {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                </Avatar>
              ) : (
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    bgcolor: 'white',
                    color: 'primary.main'
                  }}
                >
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
                </Avatar>
              )}
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem 
                onClick={(e) => e.preventDefault()}
                sx={{ 
                  cursor: 'default',
                  '&:hover': { backgroundColor: 'transparent' }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 200 }}>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold" 
                    style={{ color: '#000000' }}
                  >
                    {currentUser?.displayName || 'User'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    style={{ color: '#666666' }}
                  >
                    {currentUser?.email}
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout fontSize="small" sx={{ mr: 1 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </Box>

          {/* Main Header Content */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                color: 'white',
                fontWeight: 700,
                mb: 2,
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              }}
            >
              Ther-Assist
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 400,
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              AI-Powered Therapy Assistant for Enhanced Clinical Practice
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 6 }}>
        <Grid container spacing={4} justifyContent="center">
          {tiles.map((tile, index) => (
            <Grid item xs={12} sm={6} md={4} key={tile.title}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.08)',
                  '&:hover': {
                    boxShadow: '0 25px 50px -8px rgba(0, 0, 0, 0.15)',
                    transform: 'translateY(-8px)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                <CardActionArea
                  onClick={tile.onClick}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    p: 0,
                  }}
                >
                  {/* Gradient Header */}
                  <Box
                    sx={{
                      background: tile.gradient,
                      p: 3,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: 120,
                    }}
                  >
                    {tile.icon}
                  </Box>

                  {/* Content */}
                  <CardContent sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center',
                    textAlign: 'center',
                    p: 3,
                  }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        color: 'var(--primary)',
                      }}
                    >
                      {tile.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      {tile.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Additional Info Section */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Paper
            sx={{
              p: 4,
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              maxWidth: 800,
              mx: 'auto',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 2,
                color: 'var(--primary)',
              }}
            >
              Advanced AI-Driven Clinical Support
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.8,
              }}
            >
              Ther-Assist provides real-time guidance, evidence-based recommendations, 
              and comprehensive session analysis to enhance therapeutic outcomes. 
              Our platform integrates seamlessly with your clinical workflow to support 
              better patient care and professional development.
            </Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default LandingPage;
