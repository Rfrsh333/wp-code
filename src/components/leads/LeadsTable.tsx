'use client'

import { useState, useEffect } from 'react'
import {
  Filter,
  Search,
  Facebook,
  Linkedin,
  Instagram,
  MapPin,
  Globe,
  MoreVertical,
  Phone,
  Mail,
  Eye,
  Trash2,
  Download,
} from 'lucide-react'
import { Lead, Platform, LeadStatus } from '@/types/leads'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import LeadDetailPanel from './LeadDetailPanel'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token}` }
}

const platformIcons = {
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
  google: MapPin,
  website: Globe,
  handmatig: Globe,
}

const platformColors = {
  facebook: 'bg-blue-100 text-blue-700',
  linkedin: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-700',
  google: 'bg-red-100 text-red-700',
  website: 'bg-gray-100 text-gray-700',
  handmatig: 'bg-gray-100 text-gray-700',
}

const statusOptions: { value: LeadStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'Alle statussen', color: 'bg-gray-100 text-gray-800' },
  { value: 'nieuw', label: 'Nieuw', color: 'bg-green-100 text-green-800' },
  { value: 'benaderd', label: 'Benaderd', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_gesprek', label: 'In gesprek', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'geplaatst', label: 'Geplaatst', color: 'bg-purple-100 text-purple-800' },
  { value: 'archief', label: 'Archief', color: 'bg-gray-100 text-gray-800' },
  { value: 'niet_interested', label: 'Niet geïnteresseerd', color: 'bg-red-100 text-red-800' },
]

const platformOptions = [
  { value: 'all', label: 'Alle platforms' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google Maps' },
  { value: 'website', label: 'Website' },
]

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  useEffect(() => {
    fetchLeads()
  }, [platformFilter, statusFilter, page])

  async function fetchLeads() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (platformFilter !== 'all') params.append('platform', platformFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads?${params}`, { headers })
      const data = await res.json()

      setLeads(data.leads || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateLeadStatus(leadId: string, newStatus: LeadStatus) {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        )
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  async function deleteLead(leadId: string) {
    if (!confirm('Weet je zeker dat je deze lead wilt verwijderen?')) return

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE', headers })
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId))
        if (selectedLead?.id === leadId) {
          setDetailOpen(false)
          setSelectedLead(null)
        }
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
    }
  }

  function openDetail(lead: Lead) {
    setSelectedLead(lead)
    setDetailOpen(true)
  }

  async function exportCSV() {
    try {
      // Haal alle leads op (niet alleen huidige pagina)
      const headers = await getAuthHeaders()
      const params = new URLSearchParams({ limit: '10000' })
      if (platformFilter !== 'all') params.append('platform', platformFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const res = await fetch(`/api/leads?${params}`, { headers })
      const data = await res.json()
      const allLeads: Lead[] = data.leads || []

      if (allLeads.length === 0) return

      // Instantly.ai format: First Name, Last Name, Email, Company, Phone, etc.
      const csvRows = allLeads.map((l) => {
        const nameParts = l.naam.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        return {
          first_name: firstName,
          last_name: lastName,
          email: l.email || '',
          phone: l.telefoon || '',
          company_name: l.bedrijf || '',
          title: l.functie || '',
          city: l.stad || '',
          source: l.bron_naam || '',
          source_url: l.bron_url || '',
          platform: l.platform,
          status: l.status,
          notes: l.notities || '',
          created_at: l.created_at,
        }
      })

      const csvHeaders = Object.keys(csvRows[0])
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row) =>
          csvHeaders.map((h) => {
            const val = (row as Record<string, string>)[h] || ''
            return val.includes(',') || val.includes('\n') || val.includes('"')
              ? `"${val.replace(/"/g, '""')}"`
              : val
          }).join(',')
        ),
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `toptalent_leads_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      lead.naam.toLowerCase().includes(query) ||
      lead.bedrijf?.toLowerCase().includes(query) ||
      lead.functie?.toLowerCase().includes(query) ||
      lead.stad?.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek op naam, bedrijf, functie of stad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Platform filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {platformOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-900">{filteredLeads.length}</span> leads
            </div>
            <div>
              Pagina {page} van {Math.ceil(total / limit) || 1}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
              <p className="mt-4 text-gray-600">Leads laden...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Geen leads gevonden
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Naam & Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bedrijf / Functie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => {
                  const PlatformIcon = platformIcons[lead.platform]
                  const statusOption = statusOptions.find((s) => s.value === lead.status)

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openDetail(lead)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${platformColors[lead.platform]}`}
                          >
                            <PlatformIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{lead.naam}</div>
                            <div className="text-sm text-gray-500">{lead.bron_naam}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          {lead.bedrijf && (
                            <div className="font-medium text-gray-900">{lead.bedrijf}</div>
                          )}
                          {lead.functie && (
                            <div className="text-gray-500">{lead.functie}</div>
                          )}
                          {lead.stad && (
                            <div className="text-gray-400 text-xs">{lead.stad}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 text-sm">
                          {lead.telefoon && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Phone className="w-3 h-3" />
                              {lead.telefoon}
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${statusOption?.color} border-0 cursor-pointer`}
                        >
                          {statusOptions
                            .filter((s) => s.value !== 'all')
                            .map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {format(new Date(lead.created_at), 'd MMM yyyy', { locale: nl })}
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => deleteLead(lead.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredLeads.length > 0 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Vorige
            </button>
            <span className="text-sm text-gray-600">
              Pagina {page} van {Math.ceil(total / limit) || 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Volgende
            </button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {detailOpen && selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setDetailOpen(false)}
          onUpdate={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            setSelectedLead(updated)
          }}
          onDelete={() => {
            deleteLead(selectedLead.id)
          }}
        />
      )}
    </>
  )
}
