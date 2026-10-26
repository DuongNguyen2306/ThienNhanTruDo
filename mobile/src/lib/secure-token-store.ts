/**
 * JWT storage backed by the device keychain.
 *
 * `expo-secure-store` keeps the token out of plain-text app storage, which
 * is the mobile equivalent of the website's `localStorage` token — with a
 * materially better security posture.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'thiennhan_access_token';

export const secureTokenStore = {
  /** Read the stored token, or `null` when there is no session. */
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      // A corrupted keychain entry must never crash the app.
      return null;
    }
  },

  /** Persist the token. */
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  /** Remove the token (sign-out). */
  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Already gone — nothing to do.
    }
  },
};

export const TOKEN_STORAGE_KEY = TOKEN_KEY;
