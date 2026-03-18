import React from 'react';
import { AuthShell } from '@/components/shared/auth/AuthShell';
import { Toaster } from '@/components/ui/sonner';

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <AuthShell>{children}</AuthShell>
            <Toaster position="bottom-right" expand={false} />
        </>
    );
}
