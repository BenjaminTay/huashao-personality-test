import type { Metadata } from "next";
import "@fontsource/noto-serif-sc/chinese-simplified-400.css";
import "@fontsource/noto-serif-sc/chinese-simplified-700.css";
import "@fontsource/noto-sans-sc/chinese-simplified-400.css";
import "@fontsource/noto-sans-sc/chinese-simplified-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "花学测试｜花少人格鉴定",
  description:
    "一份关于关系、边界和心眼子余额的花学人格测试。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
