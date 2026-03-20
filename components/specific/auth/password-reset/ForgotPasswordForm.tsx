'use client';

import Link from 'next/link';
import { ArrowRight, Loader2, Mail } from 'lucide-react';
import { AuthCard } from '@/components/shared/auth/AuthCard';
import { FormField } from '@/components/shared/auth/FormField';
import { IconInput } from '@/components/shared/forms/IconInput';
import { Button } from '@/components/ui/button';
import { useForgotPasswordForm } from '@/components/specific/auth/password-reset/hooks/useForgotPasswordForm';

export function ForgotPasswordForm() {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } = useForgotPasswordForm();

    return (
        <AuthCard
            eyebrow="Password recovery"
            title="Reset password"
            description="Enter your email and we will send you a secure reset link."
            footer={
                <>
                    Remembered your password?{' '}
                    <Link href="/signin" className="font-medium text-primary hover:underline">
                        Back to sign in
                    </Link>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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

                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending reset link...
                        </>
                    ) : (
                        <>
                            Send reset link
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </form>
        </AuthCard>
    );
}
