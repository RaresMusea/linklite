import { Label } from '@/components/ui/label';
import React from 'react';

interface FormFieldProps {
    label: string;
    id: string;
    error?: string;
    children: React.ReactNode;
}

export function FormField({ label, id, error, children }: FormFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error && (
                <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
