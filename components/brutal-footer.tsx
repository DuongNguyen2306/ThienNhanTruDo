import Link from 'next/link'

function LogoText() {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-black tracking-tight text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 900 }}>
        THIÊN
      </span>
      <span className="text-xl font-black italic tracking-tight text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 900 }}>
        DỮ
      </span>
      <span className="text-xl font-black tracking-tight text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 900 }}>
        TRÚ ĐỒ
      </span>
    </div>
  )
}

export function BrutalFooter() {
  return (
    <footer className="border-t-[2px] border-[#151515] bg-[#151515] text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <LogoText />
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Nền tảng thuê phòng minh bạch tại Việt Nam. Địa chỉ thật, giá thật, hình ảnh thật.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Về chúng tôi</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/ve-verirent" className="text-sm text-white/70 hover:text-white transition-colors">Câu chuyện</Link></li>
              <li><Link href="/pricing" className="text-sm text-white/70 hover:text-white transition-colors">Bảng giá dịch vụ</Link></li>
              <li><Link href="/quy-che" className="text-sm text-white/70 hover:text-white transition-colors">Điều khoản sử dụng</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Hỗ trợ</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/ho-tro" className="text-sm text-white/70 hover:text-white transition-colors">Trung tâm trợ giúp</Link></li>
              <li><Link href="/ho-tro" className="text-sm text-white/70 hover:text-white transition-colors">Câu hỏi thường gặp</Link></li>
              <li><Link href="/ho-tro" className="text-sm text-white/70 hover:text-white transition-colors">Liên hệ CSKH</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Kết nối</h3>
            <ul className="mt-3 space-y-2">
              <li><span className="text-sm text-white/70">Hotline: 1900 1234</span></li>
              <li><span className="text-sm text-white/70">Email: hotro@thiennhan.vn</span></li>
              <li className="flex gap-3 pt-2">
                <a href="#" className="flex size-8 items-center justify-center rounded-lg border-[2px] border-white/30 text-white/70 hover:border-white hover:text-white transition-all">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="flex size-8 items-center justify-center rounded-lg border-[2px] border-white/30 text-white/70 hover:border-white hover:text-white transition-all">
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-xs text-white/40 sm:flex-row">
          <p>© 2026 Thiên Dữ Trú Đồ — Số ĐKKD 0316-999-111 · Cơ quan cấp: Sở KH&ĐT TP.HCM</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              VNPay
            </span>
            <span className="flex items-center gap-1">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Goong Map
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
