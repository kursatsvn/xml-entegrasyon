import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '112px',
          color: '#ffffff',
          fontSize: 310,
          fontWeight: 900,
          fontFamily: 'sans-serif'
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
