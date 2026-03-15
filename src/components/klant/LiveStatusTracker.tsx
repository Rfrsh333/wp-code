"use client";

interface LiveDienst {
  id: string;
  datum: string;
  start_tijd: string;
  functie: string;
  locatie: string;
  status: string;
  aanmeldingen_geaccepteerd?: number;
  aantal_nodig: number;
}

interface LiveStatusTrackerProps {
  diensten: LiveDienst[];
  onTabChange: (tab: string) => void;
}

function isVandaag(datum: string): boolean {
  return new Date(datum).toDateString() === new Date().toDateString();
}

export default function LiveStatusTracker({ diensten, onTabChange }: LiveStatusTrackerProps) {
  const vandaag = diensten.filter((d) => isVandaag(d.datum));
  if (vandaag.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          <h3 className="font-bold text-[var(--kp-text-primary)] text-sm uppercase tracking-wider">
            Live vandaag
          </h3>
        </div>
        <button
          onClick={() => onTabChange("rooster")}
          className="text-[#F27501] text-xs font-semibold"
        >
          Alles →
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--kp-border)] overflow-hidden">
        {vandaag.map((dienst, i) => {
          const bezet = dienst.aanmeldingen_geaccepteerd ?? 0;
          const nodig = dienst.aantal_nodig;
          const vol = bezet >= nodig;

          return (
            <div
              key={dienst.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-[var(--kp-border)]" : ""
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  vol
                    ? "bg-green-500"
                    : bezet > 0
                    ? "bg-amber-400 animate-pulse"
                    : "bg-red-500 animate-pulse"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--kp-text-primary)] text-sm truncate">
                  {dienst.functie}
                </p>
                <p className="text-[var(--kp-text-tertiary)] text-xs truncate">
                  {dienst.locatie}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[var(--kp-text-primary)] text-sm font-medium">
                  {dienst.start_tijd?.slice(0, 5)}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    vol
                      ? "text-green-600"
                      : bezet > 0
                      ? "text-amber-600"
                      : "text-red-500"
                  }`}
                >
                  {bezet}/{nodig} ingepland
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
