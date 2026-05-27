import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Convenience hook for accessing the authentication context.
 * Must be used within an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
