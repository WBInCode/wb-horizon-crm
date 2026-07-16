import type { Metadata } from "next";
import { display, body, mono } from "./fonts";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "WB Horizon CRM",
  description: "System CRM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <SessionProvider>
            <QueryProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </QueryProvider>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
