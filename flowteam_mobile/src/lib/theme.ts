export const colors = {
  ink: "#F8FAFC",
  inkLight: "#CBD5E1",
  muted: "#94A3B8",
  mutedLight: "#64748B",
  faint: "#1E293B",
  line: "rgba(148, 163, 184, 0.18)",
  lineSubtle: "rgba(148, 163, 184, 0.1)",

  surface: "#0E1524",
  surfaceElevated: "#121B2D",
  surfaceRaised: "#18233A",
  surfaceGlass: "rgba(14, 21, 36, 0.78)",
  canvas: "#060810",
  canvasMid: "#0B1220",
  canvasDark: "#02030A",

  // Gold accent (dominant CTA / brand highlight)
  primary: "#C9A227",
  primaryLight: "#F3D07A",
  primaryDark: "#A78312",
  primaryGlow: "rgba(201, 162, 39, 0.26)",
  primarySoft: "rgba(201, 162, 39, 0.14)",
  primarySofter: "rgba(201, 162, 39, 0.08)",

  // Secondary accent (used for “AI” / warm highlights)
  accent: "#38BDF8",
  accentLight: "#7DD3FC",
  accentGlow: "rgba(56, 189, 248, 0.24)",
  accentSoft: "rgba(56, 189, 248, 0.13)",

  orange: "#F59E0B",
  orangeLight: "#FDBA74",
  orangeSoft: "rgba(245, 158, 11, 0.13)",

  blue: "#60A5FA",
  blueLight: "#93C5FD",
  blueSoft: "rgba(96, 165, 250, 0.13)",
  violet: "#A78BFA",
  violetLight: "#C4B5FD",
  violetSoft: "rgba(167, 139, 250, 0.13)",
  yellow: "#FBBF24",
  yellowLight: "#FDE68A",
  yellowSoft: "rgba(251, 191, 36, 0.13)",
  teal: "#2DD4BF",
  tealSoft: "rgba(45, 212, 191, 0.13)",
  rose: "#FB7185",
  roseSoft: "rgba(251, 113, 133, 0.13)",
  danger: "#F87171",
  dangerSoft: "rgba(248, 113, 113, 0.13)",
  success: "#34D399",
  successSoft: "rgba(52, 211, 153, 0.13)",

  gradPrimary: ["#DAB241", "#B88B10"] as const,
  gradPrimaryVivid: ["#E6C56A", "#C9A227", "#7DD3FC"] as const,
  gradSurface: ["#121B2D", "#0E1524"] as const,
  gradHero: ["#121B2D", "#0B1220", "#060810"] as const,
  gradWarm: ["#38BDF8", "#60A5FA"] as const,
  gradCard: ["#18233A", "#0E1524"] as const,

  glassWhite: "rgba(255, 255, 255, 0.06)",
  glassDark: "rgba(0, 0, 0, 0.42)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  glassBorderDark: "rgba(255, 255, 255, 0.08)",
  overlayDark: "rgba(0, 0, 0, 0.58)",
};

export const spacing = {
  xxs: 3,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  xxl: 44,
};

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 8,
  xl: 10,
  xxl: 12,
  pill: 999,
};

export const shadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.34,
  shadowRadius: 26,
  elevation: 10,
};

export const shadowStrong = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.24,
  shadowRadius: 38,
  elevation: 16,
};

export const shadowSubtle = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.22,
  shadowRadius: 14,
  elevation: 5,
};

export const typography = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: "900" as const, letterSpacing: 0 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800" as const, letterSpacing: 0 },
  heading: { fontSize: 21, lineHeight: 27, fontWeight: "800" as const, letterSpacing: 0 },
  subheading: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const, letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "500" as const, letterSpacing: 0 },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: "700" as const, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const, letterSpacing: 0 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: "800" as const, letterSpacing: 0.7 },
  micro: { fontSize: 10, lineHeight: 13, fontWeight: "700" as const, letterSpacing: 0.4 },
};
