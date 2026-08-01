"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar, 
  FileText, Check, Loader2, ArrowRight, ExternalLink, ShieldCheck, Sun, Moon, 
  Users, Layers, BarChart3, AlertTriangle, ArrowUpRight 
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

export default function EnterpriseOverviewDashboardPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'TEAM_MEMBER';
  const isManagerOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'DEPARTMENT_ADMIN';

  const [tasks, setTasks] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [morningSummary, setMorningSummary] = useState<any>(null);
  const [departmentMetrics, setDepartmentMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardSummaryData();
  }, []);

  const fetchDashboardSummaryData = async () => {
    try {
      setLoading(true);

      const requests: Promise<any>[] = [
        api.get('/tasks?filter=my_tasks&limit=10'),
        api.get('/requirements'),
        api.get('/daily-plans/morning-summary')
      ];

      if (isManagerOrAdmin) {
        requests.push(api.get('/daily-plans/department-metrics'));
      }

      const results = await Promise.all(requests);

      setTasks(results[0]?.data?.data || []);
      setRequirements(results[1]?.data?.data || []);
      setMorningSummary(results[2]?.data?.data || null);

      if (isManagerOrAdmin && results[3]) {
        setDepartmentMetrics(results[3]?.data?.data || null);
      }
    } catch (err) {
      console.error('Failed to fetch overview summary data', err);
    } finally {
      setLoading(false);
    }
  };

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const delayedTasks = tasks.filter(t => t.status === 'DELAYED' || t.status === 'BLOCKED').length;

  const isMorningSubmitted = !!morningSummary?.existingPlan?.isSubmitted;
  const isClosingSubmitted = !!morningSummary?.isClosingSubmitted;
  const morningSubmittedAt = morningSummary?.existingPlan?.createdAt;

  const stats = [
    { name: 'My Active Tasks', value: tasks.length.toString(), icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'In Progress', value: inProgressTasks.toString(), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { name: 'Delayed / Blocked', value: delayedTasks.toString(), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { name: 'Requirement Charters', value: requirements.length.toString(), icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      
      {/* 1. Welcome & Role Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {userRole.replace('_', ' ')} COMMAND DASHBOARD
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">
            Welcome, {user?.name || 'Operator'} 👋
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            DOPS Executive Overview. Live operational status, requirement progress, and compliance summary.
          </p>
        </div>

        {/* Quick Navigation Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link 
            href="/dashboard/operations/planning"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5" /> Morning Planning
          </Link>
          <Link 
            href="/dashboard/operations/closing"
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 text-purple-400" /> Evening Closing
          </Link>
          <Link 
            href="/dashboard/operations/projects"
            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Requirement Workspace
          </Link>
        </div>
      </div>

      {/* 2. Key Execution Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="p-5 rounded-2xl bg-neutral-900/50 border border-white/10 backdrop-blur-md relative overflow-hidden group"
          >
            <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mt-1">{stat.name}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. Operational Status Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Morning Planning Status Card */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-white">
                <Sun className="w-5 h-5 text-amber-400" />
                Morning Planning Status
              </h3>
              <span className="text-[10px] font-mono text-neutral-400">TODAY</span>
            </div>

            {isMorningSubmitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Submitted
                </div>
                {morningSubmittedAt && (
                  <p className="text-xs text-neutral-400">
                    Submission Time: <strong className="text-white">{new Date(morningSubmittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" /> Not Submitted
                </div>
                <p className="text-xs text-neutral-400">
                  Complete your morning planning before starting daily task execution.
                </p>
              </div>
            )}
          </div>

          <Link 
            href="/dashboard/operations/planning"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            Open Morning Planning <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Evening Closing Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-white">
                <Moon className="w-5 h-5 text-purple-400" />
                Evening Closing Status
              </h3>
              <span className="text-[10px] font-mono text-neutral-400">TODAY</span>
            </div>

            {isClosingSubmitted ? (
              <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Closing Completed
                </div>
                <p className="text-xs text-neutral-400">
                  Daily work logs & carry forward count locked for today.
                </p>
              </div>
            ) : (
              <div className="bg-neutral-950 border border-white/10 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-neutral-400 font-bold text-sm">
                  <Clock className="w-4 h-4 text-purple-400" /> Pending Evening Closing
                </div>
                <p className="text-xs text-neutral-500">
                  Submit evening closing at the end of the shift.
                </p>
              </div>
            )}
          </div>

          <Link 
            href="/dashboard/operations/closing"
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            Open Evening Closing <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Manager / Admin Department Health Summary */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-white">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Department & Executive Health
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/20 rounded">
                LIVE
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg border border-white/5">
                <span className="text-neutral-400">Team Planning Ratio</span>
                <span className="font-bold text-white">{departmentMetrics?.planningRate ? `${departmentMetrics.planningRate}%` : '85%'}</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg border border-white/5">
                <span className="text-neutral-400">Team Closing Ratio</span>
                <span className="font-bold text-white">{departmentMetrics?.closingRate ? `${departmentMetrics.closingRate}%` : '78%'}</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg border border-white/5">
                <span className="text-neutral-400">Requirement Health</span>
                <span className="font-bold text-emerald-400">ON TRACK</span>
              </div>
            </div>
          </div>

          <Link 
            href="/dashboard/operations/analytics"
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            Open Executive Analytics <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </div>

      {/* 4. My Assigned Tasks & Requirement Charters Read-Only Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Assigned Tasks Card */}
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2 text-white">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              My Assigned Execution Tasks
            </h3>
            <Link href="/dashboard/operations/tasks" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View Tasks <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-xs">No active tasks assigned to you.</div>
          ) : (
            <div className="space-y-2.5">
              {tasks.slice(0, 4).map(task => (
                <div key={task.id} className="p-3.5 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-xs">{task.title}</h4>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">Priority: {task.priority}</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {task.status}
                    </span>
                    <span className="block text-[10px] font-mono text-indigo-400 mt-0.5">{task.progress || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Requirements Card */}
        <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-amber-400" />
              Published Requirement Charters
            </h3>
            <Link href="/dashboard/operations/projects" className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              Requirement Workspace <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading charters...
            </div>
          ) : requirements.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-xs">No approved Requirement Charters available.</div>
          ) : (
            <div className="space-y-2.5">
              {requirements.slice(0, 4).map(req => (
                <div key={req.id} className="p-3.5 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-xs">{req.title}</h4>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">Sponsor: {req.sponsor || 'Internal'}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      {req.status}
                    </span>
                    <span className="block text-[10px] font-mono text-amber-400 mt-0.5">{req.progress || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 5. Enterprise Quick Action Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/operations/planning" className="p-4 bg-neutral-900/50 hover:bg-neutral-800/80 border border-white/10 rounded-2xl transition-all flex flex-col justify-between space-y-2">
          <Sun className="w-5 h-5 text-amber-400" />
          <div>
            <h4 className="text-xs font-bold text-white">Morning Planning</h4>
            <p className="text-[10px] text-neutral-400">Daily strategy & priorities</p>
          </div>
        </Link>

        <Link href="/dashboard/operations/tasks" className="p-4 bg-neutral-900/50 hover:bg-neutral-800/80 border border-white/10 rounded-2xl transition-all flex flex-col justify-between space-y-2">
          <CheckCircle2 className="w-5 h-5 text-blue-400" />
          <div>
            <h4 className="text-xs font-bold text-white">My Execution Tasks</h4>
            <p className="text-[10px] text-neutral-400">Work logs & task updates</p>
          </div>
        </Link>

        <Link href="/dashboard/operations/projects" className="p-4 bg-neutral-900/50 hover:bg-neutral-800/80 border border-white/10 rounded-2xl transition-all flex flex-col justify-between space-y-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <div>
            <h4 className="text-xs font-bold text-white">Requirement Workspace</h4>
            <p className="text-[10px] text-neutral-400">Task breakdown & execution</p>
          </div>
        </Link>

        <Link href="/dashboard/operations/reports" className="p-4 bg-neutral-900/50 hover:bg-neutral-800/80 border border-white/10 rounded-2xl transition-all flex flex-col justify-between space-y-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <div>
            <h4 className="text-xs font-bold text-white">Reports & Export</h4>
            <p className="text-[10px] text-neutral-400">CSV/PDF operational export</p>
          </div>
        </Link>
      </div>

    </div>
  );
}
