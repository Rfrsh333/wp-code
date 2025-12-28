export default function Loading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-6 h-5 w-48 bg-neutral-200 rounded animate-pulse" />

        {/* Title skeleton */}
        <div className="mb-6 h-12 w-96 bg-neutral-200 rounded animate-pulse" />

        {/* Description skeleton */}
        <div className="mb-8 space-y-3">
          <div className="h-6 bg-neutral-200 rounded animate-pulse" />
          <div className="h-6 w-5/6 bg-neutral-200 rounded animate-pulse" />
        </div>

        {/* USPs skeleton */}
        <div className="bg-gradient-to-br from-neutral-50 to-white rounded-2xl p-8 mb-12 border border-neutral-200">
          <div className="h-8 w-64 bg-neutral-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-neutral-200 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 h-6 bg-neutral-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-neutral-200">
              <div className="h-6 w-48 bg-neutral-200 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-5 bg-neutral-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
