import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  label: string;
  count?: number;
  urgent?: boolean;
  icon?: LucideIcon;
}

interface ActionCardProps {
  items: ActionItem[];
  onItemClick: (id: string) => void;
  emptyState?: {
    title: string;
    description: string;
  };
}

export function ActionCard({ items, onItemClick, emptyState }: ActionCardProps) {
  if (items.length === 0 && emptyState) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100">
            <svg className="w-[18px] h-[18px] text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-emerald-900">
              {emptyState.title}
            </h3>
            <p className="text-xs text-emerald-700 mt-1">
              {emptyState.description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Actie vereist
          </h3>
          {items.some(item => item.urgent) && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded tabular-nums">
              {items.filter(item => item.urgent).length} urgent
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {items.map((item) => {
          const ItemIcon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-slate-50 transition-colors duration-200 text-left group"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {item.urgent && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
                {!item.urgent && ItemIcon && (
                  <ItemIcon className="flex-shrink-0 w-[15px] h-[15px] text-slate-400" />
                )}
                <span className={cn(
                  "text-sm truncate",
                  item.urgent ? "text-slate-900 font-medium" : "text-slate-600"
                )}>
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded tabular-nums">
                    {item.count}
                  </span>
                )}
              </div>
              <ArrowRight className="w-[15px] h-[15px] text-slate-300 group-hover:text-slate-400 transition-colors duration-200 flex-shrink-0 ml-2" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
