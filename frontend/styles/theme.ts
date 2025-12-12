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

import { createTheme, alpha } from '@mui/material/styles';

// Custom color palette based on material.css
const lightPalette = {
  primary: {
    main: '#0b57d0',
    light: '#a8c7fa',
    dark: '#0842a0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#00639b',
    light: '#7fcfff',
    dark: '#004a77',
    contrastText: '#ffffff',
  },
  tertiary: {
    main: '#146c2e',
    light: '#6dd58c',
    dark: '#0f5223',
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#ffffff',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    contrastText: '#ffffff',
  },
  grey: {
    50: '#fafbfd',
    100: '#f3f6fb',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  background: {
    default: '#fafbfd',
    paper: 'rgba(255, 255, 255, 0.8)',
  },
  text: {
    primary: '#1f2937',
    secondary: '#64748b',
    disabled: '#9ca3af',
  },
};

const darkPalette = {
  primary: {
    main: '#a8c7fa',
    light: '#d3e3fd',
    dark: '#062e6f',
    contrastText: '#062e6f',
  },
  secondary: {
    main: '#7fcfff',
    light: '#c2e7ff',
    dark: '#003355',
    contrastText: '#003355',
  },
  tertiary: {
    main: '#6dd58c',
    light: '#c4eed0',
    dark: '#0a3818',
    contrastText: '#0a3818',
  },
  success: {
    main: '#34d399',
    light: '#6ee7b7',
    dark: '#10b981',
    contrastText: '#064e3b',
  },
  warning: {
    main: '#fbbf24',
    light: '#fde68a',
    dark: '#f59e0b',
    contrastText: '#78350f',
  },
  error: {
    main: '#f87171',
    light: '#fca5a5',
    dark: '#ef4444',
    contrastText: '#7f1d1d',
  },
  grey: {
    50: '#1a1c1e',
    100: '#1e2024',
    200: '#374151',
    300: '#4b5563',
    400: '#6b7280',
    500: '#9ca3af',
    600: '#d1d5db',
    700: '#e5e7eb',
    800: '#f3f4f6',
    900: '#f9fafb',
  },
  background: {
    default: '#0a0b0d',
    paper: 'rgba(30, 32, 36, 0.8)',
  },
  text: {
    primary: '#f3f4f6',
    secondary: '#9ca3af',
    disabled: '#6b7280',
  },
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    ...lightPalette,
  } as any,
  typography: {
    fontFamily: '"Google Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 10,
            backgroundColor: '#6b7280',
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#4b5563',
          },
        } as any,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 24px',
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
          color: '#ffffff',
          border: 'none',
          '&:hover': {
            background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
          },
        },
        containedSuccess: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          },
        },
        containedError: {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          },
        },
        outlined: {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderColor: 'rgba(116, 119, 125, 0.2)',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(116, 119, 125, 0.3)',
          },
        },
        sizeLarge: {
          padding: '14px 32px',
          fontSize: '1rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 16,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        elevation0: {
          boxShadow: 'none',
          backgroundColor: 'transparent',
        },
        elevation1: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        },
        elevation2: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
        },
        elevation3: {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: 'none',
        },
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#dc2626',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
        },
        standardInfo: {
          backgroundColor: 'rgba(11, 87, 208, 0.1)',
          color: '#0842a0',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
        },
        bar: {
          borderRadius: 3,
          background: 'linear-gradient(90deg, #0b57d0 0%, #00639b 100%)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(11, 87, 208, 0.08)',
            transform: 'scale(1.1)',
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: 'inherit',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          backgroundImage: 'none',
        },
      },
    },
  },
});

// Add therapy colors to theme
(theme.palette as any).therapy = {
  calm: '#10b981',
  anxious: '#f59e0b', 
  distressed: '#ef4444',
  dissociated: '#9ca3af',
};

// Extend theme with custom colors for therapy-specific UI
declare module '@mui/material/styles' {
  interface Palette {
    therapy: {
      calm: string;
      anxious: string;
      distressed: string;
      dissociated: string;
    };
  }
  interface PaletteOptions {
    therapy?: {
      calm?: string;
      anxious?: string;
      distressed?: string;
      dissociated?: string;
    };
  }
}
