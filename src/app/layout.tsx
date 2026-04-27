import type { Metadata } from "next";
import { display, body, mono } from "./fonts";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { I18nProvider } from "@/i18n/client";
import { getMessages } from "@/i18n";

export const metadata: Metadata = {
  title: "WB Horizon CRM",
  description: "System CRM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getMessages();
  return (
    <html lang={locale} className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <SessionProvider>
          <I18nProvider locale={locale} messages={messages}>
            {children}
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
