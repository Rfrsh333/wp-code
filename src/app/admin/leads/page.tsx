'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, LayoutGrid, BarChart3, MessageSquare, Bookmark } from 'lucide-react'
import LeadsTable from '@/components/leads/LeadsTable'
import LeadsKanban from '@/components/leads/LeadsKanban'
import LeadsAnalytics from '@/components/leads/LeadsAnalytics'
import LeadsTemplates from '@/components/leads/LeadsTemplates'

type TabId = 'table' | 'kanban' | 'analytics' | 'templates' | 'bookmarklet'

const tabs = [
  { id: 'table' as TabId, label: 'Alle Leads', icon: Users },
  { id: 'kanban' as TabId, label: 'Kanban', icon: LayoutGrid },
  { id: 'analytics' as TabId, label: 'Analytics', icon: BarChart3 },
  { id: 'templates' as TabId, label: 'Templates', icon: MessageSquare },
  { id: 'bookmarklet' as TabId, label: 'Bookmarklet', icon: Bookmark },
]

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('table')
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              📋 Social Lead Capture
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Beheer je leads van Facebook, LinkedIn, Instagram en Google Maps
            </p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'bookmarklet') {
                      router.push('/admin/leads/bookmarklet')
                    } else {
                      setActiveTab(tab.id)
                    }
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${
                      isActive
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'table' && <LeadsTable />}
        {activeTab === 'kanban' && <LeadsKanban />}
        {activeTab === 'analytics' && <LeadsAnalytics />}
        {activeTab === 'templates' && <LeadsTemplates />}
      </div>
    </div>
  )
}
