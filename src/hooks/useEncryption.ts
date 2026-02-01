import { useState, useCallback } from 'react';
import * as encryption from '../services/encryption';

export function useEncryption() {
  const [isSetup, setIsSetup] = useState(() => encryption.isEncryptionSetup());
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const setup = useCallback(async (password: string) => {
    await encryption.initializeEncryption(password);
    setIsSetup(true);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    const ok = await encryption.loadEncryption(password);
    if (ok) setIsAuthenticated(true);
    return ok;
  }, []);

  const logout = useCallback(() => {
    encryption.clearEncryption();
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      await encryption.changePassword(oldPassword, newPassword);
    },
    []
  );

  return {
    isSetup,
    isAuthenticated,
    setup,
    login,
    logout,
    changePassword,
  };
}
