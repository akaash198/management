import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_KEY = "flowteam.accessToken";
const REFRESH_KEY = "flowteam.refreshToken";

function hasWebStorage() {
  return Platform.OS === "web" && typeof globalThis.localStorage !== "undefined";
}

export async function getAccessToken() {
  if (hasWebStorage()) return globalThis.localStorage.getItem(ACCESS_KEY);
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
  if (hasWebStorage()) return globalThis.localStorage.getItem(REFRESH_KEY);
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setTokens(access: string, refresh: string) {
  if (hasWebStorage()) {
    globalThis.localStorage.setItem(ACCESS_KEY, access);
    globalThis.localStorage.setItem(REFRESH_KEY, refresh);
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, access),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ]);
}

export async function clearTokens() {
  if (hasWebStorage()) {
    globalThis.localStorage.removeItem(ACCESS_KEY);
    globalThis.localStorage.removeItem(REFRESH_KEY);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
