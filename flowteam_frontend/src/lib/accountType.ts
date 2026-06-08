const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "protonmail.com", "live.com", "aol.com", "me.com", "msn.com",
  "ymail.com", "googlemail.com", "yahoo.co.uk", "yahoo.co.in",
]);

export function detectAccountType(email: string): "individual" | "corporate" {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return PERSONAL_DOMAINS.has(domain) ? "individual" : "corporate";
}
