'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function AddLeadForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'form' | 'saving' | 'success' | 'error'>('form')
  const [errorMsg, setErrorMsg] = useState('')

  // Pre-fill vanuit URL params (van bookmarklet)
  const [form, setForm] = useState({
    naam: '',
    bedrijf: '',
    functie: '',
    telefoon: '',
    email: '',
    stad: '',
    bron_naam: '',
    bron_url: '',
    platform: 'website',
    notities: '',
  })

  useEffect(() => {
    const fields = ['naam', 'bedrijf', 'functie', 'telefoon', 'email', 'stad', 'bron_naam', 'bron_url', 'platform', 'notities']
    const newForm = { ...form }
    let hasData = false
    fields.forEach((f) => {
      const val = searchParams.get(f)
      if (val) {
        (newForm as Record<string, string>)[f] = val
        hasData = true
      }
    })
    if (hasData) setForm(newForm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleChange = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.naam.trim()) return

    setStatus('saving')
    try {
      const payload: Record<string, string> = { ...form }
      // Verwijder lege velden
      Object.keys(payload).forEach((k) => {
        if (!payload[k]) delete payload[k]
      })

      // Auth via Supabase sessie
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Je moet ingelogd zijn om leads op te slaan. Ga naar /admin om in te loggen.')
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Opslaan mislukt')
      }

      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Onbekende fout')
      setStatus('error')
    }
  }, [form])

  const platformLabel = form.platform.charAt(0).toUpperCase() + form.platform.slice(1)
  const platformColors: Record<string, string> = {
    facebook: 'bg-blue-500',
    linkedin: 'bg-blue-700',
    instagram: 'bg-pink-500',
    google: 'bg-red-500',
    website: 'bg-neutral-500',
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Lead opgeslagen!</h2>
          <p className="text-neutral-600 mb-6">
            <strong>{form.naam}</strong> is toegevoegd aan je leads.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/admin?tab=leads')}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
            >
              Bekijk in dashboard
            </button>
            <button
              onClick={() => window.close()}
              className="px-6 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200"
            >
              Sluit venster
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Opslaan mislukt</h2>
          <p className="text-neutral-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => setStatus('form')}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
          >
            Probeer opnieuw
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-lg w-full">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-neutral-900">Lead toevoegen</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${platformColors[form.platform] || 'bg-neutral-500'}`}>
            {platformLabel}
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Naam *</label>
              <input
                type="text"
                value={form.naam}
                onChange={(e) => handleChange('naam', e.target.value)}
                placeholder="Voor- en achternaam"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Bedrijf</label>
              <input
                type="text"
                value={form.bedrijf}
                onChange={(e) => handleChange('bedrijf', e.target.value)}
                placeholder="Bedrijfsnaam"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Functie</label>
              <input
                type="text"
                value={form.functie}
                onChange={(e) => handleChange('functie', e.target.value)}
                placeholder="Bijv. Kok, Manager"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Stad</label>
              <input
                type="text"
                value={form.stad}
                onChange={(e) => handleChange('stad', e.target.value)}
                placeholder="Bijv. Utrecht"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Telefoon</label>
              <input
                type="tel"
                value={form.telefoon}
                onChange={(e) => handleChange('telefoon', e.target.value)}
                placeholder="+31 6 ..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="naam@bedrijf.nl"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Bron</label>
            <input
              type="text"
              value={form.bron_naam}
              onChange={(e) => handleChange('bron_naam', e.target.value)}
              placeholder="Naam van de groep/pagina"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Notities</label>
            <textarea
              value={form.notities}
              onChange={(e) => handleChange('notities', e.target.value)}
              placeholder="Eerste indruk, context..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none resize-none"
            />
          </div>

          {form.bron_url && (
            <div className="text-xs text-neutral-400 truncate">
              Bron URL: {form.bron_url}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!form.naam.trim() || status === 'saving'}
            className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'saving' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              'Opslaan als Lead'
            )}
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl font-medium hover:bg-neutral-200"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AddLeadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <AddLeadForm />
    </Suspense>
  )
}
