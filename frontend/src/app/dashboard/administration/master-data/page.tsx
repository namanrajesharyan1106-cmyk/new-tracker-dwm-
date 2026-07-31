"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Plus, Folder, Users, User, ChevronRight, ChevronDown, 
  Settings2, Edit2, Trash2, X, Shield, ShieldAlert, CheckCircle2, 
  XCircle, Loader2, Activity, Briefcase
} from 'lucide-react';
import api from '@/lib/axios';

type UserData = {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  mobile: string;
  role: string;
  designation: string;
  isApproved: boolean;
  isActive: boolean;
};

type TeamData = {
  id: string;
  name: string;
  users: UserData[];
};

type SectionData = {
  id: string;
  name: string;
  teams: TeamData[];
};

export default function MasterDataPage() {
  const [treeData, setTreeData] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Expanded State for Tree
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);

  // Selected User Card State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState({ pendingTasks: 0, activeProjects: 0 });

  // Dialog States
  const [activeDialog, setActiveDialog] = useState<'SECTION' | 'TEAM' | 'USER' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Dropdown options for User Team Assignment
  const [allTeamsFlat, setAllTeamsFlat] = useState<{id: string, name: string, sectionName: string}[]>([]);

  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await api.get('/master-data/tree');
      setTreeData(res.data.data);
      
      // Flatten teams for the user assignment dropdown
      const flat: any[] = [];
      res.data.data.forEach((s: SectionData) => {
        s.teams.forEach((t: TeamData) => {
          flat.push({ id: t.id, name: t.name, sectionName: s.name });
        });
      });
      setAllTeamsFlat(flat);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const handleUserClick = async (user: UserData) => {
    setSelectedUser(user);
    try {
      const res = await api.get(`/master-data/users/${user.id}/stats`);
      setUserStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleTeam = (id: string) => {
    setExpandedTeams(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openDialog = (type: 'SECTION' | 'TEAM' | 'USER', editData: any = null) => {
    setActiveDialog(type);
    setIsEditing(!!editData);
    if (type === 'SECTION') {
      setFormData(editData ? { id: editData.id, name: editData.name } : { name: '' });
    } else if (type === 'TEAM') {
      setFormData(editData ? { id: editData.id, name: editData.name, sectionId: '' } : { name: '', sectionId: '' });
    } else if (type === 'USER') {
      setFormData(editData ? { 
        id: editData.id, name: editData.name, employeeId: editData.employeeId, email: editData.email, 
        mobile: editData.mobile || '', role: editData.role, designation: editData.designation || '',
        teamIds: [] // Needs separate API call to fetch existing mappings if full edit is required, but we will simplify for now
      } : { 
        name: '', employeeId: '', email: '', mobile: '', password: '', role: 'TEAM_MEMBER', designation: '', teamIds: [] 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeDialog === 'SECTION') {
        if (isEditing) await api.put(`/master-data/sections/${formData.id}`, formData);
        else await api.post('/master-data/sections', formData);
      } else if (activeDialog === 'TEAM') {
        if (isEditing) await api.put(`/master-data/teams/${formData.id}`, formData);
        else await api.post('/master-data/teams', formData);
      } else if (activeDialog === 'USER') {
        let userId = formData.id;
        if (isEditing) {
          await api.put(`/master-data/users/${userId}`, formData);
        } else {
          const res = await api.post('/master-data/users', formData);
          userId = res.data.data.id;
        }
        // Update mappings
        if (formData.teamIds && formData.teamIds.length > 0) {
          await api.post(`/master-data/users/${userId}/mappings`, { teamIds: formData.teamIds });
        }
      }
      setActiveDialog(null);
      fetchTree();
    } catch (err) {
      console.error(err);
      alert('Failed to save data. Please check inputs.');
    }
  };

  const deleteEntity = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      await api.delete(`/master-data/${type}/${id}`);
      fetchTree();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean, field: 'approve' | 'active') => {
    try {
      if (field === 'approve') {
        await api.patch(`/master-data/users/${id}/approve`);
      } else {
        await api.patch(`/master-data/users/${id}/${currentStatus ? 'deactivate' : 'activate'}`);
      }
      fetchTree();
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser(prev => prev ? { ...prev, [field === 'approve' ? 'isApproved' : 'isActive']: field === 'approve' ? true : !currentStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      
      {/* Header & Global Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-500" />
            Master Data
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Manage organizational structure and access controls.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => openDialog('SECTION')} className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-white/10">
            <Plus className="w-4 h-4 text-emerald-400" /> Section
          </button>
          <button onClick={() => openDialog('TEAM')} className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-white/10">
            <Plus className="w-4 h-4 text-blue-400" /> Team
          </button>
          <button onClick={() => openDialog('USER')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> User
          </button>
        </div>
      </div>

      {/* Main Content Area (Split View) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Column: Expandable Tree View */}
        <div className="lg:col-span-2 bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 bg-white/5 font-semibold text-neutral-200">
            Organization Structure
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-full text-neutral-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : treeData.length === 0 ? (
              <div className="text-center text-neutral-500 mt-10">No sections found. Start by creating a Section.</div>
            ) : (
              <div className="space-y-1">
                {treeData.map(section => (
                  <div key={section.id} className="text-sm">
                    {/* Section Node */}
                    <div 
                      className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group transition-colors cursor-pointer select-none"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        {expandedSections.includes(section.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Folder className="w-4 h-4" />
                        {section.name}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openDialog('SECTION', section); }} className="text-neutral-500 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteEntity('sections', section.id); }} className="text-neutral-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {/* Teams under Section */}
                    <AnimatePresence>
                      {expandedSections.includes(section.id) && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-6 border-l border-neutral-800 ml-3 overflow-hidden">
                          {section.teams.length === 0 && <div className="p-2 text-neutral-500 italic text-xs">No teams in this section.</div>}
                          {section.teams.map(team => (
                            <div key={team.id}>
                              {/* Team Node */}
                              <div 
                                className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group transition-colors cursor-pointer select-none"
                                onClick={() => toggleTeam(team.id)}
                              >
                                <div className="flex items-center gap-2 text-blue-400">
                                  {expandedTeams.includes(team.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  <Users className="w-3.5 h-3.5" />
                                  {team.name}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); openDialog('TEAM', { ...team, sectionId: section.id }); }} className="text-neutral-500 hover:text-blue-400"><Edit2 className="w-3 h-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); deleteEntity('teams', team.id); }} className="text-neutral-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>

                              {/* Users under Team */}
                              <AnimatePresence>
                                {expandedTeams.includes(team.id) && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-6 border-l border-neutral-800 ml-3 overflow-hidden">
                                    {team.users.length === 0 && <div className="p-2 text-neutral-600 italic text-xs">No users in this team.</div>}
                                    {team.users.map(user => (
                                      <div 
                                        key={user.id} 
                                        onClick={() => handleUserClick(user)}
                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-blue-500/10 text-blue-300' : 'hover:bg-white/5 text-neutral-400'}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <User className="w-3.5 h-3.5" />
                                          {user.name} 
                                          {!user.isActive && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase">Inactive</span>}
                                          {!user.isApproved && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded uppercase">Pending</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: User Detail Card */}
        <div className="lg:col-span-1 bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 bg-white/5 font-semibold text-neutral-200">
            User Details
          </div>
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-center gap-3">
                <UserCircle2 className="w-16 h-16 text-neutral-800" />
                <p className="text-sm">Select a user from the tree<br/>to view their details.</p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedUser.name}</h3>
                    <p className="text-sm text-neutral-400">{selectedUser.designation || 'No Designation'} • {selectedUser.employeeId}</p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${selectedUser.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {selectedUser.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {selectedUser.isActive ? 'Active User' : 'Deactivated'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${selectedUser.isApproved ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                    <Shield className="w-3.5 h-3.5" />
                    {selectedUser.isApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {selectedUser.role.replace('_', ' ')}
                  </span>
                </div>

                <hr className="border-white/10" />

                {/* Live Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 text-center">
                    <Activity className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-white">{userStats.pendingTasks}</div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Pending Tasks</div>
                  </div>
                  <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 text-center">
                    <Briefcase className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-white">{userStats.activeProjects}</div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Current Projects</div>
                  </div>
                </div>

                <hr className="border-white/10" />

                {/* Contact Info */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Email</span>
                    <span className="text-neutral-300">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Mobile</span>
                    <span className="text-neutral-300">{selectedUser.mobile || 'N/A'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex flex-col gap-2">
                  <button onClick={() => openDialog('USER', selectedUser)} className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-medium transition-colors border border-white/10">
                    Edit Profile
                  </button>
                  <div className="flex gap-2">
                    {!selectedUser.isApproved && (
                      <button onClick={() => toggleUserStatus(selectedUser.id, false, 'approve')} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                        Approve
                      </button>
                    )}
                    <button 
                      onClick={() => toggleUserStatus(selectedUser.id, selectedUser.isActive, 'active')} 
                      className={`flex-1 py-2 ${selectedUser.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'} rounded-xl text-sm font-medium transition-colors`}
                    >
                      {selectedUser.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
          </div>
        </div>

      </div>

      {/* Unified Dialogs */}
      <AnimatePresence>
        {activeDialog && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setActiveDialog(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6">
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold capitalize">{isEditing ? 'Edit' : 'Create'} {activeDialog.toLowerCase()}</h3>
                <button onClick={() => setActiveDialog(null)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* SECTION FORM */}
                {activeDialog === 'SECTION' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1">Section Name *</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                  </>
                )}

                {/* TEAM FORM */}
                {activeDialog === 'TEAM' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1">Parent Section *</label>
                      <select required value={formData.sectionId} onChange={e => setFormData({...formData, sectionId: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                        <option value="" disabled>Select Section</option>
                        {treeData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1">Team Name *</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                  </>
                )}

                {/* USER FORM */}
                {activeDialog === 'USER' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Employee ID *</label>
                        <input required type="text" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Full Name *</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Email *</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                      </div>
                      {!isEditing && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Temporary Password *</label>
                          <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Role *</label>
                        <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                          <option value="TEAM_MEMBER">Team Member</option>
                          <option value="DEPARTMENT_ADMIN">Dept Admin</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Designation</label>
                        <input type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-neutral-400 mb-1 flex items-center justify-between">
                          <span>Assign Teams</span>
                          <span className="text-[10px] text-emerald-500">(Sections inherit automatically)</span>
                        </label>
                        <select 
                          multiple 
                          size={4}
                          value={formData.teamIds} 
                          onChange={e => setFormData({...formData, teamIds: Array.from(e.target.selectedOptions, option => option.value)})} 
                          className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none custom-scrollbar"
                        >
                          {allTeamsFlat.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.sectionName})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-6">
                  <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 text-sm font-medium text-neutral-300">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Save</button>
                </div>

              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

// Ensure proper Lucide imports manually since standard UserCircle2 was missing in earlier imports
import { UserCircle2 } from 'lucide-react';
