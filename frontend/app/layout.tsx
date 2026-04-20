import "./globals.css";
import type { Metadata } from "next";
import { PreferencesProvider } from "@/context/preferences-context";
import { AuthProvider } from "@/context/auth-context";
import { LanguageProvider } from "@/context/language-context";
import { DynamicTitle } from "@/app/components/DynamicTitle";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.executiveinsider.top"),
  title: "梦想实验站 | Dream Lab",
  description: "Dream Lab for strategy, exploration, and decision support",
  openGraph: {
    title: "梦想实验站 | Dream Lab",
    description: "你的 24/7 灵感、探索与决策实验空间",
    url: "https://www.executiveinsider.top",
    siteName: "梦想实验站 | Dream Lab",
    images: [
      {
        url: "/share-icon.png",
        width: 300,
        height: 300,
        alt: "梦想实验站 | Dream Lab",
      },
    ],
    locale: "zh_CN",
    type: "website",
  },
  icons: {
    icon: "/dream-lab-icon.svg",
    apple: "/share-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="site-surface">
        <div style={{ display: "none", visibility: "hidden", height: 0, width: 0, overflow: "hidden" }}>
          {/* WeChat Share Image Hack */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/share-icon.png" alt="Dream Lab logo" />
        </div>
        <AuthProvider>
          <LanguageProvider>
            <DynamicTitle />
            <PreferencesProvider>{children}</PreferencesProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
