import type { Metadata } from "next";
import { Inter } from "next/font/google";
import QueryProvider from "@providers/query-provider";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";
import StoreInitializer from "@/components/store-initializer";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat with PDF - Open Source",
  description: "Chat with your PDF documents using AI - Open Source Version",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <StoreInitializer />
            {children}
          </ThemeProvider>
          <Toaster />
        </body>
      </html>
    </QueryProvider>
  );
}
