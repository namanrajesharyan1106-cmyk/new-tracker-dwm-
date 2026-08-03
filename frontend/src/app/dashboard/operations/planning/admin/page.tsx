"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle2, XCircle, AlertTriangle, Lock, Unlock,
  Search, Filter, Plus, FileText, Activity, ShieldAlert, Award,
  Clock, Repeat, RefreshCw, Send, Loader2, Check, Moon, Sun, MessageSquare
} from 'lucide-react';
import api from '@/lib/axios';

export default function TeamMorningMeetingAdminPage() {
  const [activeTab, setActiveTab] = useState<'TEAM_MEETING' | 'EVENING_CLOSINGS' | 'PLANNED_VS_ACTUAL' | 'DEPARTMENT_METRICS' | 'MEETING_NOTES'>('TEAM_MEETING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [sectionId, setSectionId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [search, setSearch] = useState('');

  // Data State
  const [membersSummary, setMembersSummary] = useState<any[]>([]);
  const [eveningClosingsSummary, setEveningClosingsSummary] = useState<any[]>([]);
  const [plannedVsActualReport, setPlannedVsActualReport] = useState<any>(null);
  const [deptMetrics, setDeptMetrics] = useState<any>(null);
  const [meetingNotes, setMeetingNotes] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // Manager Review Form State
  const [selectedClosingId, setSelectedClosingId] = useState<string | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});

  // Meeting Note Form State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [todayFocus, setTodayFocus] = useState('');
  const [customerVisit, setCustomerVisit] = useState('');
  const [machineBreakdown, setMachineBreakdown] = useState('');
  const [safetyAlert, setSafetyAlert] = useState('');
  const [priorityProjects, setPriorityProjects] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchInitialOptions();
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Auto-polling every 5 seconds for live visibility without browser refresh
    const pollInterval = setInterval(() => {
      fetchDashboardDataSilently();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [teamId, sectionId, search, activeTab]);

  const fetchDashboardDataSilently = async () => {
    try {
      const query = new URLSearchParams();
      if (teamId) query.append('teamId', teamId);
      if (sectionId) query.append('sectionId', sectionId);
      if (search) query.append('search', search);

      if (activeTab === 'TEAM_MEETING') {
        const res = await api.get(`/daily-plans/team-meeting?${query.toString()}`);
        setMembersSummary(res.data.data || []);
      } else if (activeTab === 'EVENING_CLOSINGS') {
        const res = await api.get(`/daily-plans/team-closing?${query.toString()}`);
        setEveningClosingsSummary(res.data.data || []);
      } else if (activeTab === 'PLANNED_VS_ACTUAL') {
        const res = await api.get(`/daily-plans/planned-vs-actual?${query.toString()}`);
        setPlannedVsActualReport(res.data.data || null);
      }
    } catch (err) {
      // Silent error handling for background polling
    }
  };

  const fetchInitialOptions = async () => {
    try {
      const [secRes, teamRes] = await Promise.all([
        api.get('/master-data/sections'),
        api.get('/master-data/teams')
      ]);
      setSections(secRes.data.data || []);
      setTeams(teamRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const query = new URLSearchParams();
      if (teamId) query.append('teamId', teamId);
      if (sectionId) query.append('sectionId', sectionId);
      if (search) query.append('search', search);

      if (activeTab === 'TEAM_MEETING') {
        const res = await api.get(`/daily-plans/team-meeting?${query.toString()}`);
        setMembersSummary(res.data.data || []);
      } else if (activeTab === 'EVENING_CLOSINGS') {
        const res = await api.get(`/daily-plans/team-closing?${query.toString()}`);
        setEveningClosingsSummary(res.data.data || []);
      } else if (activeTab === 'PLANNED_VS_ACTUAL') {
        const res = await api.get(`/daily-plans/planned-vs-actual?${query.toString()}`);
        setPlannedVsActualReport(res.data.data || null);
      } else if (activeTab === 'DEPARTMENT_METRICS') {
        const res = await api.get('/daily-plans/department-metrics');
        setDeptMetrics(res.data.data);
      } else if (activeTab === 'MEETING_NOTES') {
        const res = await api.get('/daily-plans/meeting-notes');
        setMeetingNotes(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprovePlan = async (planId: string, action: 'APPROVED' | 'REJECTED') => {
    if (!planId) return;
    try {
      await api.post(`/daily-plans/${planId}/approve`, { action });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlockPlan = async (planId: string) => {
    if (!planId) return;
    try {
      await api.post(`/daily-plans/${planId}/unlock`);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewClosing = async (closingId: string, status: string) => {
    if (!closingId) return;
    try {
      const remarks = reviewRemarks[closingId] || '';
      await api.post(`/daily-plans/closing/${closingId}/review`, { status, remarks });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishMeetingNote = async () => {
    try {
      setPublishing(true);
      await api.post('/daily-plans/meeting-notes', {
        sectionId,
        teamId,
        todayFocus,
        customerVisit,
        machineBreakdown,
        safetyAlert,
        priorityProjects,
        specialInstructions,
        actionItems
      });
      setShowNoteModal(false);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Users className="w-8 h-8 text-emerald-400" />
            Team Morning Meeting & Department Operations
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Single-screen operational view for Team Leads & Department Heads.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Live Sync
          </button>
          <button
            onClick={() => setShowNoteModal(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Publish Meeting Notes
          </button>
        </div>
      </div>

      {/* Mode Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('TEAM_MEETING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'TEAM_MEETING' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          <Sun className="w-4 h-4" /> Team Morning Meeting View
        </button>
        <button
          onClick={() => setActiveTab('EVENING_CLOSINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'EVENING_CLOSINGS' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          <Moon className="w-4 h-4" /> Team Evening Closings View
        </button>
        <button
          onClick={() => setActiveTab('PLANNED_VS_ACTUAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'PLANNED_VS_ACTUAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          <Activity className="w-4 h-4" /> Planned vs Actual Matrix
        </button>
        <button
          onClick={() => setActiveTab('DEPARTMENT_METRICS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'DEPARTMENT_METRICS' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          Department Head Dashboard
        </button>
        <button
          onClick={() => setActiveTab('MEETING_NOTES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'MEETING_NOTES' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          Team Meeting Notes History
        </button>
      </div>

      {/* TAB 1: TEAM MORNING MEETING VIEW */}
      {activeTab === 'TEAM_MEETING' && (
        <div className="space-y-6">

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-900/50 p-4 rounded-xl border border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search member name or ID..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Members Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {membersSummary.map(m => (
              <div key={m.member.id} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between">

                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-base">{m.member.name}</h3>
                      <p className="text-xs text-neutral-400">{m.member.designation || m.member.role} • {m.member.employeeId}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${m.attendanceStatus === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {m.attendanceStatus}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-neutral-400 block text-[10px]">Yesterday</span>
                      <span className="font-bold text-white">{m.yesterdaySummary}</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-neutral-400 block text-[10px]">Today's Tasks</span>
                      <span className="font-bold text-blue-400">{m.plannedTasksCount} Planned</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Today's Focus / Priorities</span>
                      <p className="text-neutral-200 line-clamp-2 mt-0.5">{m.topPriorities}</p>
                    </div>

                    {m.supportRequired && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-amber-300">
                        <span className="font-bold block text-[10px]">Support Required:</span>
                        {m.supportRequired}
                      </div>
                    )}

                    {m.blockedTasks.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-red-300">
                        <span className="font-bold block text-[10px]">Blocked Tasks ({m.blockedTasks.length}):</span>
                        {m.blockedTasks[0].title} ({m.blockedTasks[0].blockReason})
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Lead Approval Bar */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    {m.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-neutral-500" />}
                    <span className="text-neutral-400">{m.todayPlanStatus}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.isLocked ? (
                      <button
                        onClick={() => handleUnlockPlan(m.member.id)}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold"
                      >
                        Unlock
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprovePlan(m.member.id, 'APPROVED')}
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprovePlan(m.member.id, 'REJECTED')}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TEAM EVENING CLOSINGS VIEW */}
      {activeTab === 'EVENING_CLOSINGS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eveningClosingsSummary.map(m => (
              <div key={m.member.id} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-base">{m.member.name}</h3>
                      <p className="text-xs text-neutral-400">{m.member.designation || m.member.role} • {m.member.employeeId}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${m.todayClosingStatus === 'SUBMITTED' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                      {m.todayClosingStatus === 'SUBMITTED' ? 'Submitted' : 'Pending'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-neutral-400 block text-[10px]">Logged Hours</span>
                      <span className="font-bold text-white">{m.actualHoursWorked} hrs</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-neutral-400 block text-[10px]">Productivity</span>
                      <span className="font-bold text-emerald-400">{m.productivityScore}%</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Completed Work ({m.completedTasks.length})</span>
                      {m.completedTasks.length > 0 ? (
                        <ul className="mt-1 space-y-0.5">
                          {m.completedTasks.map((t: any) => (
                            <li key={t.id} className="text-xs text-emerald-400 flex items-center gap-1.5 truncate">
                              <Check className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{t.title}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-neutral-500 italic text-[11px]">No tasks marked completed</p>}
                    </div>

                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Pending Work ({m.pendingTasks.length})</span>
                      {m.pendingTasks.length > 0 ? (
                        <ul className="mt-1 space-y-0.5">
                          {m.pendingTasks.map((t: any) => (
                            <li key={t.id} className="text-xs text-amber-300 flex items-center gap-1.5 truncate">
                              <Clock className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{t.title}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-neutral-500 italic text-[11px]">No pending tasks</p>}
                    </div>

                    {m.achievements && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-emerald-300">
                        <span className="font-bold block text-[10px]">Achievements:</span>
                        {m.achievements}
                      </div>
                    )}

                    {m.problemsFaced && (
                      <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-red-300">
                        <span className="font-bold block text-[10px]">Problems Faced:</span>
                        {m.problemsFaced}
                      </div>
                    )}

                    {m.supportRequired && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-amber-300">
                        <span className="font-bold block text-[10px]">Support Required:</span>
                        {m.supportRequired}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manager Review Controls */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Review Status:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${m.reviewStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : m.reviewStatus === 'NEEDS_DISCUSSION' ? 'bg-amber-500/20 text-amber-300' : m.reviewStatus === 'REQUIRES_SUPPORT' ? 'bg-red-500/20 text-red-400' : 'bg-neutral-800 text-neutral-400'}`}>
                      {m.reviewStatus.replace('_', ' ')}
                    </span>
                  </div>

                  {m.closingId && (
                    <div className="space-y-2">
                      <input 
                        type="text"
                        placeholder="Manager remarks..."
                        value={reviewRemarks[m.closingId] || ''}
                        onChange={e => setReviewRemarks({ ...reviewRemarks, [m.closingId]: e.target.value })}
                        className="w-full bg-neutral-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <button 
                          onClick={() => handleReviewClosing(m.closingId, 'APPROVED')}
                          className="py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReviewClosing(m.closingId, 'NEEDS_DISCUSSION')}
                          className="py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold"
                        >
                          Needs Discussion
                        </button>
                        <button 
                          onClick={() => handleReviewClosing(m.closingId, 'REQUIRES_SUPPORT')}
                          className="py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold"
                        >
                          Requires Support
                        </button>
                        <button 
                          onClick={() => handleReviewClosing(m.closingId, 'CARRY_FORWARD_REQUIRED')}
                          className="py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold"
                        >
                          Carry Forward
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PLANNED vs ACTUAL EXECUTION MATRIX */}
      {activeTab === 'PLANNED_VS_ACTUAL' && plannedVsActualReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-neutral-400 block font-medium">Total Members</span>
              <span className="text-2xl font-bold text-white mt-1 block">{plannedVsActualReport.summary?.totalMembers}</span>
            </div>
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-neutral-400 block font-medium">Planned Hours</span>
              <span className="text-2xl font-bold text-amber-400 mt-1 block">{plannedVsActualReport.summary?.totalPlannedHours} hrs</span>
            </div>
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-neutral-400 block font-medium">Actual Logged Hours</span>
              <span className="text-2xl font-bold text-blue-400 mt-1 block">{plannedVsActualReport.summary?.totalActualHours} hrs</span>
            </div>
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
              <span className="text-xs text-neutral-400 block font-medium">Avg Productivity</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">{plannedVsActualReport.summary?.avgProductivity}%</span>
            </div>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" /> Member Execution Variance Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead className="bg-white/5 text-neutral-400 uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Morning Plan</th>
                    <th className="p-3.5">Planned Tasks</th>
                    <th className="p-3.5">Completed Tasks</th>
                    <th className="p-3.5">Extra Tasks</th>
                    <th className="p-3.5">Planned Hours</th>
                    <th className="p-3.5">Actual Hours</th>
                    <th className="p-3.5">Productivity</th>
                    <th className="p-3.5">Evening Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {plannedVsActualReport.memberReports?.map((r: any) => (
                    <tr key={r.member.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 font-bold">{r.member.name}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.morningSubmitted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
                          {r.morningSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">{r.plannedTasksCount}</td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">{r.completedTasksCount}</td>
                      <td className="p-3.5 font-mono text-purple-400">{r.extraTasksCount}</td>
                      <td className="p-3.5 font-mono">{r.plannedHours} h</td>
                      <td className="p-3.5 font-mono text-blue-400 font-bold">{r.actualHours} h</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">{r.productivity}%</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.closingSubmitted ? 'bg-purple-500/20 text-purple-300' : 'bg-neutral-800 text-neutral-400'}`}>
                          {r.closingSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'DEPARTMENT_METRICS' && deptMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
            <span className="text-xs text-neutral-400 block font-medium">Planning Submissions</span>
            <span className="text-3xl font-bold text-white mt-1 block">{deptMetrics.planningSubmissions}</span>
            <span className="text-xs text-emerald-400 mt-2 block font-semibold">{deptMetrics.planningRatio}% Compliance</span>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
            <span className="text-xs text-neutral-400 block font-medium">Evening Closing Submissions</span>
            <span className="text-3xl font-bold text-white mt-1 block">{deptMetrics.closingSubmissions}</span>
            <span className="text-xs text-indigo-400 mt-2 block font-semibold">{deptMetrics.closingRatio}% Compliance</span>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
            <span className="text-xs text-neutral-400 block font-medium">Blocked & Delayed Tasks</span>
            <span className="text-3xl font-bold text-red-400 mt-1 block">{deptMetrics.blockedTasksCount + deptMetrics.delayedTasksCount}</span>
            <span className="text-xs text-red-400 mt-2 block font-semibold">{deptMetrics.blockedTasksCount} Blocked, {deptMetrics.delayedTasksCount} Delayed</span>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
            <span className="text-xs text-neutral-400 block font-medium">Department Health</span>
            <span className="text-3xl font-bold text-emerald-400 mt-1 block">{deptMetrics.departmentHealth}</span>
            <span className="text-xs text-neutral-400 mt-2 block font-semibold">Attendance: {deptMetrics.attendanceRate}%</span>
          </div>
        </div>
      )}

      {/* TAB 3: MEETING NOTES HISTORY */}
      {activeTab === 'MEETING_NOTES' && (
        <div className="space-y-4">
          {meetingNotes.map(n => (
            <div key={n.id} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-base">{n.todayFocus}</h3>
                <span className="text-xs text-neutral-400">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              {n.specialInstructions && <p className="text-xs text-neutral-300">{n.specialInstructions}</p>}
              <div className="text-[10px] text-neutral-500">Published by {n.createdBy?.name || 'Team Lead'}</div>
            </div>
          ))}
        </div>
      )}

      {/* MEETING NOTES PUBLISH MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Publish Team Morning Meeting Notes</h3>

            <div>
              <label className="text-xs font-semibold text-neutral-300 uppercase block mb-1">Today's Focus *</label>
              <input
                type="text"
                value={todayFocus}
                onChange={e => setTodayFocus(e.target.value)}
                placeholder="e.g. Complete Extrusion line setup & release DRS 102"
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 uppercase block mb-1">Special Instructions & Action Items</label>
              <textarea
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                placeholder="Safety alerts, priority projects, customer visit notes..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none h-24"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">Cancel</button>
              <button onClick={handlePublishMeetingNote} disabled={publishing} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs flex items-center gap-2">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish Notes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
