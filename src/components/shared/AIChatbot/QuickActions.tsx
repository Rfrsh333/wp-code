"use client";

import type { UserType } from "@/types/chatbot";

interface QuickActionsProps {
  userType: UserType;
  onSelect: (message: string) => void;
  onHandoff: () => void;
}

const medewerkerActions = [
  { label: "Shifts & beschikbaarheid", message: "Hoe kan ik me aanmelden voor shifts?" },
  { label: "Uren & betaling", message: "Wanneer word ik betaald voor mijn gewerkte uren?" },
  { label: "Mijn profiel", message: "Hoe kan ik mijn profielgegevens wijzigen?" },
  { label: "Documenten", message: "Welke documenten moet ik uploaden?" },
];

const klantActions = [
  { label: "Personeel aanvragen", message: "Hoe kan ik personeel aanvragen?" },
  { label: "Uren goedkeuren", message: "Hoe keur ik de gewerkte uren goed?" },
  { label: "Facturatie", message: "Hoe werkt de facturatie?" },
  { label: "Tarieven", message: "Wat zijn de uurtarieven?" },
];

export default function QuickActions({ userType, onSelect, onHandoff }: QuickActionsProps) {
  const actions = userType === "medewerker" ? medewerkerActions : klantActions;

  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
        Waar kan ik je mee helpen?
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onSelect(action.message)}
            className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium rounded-full transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
      <button
        onClick={onHandoff}
        className="w-full mt-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-xl border border-green-200 dark:border-green-800 transition-colors"
      >
        Spreek een medewerker
      </button>
    </div>
  );
}
