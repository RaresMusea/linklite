import { useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/auth-client';

const SOCIAL_TOAST_OPTIONS = {
    duration: 5000,
    closeButton: true,
    dismissible: true,
    className:
        '!w-[min(92vw,640px)] !max-w-[640px] !bg-popover/90 !text-popover-foreground !border-border/70 !backdrop-blur-md',
};

export function useSocialAuth() {
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

    const onGoogleAuth = async () => {
        try {
            setIsGoogleSubmitting(true);
            await authClient.signIn.social({
                provider: 'google',
                callbackURL: '/post-login',
            });
        } catch {
            toast.error('Unable to continue with Google. Please try again.', {
                ...SOCIAL_TOAST_OPTIONS,
            });
            setIsGoogleSubmitting(false);
        }
    };

    return {
        isGoogleSubmitting,
        onGoogleAuth,
    };
}
