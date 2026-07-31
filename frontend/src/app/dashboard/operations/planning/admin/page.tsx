"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, Folder, CheckSquare, AlignLeft, UserCircle2 } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminLivePlanningPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchLivePlans = async () => {
    try {
      const res = await api.get('/daily-plans/admin-live');
      setPlans(res.data.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePlans();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchLivePlans, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            Live Daily Plans
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Real-time overview of what every employee is working on today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 hidden sm:block">
            Auto-refreshes every 30s. Last: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button 
            onClick={fetchLivePlans}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors border border-white/10"
            title="Refresh Now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && plans.length === 0 ? (
        <div className="flex items-center justify-center p-20 text-neutral-500">Loading live plans...</div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-neutral-900/50 rounded-2xl border border-white/10 text-neutral-500">
          <Activity className="w-12 h-12 mb-3 text-neutral-700" />
          <p>No plans submitted yet today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan: any) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={plan.id}
              className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col"
            >
              {/* User Header */}
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                    {plan.user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{plan.user.name}</h3>
                    <p className="text-xs text-neutral-400">{plan.user.designation || plan.user.role.replace('_', ' ')} • {plan.user.employeeId}</p>
                  </div>
                </div>
                <div className="text-xs text-neutral-500 text-right">
                  Updated<br/>{new Date(plan.updatedAt).toLocaleTimeString()}
                </div>
              </div>

              {/* Plan Content */}
              <div className="p-5 flex-1 space-y-5">
                
                {/* Projects */}
                {plan.projects.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5" /> Working On Projects
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {plan.projects.map((p: any) => (
                        <span key={p.id} className="inline-flex px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-lg border border-amber-500/20">
                          {p.name} {p.drsRequestId && `(${p.drsRequestId})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {plan.tasks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5" /> Tackling Tasks
                    </h4>
                    <ul className="space-y-1.5">
                      {plan.tasks.map((t: any) => (
                        <li key={t.id} className="text-sm text-neutral-300 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <span>
                            {t.title} 
                            <span className="ml-2 text-[10px] text-neutral-500 uppercase font-medium">{t.status.replace('_', ' ')}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {plan.planText && (
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5" /> Personal Notes / Tasks
                    </h4>
                    <div className="bg-neutral-950/50 p-3 rounded-xl border border-white/5 text-sm text-neutral-300 whitespace-pre-wrap">
                      {plan.planText}
                    </div>
                  </div>
                )}

                {plan.projects.length === 0 && plan.tasks.length === 0 && !plan.planText && (
                  <div className="text-sm text-neutral-500 italic">User saved an empty plan.</div>
                )}

              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
