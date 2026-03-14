"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Sentry Test Page</h1>
        <p className="text-neutral-500">Klik op de knop om een test error naar Sentry te sturen.</p>
        <button
          className="bg-[#F27501] text-white px-6 py-3 rounded-lg font-semibold"
          onClick={() => {
            Sentry.startSpan({ name: "Example Frontend Span", op: "test" }, () => {
              const error = new Error("Sentry Frontend Test Error");
              Sentry.captureException(error);
              throw error;
            });
          }}
        >
          Test Error Sturen
        </button>
      </div>
    </div>
  );
}
