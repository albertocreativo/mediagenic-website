'use client';

import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-enter flex-1 flex flex-col min-h-screen bg-black">
      {children}
    </div>
  );
}
