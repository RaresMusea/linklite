function SkeletonLine({ className }: { className: string }) {
    return <div className={`rounded-md bg-secondary/40 ${className}`} />;
}

function SkeletonPill({ className }: { className?: string }) {
    return <div className={`h-5 w-20 rounded-full bg-secondary/45 ${className ?? ''}`} />;
}

export default function Loading() {
    return (
        <main className="mx-auto container pt-10 mt-10 max-w-4xl px-4 py-10">
            <div className="animate-pulse">
                <header className="mb-8 space-y-3">
                    <SkeletonLine className="h-9 w-2/3 max-w-xl" />
                    <SkeletonLine className="h-4 w-full max-w-3xl" />
                    <SkeletonLine className="h-4 w-5/6 max-w-2xl" />
                </header>

                <section className="mb-10 rounded-2xl border p-5">
                    <div className="space-y-3">
                        <SkeletonLine className="h-7 w-56" />
                        <SkeletonLine className="h-4 w-80" />
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <div className="w-full min-w-160 space-y-3">
                            <div className="grid grid-cols-[1fr_2fr_80px] gap-4">
                                <SkeletonLine className="h-4 w-24" />
                                <SkeletonLine className="h-4 w-28" />
                                <SkeletonLine className="h-4 w-12 justify-self-end" />
                            </div>
                            {Array.from({ length: 8 }).map((_, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_2fr_80px] gap-4 border-t pt-3">
                                    <SkeletonLine className="h-4 w-28" />
                                    <SkeletonLine className="h-4 w-full" />
                                    <SkeletonLine className="h-4 w-8 justify-self-end" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mb-10 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border p-5">
                        <div className="space-y-3">
                            <SkeletonLine className="h-7 w-40" />
                            <SkeletonLine className="h-4 w-full" />
                        </div>
                        <ul className="mt-4 space-y-3">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <li key={idx} className="flex items-center justify-between">
                                    <SkeletonLine className="h-4 w-32" />
                                    <SkeletonPill />
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-2xl border p-5">
                        <div className="space-y-3">
                            <SkeletonLine className="h-7 w-56" />
                            <SkeletonLine className="h-4 w-full" />
                        </div>
                        <ul className="mt-4 space-y-3">
                            {Array.from({ length: 5 }).map((_, idx) => (
                                <li key={idx} className="flex items-center justify-between">
                                    <SkeletonLine className="h-4 w-40" />
                                    <SkeletonPill />
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="rounded-2xl border p-5">
                    <div className="space-y-3">
                        <SkeletonLine className="h-7 w-56" />
                        <div className="flex items-center gap-2">
                            <SkeletonLine className="h-4 w-72" />
                            <SkeletonPill className="w-14" />
                        </div>
                    </div>
                    <ul className="mt-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-secondary/60" />
                                <SkeletonLine className="h-4 w-80 max-w-full" />
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </main>
    );
}
