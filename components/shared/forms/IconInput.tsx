import { Input } from '@/components/ui/input';
import { LucideIcon } from 'lucide-react';
import { ComponentProps } from 'react';

type IconInputProps = ComponentProps<'input'> & {
    icon: LucideIcon;
};

export function IconInput({ icon: Icon, ...props }: IconInputProps) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                className="border-border/80 pl-10 text-sm placeholder:text-sm placeholder:text-muted-foreground/90"
                {...props}
            />
        </div>
    );
}
