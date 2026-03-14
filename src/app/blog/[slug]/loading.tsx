import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Skeleton className="h-3 w-32 mb-6" />
      <Skeleton className="h-10 w-full mb-2" />
      <Skeleton className="h-10 w-3/4 mb-4" />
      <div className="flex gap-4 mb-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl mb-8" />
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
