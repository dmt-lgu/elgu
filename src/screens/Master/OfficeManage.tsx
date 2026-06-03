import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon, PencilIcon, TrashIcon, BuildingIcon,
  RefreshCwIcon, SearchIcon,
} from 'lucide-react';
import axios from '../../plugin/axios';
import Swal from 'sweetalert2';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

interface Office {
  officeID: number;
  name: string;
  officeMail: string;
  street: string;
  city: string;
  province: string;
  region: string;
  numUsers: number;
}

const EMPTY_FORM = {
  name: '',
  officeMail: '',
  street: '',
  city: '',
  province: '',
  region: '',
};

const OfficeManage: React.FC = () => {
  const [offices, setOffices]     = useState<Office[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const fetchOffices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/v1/office/all/`);
      setOffices(Array.isArray(res.data) ? res.data : []);
    } catch {
      setOffices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffices(); }, [fetchOffices]);

  const filtered = offices.filter(o => {
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.city.toLowerCase().includes(q) ||
      o.province.toLowerCase().includes(q) ||
      o.region.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (o: Office) => {
    setEditingId(o.officeID);
    setForm({
      name:       o.name,
      officeMail: o.officeMail,
      street:     o.street,
      city:       o.city,
      province:   o.province,
      region:     o.region,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Office name is required.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingId !== null) {
        await axios.put(`${backendUrl}/api/v1/office/${editingId}/`, form);
      } else {
        await axios.post(`${backendUrl}/api/v1/office/all/`, form);
      }
      setShowModal(false);
      fetchOffices();
      Swal.fire({
        icon: 'success',
        title: editingId !== null ? 'Office updated' : 'Office created',
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

  const handleDelete = async (o: Office) => {
    const result = await Swal.fire({
      title: 'Delete Office?',
      html: `<strong>${o.name}</strong><br><small style="color:#64748b">${o.city}, ${o.province}</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    try {
      await axios.delete(`${backendUrl}/api/v1/office/${o.officeID}/`);
      fetchOffices();
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.detail || 'Delete failed.' });
    }
  };

  const field = (label: string, key: keyof typeof EMPTY_FORM, placeholder = '') => (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
      {label}
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  );

  return (
    <div className="p-6 slg:p-4 sm:p-3 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BuildingIcon className="w-5 h-5 text-gray-500" />
          <h1 className="text-xl sm:text-lg font-semibold text-gray-800">Office Management</h1>
          {!loading && (
            <span className="text-xs text-gray-400 font-normal">
              {offices.length} office{offices.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search offices…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 w-52 sm:w-full"
            />
          </div>
          <button
            onClick={fetchOffices}
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
            New Office
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[50px]">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Province</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Region</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <BuildingIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {search ? `No offices match "${search}".` : 'No offices found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(o => (
                  <tr key={o.officeID} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{o.officeID}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{o.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.officeMail || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.province || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.region || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(o)}
                          title="Edit"
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          title="Delete"
                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
            <div className="px-6 py-4 sm:px-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-base">
                {editingId !== null ? 'Edit Office' : 'New Office'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-50 transition"
              >✕</button>
            </div>

            <div className="p-6 sm:p-4 space-y-3 overflow-y-auto max-h-[65vh]">
              {field('Office Name *', 'name', 'e.g. DICT Regional Office')}
              {field('Email', 'officeMail', 'office@dict.gov.ph')}
              {field('Street', 'street', 'Street address')}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                {field('City', 'city', 'City')}
                {field('Province', 'province', 'Province')}
              </div>
              {field('Region', 'region', 'e.g. Region I')}

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 break-all">
                  {formError}
                </div>
              )}
            </div>

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
                {saving ? 'Saving…' : editingId !== null ? 'Update Office' : 'Create Office'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeManage;
