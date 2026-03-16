import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, MailWarning, RotateCcw } from 'lucide-react';
import { AuthCard } from '@/components/shared/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { VerifyEmailStatus, verifyEmailToken } from '@/lib/auth/email-verify';
import { StatusPanel } from '@/components/specific/auth/email-verification/StatusPanel';
import { SuccessRedirectActions } from '@/components/specific/auth/email-verification/SuccessEmailVerificationAction';

type VerifyEmailPageProps = {
    params: Promise<{ token?: string[] }>;
    searchParams?: Promise<{ status?: string }>;
};

type StatusContent = {
    eyebrow: string;
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    iconClassName: string;
    panelClassName: string;
    hint: string;
    actions: ReactNode;
};

function normalizeStatus(status?: string): VerifyEmailStatus | null {
    if (status === 'success' || status === 'expired' || status === 'invalid') return status;
    return null;
}

const STATUS_CONTENT_MAP: Record<VerifyEmailStatus, StatusContent> = {
    success: {
        eyebrow: 'Email verified',
        title: 'Your account is confirmed',
        description: 'Great news. Your email is now verified and your account is ready.',
        icon: CheckCircle2,
        iconClassName: 'text-emerald-600 dark:text-emerald-400',
        panelClassName: 'border-emerald-500/25 bg-emerald-500/8',
        hint: 'You can now access all authenticated features.',
        actions: <SuccessRedirectActions />,
    },
    expired: {
        eyebrow: 'Link expired',
        title: 'This verification link has expired',
        description: 'For security, verification links are time-limited. Request a new one to continue.',
        icon: MailWarning,
        iconClassName: 'text-amber-600 dark:text-amber-400',
        panelClassName: 'border-amber-500/25 bg-amber-500/8',
        hint: 'If you requested multiple emails, only the most recent link may work.',
        actions: (
            <div className="space-y-3">
                <Button asChild size="lg" className="w-full">
                    <Link href="/register">
                        Request a new verification email
                        <RotateCcw className="h-4 w-4" />
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href="/signin">Back to sign in</Link>
                </Button>
            </div>
        ),
    },
    invalid: {
        eyebrow: 'Invalid link',
        title: 'We could not verify this link',
        description: 'This link may be malformed, already used, or no longer associated with your account.',
        icon: AlertCircle,
        iconClassName: 'text-destructive',
        panelClassName: 'border-destructive/20 bg-destructive/8',
        hint: 'Double-check the URL from your email or request a fresh verification link.',
        actions: (
            <div className="space-y-3">
                <Button asChild size="lg" className="w-full">
                    <Link href="/register">
                        Send me a new link
                        <RotateCcw className="h-4 w-4" />
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href="/signin">Try signing in</Link>
                </Button>
            </div>
        ),
    },
};

export default async function VerifyEmailPage({ params, searchParams }: VerifyEmailPageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const token = resolvedParams.token?.[0];

    const previewStatus = normalizeStatus(resolvedSearchParams?.status);
    const status = previewStatus ?? (await verifyEmailToken(token));
    const content = STATUS_CONTENT_MAP[status];

    return (
        <AuthCard
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
            footer={
                <>
                    Already verified?{' '}
                    <Link href="/signin" className="font-medium text-primary hover:underline">
                        Go to sign in
                    </Link>
                </>
            }
        >
            <section className="space-y-5" aria-live="polite">
                <StatusPanel {...content} />
                {content.actions}
            </section>
        </AuthCard>
    );
}
