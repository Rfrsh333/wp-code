"use client";

import { useState, useEffect } from "react";
import { Users, Gift, Share2, Copy, Check, Mail, MessageCircle, Send } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

interface Referral {
  id: string;
  naam: string;
  status: string;
  created_at: string;
  bonus_verdiend: number;
}

export default function ReferralClient() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/referral");
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals || []);
        setReferralCode(data.referral_code || "");
      }
    } catch (err) {
      console.error("Fetch referrals error:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link gekopieerd!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    const text = `Word medewerker bij TopTalent! Gebruik mijn referral link en we verdienen beide €50: ${link}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "TopTalent Referral", text, url: link });
      } catch (err) {
        // User cancelled share
      }
    } else {
      copyReferralLink();
    }
  };

  const shareViaWhatsApp = () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    const text = `Word medewerker bij TopTalent! Gebruik mijn referral link en we verdienen beide €50: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaLinkedIn = () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, '_blank');
  };

  const shareViaFacebook = () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    const text = `Word medewerker bij TopTalent! Gebruik mijn referral link en we verdienen beide €50:`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
  };

  const shareViaEmail = () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    const subject = "Word medewerker bij TopTalent!";
    const body = `Hoi!\n\nIk werk bij TopTalent en vind het echt top! Als jij je via mijn referral link aanmeldt, verdienen we allebei €50.\n\nGebruik deze link om je aan te melden:\n${link}\n\nGroetjes!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaSMS = () => {
    const link = `https://toptalentjobs.nl/medewerker/aanmelden?ref=${referralCode}`;
    const text = `Word medewerker bij TopTalent! Gebruik mijn referral link en we verdienen beide €50: ${link}`;
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  };

  const shareViaInstagram = () => {
    copyReferralLink();
    toast.info("Link gekopieerd! Open Instagram en plak de link in je story of bio");
  };

  const shareViaSnapchat = () => {
    copyReferralLink();
    toast.info("Link gekopieerd! Open Snapchat en plak de link");
  };

  const totaalVerdiend = referrals.reduce((sum, r) => sum + (r.bonus_verdiend || 0), 0);
  const actieveReferrals = referrals.filter((r) => r.status === "actief").length;

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
          <div className="px-4 py-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">
              Vrienden werven
            </h1>
            <p className="text-sm text-[var(--mp-text-secondary)] mt-1">
              Verdien €50 per vriend die je werft!
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-w-4xl mx-auto">
          {/* Hero card */}
          <div className="bg-gradient-to-br from-[var(--mp-accent)] to-[var(--mp-accent-dark)] rounded-[var(--mp-radius)] p-6 text-white mb-6 shadow-[var(--mp-shadow-elevated)]">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">€50 per vriend!</h2>
                <p className="text-sm text-white/90">
                  Werf een vriend en jullie verdienen allebei €50 zodra je vriend zijn eerste dienst heeft afgerond.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">{actieveReferrals}</div>
                <div className="text-sm text-white/80 mt-1">Geworven vrienden</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">€{totaalVerdiend}</div>
                <div className="text-sm text-white/80 mt-1">Totaal verdiend</div>
              </div>
            </div>
          </div>

          {/* Referral link card */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)] mb-6">
            <h3 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
              Jouw referral link
            </h3>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 px-4 py-3 rounded-xl bg-[var(--mp-bg)] text-[var(--mp-text-primary)] text-sm font-mono border border-[var(--mp-separator)] truncate">
                toptalentjobs.nl/aanmelden?ref={referralCode}
              </div>
              <button
                onClick={copyReferralLink}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] flex items-center justify-center text-[var(--mp-text-secondary)] hover:text-[var(--mp-accent)] hover:border-[var(--mp-accent)] transition-all"
                aria-label="Kopiëren"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-[var(--mp-success)]" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              onClick={shareReferralLink}
              className="w-full py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-[0.98] hover:bg-[var(--mp-accent-dark)] flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Deel referral link
            </button>

            {/* Social Media Share Options */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-[var(--mp-text-secondary)] mb-3">
                Of deel via:
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {/* WhatsApp */}
                <button
                  onClick={shareViaWhatsApp}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-green-500/10 border border-[var(--mp-separator)] hover:border-green-500 transition-all active:scale-95 group"
                  aria-label="Deel via WhatsApp"
                >
                  <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-green-600 font-medium">
                    WhatsApp
                  </span>
                </button>

                {/* Instagram */}
                <button
                  onClick={shareViaInstagram}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-pink-500/10 border border-[var(--mp-separator)] hover:border-pink-500 transition-all active:scale-95 group"
                  aria-label="Deel via Instagram"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FD5949] via-[#D6249F] to-[#285AEB] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-pink-600 font-medium">
                    Instagram
                  </span>
                </button>

                {/* Snapchat */}
                <button
                  onClick={shareViaSnapchat}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-yellow-500/10 border border-[var(--mp-separator)] hover:border-yellow-500 transition-all active:scale-95 group"
                  aria-label="Deel via Snapchat"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FFFC00] flex items-center justify-center">
                    <svg className="w-6 h-6" fill="black" viewBox="0 0 24 24">
                      <path d="M12.206 2c.195 0 .402.01.61.03 2.195.185 3.69 1.38 4.446 3.553.093.27.144.582.148.925v.238c0 .23-.004.45-.013.658a4.5 4.5 0 00.817.08c.495 0 .867-.09 1.107-.268.112-.085.178-.194.198-.33a.375.375 0 01.346-.285c.134 0 .247.073.331.216.08.135.117.302.112.483-.025.69-.507 1.186-1.44 1.482-.24.076-.513.124-.815.143.085.06.175.128.268.203.638.506 1.556 1.234 1.79 1.124.042-.02.085-.047.127-.082.183-.155.39-.33.658-.293.225.03.386.178.475.435.046.132.058.28.036.438-.028.192-.095.378-.202.554-.302.494-.955.806-1.943 1.2-.23.09-.462.175-.69.255-.032.113-.063.224-.094.333-.18.62-.365 1.26-.748 1.808-.54.77-1.446 1.204-2.7 1.293-.265.018-.504.067-.714.142-.305.11-.535.254-.792.438l-.086.062c-.41.298-.875.635-1.622.747-.118.018-.238.026-.36.026-.545 0-1.052-.148-1.505-.438-.47-.302-.82-.72-1.106-1.32a7.617 7.617 0 01-.493-1.458c-.085-.357-.127-.706-.127-1.043 0-.42.062-.807.183-1.152.185-.523.493-.944.915-1.253.422-.31.943-.464 1.552-.464.203 0 .408.02.61.06a3.87 3.87 0 00-.493-1.043c-.493-.747-1.085-1.126-1.76-1.126-.245 0-.495.043-.748.128a2.936 2.936 0 01-.792.128c-.42 0-.783-.14-1.08-.416-.294-.275-.476-.64-.544-1.084-.027-.178-.016-.343.034-.492.088-.265.257-.417.502-.45.268-.037.475.138.658.293.042.035.085.062.127.082.234.11 1.152-.618 1.79-1.124.093-.075.183-.143.268-.203-.302-.02-.575-.067-.815-.143-.933-.296-1.415-.792-1.44-1.482-.005-.18.032-.348.112-.483.084-.143.197-.216.331-.216a.375.375 0 01.346.285c.02.136.086.245.198.33.24.178.612.268 1.107.268.284 0 .563-.027.817-.08-.01-.208-.013-.428-.013-.658v-.238c.004-.343.055-.655.148-.925.756-2.173 2.25-3.368 4.446-3.553.208-.02.415-.03.61-.03z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-yellow-600 font-medium">
                    Snapchat
                  </span>
                </button>

                {/* LinkedIn */}
                <button
                  onClick={shareViaLinkedIn}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-blue-500/10 border border-[var(--mp-separator)] hover:border-blue-600 transition-all active:scale-95 group"
                  aria-label="Deel via LinkedIn"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-blue-600 font-medium">
                    LinkedIn
                  </span>
                </button>

                {/* Facebook */}
                <button
                  onClick={shareViaFacebook}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-blue-500/10 border border-[var(--mp-separator)] hover:border-blue-700 transition-all active:scale-95 group"
                  aria-label="Deel via Facebook"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-blue-700 font-medium">
                    Facebook
                  </span>
                </button>

                {/* Twitter/X */}
                <button
                  onClick={shareViaTwitter}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--mp-separator)] hover:border-black dark:hover:border-white transition-all active:scale-95 group"
                  aria-label="Deel via X (Twitter)"
                >
                  <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
                    <svg className="w-4 h-4 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-black dark:group-hover:text-white font-medium">
                    X
                  </span>
                </button>

                {/* Email */}
                <button
                  onClick={shareViaEmail}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-gray-500/10 border border-[var(--mp-separator)] hover:border-gray-500 transition-all active:scale-95 group"
                  aria-label="Deel via Email"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-gray-600 font-medium">
                    Email
                  </span>
                </button>

                {/* SMS */}
                <button
                  onClick={shareViaSMS}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--mp-bg)] hover:bg-green-500/10 border border-[var(--mp-separator)] hover:border-green-600 transition-all active:scale-95 group"
                  aria-label="Deel via SMS"
                >
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-[var(--mp-text-tertiary)] group-hover:text-green-600 font-medium">
                    SMS
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Hoe werkt het */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)] mb-6">
            <h3 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
              Hoe werkt het?
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--mp-accent)]/10 text-[var(--mp-accent)] font-bold flex items-center justify-center text-sm">
                  1
                </div>
                <div>
                  <div className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                    Deel je link
                  </div>
                  <div className="text-sm text-[var(--mp-text-secondary)]">
                    Stuur je persoonlijke referral link naar vrienden
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--mp-accent)]/10 text-[var(--mp-accent)] font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <div className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                    Vriend meldt zich aan
                  </div>
                  <div className="text-sm text-[var(--mp-text-secondary)]">
                    Je vriend maakt een account aan via jouw link
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--mp-accent)]/10 text-[var(--mp-accent)] font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <div className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                    Eerste dienst voltooid
                  </div>
                  <div className="text-sm text-[var(--mp-text-secondary)]">
                    Zodra je vriend zijn eerste dienst heeft afgerond
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--mp-success)]/10 text-[var(--mp-success)] font-bold flex items-center justify-center text-sm">
                  ✓
                </div>
                <div>
                  <div className="font-semibold text-[var(--mp-text-primary)] text-sm mb-1">
                    Jullie verdienen €50!
                  </div>
                  <div className="text-sm text-[var(--mp-text-secondary)]">
                    Jullie ontvangen allebei €50 bonus
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Geworven vrienden lijst */}
          {referrals.length > 0 && (
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)]">
              <h3 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
                Jouw referrals
              </h3>
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--mp-bg)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--mp-accent)]/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[var(--mp-accent)]" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--mp-text-primary)] text-sm">
                          {referral.naam}
                        </div>
                        <div className="text-xs text-[var(--mp-text-tertiary)]">
                          {new Date(referral.created_at).toLocaleDateString("nl-NL")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[var(--mp-accent)]">
                        €{referral.bonus_verdiend}
                      </div>
                      <div
                        className={`text-xs ${
                          referral.status === "actief"
                            ? "text-[var(--mp-success)]"
                            : "text-[var(--mp-text-tertiary)]"
                        }`}
                      >
                        {referral.status === "actief" ? "Actief" : "In behandeling"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}
