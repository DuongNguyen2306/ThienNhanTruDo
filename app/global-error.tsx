'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: "'Be Vietnam Pro', sans-serif", margin: 0, padding: 0, background: '#F8FAFC' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: '#0F172A',
        }}>
          <div style={{
            maxWidth: '480px',
            padding: '2.5rem',
            borderRadius: '1rem',
            border: '2px solid #CBD5E1',
            background: 'white',
            boxShadow: '4px 4px 0 #0F172A',
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 900,
              marginBottom: '0.5rem',
              color: '#DC2626',
            }}>
              Đã xảy ra lỗi
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#64748B',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
            }}>
              Xin lỗi, đã có sự cố không mong muốn xảy ra. Vui lòng thử tải lại trang.
            </p>
            {process.env.NODE_ENV === 'development' && error?.digest && (
              <p style={{
                fontSize: '0.75rem',
                color: '#DC2626',
                marginBottom: '1.5rem',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}>
                Error digest: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: "'Be Vietnam Pro', sans-serif",
                background: '#151515',
                color: 'white',
                border: '2px solid #151515',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 #FDE047',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translate(1px, 1px)'
                e.currentTarget.style.boxShadow = '1px 1px 0 #FDE047'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = '2px 2px 0 #FDE047'
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
