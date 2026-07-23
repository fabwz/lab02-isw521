import { login as loginRequest } from '../api/authApi.js';
import { setAuth, clearAuth, getToken, getUser, isAuthenticated } from '../state/appState.js';

export const login = async (email, password, { signal } = {}) => {
  const { user, token } = await loginRequest(email, password, { signal });
  setAuth(token, user);
  return user;
};

export const logout = () => {
  clearAuth();
};

export { getToken, getUser, isAuthenticated };
