"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/Toast";

const registerSchema = z.object({
  bedrijfsnaam: z.string().min(2, "Bedrijfsnaam is verplicht"),
  contactpersoon: z.string().min(2, "Contactpersoon is verplicht"),
  email: z.string().min(1, "Vul een geldig emailadres in").email("Vul een geldig emailadres in"),
  telefoon: z.string().optional(),
  wachtwoord: z.string().min(8, "Wachtwoord moet minimaal 8 tekens bevatten"),
  wachtwoordBevestig: z.string().min(1, "Bevestig uw wachtwoord"),
}).refine((data) => data.wachtwoord === data.wachtwoordBevestig, {
  message: "Wachtwoorden komen niet overeen",
  path: ["wachtwoordBevestig"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function KlantRegistreren() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  const onSubmit = async (formData: RegisterFormData) => {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/klant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedrijfsnaam: formData.bedrijfsnaam,
          contactpersoon: formData.contactpersoon,
          email: formData.email,
          telefoon: formData.telefoon,
          wachtwoord: formData.wachtwoord,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Account aangemaakt! Welkom bij TopTalent.");
        router.push("/klant/dashboard");
      } else {
        setError(data.error || "Er ging iets mis");
      }
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-80 h-80 border border-[#F27501]/30 rounded-full" />
          <div className="absolute bottom-10 left-10 w-64 h-64 border border-[#F27501]/20 rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Image src="/favicon-icon.png" alt="TopTalent" width={36} height={36} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Word klant</h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Registreer uw bedrijf en krijg direct toegang tot TopTalent Business. Personeel aanvragen, uren beheren en facturen inzien.
          </p>
          <div className="mt-10 space-y-4 text-left">
            {[
              "Direct personeel aanvragen",
              "Uren inzien en goedkeuren",
              "Facturen en kosten overzicht",
              "Medewerkers beoordelen",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#F27501]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-neutral-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right registration form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-neutral-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-[#F27501] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Image src="/favicon-icon.png" alt="TopTalent" width={28} height={28} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-neutral-900/5 p-8 border border-neutral-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900">Account aanmaken</h2>
              <p className="text-neutral-500 mt-2">Registreer uw bedrijf bij TopTalent</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Bedrijfsnaam *</label>
                <input
                  type="text"
                  {...register("bedrijfsnaam")}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Uw bedrijfsnaam"
                />
                {errors.bedrijfsnaam && <p className="text-red-500 text-sm mt-1">{errors.bedrijfsnaam.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Contactpersoon *</label>
                <input
                  type="text"
                  {...register("contactpersoon")}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Uw volledige naam"
                />
                {errors.contactpersoon && <p className="text-red-500 text-sm mt-1">{errors.contactpersoon.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="jouw@bedrijf.nl"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Telefoonnummer</label>
                <input
                  type="tel"
                  {...register("telefoon")}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="06 12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Wachtwoord *</label>
                <input
                  type="password"
                  {...register("wachtwoord")}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Minimaal 8 tekens"
                />
                {errors.wachtwoord && <p className="text-red-500 text-sm mt-1">{errors.wachtwoord.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Wachtwoord bevestigen *</label>
                <input
                  type="password"
                  {...register("wachtwoordBevestig")}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501] transition-colors"
                  placeholder="Herhaal wachtwoord"
                />
                {errors.wachtwoordBevestig && <p className="text-red-500 text-sm mt-1">{errors.wachtwoordBevestig.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50 mt-2"
              >
                {isLoading ? "Account aanmaken..." : "Account aanmaken"}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-neutral-500">
                Heeft u al een account?{" "}
                <Link href="/klant/login" className="text-[#F27501] hover:text-[#d96800] font-medium transition-colors">
                  Inloggen
                </Link>
              </p>
              <Link href="/" className="text-sm text-neutral-400 hover:text-[#F27501] transition-colors block">
                &larr; Terug naar website
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
