import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const alt = 'TopTalent Jobs - Horeca Uitzendbureau Utrecht'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), 'public/images/logo-icon.png'))
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`

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

        {/* Logo Icon */}
        <img
          src={logoBase64}
          alt="TopTalent Logo"
          style={{
            width: '150px',
            height: '150px',
            marginBottom: '40px',
          }}
        />

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

        {/* Call-to-Action Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #FF7A00 0%, #F97316 100%)',
            color: 'white',
            padding: '20px 48px',
            borderRadius: '16px',
            fontSize: '28px',
            fontWeight: 'bold',
            marginTop: '24px',
            boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4)',
          }}
        >
          Vraag nu personeel aan →
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
          <span style={{ fontSize: '24px', color: '#666' }}>
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
