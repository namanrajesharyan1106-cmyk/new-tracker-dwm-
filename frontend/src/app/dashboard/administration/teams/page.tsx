"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, UserCheck, Shield, ChevronRight, ChevronDown, Plus, 
  Trash2, Loader2, Layers, Check, Building, AlertCircle 
} from 'lucide-react';
import api from '@/lib/axios';

interface TeamHierarchyData {
  id: string;
  name: string;
  section?: { id: string; name: string };
  manager?: { id: string; name: string; employeeId: string };
  teamLead?: { id: string; name: string; employeeId: string };
  members?: { user?: { id: string; name: string; employeeId: string } }[];
}

export default function TeamsHierarchyMappingPage() {
  const [teams, setTeams] = useState<TeamHierarchyData[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Edit Leader Modal
  const [selectedTeam, setSelectedTeam] = useState<TeamHierarchyData | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    fetchTeamsAndUsers();
  }, []);

  const fetchTeamsAndUsers = async () => {
    try {
      setLoading(true);
      setApiError('');
      const [teamsRes, usersRes] = await Promise.all([
        api.get('/master-data/teams'),
        api.get('/master-data/users')
      ]);

      const teamsData: TeamHierarchyData[] = teamsRes.data?.data || [];
      const usersData: any[] = usersRes.data?.data || [];

      setTeams(teamsData);
      setAllUsers(usersData);

      if (teamsData.length > 0 && !expandedTeamId) {
        setExpandedTeamId(teamsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load team hierarchy', err);
      setApiError('Failed to load team hierarchy data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLeadModal = (t: TeamHierarchyData) => {
    if (!t) return;
    setSelectedTeam(t);
    setSelectedManagerId(t.manager?.id || '');
    setSelectedLeadId(t.teamLead?.id || '');
    setShowLeadModal(true);
  };

  const handleSaveTeamHierarchy = async () => {
    if (!selectedTeam || !selectedTeam.id) return;
    try {
      setSaving(true);
      await api.put(`/master-data/teams/${selectedTeam.id}/hierarchy`, {
        managerId: selectedManagerId || null,
        teamLeadId: selectedLeadId || null
      });
      setShowLeadModal(false);
      fetchTeamsAndUsers();
    } catch (err) {
      console.error('Failed to save hierarchy', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Building className="w-8 h-8 text-amber-400" />
            Team Hierarchy & Leadership Mapping
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Defines organization reporting hierarchy: Section $\rightarrow$ Team $\rightarrow$ Manager $\rightarrow$ Team Lead $\rightarrow$ Members.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {apiError}
        </div>
      )}

      {/* Teams Hierarchy Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-20 text-neutral-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Organization Hierarchy...
        </div>
      ) : teams.length === 0 ? (
        <div className="p-20 text-center text-neutral-500">No teams found in master data.</div>
      ) : (
        <div className="space-y-4">
          {teams.map(t => {
            const isExpanded = expandedTeamId === t.id;
            return (
              <div key={t.id} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                
                {/* Team Header */}
                <div 
                  onClick={() => setExpandedTeamId(isExpanded ? null : t.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-amber-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                    <div>
                      <h3 className="font-bold text-white text-base">{t.name}</h3>
                      <span className="text-[10px] text-neutral-400 block font-mono">
                        Section: {t.section?.name || 'General Section'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-neutral-400 block">Manager</span>
                      <span className="font-bold text-white">{t.manager?.name || 'Unassigned'}</span>
                    </div>

                    <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-neutral-400 block">Team Lead</span>
                      <span className="font-bold text-amber-400">{t.teamLead?.name || 'Unassigned'}</span>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLeadModal(t);
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold"
                    >
                      Assign Leaders
                    </button>
                  </div>
                </div>

                {/* Expanded Team Structure */}
                {isExpanded && (
                  <div className="p-5 bg-neutral-950/60 border-t border-white/5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Team Members ({t.members?.length || 0})
                    </h4>

                    {t.members && t.members.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {t.members.map((m, idx) => (
                          <div key={m.user?.id || idx} className="p-3 bg-neutral-900 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-white block">{m.user?.name || 'Unknown User'}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">{m.user?.employeeId || 'N/A'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-500 italic">No members assigned to this team yet. Use User Mapping to assign members.</div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ASSIGN LEADERS MODAL */}
      {showLeadModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-white">
              Assign Leaders for <span className="text-amber-400">{selectedTeam.name}</span>
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Assign Manager</label>
              <select 
                value={selectedManagerId}
                onChange={e => setSelectedManagerId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">-- Select Manager --</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Assign Team Lead</label>
              <select 
                value={selectedLeadId}
                onChange={e => setSelectedLeadId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">-- Select Team Lead --</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowLeadModal(false)} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">Cancel</button>
              <button onClick={handleSaveTeamHierarchy} disabled={saving} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Hierarchy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
