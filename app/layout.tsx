import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import { Ga4Provider } from '@/components/ga4-provider'
import { TrafficTracker } from '@/components/traffic-tracker'
import { allowGaOnLocalhost, resolveGaEnabled } from '@/lib/analytics'
import { Providers } from '@/components/providers'
import './globals.css'

export const dynamic = 'force-dynamic'

/**
 * Be Vietnam Pro là font chính của toàn bộ website.
 * `subsets` gồm "vietnamese" nên đầy đủ dấu tiếng Việt (Ư Ữ Ơ Ồ Đ Ệ …)
 * được phục vụ từ chính domain thay vì fallback sang font hệ thống.
 */
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
})

export const metadata: Metadata = {
  title: 'THIÊN NHÃN TRÚ ĐỒ — Phòng trọ đã kiểm định',
  description:
    'Nền tảng thuê phòng minh bạch tại Việt Nam: địa chỉ chính xác, biểu phí rõ ràng, ảnh đã kiểm định thực tế.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Cờ bật GA4 được quyết định ở SERVER (runtime), nên .env.local ở máy dev
  // không thể vô hiệu hoá tracker trên production build.
  const gaEnabled = resolveGaEnabled()
  const gaAllowLocalhost = allowGaOnLocalhost()

  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className={`${beVietnamPro.className} antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Ga4Provider enabled={gaEnabled} allowLocalhost={gaAllowLocalhost} />
        {/*
          Tracker lượt truy cập tự ghi (MongoDB riêng).
          Chạy SONG SONG với GA4 — GA4 giữ nguyên hoạt động, tracker này bổ
          sung bảng thống kê nguồn truy cập tích luỹ trong Admin.
        */}
        <TrafficTracker />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
