import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-white via-orange-50/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Skeleton className="h-8 w-64 mx-auto mb-6 rounded-full" />
            <Skeleton className="h-12 w-full max-w-2xl mx-auto mb-4" />
            <Skeleton className="h-12 w-3/4 mx-auto mb-6" />
            <Skeleton className="h-6 w-full max-w-xl mx-auto mb-8" />
            <div className="flex justify-center gap-8 mb-10">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </section>

      {/* Segment tabs skeleton */}
      <section className="py-12 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-32 rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      {/* Featured cases skeleton */}
      <section className="py-20 bg-gradient-to-b from-white to-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Skeleton className="h-6 w-40 mx-auto mb-4 rounded-full" />
            <Skeleton className="h-10 w-80 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-neutral-200">
                <Skeleton className="h-6 w-40 mb-6 rounded-full" />
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4 mb-6" />
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3 mb-6" />
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-4 w-full mb-8" />
                <div className="pt-6 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
