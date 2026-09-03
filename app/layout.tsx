import type { Metadata } from "next";
import "@fontsource/noto-serif-sc/chinese-simplified-400.css";
import "@fontsource/noto-serif-sc/chinese-simplified-700.css";
import "@fontsource/noto-sans-sc/chinese-simplified-400.css";
import "@fontsource/noto-sans-sc/chinese-simplified-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "花少人格鉴定｜FLOWER STUDIES ARCHIVE",
  description:
    "一份关于关系、边界和心眼子余额的旅行团观察档案。",
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
