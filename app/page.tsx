'use client'

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { BrutalFooter } from '@/components/brutal-footer'
import { BrutalListingCard } from '@/components/brutal-listing-card'
import { listings } from '@/lib/data'

const ROOM_TYPES = [
  { label: 'Phòng trọ', icon: '🏠' },
  { label: 'Chung cư mini', icon: '🏢' },
  { label: 'Căn hộ dịch vụ', icon: '🏙' },
  { label: 'Ký túc xá', icon: '🎓' },
]

const TRUST_ITEMS = [
  { icon: '💰', text: 'Giá thuê rõ ràng' },
  { icon: '📷', text: 'Hình ảnh thực tế' },
  { icon: '✅', text: 'Thông tin xác minh' },
]

export default function HomePage() {
  const router = useRouter()
  const featured = listings.filter((l) => l.status === 'active' && (l.vip || l.verified)).slice(0, 3)

  return (
    <main className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#F5F5F0] pt-10 pb-16">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1">
              <h1 
                className="text-[2.8rem] font-black leading-[1.1] tracking-tight text-[#151515] xl:text-[3.5rem]"
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                TÌM PHÒNG THẬT —{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-[#FDE047]" style={{ WebkitTextStroke: '2px #151515' }}>
                    THUÊ AN TÂM
                  </span>
                </span>
              </h1>
              
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#151515]/70">
                Thông tin rõ ràng về giá thuê, địa chỉ chính xác và hình ảnh thực tế được xác minh bởi đội ngũ Manager.
              </p>

              {/* Search Module */}
              <div className="mt-10">
                <p 
                  className="mb-4 text-sm font-bold text-[#151515]"
                  style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
                >
                  Bạn muốn tìm phòng ở đâu?
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#151515]/50" />
                    <input
                      type="text"
                      placeholder="Nhập quận, huyện, đường..."
                      className="h-14 w-full rounded-xl border-[2.5px] border-[#151515] bg-white pl-12 pr-4 text-sm font-medium text-[#151515] placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 shadow-[4px_4px_0_#151515]"
                    />
                  </div>
                  <select className="h-14 min-w-[160px] rounded-xl border-[2.5px] border-[#151515] bg-white px-4 text-sm font-medium text-[#151515] shadow-[4px_4px_0_#151515] cursor-pointer focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30">
                    <option>Loại phòng</option>
                    <option>Phòng trọ</option>
                    <option>Chung cư mini</option>
                    <option>Căn hộ dịch vụ</option>
                    <option>Ký túc xá</option>
                  </select>
                  <button
                    onClick={() => router.push('/tim-kiem')}
                    className="h-14 rounded-xl border-[2.5px] border-[#151515] bg-[#FDE047] px-8 text-base font-bold text-[#151515] shadow-[4px_4px_0_#151515] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#151515]"
                  >
                    Tìm phòng ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="order-1 lg:order-2">
              <div className="relative overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
                <img
                  src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80"
                  alt="Modern apartment interior"
                  className="aspect-[4/3] w-full object-cover"
                />
                {/* Floating badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 py-3 shadow-[3px_3px_0_#151515]">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#FDE047] font-bold text-xl">✓</span>
                  <div>
                    <p className="text-sm font-bold text-[#151515]">Đã kiểm định</p>
                    <p className="text-xs text-[#151515]/60">1.240+ phòng</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Room Type Shortcuts */}
      <section className="border-y-[2px] border-[#151515] bg-white py-5">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {ROOM_TYPES.map((type) => (
              <button
                key={type.label}
                onClick={() => router.push('/tim-kiem')}
                className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515]"
              >
                <span>{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-12">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 
                className="text-2xl font-black text-[#151515] lg:text-3xl"
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                PHÒNG NỔI BẬT
              </h2>
              <p className="mt-1 text-sm text-[#151515]/60">
                Những tin đăng được ưu tiên hiển thị
              </p>
            </div>
            <button 
              onClick={() => router.push('/tim-kiem')}
              className="text-sm font-semibold text-[#151515] underline underline-offset-4 hover:text-[#FDE047]"
            >
              Xem tất cả →
            </button>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <BrutalListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-y-[2px] border-[#151515] bg-white py-8">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            {TRUST_ITEMS.map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-lg font-bold shadow-[2px_2px_0_#151515]">
                  {item.icon}
                </span>
                <span className="text-sm font-semibold text-[#151515]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="flex flex-col items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-[#151515] p-10 text-center shadow-[6px_6px_0_#FDE047]">
            <h2 
              className="text-2xl font-black text-white lg:text-3xl"
              style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
            >
              Bạn có phòng muốn đăng?
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/70">
              Đăng tin miễn phí, tiếp cận hàng ngàn người thuê đang tìm phòng chính hãng.
            </p>
            <button
              onClick={() => router.push('/dang-ky')}
              className="mt-6 rounded-xl border-[2px] border-[#FDE047] bg-[#FDE047] px-8 py-3 text-base font-bold text-[#151515] shadow-[4px_4px_0_white] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_white]"
            >
              Đăng tin ngay
            </button>
          </div>
        </div>
      </section>

      <BrutalFooter />
    </main>
  )
}
