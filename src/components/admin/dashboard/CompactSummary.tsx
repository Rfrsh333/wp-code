import { LucideIcon } from "lucide-react";

interface SummaryItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

interface CompactSummaryProps {
  title: string;
  items: SummaryItem[];
}

export function CompactSummary({ title, items }: CompactSummaryProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <div key={index} className="flex items-start gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0">
                <Icon className="w-[15px] h-[15px] text-slate-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-slate-500">{item.label}</span>
                <span className="text-lg font-semibold text-slate-900 tabular-nums leading-none">
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
