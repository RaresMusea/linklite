'use client';

import { ComponentType } from 'react';

type StatusPanelProps = {
    icon: ComponentType<{ className?: string }>;
    iconClassName: string;
    panelClassName: string;
    hint: string;
};

export function StatusPanel({ icon: Icon, iconClassName, panelClassName, hint }: StatusPanelProps) {
    return (
        <div className={`rounded-xl border px-4 py-4 ${panelClassName}`}>
            <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassName}`} />
                <p className="text-sm text-foreground/90">{hint}</p>
            </div>
        </div>
    );
}
