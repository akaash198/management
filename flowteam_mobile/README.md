# FlowTeam Mobile

React Native + Expo mobile client for the existing FlowTeam Django backend.

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- Axios
- Expo Secure Store
- Expo Notifications

## Run

```bash
npm install
npm start
```

Open the app with Expo Go, an Android emulator, or an iOS simulator.

## Backend Configuration

Copy `.env.example` to `.env` and point the app at the same backend used by the web app:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api
EXPO_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

For a physical phone, replace `127.0.0.1` with the machine LAN IP that runs Django.

## Current Mobile Surface

- Auth: login, register, onboarding, secure JWT storage, demo preview
- Navigation: protected root, auth stack, bottom tabs, project detail stack
- Core tabs: dashboard, projects, messages, calendar agenda, notifications, settings
- API: JWT refresh interceptor, typed API response helpers, query hooks
- Native setup: deep-link scheme, notification plugin, secure storage plugin

## Next Build Phases

1. Add mobile OAuth callback support with `flowteam://` deep links.
2. Add native push-token registration endpoint in Django.
3. Replace dashboard/project/message sample fallbacks with full endpoint-specific payload mapping.
4. Add message detail with WebSocket reconnect on app foreground.
5. Add task create/edit screens, comments, attachments, and status changes.
6. Add meeting detail, recording upload, and transcript/action-item views.
7. Add offline cache persistence for tasks, messages, and drafts.
8. Add EAS build profiles for Android and iOS release builds.

