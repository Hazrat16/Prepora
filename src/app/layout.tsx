import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const font = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
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
