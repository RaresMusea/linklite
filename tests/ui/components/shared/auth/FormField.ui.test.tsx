import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FormField } from '@/components/shared/auth/FormField';

describe('FormField Component', () => {
    it('Renders label and field content', () => {
        render(
            <FormField label="Email" id="email">
                <input id="email" aria-label="email-input" />
            </FormField>
        );

        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('email-input')).toBeInTheDocument();
    });

    it('Associates label with input id', () => {
        render(
            <FormField label="Password" id="password">
                <input id="password" />
            </FormField>
        );

        expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('Renders error text with deterministic error id when error is provided', () => {
        render(
            <FormField label="Name" id="full-name" error="Name is too short">
                <input id="full-name" />
            </FormField>
        );

        const error = screen.getByText('Name is too short');
        expect(error).toBeInTheDocument();
        expect(error).toHaveAttribute('id', 'full-name-error');
    });

    it('Does not render error element when no error is provided', () => {
        render(
            <FormField label="Name" id="full-name">
                <input id="full-name" />
            </FormField>
        );

        expect(screen.queryByText('Name is too short')).not.toBeInTheDocument();
    });
});
