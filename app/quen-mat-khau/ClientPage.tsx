'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'

export default function ClientPage() {
  const router = useRouter()

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />

      <div className="grid min-h-[calc(100vh-68px)] lg:grid-cols-[58%_42%]">
        
        {/* LEFT: Info Panel */}
        <div className="flex justify-center bg-white px-8 py-12 lg:px-16">
          <div className="w-full max-w-md">
            
            <div className="mb-6">
              <h1 
                className="text-2xl font-black text-[#151515] lg:text-3xl" 
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                QUÊN MẬT KHẨU
              </h1>
              <p className="mt-1 text-sm text-[#151515]/60">
                Khôi phục tài khoản khi quên mật khẩu.
              </p>
            </div>

            <div className="rounded-2xl border-[3px] border-[#151515] bg-[#F5F5F0] p-6 shadow-[5px_5px_0_#151515]">
              
              <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2 font-bold text-amber-800">⚠️ Tính năng đang phát triển</h3>
                <p className="text-sm text-amber-700">
                  Hiện tại, việc đặt lại mật khẩu qua OTP/SMS chưa được triển khai. 
                  Để khôi phục tài khoản, vui lòng liên hệ bộ phận hỗ trợ.
                </p>
              </div>

              <div className="mb-4 space-y-3">
                <h4 className="font-bold text-[#151515]">Liên hệ hỗ trợ:</h4>
                
                <div className="flex items-center gap-3 rounded-xl border-2 border-[#151515] bg-white p-4 shadow-[2px_2px_0_#151515]">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                    <Phone className="size-5 text-[#151515]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#151515]">Hotline</p>
                    <p className="font-mono text-sm font-bold text-emerald-600">1900 1234</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border-2 border-[#151515] bg-white p-4 shadow-[2px_2px_0_#151515]">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                    <Mail className="size-5 text-[#151515]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#151515]">Email</p>
                    <p className="font-mono text-sm font-bold text-emerald-600">hotro@thiennhan.vn</p>
                  </div>
                </div>
              </div>

              <p className="mb-4 text-sm text-slate-600">
                Khi liên hệ, vui lòng cung cấp:
              </p>
              <ul className="mb-6 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">✓ Số điện thoại đã đăng ký</li>
                <li className="flex items-center gap-2">✓ Email đã đăng ký (nếu có)</li>
                <li className="flex items-center gap-2">✓ Thông tin tài khoản để xác minh</li>
              </ul>

              <button
                type="button"
                onClick={() => router.push('/dang-nhap')}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
              >
                <ArrowLeft className="size-5" />
                Quay lại đăng nhập
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border-2 border-[#151515]/20 bg-white p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#059669]" />
              <p className="text-xs text-[#151515]/60">
                Đội ngũ hỗ trợ làm việc từ 8:00 - 18:00, thứ 2 - thứ 6.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Branding Panel */}
        <div className="hidden lg:flex lg:w-full lg:min-w-0 flex-col items-start bg-[#FDE047] px-12 py-12">
          <div className="w-full max-w-2xl">
            
            <h2 
              className="text-4xl font-black leading-tight text-[#151515] xl:text-5xl" 
              style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
            >
              Khôi phục tài khoản — an toàn và nhanh chóng.
            </h2>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border-[3px] border-[#151515] bg-white px-5 py-2.5 text-sm font-black text-[#151515] shadow-[3px_3px_0_#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              <ShieldCheck className="size-5" />
              THIÊN NHÃN TRÚ ĐỒ
            </div>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#151515]/70">
              Liên hệ bộ phận hỗ trợ để được giúp đỡ khôi phục tài khoản một cách an toàn.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-start gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                  <Phone className="size-5 text-[#151515]" />
                </div>
                <div>
                  <p className="font-bold text-[#151515]">Hotline 24/7</p>
                  <p className="text-sm text-[#151515]/60">Hỗ trợ khẩn cấp mọi lúc</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                  <Mail className="size-5 text-[#151515]" />
                </div>
                <div>
                  <p className="font-bold text-[#151515]">Email hỗ trợ</p>
                  <p className="text-sm text-[#151515]/60">Phản hồi trong 24h</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#059669] shadow-[2px_2px_0_#151515]">
                  <ShieldCheck className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#151515]">Bảo mật tài khoản</p>
                  <p className="text-sm text-[#151151]/60">Xác minh danh tính trước khi đặt lại</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
