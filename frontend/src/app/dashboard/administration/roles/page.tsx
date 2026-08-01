"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Users, Check, Search, Loader2, ShieldAlert, AlertCircle 
} from 'lucide-react';
import api from '@/lib/axios';

interface UserRoleData {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  designation?: string;
  role: string;
}

const AVAILABLE_ROLES = [
  { key: 'SUPER_ADMIN', name: 'Super Admin', desc: 'Full System Control & Master Data Management' },
  { key: 'DEPARTMENT_ADMIN', name: 'Department Admin / Manager', desc: 'Execution Planning, Task Assignment & Team Monitoring' },
  { key: 'TEAM_LEAD', name: 'Team Lead', desc: 'Assigns tasks within team & verifies execution' },
  { key: 'TEAM_MEMBER', name: 'Team Member', desc: 'Task execution, morning planning, work logs & closing' },
  { key: 'VIEWER', name: 'Viewer', desc: 'Read-only access to reporting dashboards' }
];

export default function RolesMappingPage() {
  const [users, setUsers] = useState<UserRoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setApiError('');
      const res = await api.get('/master-data/users');
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load user roles', err);
      setApiError('Failed to load system roles.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!userId) return;
    try {
      setUpdatingId(userId);
      await api.put(`/master-data/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update role', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    (u?.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u?.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
    (u?.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Shield className="w-8 h-8 text-purple-400" />
            System Roles & Permissions Mapping
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Maps users to system permissions. Role mapping is independent of team membership.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {apiError}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-between">
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
        <div className="text-xs text-neutral-400">
          Mapped Users: <strong className="text-white">{filteredUsers.length}</strong>
        </div>
      </div>

      {/* Role Mapping Table */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-20 text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading System Roles...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-20 text-center text-neutral-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-white/5 uppercase text-[10px] text-neutral-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">Employee ID</th>
                  <th className="p-3.5">Employee Name</th>
                  <th className="p-3.5">Designation</th>
                  <th className="p-3.5">Assigned System Role</th>
                  <th className="p-3.5 text-right">Update System Permission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-purple-400">{u.employeeId}</td>
                    <td className="p-3.5 font-bold text-white">{u.name}</td>
                    <td className="p-3.5 text-neutral-400">{u.designation || 'N/A'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {updatingId === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto text-purple-400" />
                      ) : (
                        <select 
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="bg-neutral-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                        >
                          {AVAILABLE_ROLES.map(r => (
                            <option key={r.key} value={r.key}>{r.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
