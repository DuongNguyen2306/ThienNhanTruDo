'use client';

import { useState, useEffect } from 'react';
import { api, paymentApi } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';

interface Package {
  id: string;
  name: string;
  price: number;
  days: number;
  features: string[];
  popular?: boolean;
  roles?: string[];
}

interface PackageOrder {
  id: string;
  orderRef: string;
  amount: number;
  packageName: string;
  packageDays: number;
  method?: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', className: 'bg-yellow-400' },
  PENDING_REVIEW: { label: 'Chờ duyệt', className: 'bg-blue-400' },
  APPROVED: { label: 'Đã kích hoạt', className: 'bg-green-400' },
  REJECTED: { label: 'Từ chối', className: 'bg-red-400' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-gray-400' },
  EXPIRED: { label: 'Hết hạn', className: 'bg-orange-400' },
};

export default function PackagePurchasePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'orders'>('packages');
  // id of the package or order currently being sent to VNPay
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/dang-nhap?redirect=/tai-khoan/nang-cap');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchPackages();
      fetchOrders();
    }
  }, [user]);

  const fetchPackages = async () => {
    try {
      const res = await api.get<{ packages: Package[] }>(`/api/payment/packages?role=${user?.role || 'tenant'}`);
      setPackages(res.data.packages || []);
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get<{ orders: PackageOrder[] }>('/api/payment/my-orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Redirect to VNPay: a new order for a package, or a retry of an unpaid order.
  const payWithVnpay = async (params: { packageId: string } | { orderId: string }, key: string) => {
    setRedirecting(key);
    setPayError(null);
    try {
      const res = await paymentApi.createVnpayUrl(
        'packageId' in params ? { purpose: 'package_order', packageId: params.packageId } : { orderId: params.orderId }
      );
      if (!res.paymentUrl) throw new Error('Không tạo được liên kết thanh toán VNPay');
      window.location.href = res.paymentUrl;
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Không thể kết nối cổng thanh toán VNPay');
      setRedirecting(null);
    }
  };

  const handlePurchase = (pkg: Package) => {
    if (pkg.price === 0) {
      alert('Gói miễn phí không cần thanh toán');
      return;
    }
    payWithVnpay({ packageId: pkg.id }, pkg.id);
  };

  const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
  const formatDate = (date: string) => new Date(date).toLocaleString('vi-VN');

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_LABELS[status] || { label: status, className: 'bg-gray-400' };
    return <span className={`rounded-full px-3 py-1 text-xs font-bold ${cfg.className}`}>{cfg.label}</span>;
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_#151515]">
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold">Nâng cấp gói dịch vụ</h1>
        <p className="mb-6 text-sm text-gray-600">
          Thanh toán trực tuyến qua cổng VNPay — gói được kích hoạt ngay khi thanh toán thành công.
        </p>

        {payError && (
          <div className="mb-6 rounded-xl border-2 border-red-400 bg-red-50 p-4 text-sm font-medium text-red-700">
            {payError}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setActiveTab('packages')}
            className={`rounded-xl border-2 border-black px-6 py-3 font-bold transition-all ${
              activeTab === 'packages'
                ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_#151515]'
                : 'bg-white shadow-[2px_2px_0px_0px_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5'
            }`}
          >
            📦 Mua gói
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`rounded-xl border-2 border-black px-6 py-3 font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_#151515]'
                : 'bg-white shadow-[2px_2px_0px_0px_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5'
            }`}
          >
            📋 Đơn hàng của tôi
          </button>
        </div>

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <>
            {loading ? (
              <div className="py-8 text-center">Đang tải...</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#151515] ${
                      pkg.popular ? 'ring-4 ring-yellow-400' : ''
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-3 left-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                        PHỔ BIẾN
                      </span>
                    )}
                    <h3 className="mb-2 text-xl font-bold">{pkg.name}</h3>
                    <p className="mb-4 text-3xl font-bold text-green-600">
                      {pkg.price === 0 ? 'MIỄN PHÍ' : formatMoney(pkg.price)}
                    </p>
                    <p className="mb-4 text-sm text-gray-600">{pkg.days} ngày</p>
                    <ul className="mb-6 space-y-2">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={redirecting !== null}
                      className="mt-auto w-full rounded-xl border-2 border-black bg-yellow-400 py-3 font-bold shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 disabled:opacity-60"
                    >
                      {redirecting === pkg.id ? 'Đang chuyển sang VNPay...' : pkg.price === 0 ? 'Miễn phí' : 'Mua ngay qua VNPay'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            {orders.length === 0 ? (
              <div className="rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_#151515]">
                <p className="text-gray-600">Chưa có đơn hàng nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#151515]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          <span className="font-mono font-bold">{order.orderRef}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="font-semibold">{order.packageName}</p>
                        <p className="text-sm text-gray-600">{order.packageDays} ngày</p>
                        <p className="text-xs text-gray-500">
                          Tạo: {formatDate(order.createdAt)} · {order.method === 'VNPAY' ? 'VNPay' : 'Chuyển khoản (cũ)'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatMoney(order.amount)}</p>
                        {order.status === 'PENDING_PAYMENT' && (
                          <button
                            onClick={() => payWithVnpay({ orderId: order.id }, order.id)}
                            disabled={redirecting !== null}
                            className="mt-2 rounded-xl border-2 border-black bg-yellow-400 px-4 py-2 text-sm font-semibold disabled:opacity-60"
                          >
                            {redirecting === order.id ? 'Đang chuyển...' : 'Thanh toán VNPay'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`size-2 rounded-full ${['PENDING_PAYMENT', 'PENDING_REVIEW', 'APPROVED'].includes(order.status) ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                        <span>Chờ thanh toán</span>
                        <span className="mx-2">→</span>
                        <span className={`size-2 rounded-full ${order.status === 'APPROVED' ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span>Đã kích hoạt</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
