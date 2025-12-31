
"use client";

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { CreditBalance } from './CreditBalance';

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/onboarding';

    return (
        <div className="app-layout">
            {!isAuthPage && <Sidebar />}
            {!isAuthPage && <CreditBalance />}
            <main className={`main-content ${isAuthPage ? 'no-sidebar' : ''}`}>
                {children}
            </main>
        </div>
    );
}
