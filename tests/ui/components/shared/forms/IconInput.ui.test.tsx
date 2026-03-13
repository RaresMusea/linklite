import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { IconInput } from '@/components/shared/forms/IconInput';

describe('IconInput Component', () => {
    it('Renders an input and icon', () => {
        const { container } = render(<IconInput icon={Mail} placeholder="Email address" aria-label="email" />);

        const input = screen.getByLabelText('email');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('placeholder', 'Email address');

        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveClass('pointer-events-none');
        expect(icon).toHaveClass('absolute');
        expect(icon).toHaveClass('left-3');
        expect(icon).toHaveClass('-translate-y-1/2');
        expect(icon).toHaveClass('text-muted-foreground');
    });

    it('Forwards native input props', () => {
        render(
            <IconInput
                icon={Mail}
                aria-label="work-email"
                name="email"
                type="email"
                autoComplete="email"
                disabled
                required
                defaultValue="jane@company.com"
            />
        );

        const input = screen.getByLabelText('work-email');
        expect(input).toHaveAttribute('name', 'email');
        expect(input).toHaveAttribute('type', 'email');
        expect(input).toHaveAttribute('autocomplete', 'email');
        expect(input).toBeDisabled();
        expect(input).toBeRequired();
        expect(input).toHaveValue('jane@company.com');
    });

    it('Calls onChange when typing', () => {
        const handleChange = vi.fn();

        render(<IconInput icon={Mail} aria-label="email" onChange={handleChange} />);

        fireEvent.change(screen.getByLabelText('email'), { target: { value: 'new@mail.com' } });

        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('Applies base input styling classes', () => {
        render(<IconInput icon={Mail} aria-label="email" />);

        const input = screen.getByLabelText('email');
        expect(input).toHaveClass('pl-10');
        expect(input).toHaveClass('text-sm');
        expect(input).toHaveClass('border-border/80');
        expect(input).toHaveClass('placeholder:text-sm');
        expect(input).toHaveClass('placeholder:text-muted-foreground/90');
    });
});
