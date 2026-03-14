import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <Skeleton className="h-10 w-64 mx-auto mb-3" />
        <Skeleton className="h-4 w-full max-w-lg mx-auto" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20 items-center">
          <div className={i % 2 === 1 ? "lg:order-2" : ""}>
            <Skeleton className="h-7 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />
            <div className="space-y-2">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-full max-w-sm" />
              ))}
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
