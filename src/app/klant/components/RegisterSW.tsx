'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw-business.js', { scope: '/klant/' })
        .then((reg) => {
          console.log('[TT Business SW] Geregistreerd:', reg.scope)
        })
        .catch((err) => {
          console.warn('[TT Business SW] Registratie mislukt:', err)
        })
    }
  }, [])

  return null
}
