import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
          borderRadius: '42px',
          color: '#ffffff',
          fontSize: 118,
          fontWeight: 900,
          fontFamily: 'sans-serif'
        }}
      >
        S
      </div>
    ),
    { width: 192, height: 192 }
  );
}
