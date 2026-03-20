import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { requestPasswordReset } from '@/app/(auth)/forgot-password/actions';
import { ForgotPasswordInput, ForgotPasswordSchema } from '@/validation/ForgotPasswordSchema';

const FORGOT_PASSWORD_TOAST_OPTIONS = {
    duration: 4000,
    closeButton: true,
    dismissible: true,
    className:
        '!w-[min(92vw,640px)] !max-w-[640px] !bg-popover/90 !text-popover-foreground !border-border/70 !backdrop-blur-md',
};

const FORGOT_PASSWORD_SUCCESS_TOAST_CLASS =
    '!w-[min(92vw,640px)] !max-w-[640px] register-success-toast !border !backdrop-blur-md';

export function useForgotPasswordForm() {
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data: ForgotPasswordInput) => {
        const result = await requestPasswordReset(data);

        if (!result.success) {
            let hasFieldErrors = false;

            if (result.fieldErrors) {
                for (const [field, messages] of Object.entries(result.fieldErrors)) {
                    if (!messages?.length) continue;
                    hasFieldErrors = true;

                    setError(field as keyof ForgotPasswordInput, {
                        type: 'server',
                        message: messages[0],
                    });
                }
            }

            if (result.formError) {
                toast.error(result.formError, {
                    ...FORGOT_PASSWORD_TOAST_OPTIONS,
                });
            } else if (!hasFieldErrors) {
                toast.error('Unable to request password reset. Please try again.', {
                    ...FORGOT_PASSWORD_TOAST_OPTIONS,
                });
            }

            return;
        }

        toast.success(result.message, {
            ...FORGOT_PASSWORD_TOAST_OPTIONS,
            className: FORGOT_PASSWORD_SUCCESS_TOAST_CLASS,
        });
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
    };
}
