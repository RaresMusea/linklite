'use client';

import { AuthCard } from '@/components/shared/auth/AuthCard';
import Link from 'next/link';
import { ArrowRight, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLoginForm } from '@/components/specific/auth/login/hooks/useLoginForm';
import { IconInput } from '@/components/shared/forms/IconInput';
import { FormField } from '@/components/shared/auth/FormField';
import { useSocialAuth } from '@/components/specific/auth/social/hooks/useSocialAuth';
import { SocialAuthButtons } from '@/components/specific/auth/social/SocialAuthButtons';

export function LoginForm() {
    const { onSubmit, handleSubmit, errors, isSubmitting, register } = useLoginForm();
    const { isGoogleSubmitting, onGoogleAuth } = useSocialAuth();
    const isAnySubmitting = isSubmitting || isGoogleSubmitting;

    return (
        <AuthCard
            eyebrow="Welcome back"
            title="Sign in"
            description="Sign in to manage your links and analytics."
            footer={
                <>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="font-medium text-primary hover:underline">
                        Register
                    </Link>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <SocialAuthButtons
                    mode="signin"
                    isGoogleSubmitting={isGoogleSubmitting}
                    isDisabled={isAnySubmitting}
                    onGoogleAuthAction={onGoogleAuth}
                />

                <div className="space-y-2">
                    <FormField label="Email" id="email" error={errors.email?.message}>
                        <IconInput
                            icon={Mail}
                            id="email"
                            placeholder="jane.doe@acme.com"
                            type="email"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            {...register('email')}
                        />
                    </FormField>
                </div>

                <div className="space-y-2">
                    <FormField label="Password" id="password" error={errors.password?.message}>
                        <IconInput
                            icon={LockKeyhole}
                            id="password"
                            placeholder="At least 8 characters"
                            type="password"
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? 'password-error' : undefined}
                            {...register('password')}
                        />
                    </FormField>
                </div>

                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isAnySubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Signing you in...
                        </>
                    ) : (
                        <>
                            Sign in
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </form>
        </AuthCard>
    );
}
