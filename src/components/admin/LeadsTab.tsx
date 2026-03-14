'use client'

import { useState } from 'react'
import { Users, LayoutGrid, BarChart3, MessageSquare, Bookmark } from 'lucide-react'
import dynamic from 'next/dynamic'

const LeadsTable = dynamic(() => import('@/components/leads/LeadsTable'), { ssr: false })
const LeadsKanban = dynamic(() => import('@/components/leads/LeadsKanban'), { ssr: false })
const LeadsAnalytics = dynamic(() => import('@/components/leads/LeadsAnalytics'), { ssr: false })
const LeadsTemplates = dynamic(() => import('@/components/leads/LeadsTemplates'), { ssr: false })

type SubTab = 'table' | 'kanban' | 'analytics' | 'templates'

const subTabs = [
  { id: 'table' as SubTab, label: 'Alle Leads', icon: Users },
  { id: 'kanban' as SubTab, label: 'Kanban', icon: LayoutGrid },
  { id: 'analytics' as SubTab, label: 'Analytics', icon: BarChart3 },
  { id: 'templates' as SubTab, label: 'Templates', icon: MessageSquare },
]

export default function LeadsTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('table')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Social Leads</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Leads van Facebook, LinkedIn, Instagram en Google Maps
          </p>
        </div>
        <a
          href="/admin/leads/bookmarklet"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-medium"
        >
          <Bookmark className="w-4 h-4" />
          Bookmarklet installeren
        </a>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-200">
        {subTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeSubTab === 'table' && <LeadsTable />}
      {activeSubTab === 'kanban' && <LeadsKanban />}
      {activeSubTab === 'analytics' && <LeadsAnalytics />}
      {activeSubTab === 'templates' && <LeadsTemplates />}
    </div>
  )
}
