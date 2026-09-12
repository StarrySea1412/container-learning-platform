import type { Metadata } from "next";
import GlassNav from "@/components/container/GlassNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "容器学习平台 · Docker / K8s 交互式中文教程",
  description: "完全在浏览器里运行的容器学习平台：Docker 正课 + K8s 进阶 + 原理篇，双栏联动沙盒、交互动画、生产事故复盘。无需安装，打开网页就能练。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        {/* iOS 液态玻璃 · 极光底色 */}
        <div className="aurora" aria-hidden>
          <span className="b1" />
          <span className="b2" />
          <span className="b3" />
          <span className="b4" />
        </div>

        <GlassNav />

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
