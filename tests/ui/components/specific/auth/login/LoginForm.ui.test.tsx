import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    useLoginForm: vi.fn(),
    useSocialAuth: vi.fn(),
    register: vi.fn((name: string) => ({
        name,
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
    })),
    handleSubmit: vi.fn((onValid: (...args: unknown[]) => unknown) => (event?: { preventDefault?: () => void }) => {
        event?.preventDefault?.();
        return onValid({});
    }),
    onSubmit: vi.fn(),
    onGoogleAuth: vi.fn(),
}));

vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

vi.mock('@/components/shared/auth/AuthCard', () => ({
    AuthCard: ({
        eyebrow,
        title,
        description,
        footer,
        children,
    }: {
        eyebrow: string;
        title: string;
        description: string;
        footer?: React.ReactNode;
        children: React.ReactNode;
    }) => (
        <section>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
            {children}
            {footer}
        </section>
    ),
}));

vi.mock('@/components/shared/forms/IconInput', () => ({
    IconInput: ({ id, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input id={id} {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props}>{children}</button>
    ),
}));

vi.mock('@/components/specific/auth/login/hooks/useLoginForm', () => ({
    useLoginForm: mocks.useLoginForm,
}));

vi.mock('@/components/specific/auth/social/hooks/useSocialAuth', () => ({
    useSocialAuth: mocks.useSocialAuth,
}));

vi.mock('@/components/specific/auth/social/SocialAuthButtons', () => ({
    SocialAuthButtons: ({
        mode,
        isGoogleSubmitting,
        isDisabled,
        onGoogleAuthAction,
    }: {
        mode: 'signin' | 'signup';
        isGoogleSubmitting: boolean;
        isDisabled?: boolean;
        onGoogleAuthAction: () => void;
    }) => (
        <button type="button" disabled={isDisabled} onClick={onGoogleAuthAction}>
            {isGoogleSubmitting ? 'Continuing sign in...' : mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
        </button>
    ),
}));

import { LoginForm } from '@/components/specific/auth/login/LoginForm';

function makeLoginHookState(
    overrides: Partial<{
        errors: {
            email?: { message?: string };
            password?: { message?: string };
        };
        isSubmitting: boolean;
    }> = {}
) {
    return {
        onSubmit: mocks.onSubmit,
        handleSubmit: mocks.handleSubmit,
        errors: {},
        isSubmitting: false,
        register: mocks.register,
        ...overrides,
    };
}

describe('LoginForm Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useLoginForm.mockReturnValue(makeLoginHookState());
        mocks.useSocialAuth.mockReturnValue({
            isGoogleSubmitting: false,
            onGoogleAuth: mocks.onGoogleAuth,
        });
    });

    it('Renders auth copy, fields, social button, and footer link', () => {
        render(<LoginForm />);

        expect(screen.getByText('Welcome back', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.getByText('Sign in to manage your links and analytics.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    });

    it('Shows loading state and disables submit while submitting', () => {
        mocks.useLoginForm.mockReturnValue(
            makeLoginHookState({
                isSubmitting: true,
            })
        );

        render(<LoginForm />);

        expect(screen.getByRole('button', { name: /signing you in/i })).toBeDisabled();
    });

    it('Disables submit while Google auth is in progress', () => {
        mocks.useSocialAuth.mockReturnValue({
            isGoogleSubmitting: true,
            onGoogleAuth: mocks.onGoogleAuth,
        });

        render(<LoginForm />);

        expect(screen.getByRole('button', { name: /sign in$/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /continuing sign in/i })).toBeDisabled();
    });

    it('Calls onGoogleAuth when Google button is clicked', () => {
        render(<LoginForm />);

        fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

        expect(mocks.onGoogleAuth).toHaveBeenCalledTimes(1);
    });

    it('Wires form submit through handleSubmit', () => {
        const { container } = render(<LoginForm />);
        const form = container.querySelector('form');

        expect(form).toBeInTheDocument();
        if (form) {
            fireEvent.submit(form);
        }

        expect(mocks.handleSubmit).toHaveBeenCalledTimes(1);
        expect(mocks.handleSubmit).toHaveBeenCalledWith(mocks.onSubmit);
        expect(mocks.onSubmit).toHaveBeenCalledTimes(1);
    });
});
