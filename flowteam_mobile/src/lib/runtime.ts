import Constants from "expo-constants";

type Extra = {
  apiUrl?: string;
  wsUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function getExpoHost() {
  const constants = Constants as typeof Constants & {
    expoConfig?: { hostUri?: string | null };
    manifest2?: { extra?: { expoClient?: { hostUri?: string | null } } };
  };
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    "";
  return hostUri.split(":")[0] || "";
}

export function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (extra.apiUrl) return extra.apiUrl;
  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:8000/api`;
  return "http://127.0.0.1:8000/api";
}

export function getWsBaseUrl() {
  if (process.env.EXPO_PUBLIC_WS_URL) return process.env.EXPO_PUBLIC_WS_URL;
  if (extra.wsUrl) return extra.wsUrl;
  const expoHost = getExpoHost();
  if (expoHost) return `ws://${expoHost}:8000`;
  return "ws://127.0.0.1:8000";
}
