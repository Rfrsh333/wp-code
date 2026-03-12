"use client";

interface StatsBadgeProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: "orange" | "green" | "blue" | "yellow";
}

const colorMap = {
  orange: "bg-[#F27501]/10 text-[#F27501]",
  green: "bg-green-50 text-green-700",
  blue: "bg-blue-50 text-blue-700",
  yellow: "bg-yellow-50 text-yellow-700",
};

export default function StatsBadge({ label, value, icon, color = "orange" }: StatsBadgeProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${colorMap[color]}`}>
      {icon && <span className="text-lg">{icon}</span>}
      <div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}
