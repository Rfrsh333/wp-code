import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-full max-w-lg mb-6" />
      <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
