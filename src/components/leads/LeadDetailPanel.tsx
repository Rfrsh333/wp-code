'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Briefcase,
  Calendar,
  MessageCircle,
  ExternalLink,
  Trash2,
  Save,
} from 'lucide-react'
import { Lead, LeadOutreach, OutreachTemplate } from '@/types/leads'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token}` }
}

interface LeadDetailPanelProps {
  lead: Lead
  onClose: () => void
  onUpdate: (lead: Lead) => void
  onDelete: () => void
}

export default function LeadDetailPanel({
  lead,
  onClose,
  onUpdate,
  onDelete,
}: LeadDetailPanelProps) {
  const [outreach, setOutreach] = useState<LeadOutreach[]>([])
  const [templates, setTemplates] = useState<OutreachTemplate[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editedLead, setEditedLead] = useState(lead)
  const [showWhatsAppForm, setShowWhatsAppForm] = useState(false)
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  // Fix #36: sync editedLead when lead prop changes
  useEffect(() => {
    setEditedLead(lead)
  }, [lead])

  const fetchOutreachHistory = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads/${lead.id}`, { headers })
      const data = await res.json()
      setOutreach(data.outreach || [])
    } catch (error) {
      console.error('Error fetching outreach:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/leads/templates?kanaal=whatsapp', { headers })
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  useEffect(() => {
    fetchOutreachHistory()
    fetchTemplates()
  }, [lead.id])

  async function saveChanges() {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam: editedLead.naam,
          bedrijf: editedLead.bedrijf,
          functie: editedLead.functie,
          telefoon: editedLead.telefoon,
          email: editedLead.email,
          stad: editedLead.stad,
          notities: editedLead.notities,
        }),
      })

      if (res.ok) {
        const { lead: updated } = await res.json()
        onUpdate(updated)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Er is een fout opgetreden bij het opslaan')
    }
  }

  async function sendWhatsApp() {
    if (!editedLead.telefoon) {
      alert('Deze lead heeft geen telefoonnummer')
      return
    }

    if (!whatsappMessage.trim()) {
      alert('Vul een bericht in')
      return
    }

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads/${lead.id}/whatsapp`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefoon: editedLead.telefoon,
          bericht: whatsappMessage,
          template_id: selectedTemplateId || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        // Open WhatsApp Web
        window.open(data.whatsapp_url, '_blank')
        setShowWhatsAppForm(false)
        setWhatsappMessage('')
        fetchOutreachHistory() // Refresh history
      } else {
        alert(data.error || 'Er is een fout opgetreden')
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error)
      alert('Er is een fout opgetreden')
    }
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    // Replace variables (fix #19: leave placeholder if value is empty)
    let message = template.bericht
    const vars: Record<string, string | null | undefined> = {
      naam: editedLead.naam,
      bedrijf: editedLead.bedrijf,
      functie: editedLead.functie,
      stad: editedLead.stad,
      bron_naam: editedLead.bron_naam,
    }
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      message = message.replace(regex, value || `[${key}]`)
    }

    setWhatsappMessage(message)
    setSelectedTemplateId(templateId)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl">
        <div className="h-full bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{editedLead.naam}</h2>
                <p className="text-orange-100 text-sm">
                  {editedLead.platform.charAt(0).toUpperCase() + editedLead.platform.slice(1)} •{' '}
                  {format(new Date(editedLead.created_at), 'd MMMM yyyy', { locale: nl })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Edit mode toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Contactgegevens</h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded-lg"
                >
                  {editMode ? 'Annuleren' : 'Bewerken'}
                </button>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedLead.naam}
                      onChange={(e) =>
                        setEditedLead({ ...editedLead, naam: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{editedLead.naam}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrijf
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedLead.bedrijf || ''}
                      onChange={(e) =>
                        setEditedLead({ ...editedLead, bedrijf: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{editedLead.bedrijf || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Functie
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedLead.functie || ''}
                      onChange={(e) =>
                        setEditedLead({ ...editedLead, functie: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{editedLead.functie || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stad
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedLead.stad || ''}
                      onChange={(e) =>
                        setEditedLead({ ...editedLead, stad: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{editedLead.stad || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefoon
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={editedLead.telefoon || ''}
                      onChange={(e) =>
                        setEditedLead({ ...editedLead, telefoon: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{editedLead.telefoon || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      value={editedLead.email || ''}
                      onChange={(e) =>
                        setEditedLead({ ...editedLead, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-gray-900">{editedLead.email || '-'}</p>
                  )}
                </div>
              </div>

              {/* Notities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notities
                </label>
                {editMode ? (
                  <textarea
                    value={editedLead.notities || ''}
                    onChange={(e) =>
                      setEditedLead({ ...editedLead, notities: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                ) : (
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {editedLead.notities || 'Geen notities'}
                  </p>
                )}
              </div>

              {editMode && (
                <button
                  onClick={saveChanges}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  <Save className="w-4 h-4" />
                  Wijzigingen opslaan
                </button>
              )}

              {/* Source info */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Bron</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Platform:</span>{' '}
                    <span className="font-medium capitalize">{editedLead.platform}</span>
                  </p>
                  {editedLead.bron_naam && (
                    <p>
                      <span className="text-gray-600">Bron naam:</span>{' '}
                      <span className="font-medium">{editedLead.bron_naam}</span>
                    </p>
                  )}
                  {editedLead.bron_url && (
                    <p>
                      <a
                        href={editedLead.bron_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:underline flex items-center gap-1"
                      >
                        Bekijk origineel <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* WhatsApp form */}
              {!showWhatsAppForm ? (
                <button
                  onClick={() => setShowWhatsAppForm(true)}
                  disabled={!editedLead.telefoon}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5" />
                  Stuur WhatsApp bericht
                </button>
              ) : (
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-green-900">WhatsApp Bericht</h3>
                    <button
                      onClick={() => setShowWhatsAppForm(false)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Template selector */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template (optioneel)
                    </label>
                    <select
                      onChange={(e) => applyTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Geen template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.naam}
                        </option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Typ je bericht..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-3"
                  />

                  <button
                    onClick={sendWhatsApp}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Verstuur via WhatsApp
                  </button>
                </div>
              )}

              {/* Outreach History */}
              {outreach.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Outreach Geschiedenis</h3>
                  <div className="space-y-3">
                    {outreach.map((item) => (
                      <div key={item.id} className="border-l-4 border-blue-500 pl-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm capitalize">{item.kanaal}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(item.created_at), 'd MMM HH:mm', { locale: nl })}
                          </span>
                        </div>
                        {item.template_naam && (
                          <div className="text-xs text-gray-500 mb-1">
                            Template: {item.template_naam}
                          </div>
                        )}
                        {item.bericht && (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {item.bericht}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              Verwijderen
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
