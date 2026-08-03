"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Search, Loader2, AlertCircle, ChevronDown, ChevronRight, 
  Calendar, CheckSquare, Users, Layers, X, DollarSign, UserCheck, Plus, Check, 
  Clock, ShieldAlert, Play, ShieldCheck, Lock, ArrowRight, Building, Sparkles 
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  stageName: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: { id: string; name: string };
  targetDate?: string;
}

interface Stage {
  name: string;
  purpose: string;
  progress: number;
  tasks: Task[];
}

interface Requirement {
  id: string;
  title: string;
  description?: string;
  sponsor?: string;
  manager?: string;
  department?: string;
  timeline?: string;
  budget?: number;
  progress: number;
  status: string;
  priority?: string;
  executionStatus?: string; // Not Started, Execution Started, In Progress, Delayed, Completed, Verified, Closed
  assignedTeams?: string; // JSON string array
  assignedMembers?: string; // JSON string array
  stages?: Stage[];
  tasks?: Task[];
  createdAt: string;
}

const AVAILABLE_TEAMS = [
  'Automation Team',
  'Digital Team',
  'Maintenance Team',
  'IT Support',
  'Quality Team',
  'Production Team'
];

interface TeamMember {
  id: string;
  name: string;
  employeeId: string;
  teamName: string;
}

export default function EnterpriseRequirementWorkspacePage() {
  const { user } = useAuth();
  const userRole = user?.role || 'TEAM_MEMBER';
  const canAssignTeam = userRole === 'SUPER_ADMIN' || userRole === 'DEPARTMENT_ADMIN';
  const canCreateTask = userRole === 'SUPER_ADMIN' || userRole === 'DEPARTMENT_ADMIN' || userRole === 'TEAM_LEAD';

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [selectedReqDetail, setSelectedReqDetail] = useState<Requirement | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>('Development');

  // TEAM ASSIGNMENT MODAL STATE
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningReq, setAssigningReq] = useState<Requirement | null>(null);
  const [selectedTeamNames, setSelectedTeamNames] = useState<string[]>([]);
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // TASK CREATION MODAL STATE
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [targetStageName, setTargetStageName] = useState('Development');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskHours, setNewTaskHours] = useState('8.0');
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    fetchRequirements();
  }, [search]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requirements');
      const data: Requirement[] = res.data?.data || [];
      setRequirements(data);
      if (data.length > 0 && !expandedReqId) {
        setExpandedReqId(data[0].id);
        fetchRequirementDetails(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load requirements', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirementDetails = async (reqId: string) => {
    try {
      setLoadingDetail(true);
      const res = await api.get(`/requirements/${reqId}`);
      setSelectedReqDetail(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load requirement details', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleReq = (reqId: string) => {
    if (expandedReqId === reqId) {
      setExpandedReqId(null);
      setSelectedReqDetail(null);
    } else {
      setExpandedReqId(reqId);
      fetchRequirementDetails(reqId);
    }
  };

  // OPEN TEAM ASSIGNMENT MODAL
  const handleOpenAssignModal = async (req: Requirement, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningReq(req);
    
    // Parse existing assigned teams and members
    let existingTeams: string[] = [];
    let existingMembers: string[] = [];
    try {
      if (req.assignedTeams) existingTeams = JSON.parse(req.assignedTeams);
      if (req.assignedMembers) existingMembers = JSON.parse(req.assignedMembers);
    } catch (e) { console.error(e); }

    setSelectedTeamNames(existingTeams.length > 0 ? existingTeams : ['Digital Team', 'Automation Team']);
    setSelectedMemberIds(existingMembers);
    setShowAssignModal(true);

    // Fetch team members from master data
    fetchMasterDataUsers();
  };

  const fetchMasterDataUsers = async () => {
    try {
      setLoadingMembers(true);
      const res = await api.get('/master-data/users');
      const usersList: any[] = res.data?.data || [];
      const members: TeamMember[] = usersList.map((u: any) => ({
        id: u.id,
        name: u.name,
        employeeId: u.employeeId,
        teamName: u.teams && u.teams.length > 0 ? u.teams[0].name : 'Automation Team'
      }));
      setAvailableMembers(members);
    } catch (err) {
      console.error('Failed to fetch team members', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleToggleTeamSelection = (tName: string) => {
    setSelectedTeamNames(prev => 
      prev.includes(tName) ? prev.filter(t => t !== tName) : [...prev, tName]
    );
  };

  const handleToggleMemberSelection = (mId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    );
  };

  const handleSaveTeamAssignment = async () => {
    if (!assigningReq) return;
    try {
      setSavingAssignment(true);
      await api.put(`/requirements/${assigningReq.id}/assign-team`, {
        assignedTeams: selectedTeamNames,
        assignedMembers: selectedMemberIds
      });

      setShowAssignModal(false);
      fetchRequirements();
      if (expandedReqId === assigningReq.id) {
        fetchRequirementDetails(assigningReq.id);
      }
    } catch (err) {
      console.error('Failed to save team assignment', err);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleOpenTaskModal = (stageName: string) => {
    setTargetStageName(stageName);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('MEDIUM');
    setNewTaskHours('8.0');
    setShowTaskModal(true);
  };

  const handleCreateTask = async () => {
    if (!expandedReqId || !newTaskTitle.trim()) return;
    try {
      setCreatingTask(true);
      await api.post('/tasks', {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        priority: newTaskPriority,
        stageName: targetStageName,
        requirementId: expandedReqId,
        estimatedHours: parseFloat(newTaskHours) || 8.0
      });
      setShowTaskModal(false);
      fetchRequirementDetails(expandedReqId);
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setCreatingTask(false);
    }
  };

  const parseAssignedTeams = (teamsStr?: string): string[] => {
    if (!teamsStr) return [];
    try {
      return JSON.parse(teamsStr);
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Layers className="w-8 h-8 text-blue-400" />
            Requirement Workspace (DOPS Execution Engine)
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Real-time live synchronization of Published Requirements from DRS Command Center. Single Source of Truth: DRS.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-xl text-blue-400 text-xs font-bold">
          <Sparkles className="w-4 h-4" /> Live Real-Time DRS Sync Enabled
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Published Requirements by title, sponsor, department..."
            className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>
        <div className="text-xs text-neutral-400">
          Published Requirements: <strong className="text-white">{requirements.length}</strong>
        </div>
      </div>

      {/* Published Requirements Cards List */}
      {loading ? (
        <div className="flex items-center justify-center p-20 text-neutral-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Consuming Published Requirements from DRS...
        </div>
      ) : requirements.length === 0 ? (
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-16 text-center space-y-4">
          <FileText className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Approved Requirements Available for Execution</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Requirements are created and approved inside DRS Command Center. Published requirements automatically appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {requirements.map((req, idx) => {
            const isExpanded = expandedReqId === req.id;
            const teamsList = parseAssignedTeams(req.assignedTeams);
            const isAssigned = teamsList.length > 0;
            const execStatus = req.executionStatus || (isAssigned ? 'Execution Started' : 'Not Started');
            const shortReqNum = `#10${idx + 1}`;

            return (
              <div key={req.id} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                
                {/* Requirement Main Card */}
                <div 
                  onClick={() => handleToggleReq(req.id)}
                  className="p-6 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-lg">
                          Requirement {shortReqNum}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase ${execStatus === 'Execution Started' || execStatus === 'In Progress' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                          {execStatus}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{req.title}</h3>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      {canAssignTeam && (
                        <button 
                          onClick={(e) => handleOpenAssignModal(req, e)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                          <Users className="w-4 h-4" /> {isAssigned ? 'Reassign Team' : 'Assign Team'}
                        </button>
                      )}

                      <button 
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs border border-white/10 flex items-center gap-2"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} Open Workspace
                      </button>
                    </div>
                  </div>

                  {/* Requirement Card Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2 text-xs">
                    <div className="bg-neutral-950 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-neutral-500 block uppercase">Department</span>
                      <span className="font-bold text-white">{req.department || 'Digitization'}</span>
                    </div>

                    <div className="bg-neutral-950 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-neutral-500 block uppercase">Priority</span>
                      <span className="font-bold text-amber-400">{req.priority || 'High'}</span>
                    </div>

                    <div className="bg-neutral-950 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-neutral-500 block uppercase">Target Timeline</span>
                      <span className="font-bold text-white">{req.timeline || '12 Weeks'}</span>
                    </div>

                    <div className="bg-neutral-950 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-neutral-500 block uppercase">Sponsor</span>
                      <span className="font-bold text-white">{req.sponsor || 'Plant Head'}</span>
                    </div>

                    <div className="bg-neutral-950 p-2.5 rounded-xl border border-white/5 col-span-2 sm:col-span-2 md:col-span-2">
                      <span className="text-[10px] text-neutral-500 block uppercase mb-1">Assigned Teams</span>
                      {isAssigned ? (
                        <div className="flex flex-wrap gap-1">
                          {teamsList.map((tName, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold">
                              {tName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-500 italic">Not Assigned</span>
                          {canAssignTeam && (
                            <button 
                              onClick={(e) => handleOpenAssignModal(req, e)}
                              className="text-[10px] text-indigo-400 hover:underline font-bold"
                            >
                              [ Assign Team ]
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">Overall SDLC Execution Progress</span>
                      <span className="font-bold text-emerald-400">{req.progress || 0}%</span>
                    </div>
                    <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-emerald-500 transition-all duration-500 w-[--progress]" style={{ '--progress': `${req.progress || 0}%` } as React.CSSProperties} />
                    </div>
                  </div>
                </div>

                {/* Expanded SDLC Execution Workspace */}
                {isExpanded && (
                  <div className="p-6 bg-neutral-950/80 border-t border-white/5 space-y-6">
                    
                    {!isAssigned && execStatus === 'Not Started' ? (
                      <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-3">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                        <h4 className="font-bold text-white text-base">Execution Controls Locked</h4>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                          Assign teams and start execution to enable 8 SDLC Execution Stages and Task Breakdown.
                        </p>
                        {canAssignTeam && (
                          <button 
                            onClick={(e) => handleOpenAssignModal(req, e)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg"
                          >
                            <Users className="w-4 h-4" /> Assign Teams & Start Execution
                          </button>
                        )}
                      </div>
                    ) : loadingDetail ? (
                      <div className="p-12 text-center text-neutral-500 text-xs">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading 8 SDLC Execution Stages...
                      </div>
                    ) : selectedReqDetail && selectedReqDetail.stages ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
                          <span>8 Fixed SDLC Execution Stages</span>
                          <span className="text-xs text-neutral-400 font-normal">Task breakdown & stage progress engine</span>
                        </h4>

                        <div className="space-y-3">
                          {selectedReqDetail.stages.map((stg, sIdx) => {
                            const isStageOpen = expandedStage === stg.name;
                            return (
                              <div key={stg.name} className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
                                
                                {/* Stage Header */}
                                <div 
                                  onClick={() => setExpandedStage(isStageOpen ? null : stg.name)}
                                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center">
                                      {sIdx + 1}
                                    </span>
                                    <div>
                                      <h5 className="font-bold text-white text-sm">{stg.name}</h5>
                                      <span className="text-[10px] text-neutral-400 block">{stg.purpose}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-neutral-400">Tasks: <strong>{stg.tasks?.length || 0}</strong></span>
                                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                                        {stg.progress}%
                                      </span>
                                    </div>

                                    {canCreateTask && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenTaskModal(stg.name);
                                        }}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> Add Task
                                      </button>
                                    )}

                                    {isStageOpen ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                                  </div>
                                </div>

                                {/* Expanded Stage Tasks List */}
                                {isStageOpen && (
                                  <div className="p-4 bg-neutral-950/60 border-t border-white/5 space-y-3">
                                    {stg.tasks && stg.tasks.length > 0 ? (
                                      <div className="space-y-2">
                                        {stg.tasks.map(t => (
                                          <div key={t.id} className="p-3 bg-neutral-900 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                              <span className="font-bold text-white block">{t.title}</span>
                                              <span className="text-[10px] text-neutral-400 font-mono">
                                                Assigned To: {t.assignedTo?.name || 'Unassigned'}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                              <span className="px-2 py-0.5 bg-white/10 text-neutral-300 rounded text-[10px] font-bold">
                                                {t.status}
                                              </span>
                                              <span className="font-bold text-emerald-400">
                                                {t.progress}%
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-neutral-500 italic py-2 text-center">
                                        No execution tasks added to this stage yet. Click "Add Task" to break down work.
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* TEAM ASSIGNMENT EXECUTION PLANNING MODAL */}
      {showAssignModal && assigningReq && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Execution Planning & Team Assignment</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Assign teams and members for <strong className="text-blue-400">{assigningReq.title}</strong>
              </p>
            </div>

            {/* Step 1: Multi-Team Selection */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                1. Select Execution Teams (Multi-Team Support)
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {AVAILABLE_TEAMS.map(tName => {
                  const isSelected = selectedTeamNames.includes(tName);
                  return (
                    <div 
                      key={tName}
                      onClick={() => handleToggleTeamSelection(tName)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-neutral-950 border-white/5 text-neutral-400 hover:bg-white/5'}`}
                    >
                      <span className="font-bold">{tName}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/20'}`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Team Member Selection */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                2. Select Assigned Members
              </h4>

              {loadingMembers ? (
                <div className="p-6 text-center text-neutral-500 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Loading team members...
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="p-4 text-xs text-neutral-500 italic">No members found in Master Data.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableMembers.map(m => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <div 
                        key={m.id}
                        onClick={() => handleToggleMemberSelection(m.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-neutral-950 border-white/5 text-neutral-400 hover:bg-white/5'}`}
                      >
                        <div>
                          <span className="font-bold block">{m.name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">ID: {m.employeeId} | {m.teamName}</span>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/20'}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">Cancel</button>
              <button 
                onClick={handleSaveTeamAssignment} 
                disabled={savingAssignment || selectedTeamNames.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {savingAssignment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />} Save & Start Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK IN STAGE MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-white">
              Create Execution Task inside <span className="text-blue-400">{targetStageName}</span>
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Task Title *</label>
              <input 
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Implement REST API Controller"
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Task Description</label>
              <textarea 
                rows={3}
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                placeholder="Details of work required..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Priority</label>
                <select 
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">Estimated Hours</label>
                <input 
                  type="number"
                  value={newTaskHours}
                  onChange={e => setNewTaskHours(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">Cancel</button>
              <button onClick={handleCreateTask} disabled={creatingTask} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2">
                {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Task
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
