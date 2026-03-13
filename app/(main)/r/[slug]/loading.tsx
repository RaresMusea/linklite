export default function Loading() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-background via-primary/5 to-background" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-md">
                <div className="w-full flex flex-col items-center gap-6 animate-pulse">
                    <div className="w-20 h-20 bg-secondary/50 rounded-2xl" />
                    <div className="w-full space-y-3">
                        <div className="h-8 bg-secondary/50 rounded-lg w-3/4 mx-auto" />
                        <div className="h-4 bg-secondary/30 rounded w-1/2 mx-auto" />
                    </div>
                    <div className="w-full h-44 bg-secondary/30 rounded-2xl" />
                    <div className="w-full h-2 bg-secondary/30 rounded-full" />
                </div>
            </div>
        </div>
    );
}
