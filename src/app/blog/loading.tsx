import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
