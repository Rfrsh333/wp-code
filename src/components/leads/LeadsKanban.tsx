'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import type { Lead, LeadStatus } from '@/types/leads'
import { Facebook, Linkedin, Instagram, MapPin, Globe, Phone, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

const columns: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'nieuw', label: 'Nieuw', color: 'bg-green-100 border-green-300' },
  { id: 'benaderd', label: 'Benaderd', color: 'bg-blue-100 border-blue-300' },
  { id: 'in_gesprek', label: 'In gesprek', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'geplaatst', label: 'Geplaatst', color: 'bg-purple-100 border-purple-300' },
  { id: 'archief', label: 'Archief', color: 'bg-gray-100 border-gray-300' },
  { id: 'niet_interested', label: 'Niet geïnteresseerd', color: 'bg-red-100 border-red-300' },
]

export default function LeadsKanban() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/leads?limit=200', { headers })
      const data = await res.json()
      setLeads(data.leads || [])
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

  function onDragEnd(result: DropResult) {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId) return

    const newStatus = destination.droppableId as LeadStatus
    updateLeadStatus(draggableId, newStatus)
  }

  const leadsByStatus = columns.reduce((acc, col) => {
    acc[col.id] = leads.filter((lead) => lead.status === col.id)
    return acc
  }, {} as Record<LeadStatus, Lead[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnLeads = leadsByStatus[column.id] || []

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
            >
              <div className={`${column.color} rounded-lg border-2 p-3 mb-3`}>
                <h3 className="font-bold text-gray-800">
                  {column.label}
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({columnLeads.length})
                  </span>
                </h3>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[400px] rounded-lg p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-gray-100' : 'bg-gray-50'
                    }`}
                  >
                    {columnLeads.map((lead, index) => {
                      const PlatformIcon = platformIcons[lead.platform]

                      return (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-move transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <PlatformIcon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {lead.naam}
                                  </h4>
                                  {lead.bedrijf && (
                                    <p className="text-sm text-gray-600 truncate">
                                      {lead.bedrijf}
                                    </p>
                                  )}
                                  {lead.functie && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {lead.functie}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {(lead.telefoon || lead.email) && (
                                <div className="space-y-1 text-xs text-gray-600">
                                  {lead.telefoon && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span className="truncate">{lead.telefoon}</span>
                                    </div>
                                  )}
                                  {lead.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      <span className="truncate">{lead.email}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {lead.bron_naam && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 truncate">
                                    {lead.bron_naam}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}

                    {columnLeads.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Geen leads
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
