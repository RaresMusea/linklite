import { useForm, useWatch } from 'react-hook-form';
import { RegisterSchema, RegistrationInput } from '@/validation/RegisterSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUp } from '@/app/(auth)/register/actions';
import { toast } from 'sonner';

const REGISTER_TOAST_OPTIONS = {
    duration: 5000,
    closeButton: true,
    dismissible: true,
    className:
        '!w-[min(92vw,640px)] !max-w-[640px] !bg-popover/90 !text-popover-foreground !border-border/70 !backdrop-blur-md',
};

export function useRegistrationForm() {
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<RegistrationInput>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            terms: false,
        },
    });
    const passwordValue = useWatch({ control, name: 'password' });

    const onSubmit = async (data: RegistrationInput) => {
        const result = await signUp(data);

        if (!result.success) {
            let hasFieldErrors = false;

            if (result.fieldErrors) {
                for (const [field, messages] of Object.entries(result.fieldErrors)) {
                    if (!messages?.length) continue;
                    hasFieldErrors = true;

                    setError(field as keyof RegistrationInput, {
                        type: 'server',
                        message: messages[0],
                    });
                }
            }

            if (result.formError) {
                toast.error(result.formError, {
                    ...REGISTER_TOAST_OPTIONS,
                });
            } else if (!hasFieldErrors) {
                toast.error('Unable to create account. Please try again.', {
                    ...REGISTER_TOAST_OPTIONS,
                });
            }

            return;
        }

        toast.success(result.message, {
            ...REGISTER_TOAST_OPTIONS,
        });
    };

    return { register, control, errors, isSubmitting, passwordValue, handleSubmit, onSubmit };
}
