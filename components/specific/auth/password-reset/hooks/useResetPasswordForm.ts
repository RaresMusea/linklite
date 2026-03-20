import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { completeResetPassword } from '@/app/(auth)/reset-password/actions';
import { ResetPasswordInput, ResetPasswordSchema } from '@/validation/ResetPasswordSchema';

const RESET_PASSWORD_TOAST_OPTIONS = {
    duration: 4000,
    closeButton: true,
    dismissible: true,
    className:
        '!w-[min(92vw,640px)] !max-w-[640px] !bg-popover/90 !text-popover-foreground !border-border/70 !backdrop-blur-md',
};

const RESET_PASSWORD_SUCCESS_TOAST_CLASS =
    '!w-[min(92vw,640px)] !max-w-[640px] register-success-toast !border !backdrop-blur-md';

export function useResetPasswordForm(token: string) {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            token,
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: ResetPasswordInput) => {
        const result = await completeResetPassword(data);

        if (!result.success) {
            let hasFieldErrors = false;

            if (result.fieldErrors) {
                for (const [field, messages] of Object.entries(result.fieldErrors)) {
                    if (!messages?.length) continue;
                    hasFieldErrors = true;

                    setError(field as keyof ResetPasswordInput, {
                        type: 'server',
                        message: messages[0],
                    });
                }
            }

            if (result.formError) {
                toast.error(result.formError, {
                    ...RESET_PASSWORD_TOAST_OPTIONS,
                });
            } else if (!hasFieldErrors) {
                toast.error('Unable to reset password. Please try again.', {
                    ...RESET_PASSWORD_TOAST_OPTIONS,
                });
            }

            return;
        }

        toast.success(result.message, {
            ...RESET_PASSWORD_TOAST_OPTIONS,
            className: RESET_PASSWORD_SUCCESS_TOAST_CLASS,
        });

        router.replace('/signin');
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
    };
}
