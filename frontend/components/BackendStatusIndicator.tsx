import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Cloud, CloudOff, CloudQueue } from '@mui/icons-material';
import axios from 'axios';

type ConnectionStatus = 'checking' | 'connected' | 'auth_expired' | 'mock' | 'error';

interface HealthResponse {
  status: string;
  project?: string;
  gcp_auth?: string;
  gcp_auth_detail?: string;
  model_flash?: string;
  model_pro?: string;
}

const BackendStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [tooltipDetail, setTooltipDetail] = useState<string>('Checking backend connection...');
  const hasConnectedOnce = useRef(false);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_ANALYSIS_API;

    if (!apiUrl || apiUrl === '' || apiUrl === 'undefined') {
      setStatus('mock');
      setTooltipDetail('No backend configured — using mock data');
      return;
    }

    const checkConnection = async () => {
      try {
        // Lightweight GET health check — fast, doesn't queue behind analysis requests
        const response = await axios.get(
          `${apiUrl}/therapy_analysis`,
          { timeout: 8000 }
        );

        const health: HealthResponse = response.data;

        if (health.gcp_auth === 'valid') {
          hasConnectedOnce.current = true;
          setStatus('connected');
          setTooltipDetail(
            `GCP Connected — Project: ${health.project}\nModels: ${health.model_flash} (realtime) + ${health.model_pro} (comprehensive)`
          );
        } else if (health.gcp_auth === 'expired') {
          hasConnectedOnce.current = false;
          setStatus('auth_expired');
          setTooltipDetail(health.gcp_auth_detail || 'GCP authentication expired');
        } else if (health.gcp_auth === 'error') {
          hasConnectedOnce.current = false;
          setStatus('auth_expired');
          setTooltipDetail(health.gcp_auth_detail || 'GCP authentication error');
        } else if (health.gcp_auth === 'warning') {
          hasConnectedOnce.current = true;
          setStatus('connected');
          setTooltipDetail(health.gcp_auth_detail || 'GCP connected with warnings');
        } else {
          // Backend reachable but unknown auth state
          setStatus('auth_expired');
          setTooltipDetail('Backend reachable but GCP auth status unknown');
        }
      } catch (err: any) {
        if (err.response) {
          // Got a response (e.g., 400/405) — backend is reachable
          // This means health_check action isn't recognized (old backend) but server is up
          if (!hasConnectedOnce.current) {
            hasConnectedOnce.current = true;
          }
          setStatus('connected');
          setTooltipDetail(`Backend reachable at ${apiUrl}`);
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          // Timeout — backend is likely busy processing analysis requests
          // Don't downgrade status if we were previously connected
          if (hasConnectedOnce.current) {
            // Keep current connected status — just a busy timeout
            return;
          }
          setStatus('error');
          setTooltipDetail(`Backend at ${apiUrl} is not responding (timeout). Is the server running?`);
        } else {
          // True network error — backend is not reachable
          if (hasConnectedOnce.current) {
            // Was connected before — might be a transient issue, don't immediately flip
            return;
          }
          setStatus('error');
          setTooltipDetail(`Cannot reach backend at ${apiUrl}. Is the server running?`);
        }
      }
    };

    checkConnection();

    // Re-check every 90 seconds (less aggressive to avoid congestion during sessions)
    const interval = setInterval(checkConnection, 90000);
    return () => clearInterval(interval);
  }, []);

  const config: Record<ConnectionStatus, {
    color: string;
    bgColor: string;
    icon: React.ReactNode;
    label: string;
  }> = {
    checking: {
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.08)',
      icon: <CloudQueue sx={{ fontSize: 16, color: '#f59e0b' }} />,
      label: 'Checking...',
    },
    connected: {
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.08)',
      icon: <Cloud sx={{ fontSize: 16, color: '#10b981' }} />,
      label: 'GCP Connected',
    },
    auth_expired: {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.08)',
      icon: <CloudOff sx={{ fontSize: 16, color: '#ef4444' }} />,
      label: 'Auth Expired',
    },
    mock: {
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.08)',
      icon: <CloudOff sx={{ fontSize: 16, color: '#f59e0b' }} />,
      label: 'Mock Mode',
    },
    error: {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.08)',
      icon: <CloudOff sx={{ fontSize: 16, color: '#ef4444' }} />,
      label: 'Disconnected',
    },
  };

  const current = config[status];

  return (
    <Tooltip
      title={
        <span style={{ whiteSpace: 'pre-line', fontSize: '11px' }}>
          {tooltipDetail}
        </span>
      }
      arrow
      placement="bottom"
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          borderRadius: '16px',
          backgroundColor: current.bgColor,
          border: `1px solid ${current.color}20`,
          cursor: 'default',
          transition: 'all 0.3s ease',
        }}
      >
        {current.icon}
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 600,
            color: current.color,
            letterSpacing: '0.02em',
          }}
        >
          {current.label}
        </Typography>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: current.color,
            animation: status === 'checking' ? 'pulse 1.5s infinite' :
                       status === 'auth_expired' ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.3 },
            },
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default BackendStatusIndicator;
