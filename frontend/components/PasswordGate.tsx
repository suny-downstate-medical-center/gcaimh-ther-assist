import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { Lock } from '@mui/icons-material';

const SITE_PASSWORD = 'TherAssist2026';
const SESSION_KEY = 'ther-assist-authenticated';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const isAuth = sessionStorage.getItem(SESSION_KEY);
    if (isAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem(SESSION_KEY, 'true');
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a1628 0%, #1a237e 50%, #0d47a1 100%)',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: { xs: 3, md: 5 },
          maxWidth: { xs: '100%', sm: 420 },
          width: '100%',
          mx: { xs: 1, sm: 2 },
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: { xs: 48, md: 64 },
            height: { xs: 48, md: 64 },
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Lock sx={{ color: '#fff', fontSize: { xs: 24, md: 32 } }} />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Ther-Assist
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          AI Therapy Session Assistant — Pilot Access
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="Access Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            error={error}
            autoFocus
            sx={{ mb: 2 }}
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
              Incorrect password. Please try again.
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={!password}
            sx={{
              py: 1.5,
              background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
              fontWeight: 600,
              fontSize: '1rem',
              '&:hover': {
                background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
              },
            }}
          >
            Enter
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default PasswordGate;
