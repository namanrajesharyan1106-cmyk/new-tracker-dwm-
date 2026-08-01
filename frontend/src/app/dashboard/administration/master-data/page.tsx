"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, User, Plus, Search, Filter, Edit2, Key, CheckCircle2, XCircle, 
  Loader2, Download, Shield, Mail, Phone, Briefcase, Check, AlertCircle 
} from 'lucide-react';
import api from '@/lib/axios';

interface UserData {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile?: string;
  designation?: string;
  role: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
}

export default function MasterDataUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [apiError, setApiError] = useState('');

  // Modal States
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  // Form State (NO Team selection allowed here per Enterprise Spec)
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TEAM_MEMBER');
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setApiError('');
      const res = await api.get('/master-data/users');
      let data: UserData[] = res.data?.data || [];

      if (search) {
        data = data.filter(u => 
          (u?.name || '').toLowerCase().includes(search.toLowerCase()) || 
          (u?.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
          (u?.email || '').toLowerCase().includes(search.toLowerCase())
        );
      }

      if (roleFilter !== 'ALL') {
        data = data.filter(u => u?.role === roleFilter);
      }

      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users', err);
      setApiError('Failed to load employee records from backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setEmployeeId('');
    setName('');
    setEmail('');
    setMobile('');
    setDesignation('');
    setPassword('Password123!');
    setRole('TEAM_MEMBER');
    setErrorMsg('');
    setShowUserModal(true);
  };

  const handleOpenEditModal = (u: UserData) => {
    if (!u) return;
    setEditingUser(u);
    setEmployeeId(u.employeeId || '');
    setName(u.name || '');
    setEmail(u.email || '');
    setMobile(u.mobile || '');
    setDesignation(u.designation || '');
    setPassword('');
    setRole(u.role || 'TEAM_MEMBER');
    setErrorMsg('');
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!name.trim() || !email.trim() || (!editingUser && !employeeId.trim())) {
      setErrorMsg('Name, Email, and Employee ID are required.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      if (editingUser) {
        // Edit User Record
        await api.put(`/master-data/users/${editingUser.id}`, {
          name,
          email,
          mobile,
          designation,
          role
        });
      } else {
        // Create Employee Record (No team selection)
        await api.post('/master-data/users', {
          employeeId,
          name,
          email,
          mobile,
          designation,
          password,
          role
        });
      }

      setShowUserModal(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save employee record.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: UserData) => {
    if (!u || !u.id) return;
    try {
      if (u.isActive) {
        await api.patch(`/master-data/users/${u.id}/deactivate`);
      } else {
        await api.patch(`/master-data/users/${u.id}/activate`);
      }
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportUsersCSV = () => {
    if (users.length === 0) return;
    const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Designation', 'Role', 'Status', 'Created Date'];
    const rows = users.map(u => [
      u.employeeId || '', u.name || '', u.email || '', u.mobile || '', u.designation || '', u.role || '', u.isActive ? 'ACTIVE' : 'INACTIVE', u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''
    ].map(v => JSON.stringify(v)).join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `employee_master_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Users className="w-8 h-8 text-blue-400" />
            Employee Master Records Management
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Maintain organization employee profiles only. Team assignment happens in User Mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportUsersCSV}
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs border border-white/10 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Records
          </button>

          <button 
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Create Employee Profile
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee name, ID, email..."
            className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="ALL">All System Roles</option>
            <option value="SUPER_ADMIN">SUPER ADMIN</option>
            <option value="DEPARTMENT_ADMIN">DEPARTMENT ADMIN</option>
            <option value="TEAM_MEMBER">TEAM MEMBER</option>
          </select>

          <span className="text-xs text-neutral-400">
            Total Records: <strong className="text-white">{users.length}</strong>
          </span>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {apiError}
        </div>
      )}

      {/* Employee List Table */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-20 text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Employee Records...
          </div>
        ) : users.length === 0 ? (
          <div className="p-20 text-center text-neutral-500">No employee records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-white/5 uppercase text-[10px] text-neutral-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">Employee ID</th>
                  <th className="p-3.5">Name & Email</th>
                  <th className="p-3.5">Designation</th>
                  <th className="p-3.5">System Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-400">{u.employeeId}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-white block">{u.name}</span>
                      <span className="text-[10px] text-neutral-500">{u.email}</span>
                    </td>
                    <td className="p-3.5 text-neutral-300">{u.designation || 'N/A'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-neutral-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-neutral-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-3.5 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenEditModal(u)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleActive(u)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${u.isActive ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingUser ? `Edit Employee Profile (${editingUser.employeeId})` : 'Create Employee Profile'}
            </h3>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            {!editingUser && (
              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Employee ID *</label>
                <input 
                  type="text"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP-1092"
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Full Name *</label>
              <input 
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Employee full name"
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Email *</label>
                <input 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@company.com"
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Phone</label>
                <input 
                  type="text"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Designation</label>
                <input 
                  type="text"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">System Role</label>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="TEAM_MEMBER">TEAM MEMBER</option>
                  <option value="DEPARTMENT_ADMIN">DEPARTMENT ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
                </select>
              </div>
            </div>

            {!editingUser && (
              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Temporary Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">Cancel</button>
              <button onClick={handleSaveUser} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Employee Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
