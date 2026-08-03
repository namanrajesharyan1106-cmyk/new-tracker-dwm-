"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Folder, CheckSquare, Clock, AlertTriangle, 
  XCircle, CheckCircle2, ChevronRight, ChevronDown, User, Activity, 
  Loader2, Search, Filter, ShieldAlert, Award, Calendar, Repeat, 
  X, ArrowRight, Zap, PieChart, BarChart3, RefreshCw
} from 'lucide-react';
import api from '@/lib/axios';

interface Member {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  designation?: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  users: Member[];
}

interface Section {
  id: string;
  name: string;
  teams: Team[];
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  estimatedHours?: number;
  actualHours?: number;
  targetDate?: string;
  assignedTo?: { id: string; name: string };
  team?: { id: string; name: string };
  section?: { id: string; name: string };
}

export default function TeamExecutionResourceBoard() {
  const [treeData, setTreeData] = useState<Section[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selection & Search Filters
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Selected Member Drawer State
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [memberDetails, setMemberDetails] = useState<any | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  // Collapsible Teams State
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setRefreshing(true);
      const [treeRes, taskRes] = await Promise.all([
        api.get('/master-data/tree'),
        api.get('/tasks?limit=300')
      ]);

      setTreeData(treeRes.data.data || []);
      setAllTasks(taskRes.data.data || []);
    } catch (err) {
      console.error('Failed to load team tasks data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleTeamCollapse = (teamId: string) => {
    setCollapsedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const handleOpenMemberDrawer = async (member: Member) => {
    setSelectedMember(member);
    setDrawerOpen(true);
    setLoadingDrawer(true);
    try {
      const userTasks = allTasks.filter(t => t.assignedTo?.id === member.id);
      setMemberDetails({
        userTasks,
        completedTasks: userTasks.filter(t => t.status === 'COMPLETED'),
        delayedTasks: userTasks.filter(t => t.status === 'DELAYED'),
        blockedTasks: userTasks.filter(t => t.status === 'BLOCKED'),
        estimatedHoursTotal: userTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0),
        actualHoursTotal: userTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDrawer(false);
    }
  };

  // Filter tasks based on selections
  const filteredTasks = allTasks.filter(task => {
    if (selectedSectionId !== 'ALL' && task.section?.id !== selectedSectionId) return false;
    if (selectedTeamId !== 'ALL' && task.team?.id !== selectedTeamId) return false;
    if (selectedStatus !== 'ALL' && task.status !== selectedStatus) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase()) && !task.assignedTo?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Capacity & Workload Metrics
  const totalTasksCount = filteredTasks.length;
  const completedCount = filteredTasks.filter(t => t.status === 'COMPLETED').length;
  const delayedCount = filteredTasks.filter(t => t.status === 'DELAYED').length;
  const blockedCount = filteredTasks.filter(t => t.status === 'BLOCKED').length;
  
  const totalEstHours = filteredTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
  const totalActHours = filteredTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-neutral-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading Team Execution & Resource Board...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Users className="w-8 h-8 text-blue-400" />
            Team Execution & Resource Board
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            Live operational dashboard for Team Leads & Project Managers to track workload, capacity, and execution.
          </p>
        </div>

        <button 
          onClick={fetchTeamData}
          className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl border border-white/10 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Live Refresh
        </button>
      </div>

      {/* Capacity & Workload Engine Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total Active Tasks</div>
          <div className="text-2xl font-bold text-white mt-1">{totalTasksCount}</div>
          <div className="text-[10px] text-neutral-400 mt-1">{completedCount} Completed</div>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-md border border-blue-500/20 bg-blue-500/5 p-4 rounded-2xl">
          <div className="text-xs text-blue-400 font-medium uppercase tracking-wider">Est vs Actual Hours</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{totalActHours}h / {totalEstHours}h</div>
          <div className="text-[10px] text-neutral-400 mt-1">Total Allocated Workload</div>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-md border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-2xl">
          <div className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Team Capacity Health</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 100}%
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Completion Efficiency</div>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-md border border-amber-500/20 bg-amber-500/5 p-4 rounded-2xl">
          <div className="text-xs text-amber-400 font-medium uppercase tracking-wider">Delayed Tasks</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{delayedCount}</div>
          <div className="text-[10px] text-amber-400/80 mt-1">Requires Attention</div>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-md border border-red-500/20 bg-red-500/5 p-4 rounded-2xl">
          <div className="text-xs text-red-400 font-medium uppercase tracking-wider">Blocked Tasks</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{blockedCount}</div>
          <div className="text-[10px] text-red-400/80 mt-1">Critical Roadblocks</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search member or task..."
              className="bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none w-48"
            />
          </div>

          <select 
            value={selectedSectionId}
            onChange={e => { setSelectedSectionId(e.target.value); setSelectedTeamId('ALL'); }}
            className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
          >
            <option value="ALL">All Sections</option>
            {treeData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select 
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
          >
            <option value="ALL">All Teams</option>
            {treeData
              .filter(s => selectedSectionId === 'ALL' || s.id === selectedSectionId)
              .flatMap(s => s.teams)
              .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="text-xs text-neutral-400">
          Showing <strong className="text-white">{filteredTasks.length}</strong> active tasks
        </div>
      </div>

      {/* Organizational Breakdown Tree & Member Cards */}
      <div className="space-y-6">
        {treeData
          .filter(s => selectedSectionId === 'ALL' || s.id === selectedSectionId)
          .map(section => (
            <div key={section.id} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              
              {/* Section Header */}
              <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
                  <Folder className="w-5 h-5" />
                  <span>{section.name} Section</span>
                </div>
                <span className="text-xs text-neutral-400 font-medium">
                  {section.teams.length} Team(s)
                </span>
              </div>

              {/* Teams List */}
              <div className="p-4 space-y-6">
                {section.teams
                  .filter(t => selectedTeamId === 'ALL' || t.id === selectedTeamId)
                  .map(team => {
                    const isCollapsed = collapsedTeams[team.id];
                    const teamTasks = filteredTasks.filter(task => task.team?.id === team.id);
                    
                    return (
                      <div key={team.id} className="bg-neutral-950 p-4 rounded-xl border border-white/10 space-y-4">
                        
                        {/* Team Title Bar */}
                        <div 
                          onClick={() => toggleTeamCollapse(team.id)}
                          className="flex justify-between items-center pb-2 border-b border-white/5 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <Users className="w-4 h-4" />
                            <span>{team.name}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-neutral-400">
                            <span>Members: <strong className="text-white">{team.users.length}</strong></span>
                            <span>Active Tasks: <strong className="text-white">{teamTasks.length}</strong></span>
                          </div>
                        </div>

                        {/* Collapsible Member Cards Grid */}
                        {!isCollapsed && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {team.users.map(member => {
                              const userTasks = teamTasks.filter(t => t.assignedTo?.id === member.id);
                              const userCompleted = userTasks.filter(t => t.status === 'COMPLETED').length;
                              const userDelayed = userTasks.filter(t => t.status === 'DELAYED').length;
                              const userBlocked = userTasks.filter(t => t.status === 'BLOCKED').length;

                              // Health & Workload status indicator
                              const isOverloaded = userTasks.length > 5;
                              const isBusy = userTasks.length >= 3;
                              const statusColor = isOverloaded ? 'border-red-500/40 bg-red-500/5' : isBusy ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-neutral-900';

                              return (
                                <motion.div 
                                  whileHover={{ scale: 1.01 }}
                                  key={member.id} 
                                  onClick={() => handleOpenMemberDrawer(member)}
                                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${statusColor}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                                        {member.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate">{member.name}</div>
                                        <div className="text-[10px] text-neutral-400 truncate">{member.designation || 'Member'} • {member.employeeId}</div>
                                      </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isOverloaded ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                      {isOverloaded ? 'OVERLOADED' : 'NORMAL'}
                                    </span>
                                  </div>

                                  {/* Task Stats Bar */}
                                  <div className="flex justify-between items-center text-[10px] bg-neutral-950 p-2 rounded-lg text-neutral-400 border border-white/5">
                                    <span>Assigned: <strong className="text-white">{userTasks.length}</strong></span>
                                    <span className="text-emerald-400">Done: {userCompleted}</span>
                                    {userDelayed > 0 && <span className="text-amber-400">Delayed: {userDelayed}</span>}
                                    {userBlocked > 0 && <span className="text-red-400">Blocked: {userBlocked}</span>}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* MEMBER DETAILS RIGHT-SIDE DRAWER */}
      <AnimatePresence>
        {drawerOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-xl bg-neutral-900 border-l border-white/10 h-full p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between"
            >
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xl flex items-center justify-center border border-blue-500/30">
                      {selectedMember.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedMember.name}</h3>
                      <p className="text-xs text-neutral-400">{selectedMember.designation || selectedMember.role} • {selectedMember.employeeId}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="p-2 text-neutral-400 hover:text-white rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {loadingDrawer ? (
                  <div className="flex items-center justify-center p-12 text-neutral-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading member workload history...
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Workload Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-neutral-400 block text-[10px]">Total Assigned Tasks</span>
                        <span className="text-lg font-bold text-white">{memberDetails?.userTasks?.length || 0}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-neutral-400 block text-[10px]">Estimated Workload</span>
                        <span className="text-lg font-bold text-blue-400">{memberDetails?.estimatedHoursTotal || 0} Hours</span>
                      </div>
                    </div>

                    {/* Active Tasks List */}
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                        Assigned Tasks & Progress
                      </h4>
                      <div className="space-y-2">
                        {memberDetails?.userTasks?.length === 0 ? (
                          <div className="text-xs text-neutral-500 italic p-3 bg-neutral-950 rounded-xl">No active tasks assigned.</div>
                        ) : (
                          memberDetails?.userTasks?.map((t: any) => (
                            <div key={t.id} className="p-3 bg-neutral-950 border border-white/5 rounded-xl space-y-1.5 text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-white">{t.title}</span>
                                <span className="text-[10px] font-bold text-blue-400">{t.status}</span>
                              </div>
                              <div className="w-full bg-neutral-800 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full w-[--progress]" style={{ '--progress': `${t.progress || 0}%` } as React.CSSProperties} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              <div className="pt-4 border-t border-white/10">
                <button 
                  onClick={() => setDrawerOpen(false)}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Close Member Drawer
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
