'use client'

import { useRouter } from 'next/navigation'
import { Building2, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListingCard } from '@/components/listing-card'
import { PublicFooter, TransparentHeader } from '@/components/shells'
import { RealMap } from '@/components/RealMap'
import { listings } from '@/lib/data'

export default function HomePage() {
  const router = useRouter()
  const featured = listings.filter((l) => l.status === 'active' && (l.vip || l.verified))

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <TransparentHeader />
      {/* ── Hero với background gradient xanh lá rừng sẫm ── */}
      <section
        className="relative flex flex-col items-center justify-center overflow-hidden px-5 pt-32 pb-10 text-center"
        style={{
          background: 'linear-gradient(180deg, #064E3B 0%, #043E30 50%, #022C22 100%)',
          minHeight: '70vh',
        }}
      >
        <h1
          className="relative max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
        >
          Tìm phòng trọ{' '}
          <span style={{ fontFamily: "'Allura', cursive", fontStyle: 'italic', fontWeight: 400 }}>
            không phí ẩn
          </span>
          ,{' '}
          <span style={{ fontFamily: "'Allura', cursive", fontStyle: 'italic', fontWeight: 400 }}>
            không địa chỉ ảo.
          </span>
        </h1>

        <p className="relative mt-5 max-w-xl leading-7 text-emerald-100/70">
          Mỗi tin đăng hiển thị địa chỉ chuẩn hoá, ghim toạ độ thật và tổng chi phí ước tính mỗi tháng
          (phòng + điện + nước).
        </p>

        <p className="relative mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-400">
          <ShieldCheck className="size-4" />
          1.240 phòng đã được Manager kiểm định tại chỗ
        </p>

        <Button
          className="relative mt-8 h-12 rounded-xl bg-[#059669] px-8 text-base font-semibold text-white hover:bg-[#10B981]"
          onClick={() => router.push('/tim-kiem')}
        >
          <Search className="mr-2 size-5" /> Tìm phòng ngay
        </Button>
      </section>

      {/* ── Map section ── */}
      <div className="mx-auto max-w-7xl px-5 pt-6 lg:px-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="h-[60vh] overflow-hidden rounded-xl">
            <RealMap listings={listings.filter((l) => l.status === 'active')} selectedId={undefined} onSelect={(id) => router.push(`/phong/${id}`)} />
          </div>
        </div>
      </div>

      {/* ── Listings section ── */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Tin VIP / đã kiểm định trực tiếp</h2>
          <p className="mt-1 text-sm text-slate-500">Manager đã đối soát địa chỉ, ảnh và biểu phí trước khi đưa lên trang chủ.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((home) => (
            <ListingCard key={home.id} listing={home} />
          ))}
        </div>
      </section>

      {/* ── Trust section ── */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 md:grid-cols-3 lg:px-10">
          <Trust title="Xác thực thực tế" copy="Ảnh, an ninh và giấy tờ quản lý được kiểm tra tại chỗ bởi Manager." />
          <Trust title="Ghim toạ độ chính xác" copy="Biết cửa vào, bề rộng đường và tiện ích xung quanh — chống địa chỉ ảo." />
          <Trust title="Tổng chi phí rõ ràng" copy="Tiền phòng, điện, nước, giữ xe và phí quản lý hiện ngay trên thẻ tin." />
        </div>
      </section>
      <PublicFooter />
    </main>
  )
}

function Trust({ title, copy }: { title: string; copy: string }) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <CardContent className="p-5">
        <Building2 className="mb-4 text-emerald-600" />
        <b className="text-slate-900">{title}</b>
        <p className="mt-1 text-sm leading-6 text-slate-500">{copy}</p>
      </CardContent>
    </Card>
  )
}
