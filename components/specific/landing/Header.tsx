import {Link2} from "lucide-react";
import { ThemeToggler } from '@/components/shared/ThemeToggler';

export function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-10 h-10 bg-linear-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-sm">
                            <Link2 className="h-6 w-6 text-primary-foreground"/>
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-foreground">
              Link<span className="text-primary">Lite</span>
            </span>
                    </div>
                    <ThemeToggler />

                    {/*/!* Actions - desktop *!/*/}
                    {/*<div className="hidden sm:flex items-center gap-3">*/}
                    {/*    <button*/}
                    {/*        className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"*/}
                    {/*    >*/}
                    {/*        <LogIn className="h-4 w-4" />*/}
                    {/*        <span>Sign In</span>*/}
                    {/*    </button>*/}

                    {/*    <button*/}
                    {/*        className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-primary-foreground bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-200 transform hover:scale-105 shadow-sm"*/}
                    {/*    >*/}
                    {/*        <UserPlus className="h-4 w-4" />*/}
                    {/*        <span>Sign Up</span>*/}
                    {/*    </button>*/}
                    {/*</div>*/}

                    {/*/!* Actions - mobile *!/*/}
                    {/*<div className="flex sm:hidden items-center gap-2">*/}
                    {/*    <button*/}
                    {/*        className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"*/}
                    {/*        aria-label="Sign in"*/}
                    {/*    >*/}
                    {/*        <LogIn className="h-5 w-5" />*/}
                    {/*    </button>*/}

                    {/*    <button*/}
                    {/*        className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-sm"*/}
                    {/*    >*/}
                    {/*        <UserPlus className="h-4 w-4 mr-1.5" />*/}
                    {/*        <span>Sign Up</span>*/}
                    {/*    </button>*/}
                    {/*</div>*/}
                </div>
            </div>
        </header>
    );
}
