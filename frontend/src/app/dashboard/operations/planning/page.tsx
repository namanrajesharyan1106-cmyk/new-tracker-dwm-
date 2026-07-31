"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Calendar, Folder, CheckSquare, AlignLeft, Check, Plus, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

export default function MorningPlanningPage() {
  const [projectsList, setProjectsList] = useState<{id: string, name: string, drsRequestId: string}[]>([]);
  const [myTasksList, setMyTasksList] = useState<{id: string, title: string, status: string}[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [planText, setPlanText] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [projRes, taskRes, planRes] = await Promise.all([
        api.get('/projects'), // Needs to return all projects or assigned projects
        api.get('/tasks?filter=my_tasks&limit=50'),
        api.get('/daily-plans/today')
      ]);

      setProjectsList(projRes.data.data);
      setMyTasksList(taskRes.data.data.filter((t: any) => t.status !== 'COMPLETED')); // Only show active tasks
      
      const plan = planRes.data.data;
      if (plan) {
        setPlanText(plan.planText || '');
        setSelectedProjects(plan.projects.map((p: any) => p.id));
        setSelectedTasks(plan.tasks.map((t: any) => t.id));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load planning data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/daily-plans/today', {
        planText,
        projectIds: selectedProjects,
        taskIds: selectedTasks
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const toggleProject = (id: string) => {
    if (selectedProjects.includes(id)) {
      setSelectedProjects(prev => prev.filter(p => p !== id));
    } else {
      setSelectedProjects(prev => [...prev, id]);
    }
  };

  const toggleTask = (id: string) => {
    if (selectedTasks.includes(id)) {
      setSelectedTasks(prev => prev.filter(t => t !== id));
    } else {
      setSelectedTasks(prev => [...prev, id]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex items-center gap-2 text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your day...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="w-8 h-8 text-indigo-500" />
            Morning Planning
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Design your day by selecting active projects and tasks.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-400">{error}</span>}
          {success && <span className="text-sm text-emerald-400 flex items-center gap-1"><Check className="w-4 h-4" /> Saved!</span>}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Update Plan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Projects & Tasks Selection */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* DRS Projects */}
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-200">
                <Folder className="w-4 h-4 text-amber-500" />
                Today's Projects
              </h3>
              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                {selectedProjects.length} Selected
              </span>
            </div>
            <div className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-1">
              {projectsList.length === 0 ? (
                <div className="p-4 text-center text-sm text-neutral-500">No projects available.</div>
              ) : (
                projectsList.map(proj => (
                  <label key={proj.id} className={`flex items-center space-x-3 cursor-pointer p-3 rounded-xl border transition-all ${selectedProjects.includes(proj.id) ? 'bg-amber-500/10 border-amber-500/30' : 'border-transparent hover:bg-white/5'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedProjects.includes(proj.id)}
                      onChange={() => toggleProject(proj.id)}
                      className="w-4 h-4 text-amber-500 rounded border-neutral-700 bg-neutral-900 focus:ring-amber-500" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate transition-colors ${selectedProjects.includes(proj.id) ? 'text-amber-100' : 'text-neutral-300'}`}>{proj.name}</div>
                      {proj.drsRequestId && <div className="text-xs text-neutral-500 truncate">DRS: {proj.drsRequestId}</div>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Assigned Tasks */}
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-200">
                <CheckSquare className="w-4 h-4 text-blue-500" />
                Today's Tasks
              </h3>
              <span className="text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                {selectedTasks.length} Selected
              </span>
            </div>
            <div className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-1">
              {myTasksList.length === 0 ? (
                <div className="p-4 text-center text-sm text-neutral-500">No active tasks assigned to you.</div>
              ) : (
                myTasksList.map(task => (
                  <label key={task.id} className={`flex items-start space-x-3 cursor-pointer p-3 rounded-xl border transition-all ${selectedTasks.includes(task.id) ? 'bg-blue-500/10 border-blue-500/30' : 'border-transparent hover:bg-white/5'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="w-4 h-4 mt-0.5 text-blue-500 rounded border-neutral-700 bg-neutral-900 focus:ring-blue-500" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium transition-colors leading-tight ${selectedTasks.includes(task.id) ? 'text-blue-100' : 'text-neutral-300'}`}>{task.title}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          
        </div>

        {/* Right Column: Personal Tasks & Rich Text */}
        <div className="lg:col-span-2">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full min-h-[824px]">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-200">
                <AlignLeft className="w-4 h-4 text-emerald-500" />
                Personal Tasks & Daily Notes
              </h3>
              <p className="text-xs text-neutral-400 mt-1">Jot down your ad-hoc personal tasks, reminders, and overall strategy for today.</p>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <textarea 
                value={planText}
                onChange={e => setPlanText(e.target.value)}
                placeholder="Example:&#10;- Follow up with John on DRS 1022&#10;- Complete backend refactor by 2 PM&#10;- Personal: Renew software license"
                className="w-full flex-1 bg-neutral-950 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none custom-scrollbar"
              />
            </div>
            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-neutral-500">
              <span>Your plan will be visible to Admins live.</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
