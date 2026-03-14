'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Facebook,
  Linkedin,
  Instagram,
  MapPin,
  Globe,
  ArrowRight,
  Check,
  Copy,
} from 'lucide-react'

export default function BookmarkletPage() {
  const [bookmarkletData, setBookmarkletData] = useState<{
    href: string
    size: number
    builtAt: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    fetch('/bookmarklet-built.json')
      .then((res) => res.json())
      .then(setBookmarkletData)
      .catch(console.error)
  }, [])

  // React blokkeert javascript: URLs — we zetten de href via de DOM
  useEffect(() => {
    if (linkRef.current && bookmarkletData) {
      linkRef.current.setAttribute('href', bookmarkletData.href)
    }
  }, [bookmarkletData])

  const handleCopy = useCallback(() => {
    if (!bookmarkletData) return
    navigator.clipboard.writeText(bookmarkletData.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }, [bookmarkletData])

  if (!bookmarkletData) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lead Capture Bookmarklet</h1>
        <p className="text-gray-600">
          Voeg met een klik leads toe vanuit Facebook, LinkedIn, Instagram en Google Maps
        </p>
      </div>

      {/* Installatie instructies */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
            1
          </span>
          Sleep deze knop naar je bookmark bar
        </h2>

        <div className="bg-white rounded-lg p-6 flex items-center justify-between border-2 border-dashed border-orange-300">
          <div>
            {/* href wordt via useRef/DOM gezet om React's javascript: URL blokkade te omzeilen */}
            <a
              ref={linkRef}
              href="#"
              className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-move select-none"
              onClick={(e) => {
                e.preventDefault()
                alert('Sleep deze knop naar je bookmark bar! (Klik niet, maar sleep)')
              }}
            >
              TopTalent Lead
            </a>
            <p className="text-sm text-gray-500 mt-2">
              Sleep deze knop (niet klikken!) naar je browser bookmark bar
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">
              Grootte: {bookmarkletData.size} KB
            </div>
            <div className="text-xs text-gray-400">
              Laatste build: {new Date(bookmarkletData.builtAt).toLocaleString('nl-NL')}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <strong>Tip:</strong> Als je je bookmark bar niet ziet, druk dan op{' '}
          <code className="bg-white px-2 py-1 rounded">Cmd+Shift+B</code> (Mac) of{' '}
          <code className="bg-white px-2 py-1 rounded">Ctrl+Shift+B</code> (Windows)
        </div>
      </div>

      {/* Alternatieve installatie */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
            ?
          </span>
          Alternatief: handmatig installeren
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Lukt het slepen niet? Dan kun je de bookmarklet handmatig toevoegen:
        </p>
        <ol className="text-sm text-gray-600 space-y-2 mb-4 list-decimal list-inside">
          <li>Klik op de knop hieronder om de code te kopieren</li>
          <li>Maak een nieuwe bladwijzer aan in je browser (Cmd+D / Ctrl+D)</li>
          <li>Bewerk de bladwijzer en plak de code in het URL-veld</li>
          <li>Geef de bladwijzer een naam zoals &quot;TopTalent Lead&quot;</li>
        </ol>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Gekopieerd!' : 'Kopieer bookmarklet code'}
        </button>
      </div>

      {/* Gebruik instructies */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
            2
          </span>
          Gebruik de bookmarklet
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-gray-100 rounded-full p-2 mt-1">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">Ga naar een social media platform</p>
              <p className="text-sm text-gray-600">
                Facebook, LinkedIn, Instagram of Google Maps
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-gray-100 rounded-full p-2 mt-1">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">Klik op de bookmarklet</p>
              <p className="text-sm text-gray-600">
                Er verschijnt een popup met automatisch ingevulde gegevens
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-gray-100 rounded-full p-2 mt-1">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Vul eventueel extra info aan en sla op</p>
              <p className="text-sm text-gray-600">
                De lead wordt direct toegevoegd aan je dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform mogelijkheden */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">Ondersteunde Platforms</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-3 mb-2">
              <Facebook className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold">Facebook</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Automatisch opgehaald:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Naam van poster/bedrijf</li>
              <li>- Groepsnaam als bron</li>
              <li>- Post URL</li>
            </ul>
          </div>

          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-3 mb-2">
              <Linkedin className="w-6 h-6 text-blue-700" />
              <h3 className="font-bold">LinkedIn</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Automatisch opgehaald:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Naam van persoon</li>
              <li>- Functie & bedrijf</li>
              <li>- Locatie</li>
            </ul>
          </div>

          <div className="border border-pink-200 rounded-lg p-4 bg-pink-50">
            <div className="flex items-center gap-3 mb-2">
              <Instagram className="w-6 h-6 text-pink-600" />
              <h3 className="font-bold">Instagram</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Automatisch opgehaald:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Account naam</li>
              <li>- Bio tekst als notities</li>
              <li>- Profiel URL</li>
            </ul>
          </div>

          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-6 h-6 text-red-600" />
              <h3 className="font-bold">Google Maps</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Automatisch opgehaald:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Bedrijfsnaam</li>
              <li>- Adres & stad</li>
              <li>- Telefoonnummer</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-700">Andere websites</h3>
          </div>
          <p className="text-sm text-gray-600">
            De bookmarklet werkt op elke website! Op onbekende sites worden basis meta-tags
            geprobeerd, maar je kunt altijd handmatig alle velden invullen.
          </p>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-bold mb-2">Sneltoetsen</h3>
        <div className="text-sm">
          <code className="bg-white px-2 py-1 rounded">Escape</code> - Sluit popup
        </div>
      </div>
    </div>
  )
}
