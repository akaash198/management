import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthCookieSync } from "@/components/auth/AuthCookieSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cowrk", template: "%s · Cowrk" },
  description: "Work together, ship together.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)",  color: "#0d1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('flowteam-theme');
                  if (stored) {
                    var parsed = JSON.parse(stored);
                    var theme = parsed && parsed.state && parsed.state.theme;
                    if (theme) {
                      document.documentElement.classList.add(theme);
                      return;
                    }
                  }
                } catch (e) {}
                // Default to dark if no theme is stored
                document.documentElement.classList.add('dark');
              })()
            `,
          }}
        />
      </head>
      <body className="h-full antialiased">
        <AuthCookieSync />
        {children}
      </body>
    </html>
  );
}
