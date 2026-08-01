"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Plus, Trash2, Check, Loader2, ShieldCheck, Layers, Building, AlertCircle 
} from 'lucide-react';
import api from '@/lib/axios';

interface UserData {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  designation?: string;
  teams?: { id: string; name: string }[];
}

interface TeamData {
  id: string;
  name: string;
  section?: { name: string };
}

export default function UserTeamMappingPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setApiError('');
      const [usersRes, teamsRes] = await Promise.all([
        api.get('/master-data/users'),
        api.get('/master-data/teams')
      ]);

      const usersList: UserData[] = usersRes.data?.data || [];
      const teamsList: TeamData[] = teamsRes.data?.data || [];
      
      setUsers(usersList);
      setTeams(teamsList);

      if (usersList.length > 0) {
        handleSelectUser(usersList[0]);
      }
    } catch (err) {
      console.error('Failed to load user mapping data', err);
      setApiError('Failed to load user and team data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (u: UserData) => {
    if (!u) return;
    setSelectedUser(u);
    const existingIds = u.teams ? u.teams.map(t => t.id) : [];
    setAssignedTeamIds(existingIds);
    setSaveSuccess(false);
  };

  const handleToggleTeam = (teamId: string) => {
    setAssignedTeamIds(prev => 
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSaveUserTeamMapping = async () => {
    if (!selectedUser || !selectedUser.id) return;
    try {
      setSaving(true);
      setSaveSuccess(false);
      await api.put(`/master-data/users/${selectedUser.id}/teams`, {
        teamIds: assignedTeamIds
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to save team mapping', err);
    } finally {
      setSaving(false);
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
            <Layers className="w-8 h-8 text-indigo-400" />
            User Organization & Team Mapping
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Assign employees to one or multiple organizational teams. Manages organization membership.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Employee Selector List */}
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Select Employee
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> Loading employees...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">No employees found.</div>
          ) : (
            <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
              {filteredUsers.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div 
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`p-3 rounded-xl cursor-pointer border transition-all ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-neutral-950 border-white/5 text-neutral-300 hover:bg-white/5'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">{u.name}</span>
                      <span className="font-mono text-[10px] text-neutral-400">{u.employeeId}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">{u.email}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Multi-Team Mapping Panel */}
        <div className="lg:col-span-2 bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-6">
          {selectedUser ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    ID: {selectedUser.employeeId} | {selectedUser.email}
                  </p>
                </div>

                <button 
                  onClick={handleSaveUserTeamMapping}
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4" />}
                  {saving ? 'Saving...' : saveSuccess ? 'Mapping Saved!' : 'Save Team Mapping'}
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Assign Organizational Teams (Multi-Team Support)
                </h4>

                {teams.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-xs">No teams available in Master Data.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teams.map(t => {
                      const isAssigned = assignedTeamIds.includes(t.id);
                      return (
                        <div 
                          key={t.id}
                          onClick={() => handleToggleTeam(t.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isAssigned ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-neutral-950 border-white/5 text-neutral-400 hover:bg-white/5'}`}
                        >
                          <div>
                            <span className="font-bold text-xs block">{t.name}</span>
                            <span className="text-[10px] text-neutral-500">{t.section?.name || 'General Section'}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${isAssigned ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/20'}`}>
                            {isAssigned && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-20 text-center text-neutral-500">Select an employee from the left panel to manage team mappings.</div>
          )}
        </div>

      </div>

    </div>
  );
}
