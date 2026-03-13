import { Input } from '@/components/ui/input';
import { LucideIcon } from 'lucide-react';
import { ComponentProps, forwardRef } from 'react';

type IconInputProps = ComponentProps<'input'> & {
    icon: LucideIcon;
};

export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(({ icon: Icon, ...props }, ref) => {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                ref={ref}
                className="border-border/80 pl-10 text-sm placeholder:text-sm placeholder:text-muted-foreground/90"
                {...props}
            />
        </div>
    );
});

IconInput.displayName = 'IconInput';
