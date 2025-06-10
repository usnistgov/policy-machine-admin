import { queryClient } from '../App';
import { userOpenTreeNodesAtom, targetOpenTreeNodesAtom } from '@/components/tree/tree-atom';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';

// Auth token key in localStorage
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Hook to reset application state (for components to use)
 */
export const useResetAppState = () => {
  const setUserOpenNodes = useSetAtom(userOpenTreeNodesAtom);
  const setTargetOpenNodes = useSetAtom(targetOpenTreeNodesAtom);
  
  return useCallback(() => {
    // Reset all tree open states
    setUserOpenNodes({});
    setTargetOpenNodes({});
  }, [setUserOpenNodes, setTargetOpenNodes]);
};

/**
 * AuthService provides centralized methods for authentication
 */
export const AuthService = {
  /**
   * Login a user
   * @param username The username to authenticate
   */
  login: (username: string): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, username);
  },

  /**
   * Logout the current user and reset application state
   * @param redirect If true, will force a full page reload
   */
  logout: (redirect = false): void => {
    // Clear auth data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    
    // Reset all React Query caches
    queryClient.clear();
    
    // Optionally force a page reload to reset all state
    if (redirect) {
      window.location.href = '/login';
    }
  },

  /**
   * Check if a user is authenticated
   */
  isAuthenticated: (): boolean => {
    return localStorage.getItem(AUTH_TOKEN_KEY) !== null;
  },

  /**
   * Get the current username
   */
  getUsername: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
}; 