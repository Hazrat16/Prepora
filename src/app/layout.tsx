import type { Metadata } from "next";
import { Noto_Serif_Bengali } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// A book-style serif for long reading. Variable font, so every weight is available.
const font = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  variable: "--font-bangla",
});

export const metadata: Metadata = {
  title: "Govt Job Preparation BD",
  description: "প্রাথমিক সহকারী শিক্ষক নিয়োগ পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning className={font.variable}>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
