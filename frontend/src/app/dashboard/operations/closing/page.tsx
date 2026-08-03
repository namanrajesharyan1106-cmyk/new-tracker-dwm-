"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, CheckSquare, AlignLeft, Check, Loader2, AlertCircle, Clock, XCircle } from 'lucide-react';
import api from '@/lib/axios';

export default function EveningClosingPage() {
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [closingText, setClosingText] = useState('');
  const [taskUpdates, setTaskUpdates] = useState<Record<string, any>>({});

  const [morningPlan, setMorningPlan] = useState<any>(null);
  const [todayWorkLogs, setTodayWorkLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [taskRes, closingRes, morningRes, timelineRes] = await Promise.all([
        api.get('/tasks?filter=my_tasks&limit=50'),
        api.get('/operations/closing'),
        api.get('/daily-plans/morning-summary'),
        api.get('/daily-plans/timeline-summary')
      ]);

      const activeTasks = taskRes.data.data.filter((t: any) => t.status !== 'COMPLETED');
      setTasksList(activeTasks);
      setMorningPlan(morningRes.data?.data?.existingPlan || null);
      setTodayWorkLogs(timelineRes.data?.data?.workLogs || []);
      
      const initialUpdates: Record<string, any> = {};
      activeTasks.forEach((task: any) => {
        initialUpdates[task.id] = {
          taskId: task.id,
          status: task.status,
          progress: task.progress || 0,
          reason: '',
          expectedCompletion: '',
          estimatedDelayDays: 1
        };
      });
      setTaskUpdates(initialUpdates);

      const closing = closingRes.data.data;
      if (closing) {
        setClosingText(closing.closingText || '');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load closing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChange = (taskId: string, field: string, value: any) => {
    setTaskUpdates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    // Validate mandatory reasons
    for (const update of Object.values(taskUpdates)) {
      if ((update.status === 'DELAYED' || update.status === 'BLOCKED') && !update.reason) {
        setError(`Reason is mandatory for task marked as ${update.status}`);
        return;
      }
    }

    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/operations/closing', {
        closingText,
        taskUpdates: Object.values(taskUpdates)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Remove completed tasks from view
      fetchInitialData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit evening closing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex items-center gap-2 text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your day's tasks...
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
            <CheckSquare className="w-8 h-8 text-indigo-500" />
            Evening Closing
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Update your tasks before logout to keep your team informed.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-400">{error}</span>}
          {success && <span className="text-sm text-emerald-400 flex items-center gap-1"><Check className="w-4 h-4" /> Submitted!</span>}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Submitting...' : 'Submit Closing'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tasks Update */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-200">
                <CheckSquare className="w-4 h-4 text-blue-500" />
                Task Updates
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {tasksList.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">No pending tasks to update.</div>
              ) : (
                tasksList.map(task => {
                  const update = taskUpdates[task.id] || {};
                  return (
                    <div key={task.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-white">{task.title}</h4>
                          <p className="text-xs text-neutral-400">Current Status: {task.status}</p>
                        </div>
                        <select 
                          value={update.status}
                          onChange={(e) => handleUpdateChange(task.id, 'status', e.target.value)}
                          className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="DELAYED">Delayed</option>
                          <option value="BLOCKED">Blocked</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      {/* Dynamic Fields based on status */}
                      {(update.status === 'DELAYED' || update.status === 'BLOCKED') && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-3">
                          <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                            {update.status === 'DELAYED' ? <Clock className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {update.status === 'DELAYED' ? 'Delay Information' : 'Blocker Information'}
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1">Reason (Mandatory) *</label>
                            <input 
                              type="text" 
                              value={update.reason}
                              onChange={(e) => handleUpdateChange(task.id, 'reason', e.target.value)}
                              placeholder={`Why is this task ${update.status.toLowerCase()}?`}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-neutral-400 mb-1">Expected {update.status === 'DELAYED' ? 'Completion' : 'Resolution'} Date</label>
                              <input 
                                type="date" 
                                value={update.expectedCompletion}
                                onChange={(e) => handleUpdateChange(task.id, 'expectedCompletion', e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                            {update.status === 'DELAYED' && (
                              <div>
                                <label className="block text-xs text-neutral-400 mb-1">Estimated Delay (Days)</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={update.estimatedDelayDays}
                                  onChange={(e) => handleUpdateChange(task.id, 'estimatedDelayDays', parseInt(e.target.value))}
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-red-500 focus:border-red-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Progress Slider (Only for In Progress) */}
                      {update.status === 'IN_PROGRESS' && (
                        <div>
                          <div className="flex justify-between text-xs text-neutral-400 mb-1">
                            <span>Progress</span>
                            <span>{update.progress}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" max="100" 
                            value={update.progress}
                            onChange={(e) => handleUpdateChange(task.id, 'progress', parseInt(e.target.value))}
                            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Overall Remarks */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-200">
                <AlignLeft className="w-4 h-4 text-emerald-500" />
                Overall Remarks
              </h3>
              <p className="text-xs text-neutral-400 mt-1">Provide a brief summary of your day and any handovers.</p>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <textarea 
                value={closingText}
                onChange={e => setClosingText(e.target.value)}
                placeholder="Overall day went well. Handovers left for the night shift..."
                className="w-full flex-1 bg-neutral-950 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none custom-scrollbar"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
