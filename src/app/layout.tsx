import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "川麻战绩统计",
  description: "AI 识别麻将战绩截图，自动生成精美战绩卡片",
  keywords: ["麻将", "川麻", "战绩", "积分", "统计"],
  openGraph: {
    title: "川麻战绩统计",
    description: "AI 识别麻将战绩截图，自动生成精美战绩卡片",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
