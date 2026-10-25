'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

interface BankAccount {
  id: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
  qrImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const VIETNAM_BANKS = [
  { bin: '970436', name: 'Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam' },
  { bin: '970418', name: 'VietinBank - Ngân hàng TMCP Công Thương Việt Nam' },
  { bin: '970400', name: 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { bin: '970415', name: 'Agribank - Ngân hàng TMCP Nông nghiệp Việt Nam' },
  { bin: '970419', name: 'ACB - Ngân hàng TMCP Á Châu' },
  { bin: '970432', name: 'Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam' },
  { bin: '970437', name: 'MBBank - Ngân hàng TMCP Quân đội' },
  { bin: '970423', name: 'VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { bin: '970425', name: 'TPBank - Ngân hàng TMCP Tiên Phong' },
  { bin: '970439', name: 'HDBank - Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh' },
];

export default function AdminBankAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    bankName: '',
    bankBin: '',
    accountNumber: '',
    accountHolder: '',
    isActive: false,
    qrImageUrl: '',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ accounts: BankAccount[] }>('/api/payment/admin/bank-accounts');
      setAccounts(res.data.accounts || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Lỗi khi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelect = (bin: string) => {
    const bank = VIETNAM_BANKS.find(b => b.bin === bin);
    if (bank) {
      setForm(f => ({ ...f, bankBin: bin, bankName: bank.name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await api.put(`/api/payment/admin/bank-accounts/${editingId}`, form);
      } else {
        await api.post('/api/payment/admin/bank-accounts', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ bankName: '', bankBin: '', accountNumber: '', accountHolder: '', isActive: false, qrImageUrl: '' });
      fetchAccounts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Lỗi khi lưu');
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setForm({
      bankName: account.bankName,
      bankBin: account.bankBin,
      accountNumber: account.accountNumber,
      accountHolder: account.accountHolder,
      isActive: account.isActive,
      qrImageUrl: account.qrImageUrl || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa tài khoản này?')) return;
    try {
      await api.delete(`/api/payment/admin/bank-accounts/${id}`);
      fetchAccounts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Lỗi khi xóa');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F5F5F0] p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_#151515]">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Không có quyền truy cập</h1>
          <p>Chỉ Admin mới có quyền cấu hình tài khoản ngân hàng.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cấu hình tài khoản ngân hàng</h1>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ bankName: '', bankBin: '', accountNumber: '', accountHolder: '', isActive: false, qrImageUrl: '' }); }}
            className="rounded-xl border-2 border-black bg-yellow-400 px-6 py-3 font-semibold shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            {showForm ? 'Đóng' : '+ Thêm tài khoản'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border-2 border-red-500 bg-red-100 p-4 text-red-700">{error}</div>
        )}

        {showForm && (
          <div className="mb-6 rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#151515]">
            <h2 className="mb-4 text-xl font-bold">{editingId ? 'Sửa' : 'Thêm'} tài khoản ngân hàng</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block font-semibold">Ngân hàng</label>
                <select
                  value={form.bankBin}
                  onChange={e => handleBankSelect(e.target.value)}
                  className="w-full rounded-xl border-2 border-black px-4 py-3"
                  required
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {VIETNAM_BANKS.map(bank => (
                    <option key={bank.bin} value={bank.bin}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold">Số tài khoản</label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  className="w-full rounded-xl border-2 border-black px-4 py-3"
                  placeholder="Nhập số tài khoản"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold">Tên chủ tài khoản</label>
                <input
                  type="text"
                  value={form.accountHolder}
                  onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))}
                  className="w-full rounded-xl border-2 border-black px-4 py-3"
                  placeholder="Tên in trên thẻ/tài khoản"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="size-5"
                />
                <label htmlFor="isActive" className="font-semibold">Đặt làm tài khoản nhận mặc định</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="rounded-xl border-2 border-black bg-green-400 px-6 py-3 font-semibold shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  {editingId ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="rounded-xl border-2 border-black bg-gray-200 px-6 py-3 font-semibold shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_#151515]">
            <p className="text-gray-600">Chưa có tài khoản ngân hàng nào.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map(account => (
              <div key={account.id} className={`rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#151515] ${account.isActive ? 'ring-4 ring-yellow-400' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-bold">{account.bankName}</h3>
                      {account.isActive && (
                        <span className="rounded-full bg-green-400 px-3 py-1 text-xs font-bold">ĐANG HOẠT ĐỘNG</span>
                      )}
                    </div>
                    <p className="text-gray-600">BIN: {account.bankBin}</p>
                    <p className="text-xl font-mono font-bold">{account.accountNumber}</p>
                    <p className="mt-1 font-semibold">{account.accountHolder}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(account)}
                      className="rounded-xl border-2 border-black bg-blue-400 px-4 py-2 font-semibold shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="rounded-xl border-2 border-black bg-red-400 px-4 py-2 font-semibold shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
