import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    useRegistrationForm: vi.fn(),
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

vi.mock('@/components/ui/animate-checkbox', () => ({
    Checkbox: ({
        id,
        checked,
        onCheckedChange,
        ...props
    }: {
        id?: string;
        checked?: boolean;
        onCheckedChange?: (checked: boolean) => void;
    }) => (
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            {...props}
        />
    ),
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props}>{children}</button>
    ),
}));

vi.mock('react-hook-form', () => ({
    Controller: ({
        render,
    }: {
        render: (args: { field: { value: boolean; onChange: (value: boolean) => void } }) => React.ReactNode;
    }) => render({ field: { value: false, onChange: vi.fn() } }),
}));

vi.mock('@/components/specific/auth/register/hooks/useRegistrationForm', () => ({
    useRegistrationForm: mocks.useRegistrationForm,
}));

import { RegistrationForm } from '@/components/specific/auth/register/RegistrationForm';

function makeHookState(
    overrides: Partial<{
        errors: {
            name?: { message?: string };
            email?: { message?: string };
            password?: { message?: string };
            confirmPassword?: { message?: string };
            terms?: { message?: string };
        };
        isSubmitting: boolean;
        passwordValue: string;
    }> = {}
) {
    return {
        register: mocks.register,
        control: {},
        errors: {},
        isSubmitting: false,
        passwordValue: '',
        handleSubmit: mocks.handleSubmit,
        onSubmit: mocks.onSubmit,
        ...overrides,
    };
}

describe('RegistrationForm Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useRegistrationForm.mockReturnValue(makeHookState());
    });

    it('Renders auth copy, base fields, and footer links', () => {
        render(<RegistrationForm />);

        expect(screen.getByText('Create account', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
        expect(screen.getByText('Fill in your details and start using LinkLite.')).toBeInTheDocument();
        expect(screen.getByLabelText('Full name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
    });

    it('Shows confirm password only when password has value', () => {
        const { rerender } = render(<RegistrationForm />);
        expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();

        mocks.useRegistrationForm.mockReturnValue(
            makeHookState({
                passwordValue: 'Strong_Ab',
            })
        );
        rerender(<RegistrationForm />);

        expect(screen.getByPlaceholderText('Re-enter your password')).toBeInTheDocument();
    });

    it('Shows terms error when provided by hook state', () => {
        mocks.useRegistrationForm.mockReturnValue(
            makeHookState({
                errors: {
                    terms: { message: 'You must accept the terms and the privacy policy.' },
                },
            })
        );

        render(<RegistrationForm />);

        expect(screen.getByText('You must accept the terms and the privacy policy.')).toBeInTheDocument();
    });

    it('Shows loading state and disables submit while submitting', () => {
        mocks.useRegistrationForm.mockReturnValue(
            makeHookState({
                isSubmitting: true,
            })
        );

        render(<RegistrationForm />);

        const submitButton = screen.getByRole('button', { name: /creating account/i });
        expect(submitButton).toBeDisabled();
    });

    it('Wires form submit through handleSubmit', () => {
        const { container } = render(<RegistrationForm />);
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
