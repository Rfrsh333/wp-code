"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { socialLinks } from "@/lib/social-links";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileDienstenOpen, setIsMobileDienstenOpen] = useState(false);
  const [isDienstenOpen, setIsDienstenOpen] = useState(false);
  const dienstenRef = useRef<HTMLDivElement>(null);

  const closeDiensten = useCallback(() => setIsDienstenOpen(false), []);

  // Close desktop dropdown on Escape or outside click
  useEffect(() => {
    if (!isDienstenOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDiensten();
    };
    const handleClick = (e: MouseEvent) => {
      if (dienstenRef.current && !dienstenRef.current.contains(e.target as Node)) closeDiensten();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isDienstenOpen, closeDiensten]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll lock when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* Top Bar - Subtle and Professional - Hidden on mobile */}
      <div className="hidden md:block bg-neutral-900 py-2.5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-6">
              <a
                href="mailto:info@toptalentjobs.nl"
                className="flex items-center text-neutral-300 hover:text-white transition-colors duration-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                info@toptalentjobs.nl
              </a>
              <a
                href="tel:+31617177939"
                className="hidden sm:flex items-center text-neutral-300 hover:text-white transition-colors duration-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +31 6 17 17 79 39
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden md:inline text-neutral-300 text-xs tracking-wide">
                24/7 beschikbaar voor uw vragen
              </span>
              <div className="flex items-center gap-1">
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-[#F27501] transition-colors duration-300 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Instagram"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-[#F27501] transition-colors duration-300 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`bg-white sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? "shadow-lg shadow-neutral-900/5" : "shadow-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="TopTalent Jobs"
                width={288}
                height={144}
                className="h-34 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link
                href="/"
                className="px-4 py-2 text-neutral-900 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Home
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <div className="relative" ref={dienstenRef} onMouseEnter={() => setIsDienstenOpen(true)} onMouseLeave={() => setIsDienstenOpen(false)}>
                <button
                  onClick={() => setIsDienstenOpen(!isDienstenOpen)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsDienstenOpen(!isDienstenOpen); }
                    if (e.key === "ArrowDown") { e.preventDefault(); setIsDienstenOpen(true); }
                  }}
                  aria-expanded={isDienstenOpen}
                  aria-haspopup="true"
                  className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 flex items-center gap-1"
                >
                  Diensten
                  <svg className={`w-4 h-4 transition-transform duration-300 ${isDienstenOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`absolute left-0 top-full pt-2 transition-all duration-300 ${isDienstenOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                  <div className="bg-white rounded-xl shadow-xl shadow-neutral-900/10 border border-neutral-100 py-2 min-w-[200px]" role="menu">
                    <Link
                      href="/diensten/"
                      role="menuitem"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                      onClick={closeDiensten}
                    >
                      Alle Diensten
                    </Link>
                    <Link
                      href="/diensten/uitzenden/"
                      role="menuitem"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                      onClick={closeDiensten}
                    >
                      Uitzenden
                    </Link>
                    <Link
                      href="/diensten/detachering/"
                      role="menuitem"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                      onClick={closeDiensten}
                    >
                      Detachering
                    </Link>
                    <Link
                      href="/diensten/recruitment/"
                      role="menuitem"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                      onClick={closeDiensten}
                    >
                      Recruitment
                    </Link>
                    <div className="border-t border-neutral-100 my-1" />
                    <Link
                      href="/functies/"
                      role="menuitem"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                      onClick={closeDiensten}
                    >
                      Personeel per functie
                    </Link>
                  </div>
                </div>
              </div>
              <Link
                href="/over-ons/"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Over Ons
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link
                href="/blog/"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Nieuws
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link
                href="/kosten-calculator/"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Kosten calculator
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link
                href="/veelgestelde-vragen/"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                FAQ
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link
                href="/contact/"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Contact
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/medewerker/login/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm
                border-2 border-neutral-300 text-neutral-700 hover:border-[#F27501] hover:text-[#F27501]
                transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Login
              </Link>
              <Link
                href="/contact/"
                className="bg-[#F27501] text-white px-6 py-2.5 rounded-lg font-semibold text-sm
                shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
                hover:bg-[#d96800] transition-all duration-300"
              >
                Neem contact op
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Menu sluiten" : "Menu openen"}
              aria-expanded={isMenuOpen}
            >
              <svg
                className="w-6 h-6 text-neutral-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Navigation Overlay - Full Screen */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
          isMenuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        style={{ top: isScrolled ? "80px" : "80px" }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Menu Container */}
        <div
          className={`relative h-full bg-white shadow-2xl transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-y-0" : "-translate-y-4"
          }`}
        >
          {/* Scrollable Menu Content */}
          <div className="h-full overflow-y-auto overscroll-contain">
            <nav className="flex flex-col p-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
              {/* Navigation Links */}
              <div className="space-y-2 mb-8">
                <Link
                  href="/"
                  className="block px-4 py-3.5 text-neutral-900 font-semibold text-base hover:text-[#F27501] hover:bg-neutral-50 rounded-xl transition-all duration-200 active:scale-98"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>

                {/* Diensten met dropdown */}
                <div>
                  <button
                    onClick={() => setIsMobileDienstenOpen(!isMobileDienstenOpen)}
                    aria-expanded={isMobileDienstenOpen}
                    className="w-full px-4 py-3.5 text-neutral-700 font-semibold text-base hover:text-[#F27501] hover:bg-neutral-50 rounded-xl transition-all duration-200 flex items-center justify-between"
                  >
                    Diensten
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${isMobileDienstenOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isMobileDienstenOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-4 pt-2 space-y-1.5">
                      <Link
                        href="/diensten/"
                        className="block px-4 py-2.5 text-sm text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-all duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Alle Diensten
                      </Link>
                      <Link
                        href="/diensten/uitzenden/"
                        className="block px-4 py-2.5 text-sm text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-all duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Uitzenden
                      </Link>
                      <Link
                        href="/diensten/detachering/"
                        className="block px-4 py-2.5 text-sm text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-all duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Detachering
                      </Link>
                      <Link
                        href="/diensten/recruitment/"
                        className="block px-4 py-2.5 text-sm text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-all duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Recruitment
                      </Link>
                      <Link
                        href="/functies/"
                        className="block px-4 py-2.5 text-sm text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-all duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Personeel per functie
                      </Link>
                    </div>
                  </div>
                </div>

                <Link
                  href="/over-ons/"
                  className="block px-4 py-3.5 text-neutral-700 font-semibold text-base hover:text-[#F27501] hover:bg-neutral-50 rounded-xl transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Over Ons
                </Link>
                <Link
                  href="/blog/"
                  className="block px-4 py-3.5 text-neutral-700 font-semibold text-base hover:text-[#F27501] hover:bg-neutral-50 rounded-xl transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Nieuws
                </Link>
                <Link
                  href="/kosten-calculator/"
                  className="block px-4 py-3.5 text-neutral-700 font-semibold text-base hover:text-[#F27501] hover:bg-neutral-50 rounded-xl transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Kosten calculator
                </Link>
                <Link
                  href="/veelgestelde-vragen/"
                  className="block px-4 py-3.5 text-neutral-700 font-semibold text-base hover:text-[#F27501] hover:bg-neutral-50 rounded-xl transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  FAQ
                </Link>
                <Link
                  href="/contact/"
                  className="block px-4 py-3.5 text-neutral-700 font-semibold text-base hover:text-[#F27501] hover:bg-neutral-50 rounded-xl transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>
              </div>

              {/* Contact Shortcuts - Premium Section */}
              <div className="mb-6 px-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 px-2">
                  Direct contact
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="https://wa.me/31617177939?text=Hallo!%20Ik%20heb%20een%20vraag%20over%20TopTalent%20Jobs."
                    className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl hover:from-green-100 hover:to-green-200/50 transition-all duration-200 active:scale-95"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg className="w-6 h-6 text-green-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span className="text-xs font-semibold text-green-700">WhatsApp</span>
                  </a>
                  <a
                    href="tel:+31617177939"
                    className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl hover:from-blue-100 hover:to-blue-200/50 transition-all duration-200 active:scale-95"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-xs font-semibold text-blue-700">Bel direct</span>
                  </a>
                </div>
              </div>

              {/* CTAs - Clear Visual Separation */}
              <div className="space-y-3 pt-4 border-t border-neutral-200">
                <Link
                  href="/personeel-aanvragen/"
                  className="block w-full bg-gradient-to-r from-[#F27501] to-[#d96800] text-white px-6 py-4 rounded-xl font-bold text-center shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 active:scale-98"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Personeel aanvragen
                </Link>
                <Link
                  href="/medewerker/login/"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl font-semibold border-2 border-neutral-300 text-neutral-700 hover:border-[#F27501] hover:text-[#F27501] transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Medewerker login
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
