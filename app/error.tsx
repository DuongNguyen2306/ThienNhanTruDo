'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      color: '#0F172A',
      background: '#F8FAFC',
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
          Rất tiếc, trang này gặp sự cố. Vui lòng thử tải lại hoặc quay về trang chủ.
        </p>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <p style={{
            fontSize: '0.75rem',
            color: '#DC2626',
            marginBottom: '1.5rem',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            background: '#FEF2F2',
            padding: '0.75rem',
            borderRadius: '0.5rem',
          }}>
            {error.message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: '#151515',
              color: 'white',
              border: '2px solid #151515',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 #FDE047',
            }}
          >
            Thử lại
          </button>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: 'white',
              color: '#151515',
              border: '2px solid #151515',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              boxShadow: '2px 2px 0 #151515',
            }}
          >
            Trang chủ
          </a>
        </div>
      </div>
    </div>
  )
}
