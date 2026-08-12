import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import ModalProvider from '@/components/ModalProvider';

export const metadata: Metadata = {
  title: '书影账本 · 个人书影管理平台',
  description: '一本会生长的书影账本——记录与统计并重，数据 100% 归自己',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ModalProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 flex flex-col">
              {children}
            </main>
          </div>
        </ModalProvider>
      </body>
    </html>
  );
}
