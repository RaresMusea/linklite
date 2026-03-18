'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SiGoogle } from 'react-icons/si';

type SocialAuthButtonsProps = {
    isGoogleSubmitting: boolean;
    isDisabled?: boolean;
    onGoogleAuthAction: () => void;
};

export function SocialAuthButtons({
    isGoogleSubmitting,
    isDisabled = false,
    onGoogleAuthAction,
}: SocialAuthButtonsProps) {
    return (
        <>
            <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                onClick={onGoogleAuthAction}
                disabled={isDisabled}
            >
                {isGoogleSubmitting ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Continuing with Google...
                    </>
                ) : (
                    <>
                        <SiGoogle className="h-4 w-4" />
                        Continue with Google
                    </>
                )}
            </Button>

            <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or continue with email</span>
                <span className="h-px flex-1 bg-border" />
            </div>
        </>
    );
}
