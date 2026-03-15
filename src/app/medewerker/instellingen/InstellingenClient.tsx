"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Mail, Lock, Shield, Eye, Moon, Globe } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

export default function InstellingenClient() {
  const router = useRouter();
  const [notificaties, setNotificaties] = useState(true);
  const [emailNotificaties, setEmailNotificaties] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleToggle = (setting: string, value: boolean) => {
    toast.success(`${setting} ${value ? "ingeschakeld" : "uitgeschakeld"}`);
  };

  const settings = [
    {
      title: "Notificaties",
      items: [
        {
          icon: Bell,
          label: "Push notificaties",
          description: "Ontvang meldingen voor nieuwe diensten",
          value: notificaties,
          onChange: (v: boolean) => {
            setNotificaties(v);
            handleToggle("Push notificaties", v);
          },
        },
        {
          icon: Mail,
          label: "Email notificaties",
          description: "Ontvang updates per email",
          value: emailNotificaties,
          onChange: (v: boolean) => {
            setEmailNotificaties(v);
            handleToggle("Email notificaties", v);
          },
        },
      ],
    },
    {
      title: "Weergave",
      items: [
        {
          icon: Moon,
          label: "Donkere modus",
          description: "Gebruik donker thema",
          value: darkMode,
          onChange: (v: boolean) => {
            setDarkMode(v);
            handleToggle("Donkere modus", v);
          },
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: Lock,
          label: "Wachtwoord wijzigen",
          description: "Wijzig je wachtwoord",
          onClick: () => router.push("/medewerker/wachtwoord-reset"),
        },
        {
          icon: Shield,
          label: "Tweefactorauthenticatie",
          description: "Extra beveiliging voor je account",
          onClick: () => toast.info("2FA configuratie komt binnenkort"),
        },
        {
          icon: Eye,
          label: "Privacyinstellingen",
          description: "Beheer je privacy voorkeuren",
          onClick: () => toast.info("Privacy instellingen komen binnenkort"),
        },
      ],
    },
  ];

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] pt-4 pb-6 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white mb-4 transition-opacity active:opacity-70"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Instellingen</h1>
            <p className="text-white/80 text-sm mt-1">Beheer je voorkeuren en account</p>
          </div>
        </div>

        {/* Settings */}
        <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4">
          {settings.map((section, idx) => (
            <div key={idx} className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] overflow-hidden shadow-[var(--mp-shadow)]">
              <div className="px-4 py-3 border-b border-[var(--mp-separator)]">
                <h2 className="text-sm font-semibold text-[var(--mp-text-secondary)]">
                  {section.title}
                </h2>
              </div>
              <div className="divide-y divide-[var(--mp-separator)]">
                {section.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isToggle = "value" in item;

                  return (
                    <div key={itemIdx} className="px-4 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[var(--mp-text-secondary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--mp-text-primary)]">
                          {item.label}
                        </div>
                        <div className="text-xs text-[var(--mp-text-tertiary)] mt-0.5">
                          {item.description}
                        </div>
                      </div>
                      {isToggle ? (
                        <button
                          onClick={() => item.onChange(!item.value)}
                          className={`relative w-12 h-7 rounded-full transition-colors ${
                            item.value ? "bg-[var(--mp-accent)]" : "bg-[var(--mp-separator)]"
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                              item.value ? "translate-x-5" : ""
                            }`}
                          />
                        </button>
                      ) : (
                        <button
                          onClick={item.onClick}
                          className="text-[var(--mp-accent)] text-sm font-medium"
                        >
                          Wijzig
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Spacing */}
        <div className="h-8" />
      </div>
    </MedewerkerResponsiveLayout>
  );
}
