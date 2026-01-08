"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { socialLinks } from "@/lib/social-links";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileDienstenOpen, setIsMobileDienstenOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Top Bar - Subtle and Professional */}
      <div className="bg-neutral-900 py-2.5">
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
                href="tel:+31649713766"
                className="hidden sm:flex items-center text-neutral-300 hover:text-white transition-colors duration-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +31 6 49 71 37 66
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
              <div className="relative group">
                <button className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 flex items-center gap-1">
                  Diensten
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="bg-white rounded-xl shadow-xl shadow-neutral-900/10 border border-neutral-100 py-2 min-w-[200px]">
                    <Link
                      href="/diensten"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                    >
                      Alle Diensten
                    </Link>
                    <Link
                      href="/diensten/uitzenden"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                    >
                      Uitzenden
                    </Link>
                    <Link
                      href="/diensten/detachering"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                    >
                      Detachering
                    </Link>
                    <Link
                      href="/diensten/recruitment"
                      className="block px-4 py-2.5 text-neutral-600 hover:text-[#F27501] hover:bg-neutral-50 transition-colors duration-200"
                    >
                      Recruitment
                    </Link>
                  </div>
                </div>
              </div>
              <Link
                href="/over-ons"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Over Ons
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link
                href="/kosten-calculator"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Kosten calculator
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link
                href="/blog"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Blog
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2 text-neutral-600 font-medium hover:text-[#F27501] transition-colors duration-300 relative group"
              >
                Contact
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#F27501] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
            </nav>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center gap-4">
              <Link
                href="/contact"
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
              aria-label="Menu"
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

          {/* Mobile Navigation */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ${
              isMenuOpen ? "max-h-[500px] pb-6" : "max-h-0"
            }`}
          >
            <nav className="flex flex-col gap-1 pt-4 border-t border-neutral-100">
              <Link
                href="/"
                className="px-4 py-3 text-neutral-900 font-medium hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              {/* Diensten met dropdown */}
              <div>
                <button
                  onClick={() => setIsMobileDienstenOpen(!isMobileDienstenOpen)}
                  className="w-full px-4 py-3 text-neutral-600 font-medium hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200 flex items-center justify-between"
                >
                  Diensten
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isMobileDienstenOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isMobileDienstenOpen ? 'max-h-48' : 'max-h-0'}`}>
                  <div className="pl-4 py-1 space-y-1">
                    <Link
                      href="/diensten"
                      className="block px-4 py-2 text-neutral-500 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Alle Diensten
                    </Link>
                    <Link
                      href="/diensten/uitzenden"
                      className="block px-4 py-2 text-neutral-500 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Uitzenden
                    </Link>
                    <Link
                      href="/diensten/detachering"
                      className="block px-4 py-2 text-neutral-500 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Detachering
                    </Link>
                    <Link
                      href="/diensten/recruitment"
                      className="block px-4 py-2 text-neutral-500 hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Recruitment
                    </Link>
                  </div>
                </div>
              </div>
              <Link
                href="/over-ons"
                className="px-4 py-3 text-neutral-600 font-medium hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Over Ons
              </Link>
              <Link
                href="/kosten-calculator"
                className="px-4 py-3 text-neutral-600 font-medium hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Kosten calculator
              </Link>
              <Link
                href="/blog"
                className="px-4 py-3 text-neutral-600 font-medium hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/contact"
                className="px-4 py-3 text-neutral-600 font-medium hover:text-[#F27501] hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="mt-4 px-4">
                <Link
                  href="/contact"
                  className="block w-full bg-[#F27501] text-white px-6 py-3 rounded-lg font-semibold text-center
                  hover:bg-[#d96800] transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Neem contact op
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
