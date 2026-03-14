'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { Lead } from '@/types/leads'
import { supabase } from '@/lib/supabase'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token}` }
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877f2',
  linkedin: '#0a66c2',
  instagram: '#e4405f',
  google: '#ea4335',
  website: '#6b7280',
  handmatig: '#9ca3af',
}

const STATUS_COLORS: Record<string, string> = {
  nieuw: '#10b981',
  benaderd: '#3b82f6',
  in_gesprek: '#f59e0b',
  geplaatst: '#8b5cf6',
  archief: '#6b7280',
  niet_interested: '#ef4444',
}

// Fix #34: correcte display namen
const STATUS_LABELS: Record<string, string> = {
  nieuw: 'Nieuw',
  benaderd: 'Benaderd',
  in_gesprek: 'In gesprek',
  geplaatst: 'Geplaatst',
  archief: 'Archief',
  niet_interested: 'Niet geïnteresseerd',
}

export default function LeadsAnalytics() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/leads?limit=1000', { headers })
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Analytics berekeningen
  const totalLeads = leads.length

  // Leads per platform
  const leadsByPlatform = Object.entries(
    leads.reduce((acc, lead) => {
      acc[lead.platform] = (acc[lead.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([platform, count]) => ({
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    value: count,
    fill: PLATFORM_COLORS[platform] || '#gray',
  }))

  // Leads per status
  const leadsByStatus = Object.entries(
    leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    fill: STATUS_COLORS[status] || '#9ca3af',
  }))

  // Conversietrechter
  const funnelData = [
    { name: 'Nieuw', value: leads.filter((l) => l.status === 'nieuw').length },
    { name: 'Benaderd', value: leads.filter((l) => l.status === 'benaderd').length },
    {
      name: 'In gesprek',
      value: leads.filter((l) => l.status === 'in_gesprek').length,
    },
    { name: 'Geplaatst', value: leads.filter((l) => l.status === 'geplaatst').length },
  ]

  // Conversie percentages
  const geplaatst = leads.filter((l) => l.status === 'geplaatst').length
  const conversieRate = totalLeads > 0 ? ((geplaatst / totalLeads) * 100).toFixed(1) : 0

  // Leads per maand (laatste 6 maanden) - fix #42 correct sorteren op datum
  const monthlyMap = new Map<string, { sortKey: string; month: string; count: number }>()
  leads.forEach((lead) => {
    const date = new Date(lead.created_at)
    const sortKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`
    const label = date.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' })
    const existing = monthlyMap.get(sortKey)
    if (existing) {
      existing.count++
    } else {
      monthlyMap.set(sortKey, { sortKey, month: label, count: 1 })
    }
  })
  const monthlyData = Array.from(monthlyMap.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(-6)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Totaal Leads</div>
          <div className="text-3xl font-bold text-gray-900">{totalLeads}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Geplaatst</div>
          <div className="text-3xl font-bold text-purple-600">{geplaatst}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Conversie Rate</div>
          <div className="text-3xl font-bold text-green-600">{conversieRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">In Gesprek</div>
          <div className="text-3xl font-bold text-yellow-600">
            {leads.filter((l) => l.status === 'in_gesprek').length}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads per Platform */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Leads per Platform</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadsByPlatform}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                dataKey="value"
              >
                {leadsByPlatform.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leads per Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Leads per Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadsByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversietrechter */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Conversietrechter</h3>
          <div className="space-y-3">
            {funnelData.map((item, index) => {
              const percentage =
                funnelData[0].value > 0
                  ? ((item.value / funnelData[0].value) * 100).toFixed(0)
                  : 0

              return (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600">
                      {item.value} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ width: `${percentage}%`, minWidth: '40px' }}
                    >
                      {percentage}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Leads per Maand */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Leads per Maand</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Sources */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top Bronnen</h3>
        <div className="space-y-2">
          {Object.entries(
            leads.reduce((acc, lead) => {
              const bron = lead.bron_naam || 'Onbekend'
              acc[bron] = (acc[bron] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([bron, count]) => (
              <div key={bron} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{bron}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{
                        width: `${(count / totalLeads) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
