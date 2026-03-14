import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <Skeleton className="h-10 w-72 mx-auto mb-3" />
        <Skeleton className="h-10 w-full max-w-xl mx-auto mb-3" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="mb-8">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="bg-white rounded-lg border border-neutral-200 p-4">
                <Skeleton className="h-5 w-full max-w-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
