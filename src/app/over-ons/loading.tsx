import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-56 mx-auto mb-3" />
        <Skeleton className="h-4 w-full max-w-xl mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-8">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-6">
            <Skeleton className="h-10 w-10 rounded-lg mb-3" />
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
