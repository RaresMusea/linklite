import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInput, LoginSchema } from '@/validation/LoginSchema';
import { LoginResult, signIn } from '@/app/(auth)/signin/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const LOGIN_TOAST_OPTIONS = {
    duration: 3500,
    closeButton: true,
    dismissible: true,
    className:
        '!w-[min(92vw,640px)] !max-w-[640px] !bg-popover/90 !text-popover-foreground !border-border/70 !backdrop-blur-md',
};

const LOGIN_SUCCESS_TOAST_CLASS =
    '!w-[min(92vw,640px)] !max-w-[640px] register-success-toast !border !backdrop-blur-md';

export function useLoginForm() {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginInput>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginInput) => {
        const result: LoginResult = await signIn(data);

        if (!result.success) {
            let hasFieldErrors = false;

            if (result.fieldErrors) {
                for (const [field, messages] of Object.entries(result.fieldErrors)) {
                    if (!messages?.length) continue;
                    hasFieldErrors = true;

                    setError(field as keyof LoginInput, {
                        type: 'server',
                        message: messages[0],
                    });
                }
            }

            if (result.formError) {
                toast.error(result.formError, {
                    ...LOGIN_TOAST_OPTIONS,
                });
            } else if (!hasFieldErrors) {
                toast.error('Unable to log in into your account. Please try again.', {
                    ...LOGIN_TOAST_OPTIONS,
                });
            }

            return;
        }

        toast.success(result.message, {
            ...LOGIN_TOAST_OPTIONS,
            className: LOGIN_SUCCESS_TOAST_CLASS,
        });

        router.replace('/post-login');
    };

    return { onSubmit, handleSubmit, errors, isSubmitting, register };
}
