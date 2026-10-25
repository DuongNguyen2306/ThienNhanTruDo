'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
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
  transferRef: string;
  amount: number;
  packageName: string;
  packageDays: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  proofUploadedAt?: string;
  bankAccount?: {
    bankName: string;
    bankBin: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export default function PackagePurchasePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [currentOrder, setCurrentOrder] = useState<PackageOrder | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState('');
  const [activeTab, setActiveTab] = useState<'packages' | 'orders'>('packages');

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

  const handlePurchase = async (pkg: Package) => {
    if (pkg.price === 0) {
      alert('Gói miễn phí không cần thanh toán');
      return;
    }

    try {
      const res = await api.post<{ success: boolean; order: PackageOrder }>('/api/payment/create-order', { packageId: pkg.id });
      if (res.data.success) {
        setCurrentOrder(res.data.order);
        setSelectedPackage(pkg);
        fetchQRCode(res.data.order.id);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Lỗi khi tạo đơn hàng');
    }
  };

  const fetchQRCode = async (orderId: string) => {
    try {
      const res = await api.get<{ qrUrl: string }>(`/api/payment/vietqr/${orderId}`);
      setQrUrl(res.data.qrUrl);
    } catch (err) {
      console.error('Error fetching QR:', err);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleUploadProof = async (orderId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('proof', file);

      try {
        await api.post('/api/payment/upload-proof', formData);
        alert('Đã gửi minh chứng thanh toán');
        fetchOrders();
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } } };
        alert(error.response?.data?.error || 'Lỗi khi tải lên');
      }
    };
    input.click();
  };

  const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
  const formatDate = (date: string) => new Date(date).toLocaleString('vi-VN');

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING_PAYMENT: 'bg-yellow-400',
      PENDING_REVIEW: 'bg-blue-400',
      APPROVED: 'bg-green-400',
      REJECTED: 'bg-red-400',
      CANCELLED: 'bg-gray-400',
      EXPIRED: 'bg-orange-400',
    };
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${badges[status] || 'bg-gray-400'}`}>
        {status.replace('_', ' ')}
      </span>
    );
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
        <h1 className="mb-6 text-3xl font-bold">Nâng cấp gói dịch vụ</h1>

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
              <div className="text-center py-8">Đang tải...</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    className={`relative rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#151515] ${
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
                      className="w-full rounded-xl border-2 border-black bg-yellow-400 py-3 font-bold shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
                    >
                      Mua ngay
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Current Order / Payment Instructions */}
            {currentOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_#151515]">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Thanh toán chuyển khoản</h2>
                    <button
                      onClick={() => { setCurrentOrder(null); setSelectedPackage(null); }}
                      className="text-2xl font-bold hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Package Info */}
                  <div className="mb-6 rounded-xl bg-yellow-100 p-4">
                    <p className="font-semibold">{currentOrder.packageName}</p>
                    <p className="text-sm text-gray-600">{currentOrder.packageDays} ngày</p>
                    <p className="text-2xl font-bold text-green-600">{formatMoney(currentOrder.amount)}</p>
                  </div>

                  {/* QR Code */}
                  {qrUrl && (
                    <div className="mb-6 text-center">
                      <p className="mb-2 font-semibold">Quét mã QR</p>
                      <img
                        src={qrUrl}
                        alt="VietQR"
                        className="mx-auto max-w-64 rounded-xl border-2 border-black"
                        onError={() => setQrUrl('')}
                      />
                      <p className="mt-2 text-sm text-gray-500">Hoặc chuyển khoản thủ công bên dưới</p>
                    </div>
                  )}

                  {/* Bank Transfer Info */}
                  <div className="mb-6 rounded-xl border-2 border-black bg-gray-50 p-4">
                    <h3 className="mb-3 font-bold">Chuyển khoản đến:</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ngân hàng:</span>
                        <span className="font-semibold">{currentOrder.bankAccount?.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Số tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{currentOrder.bankAccount?.accountNumber}</span>
                          <button
                            onClick={() => copyToClipboard(currentOrder.bankAccount?.accountNumber || '', 'account')}
                            className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                          >
                            {copied === 'account' ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tên TK:</span>
                        <span className="font-semibold">{currentOrder.bankAccount?.accountHolder}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                        <span className="text-gray-600">Số tiền:</span>
                        <span className="text-xl font-bold text-green-600">{formatMoney(currentOrder.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                        <span className="text-gray-600">Nội dung CK:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600">{currentOrder.transferRef}</span>
                          <button
                            onClick={() => copyToClipboard(currentOrder.transferRef, 'ref')}
                            className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                          >
                            {copied === 'ref' ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-red-600">
                      ⚠️ <strong>Lưu ý:</strong> Nội dung chuyển khoản phải chính xác: <strong>{currentOrder.transferRef}</strong>
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="mb-6 rounded-xl bg-blue-50 p-4">
                    <h3 className="mb-2 font-bold">Hướng dẫn:</h3>
                    <ol className="list-inside list-decimal space-y-1 text-sm">
                      <li>Chuyển khoản đúng số tiền <strong>{formatMoney(currentOrder.amount)}</strong></li>
                      <li>Ghi đúng nội dung: <strong>{currentOrder.transferRef}</strong></li>
                      <li>Chụp ảnh/screenshot biên lai chuyển tiền</li>
                      <li>Ấn nút "Đã chuyển khoản" bên dưới và tải lên minh chứng</li>
                    </ol>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleUploadProof(currentOrder.id)}
                      className="w-full rounded-xl border-2 border-black bg-green-400 py-4 font-bold shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
                    >
                      ✅ Tôi đã chuyển khoản - Tải lên minh chứng
                    </button>
                    <p className="text-center text-sm text-gray-500">
                      Đơn hàng hết hạn: {formatDate(currentOrder.expiresAt)}
                    </p>
                  </div>
                </div>
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
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-2 flex items-center gap-3">
                          <span className="font-mono font-bold">{order.orderRef}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="font-semibold">{order.packageName}</p>
                        <p className="text-sm text-gray-600">{order.packageDays} ngày</p>
                        <p className="text-xs text-gray-500">Tạo: {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatMoney(order.amount)}</p>
                        {order.status === 'PENDING_PAYMENT' && (
                          <button
                            onClick={() => {
                              setCurrentOrder(order);
                              fetchQRCode(order.id);
                            }}
                            className="mt-2 rounded-xl border-2 border-black bg-yellow-400 px-4 py-2 text-sm font-semibold"
                          >
                            Thanh toán
                          </button>
                        )}
                        {order.status === 'PENDING_PAYMENT' && !order.proofUploadedAt && (
                          <button
                            onClick={() => handleUploadProof(order.id)}
                            className="mt-2 block w-full rounded-xl border-2 border-black bg-green-400 px-4 py-2 text-sm font-semibold"
                          >
                            Đã chuyển khoản
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
                        <span className={`size-2 rounded-full ${['PENDING_REVIEW', 'APPROVED'].includes(order.status) ? 'bg-blue-400' : 'bg-gray-300'}`} />
                        <span>Chờ duyệt</span>
                        <span className="mx-2">→</span>
                        <span className={`size-2 rounded-full ${order.status === 'APPROVED' ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span>Hoàn thành</span>
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
