import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/ConditionalShell";
import { siteUrl } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Panda lounge | Delivery de Hambúrguers",
    template: "%s | Panda lounge",
  },
  description: "Panda lounge | Peça Online, Cardápio Digital, Preços.",
  verification: {
    google: "iFNvvYLli4pLzw8Ne01U4uBkal2KzUsQdMzQ8Wjcy5M",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
