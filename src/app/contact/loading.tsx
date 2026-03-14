import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-48 mx-auto mb-3" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white rounded-xl border border-neutral-200 p-8 space-y-5">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-5">
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
