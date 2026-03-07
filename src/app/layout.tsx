import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Персональные финансы - Учет доходов и расходов",
  description: "Лаконичное веб-приложение для личного финансового учета. Управление доходами, расходами, бюджетами и регулярными платежами.",
  keywords: ["финансы", "бюджет", "учет расходов", "личные финансы", "деньги", "бюджетирование"],
  authors: [{ name: "Personal Finance App" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Персональные финансы",
    description: "Управление личными финансами",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
