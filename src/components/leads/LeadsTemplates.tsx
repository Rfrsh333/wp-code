'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, MessageCircle, Mail } from 'lucide-react'
import type { OutreachTemplate } from '@/types/leads'
import { supabase } from '@/lib/supabase'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token}` }
}

export default function LeadsTemplates() {
  const [templates, setTemplates] = useState<OutreachTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const [formData, setFormData] = useState({
    naam: '',
    kanaal: 'whatsapp' as 'whatsapp' | 'email',
    onderwerp: '',
    bericht: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/leads/templates', { headers })
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveTemplate() {
    try {
      const url = editingId
        ? `/api/leads/templates/${editingId}`
        : '/api/leads/templates'
      const method = editingId ? 'PATCH' : 'POST'

      const headers = await getAuthHeaders()
      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        fetchTemplates()
        resetForm()
      } else {
        const data = await res.json()
        alert(data.error || 'Er is een fout opgetreden')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Er is een fout opgetreden')
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads/templates/${id}`, { method: 'DELETE', headers })
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id))
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  function editTemplate(template: OutreachTemplate) {
    setFormData({
      naam: template.naam,
      kanaal: template.kanaal,
      onderwerp: template.onderwerp || '',
      bericht: template.bericht,
    })
    setEditingId(template.id)
    setShowNewForm(true)
  }

  function resetForm() {
    setFormData({
      naam: '',
      kanaal: 'whatsapp',
      onderwerp: '',
      bericht: '',
    })
    setEditingId(null)
    setShowNewForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bericht Templates</h2>
          <p className="text-gray-600 text-sm">
            Maak herbruikbare templates voor WhatsApp en email berichten
          </p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Template
          </button>
        )}
      </div>

      {/* New/Edit Form */}
      {showNewForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Template Bewerken' : 'Nieuwe Template'}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Naam *
                </label>
                <input
                  type="text"
                  value={formData.naam}
                  onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                  placeholder="Bijv. Kandidaat - Eerste Contact"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kanaal *
                </label>
                <select
                  value={formData.kanaal}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      kanaal: e.target.value as 'whatsapp' | 'email',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {formData.kanaal === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Onderwerp
                </label>
                <input
                  type="text"
                  value={formData.onderwerp}
                  onChange={(e) =>
                    setFormData({ ...formData, onderwerp: e.target.value })
                  }
                  placeholder="Email onderwerp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bericht *
              </label>
              <textarea
                value={formData.bericht}
                onChange={(e) => setFormData({ ...formData, bericht: e.target.value })}
                rows={8}
                placeholder="Typ je bericht hier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gebruik variabelen: {'{{naam}}'}, {'{{bedrijf}}'}, {'{{functie}}'},{'{{stad}}'}, {'{{bron_naam}}'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveTemplate}
                disabled={!formData.naam || !formData.bericht}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Template Bijwerken' : 'Template Aanmaken'}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {template.kanaal === 'whatsapp' ? (
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">{template.naam}</h4>
                  <p className="text-xs text-gray-500 capitalize">{template.kanaal}</p>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => editTemplate(template)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {template.onderwerp && (
              <div className="mb-2">
                <span className="text-xs text-gray-500">Onderwerp:</span>
                <p className="text-sm font-medium text-gray-700">{template.onderwerp}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {template.bericht.length > 200
                  ? template.bericht.substring(0, 200) + '...'
                  : template.bericht}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Gebruikt: {template.aantal_gebruikt}x</span>
              <span className={template.is_actief ? 'text-green-600' : 'text-gray-400'}>
                {template.is_actief ? 'Actief' : 'Inactief'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !showNewForm && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nog geen templates aangemaakt</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-4 text-orange-600 hover:underline"
          >
            Maak je eerste template
          </button>
        </div>
      )}
    </div>
  )
}
