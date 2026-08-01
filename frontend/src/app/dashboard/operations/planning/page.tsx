"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sun, Moon, Save, Calendar, Folder, CheckSquare, AlignLeft, 
  Check, Loader2, AlertCircle, Clock, Award, ShieldAlert, 
  ArrowRight, Repeat, AlertTriangle 
} from 'lucide-react';
import api from '@/lib/axios';

export default function MorningPlanningPage() {
  const [mode, setMode] = useState<'MORNING' | 'CLOSING'>('MORNING');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Morning Planning Data
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [carryForwardTasks, setCarryForwardTasks] = useState<any[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<any[]>([]);
  const [personalTasks, setPersonalTasks] = useState<any[]>([]);

  // Form State - Morning
  const [topPriorities, setTopPriorities] = useState('');
  const [expectedHours, setExpectedHours] = useState('8.0');
  const [strategy, setStrategy] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isClosingSubmitted, setIsClosingSubmitted] = useState(false);

  // Form State - Closing
  const [achievements, setAchievements] = useState('');
  const [problemsFaced, setProblemsFaced] = useState('');
  const [tomorrowPriority, setTomorrowPriority] = useState('');
  const [closingSupportRequired, setClosingSupportRequired] = useState('');
  const [actualHoursWorked, setActualHoursWorked] = useState('8.0');
  const [unfinishedTaskUpdates, setUnfinishedTaskUpdates] = useState<Record<string, { status: string; delayReason: string; blockReason: string }>>({});

  useEffect(() => {
    fetchPlanningSummary();
  }, []);

  const fetchPlanningSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/daily-plans/morning-summary');
      const data = res.data.data;
      
      setAssignedTasks(data.assignedTasks || []);
      setCarryForwardTasks(data.carryForwardTasks || []);
      setRecurringTasks(data.recurringTasks || []);
      setPersonalTasks(data.personalTasks || []);
      setIsClosingSubmitted(data.isClosingSubmitted || false);

      const projMap = new Map();
      (data.assignedTasks || []).forEach((t: any) => {
        if (t.project) projMap.set(t.project.id, t.project);
      });
      setAssignedProjects(Array.from(projMap.values()));

      if (data.existingPlan) {
        const plan = data.existingPlan;
        setTopPriorities(plan.topPriorities || plan.planText || '');
        setExpectedHours(plan.expectedHours ? String(plan.expectedHours) : '8.0');
        setStrategy(plan.strategy || '');
        setSupportRequired(plan.supportRequired || '');
        setSelectedTaskIds(plan.tasks ? plan.tasks.map((t: any) => t.id) : []);
        setSelectedProjectIds(plan.projects ? plan.projects.map((p: any) => p.id) : []);
      } else {
        // Pre-select all active assigned tasks
        setSelectedTaskIds((data.assignedTasks || []).map((t: any) => t.id));
      }
    } catch (err) {
      console.error('Failed to fetch morning planning data', err);
      setError('Failed to load planning data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMorningPlan = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      await api.post('/daily-plans/morning', {
        topPriorities,
        expectedHours,
        strategy,
        supportRequired,
        taskIds: selectedTaskIds,
        projectIds: selectedProjectIds
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit morning planning');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEveningClosing = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      const updatesArray = Object.entries(unfinishedTaskUpdates).map(([taskId, val]) => ({
        taskId,
        status: val.status,
        delayReason: val.delayReason,
        blockReason: val.blockReason
      }));

      await api.post('/daily-plans/closing', {
        achievements,
        problemsFaced,
        tomorrowPriority,
        supportRequired: closingSupportRequired,
        actualHoursWorked,
        unfinishedTaskUpdates: updatesArray
      });

      setSuccess(true);
      setIsClosingSubmitted(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit evening closing');
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskSelection = (id: string) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter(t => t !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex items-center gap-2 text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading daily operational engine...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            {mode === 'MORNING' ? <Sun className="w-8 h-8 text-amber-400" /> : <Moon className="w-8 h-8 text-indigo-400" />}
            {mode === 'MORNING' ? 'Morning Operational Planning' : 'Evening Operational Closing'}
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            {mode === 'MORNING' 
              ? 'Auto-populated from DRS Projects & Tasks. Set your priorities and strategy for today.' 
              : 'Review planned task completions, log delay/block reasons, and prepare tomorrow suggestions.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-white/10">
          <button 
            onClick={() => setMode('MORNING')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'MORNING' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-neutral-400 hover:text-white'}`}
          >
            <Sun className="w-4 h-4" /> Morning Mode
          </button>
          <button 
            onClick={() => setMode('CLOSING')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mode === 'CLOSING' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-400 hover:text-white'}`}
          >
            <Moon className="w-4 h-4" /> Evening Mode
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" /> {mode === 'MORNING' ? 'Morning Plan' : 'Evening Closing'} saved and logged to timeline successfully!
        </div>
      )}

      {/* MODE 1: MORNING PLANNING */}
      {mode === 'MORNING' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Auto-populated Tasks & Projects */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Today's Tasks */}
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-neutral-200 text-sm">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                  Assigned Execution Tasks
                </h3>
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg">
                  {selectedTaskIds.length} Selected
                </span>
              </div>
              <div className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-1">
                {assignedTasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-500">No active execution tasks assigned.</div>
                ) : (
                  assignedTasks.map(t => (
                    <label key={t.id} className={`flex items-start space-x-3 cursor-pointer p-2.5 rounded-xl border transition-all ${selectedTaskIds.includes(t.id) ? 'bg-blue-500/10 border-blue-500/30' : 'border-transparent hover:bg-white/5'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedTaskIds.includes(t.id)}
                        onChange={() => toggleTaskSelection(t.id)}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-neutral-700 bg-neutral-900 focus:ring-blue-500" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{t.title}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">Project: {t.project?.name || 'General'}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Carry Forward Tasks */}
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[200px]">
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-amber-400 text-xs">
                  <Repeat className="w-4 h-4" /> Carry Forward Tasks ({carryForwardTasks.length})
                </h3>
              </div>
              <div className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-1 text-xs">
                {carryForwardTasks.map(t => (
                  <div key={t.id} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-neutral-200">
                    <span className="font-medium text-amber-300">{t.title}</span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">Moved {t.carryForwardCount} time(s)</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Strategy & Priorities Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
              
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Today's Top Priorities & Focus Area *
                </label>
                <textarea 
                  value={topPriorities}
                  onChange={e => setTopPriorities(e.target.value)}
                  placeholder="Outline key deliverables, milestones, and high-impact goals for today..."
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:border-amber-500 focus:outline-none h-28 custom-scrollbar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                    Expected Working Hours
                  </label>
                  <input 
                    type="number"
                    step="0.5"
                    value={expectedHours}
                    onChange={e => setExpectedHours(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                    Required Management Support / Dependencies
                  </label>
                  <input 
                    type="text"
                    value={supportRequired}
                    onChange={e => setSupportRequired(e.target.value)}
                    placeholder="e.g. Server access, approval on DRS 102"
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Execution Strategy & Tactical Notes
                </label>
                <textarea 
                  value={strategy}
                  onChange={e => setStrategy(e.target.value)}
                  placeholder="Steps to overcome potential bottlenecks and complete execution..."
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:border-amber-500 focus:outline-none h-24 custom-scrollbar"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveMorningPlan}
                  disabled={saving || isClosingSubmitted}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Submit Morning Planning
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* MODE 2: EVENING CLOSING */}
      {mode === 'CLOSING' && (
        <div className="space-y-6">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              Daily Operational Closing & Achievements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Today's Achievements & Deliverables Completed *
                </label>
                <textarea 
                  value={achievements}
                  onChange={e => setAchievements(e.target.value)}
                  placeholder="Summarize key tasks finished and milestones achieved..."
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:border-indigo-500 focus:outline-none h-28 custom-scrollbar"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Problems Faced & Obstacles Encountered
                </label>
                <textarea 
                  value={problemsFaced}
                  onChange={e => setProblemsFaced(e.target.value)}
                  placeholder="Describe technical blockers, delays, or dependency issues..."
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:border-indigo-500 focus:outline-none h-28 custom-scrollbar"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Actual Hours Worked Today
                </label>
                <input 
                  type="number"
                  step="0.5"
                  value={actualHoursWorked}
                  onChange={e => setActualHoursWorked(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Tomorrow's Proposed Priority
                </label>
                <input 
                  type="text"
                  value={tomorrowPriority}
                  onChange={e => setTomorrowPriority(e.target.value)}
                  placeholder="Top priority for tomorrow..."
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Tomorrow Support Needed
                </label>
                <input 
                  type="text"
                  value={closingSupportRequired}
                  onChange={e => setClosingSupportRequired(e.target.value)}
                  placeholder="Support required for tomorrow..."
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button 
                onClick={handleSaveEveningClosing}
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Submit Evening Closing & Execute Carry Forward
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
