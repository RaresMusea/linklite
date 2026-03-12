import Link from 'next/link';
import { ArrowRight, LockKeyhole, Mail, User } from 'lucide-react';
import { AuthCard } from '@/components/shared/auth/AuthCard';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/animate-checkbox';
import { IconInput } from '@/components/shared/forms/IconInput';

export default function RegisterPage() {
    return (
        <AuthCard
            eyebrow="Create account"
            title="Register"
            description="Fill in your details and start using LinkLite."
            footer={
                <>
                    Already have an account?{' '}
                    <Link href="/signin" className="font-medium text-primary hover:underline">
                        Sign in
                    </Link>
                </>
            }
        >
            <form className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <IconInput icon={User} id="full-name" name="name" placeholder="Jane Doe" autoComplete="true" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <IconInput
                        icon={Mail}
                        id="email"
                        type="email"
                        name="email"
                        placeholder="jane@acme.com"
                        autoComplete="email"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <IconInput
                        icon={LockKeyhole}
                        id="password"
                        type="password"
                        placeholder="At least 8 characters"
                        name="password"
                        autoComplete="new-password"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <IconInput
                        icon={LockKeyhole}
                        id="confirm-password"
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        type="password"
                        name="confirmPassword"
                    />
                </div>

                <label className="mt-1 flex items-start gap-3 text-sm text-muted-foreground">
                    <Checkbox
                        id="terms"
                        name="terms"
                        className="mt-0.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <span>
                        I agree with the{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                            Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                        </Link>
                        .
                    </span>
                </label>

                <Button type="submit" size="lg" className="mt-2 w-full">
                    Create account
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </form>
        </AuthCard>
    );
}
