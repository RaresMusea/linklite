import React from 'react';
import { AuthShell } from '@/components/shared/auth/AuthShell';

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AuthShell>{children}</AuthShell>;
}
