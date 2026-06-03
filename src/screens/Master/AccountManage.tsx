import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon, PencilIcon, TrashIcon, UsersIcon,
  RefreshCwIcon, SearchIcon, EyeIcon, EyeOffIcon,
} from 'lucide-react';
import axios from '../../plugin/axios';
import Swal from 'sweetalert2';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

const ACC_LEVEL_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Master',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  1: { label: 'Admin',    color: 'bg-blue-100   text-blue-700   border-blue-200'   },
  3: { label: 'User',     color: 'bg-gray-100   text-gray-600   border-gray-200'   },
};

interface UserAccount {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
  acc_lvl: number;
  is_active: boolean;
  office: number;
}

const EMPTY_FORM = {
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  position: '',
  acc_lvl: 1,
  is_active: true,
  office: 1,
};

const AccountManage: React.FC = () => {
  const [users, setUsers]       = useState<UserAccount[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');

  const [showModal, setShowModal]     = useState(false);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/v1/users/all/`);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (u: UserAccount) => {
    setEditingId(u.id);
    setForm({
      email:      u.email,
      first_name: u.first_name,
      last_name:  u.last_name,
      password:   '',
      position:   u.position || '',
      acc_lvl:    u.acc_lvl,
      is_active:  u.is_active,
      office:     u.office,
    });
    setFormError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.email.trim() || !form.first_name.trim() || !form.last_name.trim() || !form.position.trim()) {
      setFormError('Email, first name, last name, and position are required.');
      return;
    }
    if (!editingId && !form.password.trim()) {
      setFormError('Password is required when creating a new account.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, any> = { ...form };
      if (editingId && !payload.password.trim()) delete payload.password;

      if (editingId) {
        await axios.put(`${backendUrl}/api/v1/users/update/${editingId}/`, payload);
      } else {
        await axios.post(`${backendUrl}/api/v1/users/create/`, payload);
      }

      setShowModal(false);
      fetchUsers();
      Swal.fire({
        icon: 'success',
        title: editingId ? 'Account updated' : 'Account created',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      const detail = err?.response?.data;
      setFormError(
        typeof detail === 'string'
          ? detail
          : detail?.detail || JSON.stringify(detail)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UserAccount) => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      html: `<strong>${u.email}</strong><br><small style="color:#64748b">${u.first_name} ${u.last_name}</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    try {
      await axios.delete(`${backendUrl}/api/v1/users/delete/${u.id}/`);
      fetchUsers();
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Delete failed.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    }
  };

  return (
    <div className="p-6 slg:p-4 sm:p-3 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-gray-500" />
          <h1 className="text-xl sm:text-lg font-semibold text-gray-800">Account Management</h1>
          {!loading && (
            <span className="text-xs text-gray-400 font-normal">
              {users.length} account{users.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search email or name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 w-56 sm:w-full"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-3 py-2 rounded-md transition-colors"
          >
            <RefreshCwIcon className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-[#2464e8] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Account
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Level</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[80px]">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {search ? `No accounts match "${search}".` : 'No accounts found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const lvl = ACC_LEVEL_MAP[u.acc_lvl] ?? { label: String(u.acc_lvl), color: 'bg-gray-100 text-gray-600 border-gray-200' };
                  return (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.first_name} {u.last_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[180px]">{u.position || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center border px-2.5 py-0.5 rounded-full text-xs font-medium ${lvl.color}`}>
                          {lvl.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            title="Edit"
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            title="Delete"
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-2 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md">

            {/* Modal header */}
            <div className="px-6 py-4 sm:px-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-base">
                {editingId ? 'Edit Account' : 'New Account'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-50 transition shrink-0"
              >✕</button>
            </div>

            {/* Modal body */}
            <div className="p-6 sm:p-4 space-y-4 overflow-y-auto max-h-[65vh]">

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  First Name *
                  <input
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Juan"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Last Name *
                  <input
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Dela Cruz"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Email *
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="user@example.com"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                {editingId ? 'Password (leave blank to keep current)' : 'Password *'}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editingId ? 'Leave blank to keep current' : 'Min. 8 characters'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Position *
                <input
                  value={form.position}
                  onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. IT Officer"
                />
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Access Level
                  <select
                    value={form.acc_lvl}
                    onChange={e => setForm(f => ({ ...f, acc_lvl: Number(e.target.value) }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value={0}>0 — Master</option>
                    <option value={1}>1 — Admin</option>
                    <option value={3}>3 — User</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                  Office ID
                  <input
                    type="number"
                    min={1}
                    value={form.office}
                    onChange={e => setForm(f => ({ ...f, office: Number(e.target.value) }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4"
                />
                Active Account
              </label>

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 break-all">
                  {formError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 sm:px-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/60 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#2464e8] hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingId ? 'Update Account' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManage;
