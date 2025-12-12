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

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase-config';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string, displayName?: string) => Promise<any>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to check if email is authorized
  const isEmailAuthorized = (email: string | null): boolean => {
    if (!email) return false;
    
    // Get allowed domains and emails from environment variables
    const allowedDomainsStr = import.meta.env.VITE_AUTH_ALLOWED_DOMAINS || '';
    const allowedEmailsStr = import.meta.env.VITE_AUTH_ALLOWED_EMAILS || '';
    
    const allowedDomains = allowedDomainsStr ? allowedDomainsStr.split(',').map((d: string) => d.trim()) : [];
    const allowedEmails = allowedEmailsStr ? allowedEmailsStr.split(',').map((e: string) => e.trim()) : [];
    
    // Check explicit email allowlist
    if (allowedEmails.includes(email)) {
      return true;
    }
    
    // Check domain allowlist
    const emailDomain = email.split('@')[1];
    return allowedDomains.includes(emailDomain);
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    return result;
  };

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if the email is authorized
    const email = result.user?.email;
    if (!isEmailAuthorized(email)) {
      // Sign out the user if they don't have an authorized email
      await signOut(auth);
      throw new Error('Access restricted to @google.com email addresses and authorized users only.');
    }
    
    return result;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if the current user has an authorized email
        const email = user.email;
        if (!isEmailAuthorized(email)) {
          // Sign out the user if they don't have an authorized email
          await signOut(auth);
          setCurrentUser(null);
          setLoading(false);
          return;
        }
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
