import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'bg-gradient-to-r from-surface via-surface-hover to-surface bg-[length:200%_100%] animate-shimmer rounded-lg',
            className
          )}
        />
      ))}
    </>
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="bg-surface/70 border border-surface-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-16 h-4 ml-auto" />
      </div>
      <Skeleton className="w-full h-5" />
      <Skeleton className="w-4/5 h-5" />
      <Skeleton className="w-full h-12" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
    </div>
  );
}
