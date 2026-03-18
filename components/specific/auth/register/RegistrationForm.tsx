'use client';

import { AuthCard } from '@/components/shared/auth/AuthCard';
import Link from 'next/link';
import { IconInput } from '@/components/shared/forms/IconInput';
import { ArrowRight, Loader2, LockKeyhole, Mail, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/animate-checkbox';
import { Button } from '@/components/ui/button';
import { Controller } from 'react-hook-form';
import { useRegistrationForm } from '@/components/specific/auth/register/hooks/useRegistrationForm';
import { FormField } from '@/components/shared/auth/FormField';
import { useSocialAuth } from '@/components/specific/auth/social/hooks/useSocialAuth';
import { SocialAuthButtons } from '@/components/specific/auth/social/SocialAuthButtons';

export function RegistrationForm() {
    const { register, control, errors, isSubmitting, passwordValue, handleSubmit, onSubmit } = useRegistrationForm();
    const { isGoogleSubmitting, onGoogleAuth } = useSocialAuth();
    const isAnySubmitting = isSubmitting || isGoogleSubmitting;

    return (
        <AuthCard
            eyebrow="Create account"
            title="Register"
            description="Fill in your details and start using LinkLite."
            footer={
                <>
                    Already have an account?{' '}
                    <Link href="/signin" className="font-medium text-primary hover:underline">
                        Sign in
                    </Link>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <SocialAuthButtons
                    mode="signup"
                    isGoogleSubmitting={isGoogleSubmitting}
                    isDisabled={isAnySubmitting}
                    onGoogleAuthAction={onGoogleAuth}
                />

                <FormField label="Full name" id="full-name" error={errors.email?.message}>
                    <IconInput
                        icon={User}
                        id="full-name"
                        placeholder="Jane Doe"
                        type="name"
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        {...register('name')}
                    />
                </FormField>

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

                {passwordValue?.length ? (
                    <FormField label="Confirm password" id="confirm-password" error={errors.confirmPassword?.message}>
                        <IconInput
                            icon={LockKeyhole}
                            id="confirm-passowrd"
                            placeholder="Re-enter your password"
                            type="password"
                            aria-invalid={!!errors.confirmPassword}
                            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                            {...register('confirmPassword')}
                        />
                    </FormField>
                ) : null}

                <label className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <Controller
                        name="terms"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="terms"
                                checked={field.value}
                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                aria-invalid={!!errors.terms}
                                aria-describedby={errors.terms ? 'terms-error' : undefined}
                                className="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                        )}
                    />
                    <span>
                        I agree with the{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                            Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                        </Link>
                        .
                    </span>
                </label>
                {errors.terms ? (
                    <p id="terms-error" className="text-sm text-destructive">
                        {errors.terms.message}
                    </p>
                ) : null}

                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isAnySubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating account...
                        </>
                    ) : (
                        <>
                            Create account
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </form>
        </AuthCard>
    );
}
