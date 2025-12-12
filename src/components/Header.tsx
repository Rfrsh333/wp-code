"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="TopTalent Jobs"
              width={150}
              height={50}
              className="h-12 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-[#F27501] transition-colors">
              Home
            </Link>
            <Link href="/vacatures" className="text-gray-700 hover:text-[#F27501] transition-colors">
              Vacatures
            </Link>
            <Link href="/diensten" className="text-gray-700 hover:text-[#F27501] transition-colors">
              Diensten
            </Link>
            <Link href="/over-ons" className="text-gray-700 hover:text-[#F27501] transition-colors">
              Over Ons
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-[#F27501] transition-colors">
              Contact
            </Link>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link
              href="/contact"
              className="bg-[#F27501] text-white px-6 py-2 rounded-full hover:bg-[#d96800] transition-colors"
            >
              Aan de slag
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
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
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-[#F27501] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/vacatures"
                className="text-gray-700 hover:text-[#F27501] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Vacatures
              </Link>
              <Link
                href="/diensten"
                className="text-gray-700 hover:text-[#F27501] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Diensten
              </Link>
              <Link
                href="/over-ons"
                className="text-gray-700 hover:text-[#F27501] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Over Ons
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-[#F27501] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <Link
                href="/contact"
                className="bg-[#F27501] text-white px-6 py-2 rounded-full hover:bg-[#d96800] transition-colors text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Aan de slag
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
