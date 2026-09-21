import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ResumeProvider } from "@/contexts/ResumeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "JobAI - Smart Job Matching Platform",
  description: "Upload your resume, scrape jobs, and get AI-powered matches",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ResumeProvider>
              <Navbar />
              <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            </ResumeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
