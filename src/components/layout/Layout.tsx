import type { ReactNode } from 'react';
import { TabBar } from './TabBar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
