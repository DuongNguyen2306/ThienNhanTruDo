'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';

interface PackageOrder {
  id: string;
  orderRef: string;
  userId: string;
  userRole: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  packageDays: number;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
  transferRef: string;
  amount: number;
  status: string;
  proofUrl?: string;
  proofUploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerNote?: string;
  verifiedAmount?: number;
  verifiedBankTx?: string;
  verifiedDate?: string;
  expiresAt: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
    role: string;
  };
}

interface BoostOrder {
  id: string;
  orderRef: string;
  userId: string;
  listingId: string;
  listingTitle: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  packageDays: number;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
  transferRef: string;
  amount: number;
  status: string;
  proofUrl?: string;
  proofUploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerNote?: string;
  verifiedBankTx?: string;
  verifiedDate?: string;
  expiresAt: string;
  createdAt: string;
}

interface WalletDeposit {
  id: string;
  depositRef: string;
  userId: string;
  amount: number;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
  transferRef: string;
  status: string;
  proofUrl?: string;
  proofUploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerNote?: string;
  verifiedBankTx?: string;
  verifiedDate?: string;
  expiresAt: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
}

type ReviewItem = 
  | { type: 'order'; data: PackageOrder }
  | { type: 'deposit'; data: WalletDeposit }
  | { type: 'boost'; data: BoostOrder };

export default function ManagerPaymentReviewsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [boostOrders, setBoostOrders] = useState<BoostOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [itemType, setItemType] = useState<'orders' | 'deposits' | 'boosts'>('orders');
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Approval form
  const [approvalForm, setApprovalForm] = useState({
    verifiedAmount: '',
    verifiedBankTx: '',
    verifiedDate: '',
    internalNote: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [showClarify, setShowClarify] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'admin') {
      fetchData();
    }
  }, [user, statusFilter, page, itemType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (itemType === 'orders') {
        const res = await api<{ orders: PackageOrder[]; pagination: any }>(`/api/payment/manager/reviews?status=${statusFilter}&page=${page}&limit=10`);
        setOrders(res.orders || []);
        setTotalPages(res.pagination?.totalPages || 1);
      } else if (itemType === 'deposits') {
        const res = await api<{ deposits: WalletDeposit[]; pagination: any }>(`/api/payment/manager/deposits?status=${statusFilter}&page=${page}&limit=10`);
        setDeposits(res.deposits || []);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        const res = await api<{ orders: BoostOrder[]; pagination: any }>(`/api/payment/manager/boost-orders?status=${statusFilter}&page=${page}&limit=10`);
        setBoostOrders(res.orders || []);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrder = async () => {
    if (!selectedItem || selectedItem.type !== 'order') return;
    if (!approvalForm.verifiedAmount || !approvalForm.verifiedBankTx || !approvalForm.verifiedDate) {
      alert('Vui lòng điền đầy đủ thông tin xác minh');
      return;
    }

    if (!confirm('Xác nhận đã kiểm tra giao dịch ngân hàng thực tế?')) return;

    setActionLoading(true);
    try {
      await api(`/api/payment/manager/approve/${selectedItem.data.id}`, {
        method: 'POST',
        body: {
          verifiedAmount: parseFloat(approvalForm.verifiedAmount),
          verifiedBankTx: approvalForm.verifiedBankTx,
          verifiedDate: approvalForm.verifiedDate,
          internalNote: approvalForm.internalNote,
        },
      });
      alert('Đã duyệt thanh toán');
      setSelectedItem(null);
      fetchData();
      // Reload user session to update wallet balance and package status
      const meRes = await api<{ user: any }>('/api/auth/me');
      if (meRes.user) {
        localStorage.setItem('user', JSON.stringify(meRes.user));
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi duyệt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDeposit = async () => {
    if (!selectedItem || selectedItem.type !== 'deposit') return;

    if (!confirm('Xác nhận đã kiểm tra giao dịch ngân hàng thực tế?')) return;

    setActionLoading(true);
    try {
      await api(`/api/payment/manager/deposit/${selectedItem.data.id}/approve`, {
        method: 'POST',
        body: {
          verifiedBankTx: `DEP-${Date.now()}`,
          verifiedDate: new Date().toISOString(),
          internalNote: approvalForm.internalNote,
        },
      });
      alert('Đã duyệt nạp tiền và cộng vào ví');
      setSelectedItem(null);
      fetchData();
      const meRes = await api<{ user: any }>('/api/auth/me');
      if (meRes.user) {
        localStorage.setItem('user', JSON.stringify(meRes.user));
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi duyệt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedItem || selectedItem.type !== 'order' || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/api/payment/manager/reject/${selectedItem.data.id}`, {
        method: 'POST',
        body: { reason: rejectReason },
      });
      alert('Đã từ chối');
      setSelectedItem(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi từ chối');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDeposit = async () => {
    if (!selectedItem || selectedItem.type !== 'deposit' || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/api/payment/manager/deposit/${selectedItem.data.id}/reject`, {
        method: 'POST',
        body: { reason: rejectReason },
      });
      alert('Đã từ chối');
      setSelectedItem(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi từ chối');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClarifyOrder = async () => {
    if (!selectedItem || selectedItem.type !== 'order' || !rejectReason.trim()) {
      alert('Vui lòng nhập nội dung yêu cầu làm rõ');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/api/payment/manager/reject/${selectedItem.data.id}`, {
        method: 'POST',
        body: {
          requestClarification: true,
          reason: rejectReason,
        },
      });
      alert('Đã gửi yêu cầu làm rõ');
      setSelectedItem(null);
      setRejectReason('');
      setShowClarify(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClarifyDeposit = async () => {
    if (!selectedItem || selectedItem.type !== 'deposit' || !rejectReason.trim()) {
      alert('Vui lòng nhập nội dung yêu cầu làm rõ');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/api/payment/manager/deposit/${selectedItem.data.id}/reject`, {
        method: 'POST',
        body: {
          requestClarification: true,
          reason: rejectReason,
        },
      });
      alert('Đã gửi yêu cầu làm rõ');
      setSelectedItem(null);
      setRejectReason('');
      setShowClarify(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveBoost = async () => {
    if (!selectedItem || selectedItem.type !== 'boost') return;
    if (!approvalForm.verifiedBankTx) {
      alert('Vui lòng nhập mã giao dịch ngân hàng');
      return;
    }
    if (!confirm('Xác nhận đã kiểm tra giao dịch ngân hàng thực tế?')) return;

    setActionLoading(true);
    try {
      await api(`/api/payment/manager/boost-order/${selectedItem.data.id}/approve`, {
        method: 'POST',
        body: {
          verifiedBankTx: approvalForm.verifiedBankTx,
          verifiedDate: approvalForm.verifiedDate || new Date().toISOString(),
          internalNote: approvalForm.internalNote,
        },
      });
      alert('Đã duyệt thanh toán Boost và kích hoạt VIP');
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi duyệt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBoost = async () => {
    if (!selectedItem || selectedItem.type !== 'boost' || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await api(`/api/payment/manager/boost-order/${selectedItem.data.id}/reject`, {
        method: 'POST',
        body: { reason: rejectReason },
      });
      alert('Đã từ chối');
      setSelectedItem(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi từ chối');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString('vi-VN');
  const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

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

  const pendingCount = deposits.filter(d => d.status === 'PENDING_REVIEW').length;
  const boostPendingCount = boostOrders.filter(b => b.status === 'PENDING_REVIEW').length;

  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F5F5F0] p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_#151515]">
          <h1 className="text-2xl font-bold text-red-600">Không có quyền truy cập</h1>
        </div>
      </div>
    );
  }

  const items = itemType === 'orders' 
    ? orders.map(o => ({ type: 'order' as const, data: o }))
    : itemType === 'deposits'
    ? deposits.map(d => ({ type: 'deposit' as const, data: d }))
    : boostOrders.map(b => ({ type: 'boost' as const, data: b }));

  return (
    <div className="min-h-screen bg-[#F5F5F0] p-6">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-[#151515]/60">
          <Link href="/manager" className="hover:text-[#151515]">Trang chủ</Link>
          <span>/</span>
          <span className="text-[#151515]">Duyệt thanh toán</span>
        </nav>

        <h1 className="mb-6 text-3xl font-black text-[#151515]">Duyệt thanh toán chuyển khoản</h1>

        {/* Type Tabs */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => { setItemType('orders'); setPage(1); setSelectedItem(null); }}
            className={`rounded-xl border-2 border-black px-6 py-3 font-bold transition-all ${
              itemType === 'orders'
                ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_#151515]'
                : 'bg-white shadow-[2px_2px_0px_0px_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5'
            }`}
          >
            📦 Gói dịch vụ
          </button>
          <button
            onClick={() => { setItemType('boosts'); setPage(1); setSelectedItem(null); }}
            className={`rounded-xl border-2 border-black px-6 py-3 font-bold transition-all ${
              itemType === 'boosts'
                ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_#151515]'
                : 'bg-white shadow-[2px_2px_0px_0px_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5'
            }`}
          >
            🚀 Boost VIP
            {boostPendingCount > 0 && (
              <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {boostPendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setItemType('deposits'); setPage(1); setSelectedItem(null); }}
            className={`rounded-xl border-2 border-black px-6 py-3 font-bold transition-all ${
              itemType === 'deposits'
                ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_#151515]'
                : 'bg-white shadow-[2px_2px_0px_0px_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5'
            }`}
          >
            💰 Nạp tiền ví
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          {['PENDING_REVIEW', 'PENDING', 'APPROVED', 'REJECTED', 'all'].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`rounded-xl border-2 border-black px-4 py-2 text-sm font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-yellow-400 shadow-[3px_3px_0px_0px_#151515]'
                  : 'bg-white shadow-[2px_2px_0px_0px_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5'
              }`}
            >
              {status === 'all' ? 'Tất cả' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Items List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_#151515]">
            <p className="text-gray-600">Không có yêu cầu nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const data = item.data;
              const id = item.type === 'order' 
                ? (data as PackageOrder).orderRef 
                : item.type === 'deposit'
                ? (data as WalletDeposit).depositRef
                : (data as BoostOrder).orderRef;
              const user = item.type === 'boost'
                ? null  // Boost orders don't include user
                : item.type === 'order' 
                ? (data as PackageOrder).user 
                : (data as WalletDeposit).user;
              const amount = item.type === 'order' 
                ? (data as PackageOrder).amount 
                : item.type === 'deposit'
                ? (data as WalletDeposit).amount
                : (data as BoostOrder).amount;
              const status = data.status;
              
              // For boost orders, show listing title
              const listingTitle = item.type === 'boost' ? (data as BoostOrder).listingTitle : null;

              return (
                <div
                  key={item.type + '-' + data.id}
                  className="cursor-pointer rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#151515]"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <span className="font-mono font-bold">{id}</span>
                        <span className="text-xs text-gray-500">
                          {item.type === 'order' ? '📦 Gói dịch vụ' : item.type === 'boost' ? '🚀 Boost VIP' : '💰 Nạp tiền ví'}
                        </span>
                        {getStatusBadge(status)}
                      </div>
                      {user && (
                        <>
                          <p className="font-semibold text-[#151515]">{user.fullName || user.phone}</p>
                          <p className="text-sm text-gray-600">
                            {user.email || 'N/A'}
                          </p>
                        </>
                      )}
                      {listingTitle && (
                        <>
                          <p className="font-semibold text-[#151515]">{listingTitle}</p>
                          <p className="text-sm text-gray-600">Boost VIP</p>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-2xl font-black text-[#059669]">{formatMoney(amount)}</p>
                      {item.type === 'order' && (
                        <p className="text-sm text-gray-600">{(data as PackageOrder).packageName}</p>
                      )}
                      {item.type === 'boost' && (
                        <p className="text-sm text-gray-600">{(data as BoostOrder).packageName}</p>
                      )}
                      <p className="text-xs text-gray-500">{formatDate(data.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl border-2 border-black bg-white px-4 py-2 disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="flex items-center px-4">Trang {page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl border-2 border-black bg-white px-4 py-2 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_#151515]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedItem.type === 'order' ? 'Chi tiết đơn hàng gói' : selectedItem.type === 'boost' ? 'Chi tiết đơn Boost VIP' : 'Chi tiết yêu cầu nạp tiền'}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedItem.type === 'order' 
                    ? (selectedItem.data as PackageOrder).orderRef 
                    : selectedItem.type === 'boost'
                    ? (selectedItem.data as BoostOrder).orderRef
                    : (selectedItem.data as WalletDeposit).depositRef}
                </p>
              </div>
              <button
                onClick={() => { setSelectedItem(null); setShowClarify(false); setRejectReason(''); }}
                className="text-2xl font-bold hover:text-red-500"
              >
                ✕
              </button>
            </div>

            {/* Info */}
            <div className="mb-6 grid gap-4 rounded-xl bg-gray-100 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Trạng thái</p>
                  {getStatusBadge(selectedItem.data.status)}
                </div>
                {selectedItem.type === 'order' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Gói</p>
                      <p className="font-semibold">{(selectedItem.data as PackageOrder).packageName}</p>
                      <p className="text-sm text-gray-600">{(selectedItem.data as PackageOrder).packageDays} ngày</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Vai trò</p>
                      <p>{(selectedItem.data as PackageOrder).userRole}</p>
                    </div>
                  </>
                )}
                {selectedItem.type === 'boost' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Gói Boost</p>
                      <p className="font-semibold">{(selectedItem.data as BoostOrder).packageName}</p>
                      <p className="text-sm text-gray-600">{(selectedItem.data as BoostOrder).packageDays} ngày</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tin đăng</p>
                      <p className="font-semibold">{(selectedItem.data as BoostOrder).listingTitle}</p>
                    </div>
                  </>
                )}
                {selectedItem.type === 'deposit' && (
                  <div>
                    <p className="text-sm text-gray-600">Loại</p>
                    <p className="font-semibold">Nạp tiền ví</p>
                  </div>
                )}
                {selectedItem.type !== 'boost' && (
                  <div>
                    <p className="text-sm text-gray-600">Người yêu cầu</p>
                    {selectedItem.type === 'order' 
                      ? (selectedItem.data as PackageOrder).user?.fullName 
                      : (selectedItem.data as WalletDeposit).user?.fullName}
                    <p className="text-sm text-gray-600">
                      {selectedItem.type === 'order' 
                        ? (selectedItem.data as PackageOrder).user?.phone 
                        : (selectedItem.data as WalletDeposit).user?.phone}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Số tiền</p>
                  <p className="font-mono text-2xl font-black text-[#059669]">
                    {formatMoney(selectedItem.type === 'order' 
                      ? (selectedItem.data as PackageOrder).amount 
                      : selectedItem.type === 'boost'
                      ? (selectedItem.data as BoostOrder).amount
                      : (selectedItem.data as WalletDeposit).amount)}
                  </p>
                </div>
              </div>

              {/* Bank Transfer Details */}
              <div className="border-t border-gray-300 pt-4">
                <p className="mb-2 font-semibold">Thông tin chuyển khoản</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>Ngân hàng: {selectedItem.data.bankName}</p>
                  <p>STK: {selectedItem.data.accountNumber}</p>
                  <p>Người nhận: {selectedItem.data.accountHolder}</p>
                  <p className="font-bold">
                    Nội dung CK: <span className="text-blue-600">{selectedItem.data.transferRef}</span>
                  </p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t border-gray-300 pt-4 text-sm text-gray-600">
                <p>Tạo: {formatDate(selectedItem.data.createdAt)}</p>
                {selectedItem.data.proofUploadedAt && <p>Nộp minh chứng: {formatDate(selectedItem.data.proofUploadedAt)}</p>}
                <p>Hết hạn: {formatDate(selectedItem.data.expiresAt)}</p>
              </div>
            </div>

            {/* Payment Proof */}
            {selectedItem.data.proofUrl && (
              <div className="mb-6">
                <p className="mb-2 font-semibold">Minh chứng thanh toán</p>
                {selectedItem.data.proofUrl.startsWith('data:') ? (
                  <img
                    src={selectedItem.data.proofUrl}
                    alt="Payment proof"
                    className="max-h-64 rounded-xl border-2 border-black"
                  />
                ) : (
                  <a
                    href={selectedItem.data.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Xem minh chứng
                  </a>
                )}
              </div>
            )}

            {/* Review Details */}
            {selectedItem.data.reviewedAt && (
              <div className="mb-6 rounded-xl bg-blue-50 p-4">
                <p className="font-semibold">Kết quả duyệt</p>
                <p className="text-sm text-gray-600">
                  {selectedItem.data.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'} lúc {formatDate(selectedItem.data.reviewedAt)}
                </p>
                {(selectedItem.data as PackageOrder).verifiedAmount && (
                  <p className="text-sm">Số tiền xác minh: {formatMoney((selectedItem.data as PackageOrder).verifiedAmount!)}</p>
                )}
                {selectedItem.data.verifiedBankTx && (
                  <p className="text-sm">Mã GD ngân hàng: {selectedItem.data.verifiedBankTx}</p>
                )}
                {selectedItem.data.reviewerNote && (
                  <p className="mt-2 text-sm italic">"{selectedItem.data.reviewerNote}"</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {(selectedItem.data.status === 'PENDING_REVIEW' || selectedItem.data.status === 'PENDING') && (
              <div className="space-y-4 border-t border-gray-200 pt-4">
                <h3 className="font-bold">Hành động</h3>

                {/* Approve Form */}
                <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4">
                  <p className="mb-3 font-semibold text-green-700">
                    ✅ {selectedItem.type === 'order' ? 'Duyệt thanh toán & kích hoạt gói' : selectedItem.type === 'boost' ? 'Duyệt thanh toán & kích hoạt Boost' : 'Duyệt nạp tiền & cộng vào ví'}
                  </p>
                  <p className="mb-3 text-sm text-gray-600">
                    ⚠️ Bạn phải xác nhận đã kiểm tra giao dịch ngân hàng thực tế trước khi duyệt.
                  </p>
                  {/* Chỉ hiện các trường cần thiết cho từng loại */}
                  {selectedItem.type === 'order' && (
                    <input
                      type="number"
                      placeholder="Số tiền thực nhận (VND)"
                      value={approvalForm.verifiedAmount}
                      onChange={e => setApprovalForm(f => ({ ...f, verifiedAmount: e.target.value }))}
                      className="mb-3 w-full rounded-xl border-2 border-black px-4 py-2"
                    />
                  )}
                  <textarea
                    placeholder="Ghi chú nội bộ (tùy chọn)"
                    value={approvalForm.internalNote}
                    onChange={e => setApprovalForm(f => ({ ...f, internalNote: e.target.value }))}
                    className="mb-3 w-full rounded-xl border-2 border-black px-4 py-2"
                    rows={2}
                  />
                  <button
                    onClick={() => {
                      if (actionLoading) return;
                      if (selectedItem.type === 'order') handleApproveOrder();
                      else if (selectedItem.type === 'boost') handleApproveBoost();
                      else handleApproveDeposit();
                    }}
                    disabled={actionLoading}
                    className="w-full rounded-xl border-2 border-black bg-green-400 px-6 py-3 font-bold shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 disabled:opacity-50"
                  >
                    {actionLoading ? 'Đang xử lý...' : selectedItem.type === 'order' 
                      ? 'Xác nhận đã nhận tiền & kích hoạt gói' 
                      : selectedItem.type === 'boost'
                      ? 'Xác nhận đã nhận tiền & kích hoạt Boost'
                      : 'Xác nhận đã nhận tiền & cộng vào ví'}
                  </button>
                </div>

                {/* Reject / Clarify */}
                <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4">
                  <p className="mb-3 font-semibold text-red-700">❌ Từ chối / Yêu cầu làm rõ</p>
                  <textarea
                    placeholder="Lý do từ chối hoặc yêu cầu làm rõ..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="mb-3 w-full rounded-xl border-2 border-black px-4 py-2"
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (selectedItem.type === 'order') handleRejectOrder();
                        else if (selectedItem.type === 'boost') handleRejectBoost();
                        else handleRejectDeposit();
                      }}
                      disabled={actionLoading}
                      className="rounded-xl border-2 border-black bg-red-400 px-4 py-2 font-semibold disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
