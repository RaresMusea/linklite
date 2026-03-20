import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    useForgotPasswordForm: vi.fn(),
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

vi.mock('@/components/specific/auth/password-reset/hooks/useForgotPasswordForm', () => ({
    useForgotPasswordForm: mocks.useForgotPasswordForm,
}));

import { ForgotPasswordForm } from '@/components/specific/auth/password-reset/ForgotPasswordForm';

function makeHookState(
    overrides: Partial<{
        errors: {
            email?: { message?: string };
        };
        isSubmitting: boolean;
    }> = {}
) {
    return {
        register: mocks.register,
        handleSubmit: mocks.handleSubmit,
        errors: {},
        isSubmitting: false,
        onSubmit: mocks.onSubmit,
        ...overrides,
    };
}

describe('ForgotPasswordForm Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useForgotPasswordForm.mockReturnValue(makeHookState());
    });

    it('Renders auth copy, email field, and footer link', () => {
        render(<ForgotPasswordForm />);

        expect(screen.getByText('Password recovery', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
        expect(screen.getByText('Enter your email and we will send you a secure reset link.')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/signin');
    });

    it('Shows loading state and disables submit while submitting', () => {
        mocks.useForgotPasswordForm.mockReturnValue(
            makeHookState({
                isSubmitting: true,
            })
        );

        render(<ForgotPasswordForm />);

        expect(screen.getByRole('button', { name: /sending reset link/i })).toBeDisabled();
    });

    it('Wires form submit through handleSubmit', () => {
        const { container } = render(<ForgotPasswordForm />);
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
