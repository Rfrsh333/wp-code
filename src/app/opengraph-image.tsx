import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'TopTalent Jobs - Horeca Uitzendbureau Utrecht'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF7F1 0%, #FFFFFF 50%, #FFF7F1 100%)',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: 'linear-gradient(90deg, #FF7A00 0%, #F97316 100%)',
          }}
        />

        {/* Logo T */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            height: '120px',
            background: 'linear-gradient(135deg, #FF7A00 0%, #F97316 100%)',
            borderRadius: '24px',
            marginBottom: '40px',
            boxShadow: '0 20px 40px rgba(249, 115, 22, 0.3)',
          }}
        >
          <span style={{ fontSize: '72px', color: 'white', fontWeight: 'bold' }}>T</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#1F1F1F',
              marginBottom: '16px',
            }}
          >
            TopTalent Jobs
          </span>
          <span
            style={{
              fontSize: '32px',
              color: '#666666',
              marginBottom: '24px',
            }}
          >
            Horeca Uitzendbureau Utrecht
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            marginTop: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <span style={{ fontSize: '24px', color: '#666' }}>Binnen 24 uur</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <span style={{ fontSize: '24px', color: '#666' }}>Ervaren personeel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📞</span>
            <span style={{ fontSize: '24px', color: '#666' }}>7 dagen bereikbaar</span>
          </div>
        </div>

        {/* Website URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '24px', color: '#FF7A00', fontWeight: '600' }}>
            toptalentjobs.nl
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
