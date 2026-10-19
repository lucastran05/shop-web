import type { TokenPair } from "./common.types";
import type { TokenStore } from "./http-client";

export const SESSION_STORAGE_KEY = "shop-api-session-v1";

export function createSessionStore(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): TokenStore {
  return {
    read() {
      try {
        const raw = storage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const data: unknown = JSON.parse(raw);
        if (
          typeof data === "object" &&
          data !== null &&
          "accessToken" in data &&
          typeof data.accessToken === "string" &&
          data.accessToken &&
          "refreshToken" in data &&
          typeof data.refreshToken === "string" &&
          data.refreshToken
        ) {
          return {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        }
        storage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        /* Invalid or inaccessible storage must not grant a session. */
      }
      return null;
    },
    write(tokens: TokenPair) {
      storage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      );
    },
    clear() {
      storage.removeItem(SESSION_STORAGE_KEY);
    },
  };
}
