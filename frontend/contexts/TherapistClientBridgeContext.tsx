/**
 * Therapist ↔ Client Portal Bridge Context
 *
 * Provides the TherapistClientBridgeProvider interface to all therapist-side
 * client portal management panels via React Context.
 *
 * Currently wired to the Mock provider (localStorage). Switch to
 * TherapistClientBridgeRealProvider when backend is ready.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { TherapistClientBridgeProvider } from '../types/therapistClientBridge';
import { TherapistClientBridgeMockProvider } from '../providers/TherapistClientBridgeMockProvider';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TherapistClientBridgeContext = createContext<TherapistClientBridgeProvider | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTherapistBridge(): TherapistClientBridgeProvider {
  const ctx = useContext(TherapistClientBridgeContext);
  if (!ctx) {
    throw new Error('useTherapistBridge must be used inside <TherapistClientBridgeProviderWrapper>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider wrapper
// ---------------------------------------------------------------------------

export function TherapistClientBridgeProviderWrapper({ children }: { children: React.ReactNode }) {
  const provider = useMemo(() => new TherapistClientBridgeMockProvider(), []);
  return (
    <TherapistClientBridgeContext.Provider value={provider}>
      {children}
    </TherapistClientBridgeContext.Provider>
  );
}

export default TherapistClientBridgeContext;
