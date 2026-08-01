"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, BarChart3, TrendingUp, AlertTriangle, ShieldAlert, 
  CheckCircle2, Clock, Award, Users, Folder, RefreshCw, Loader2, ArrowUpRight 
} from 'lucide-react';
import api from '@/lib/axios';

export default function ExecutiveAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<'EXECUTIVE' | 'PROJECTS' | 'LEADERBOARDS'>('EXECUTIVE');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [execData, setExecData] = useState<any>(null);
  const [projectData, setProjectData] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [activeTab]);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      if (activeTab === 'EXECUTIVE') {
        const res = await api.get('/operations/analytics/executive');
        setExecData(res.data.data);
      } else if (activeTab === 'PROJECTS') {
        const res = await api.get('/operations/analytics/projects');
        setProjectData(res.data.data || []);
      } else if (activeTab === 'LEADERBOARDS') {
        const res = await api.get('/operations/analytics/leaderboards');
        setLeaderboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-neutral-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Executive Analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <PieChart className="w-8 h-8 text-pink-500" />
            Executive Reporting & Analytics Dashboard
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            Real-time management dashboard providing end-to-end visibility into projects, teams, and execution health.
          </p>
        </div>

        <button 
          onClick={fetchAnalyticsData}
          className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl border border-white/10 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Analytics
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button 
          onClick={() => setActiveTab('EXECUTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'EXECUTIVE' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          Executive Overview
        </button>
        <button 
          onClick={() => setActiveTab('PROJECTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'PROJECTS' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          Project Forecast & Variance Engine
        </button>
        <button 
          onClick={() => setActiveTab('LEADERBOARDS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'LEADERBOARDS' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white bg-neutral-900/50'}`}
        >
          Employee Leaderboards & Performance
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'EXECUTIVE' && execData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
              <span className="text-xs text-neutral-400 font-medium block">Active / Total Projects</span>
              <span className="text-3xl font-bold text-white mt-1 block">{execData.projects.active} / {execData.projects.total}</span>
              <span className="text-xs text-emerald-400 mt-2 block font-semibold">{execData.projects.completed} Completed</span>
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
              <span className="text-xs text-neutral-400 font-medium block">Planning & Closing Compliance</span>
              <span className="text-3xl font-bold text-blue-400 mt-1 block">{execData.compliance.planningComplianceRatio}% / {execData.compliance.closingComplianceRatio}%</span>
              <span className="text-xs text-neutral-400 mt-2 block">Daily Submissions</span>
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
              <span className="text-xs text-neutral-400 font-medium block">Attendance Rate</span>
              <span className="text-3xl font-bold text-emerald-400 mt-1 block">{execData.compliance.attendanceRatio}%</span>
              <span className="text-xs text-emerald-400 mt-2 block font-semibold">{execData.compliance.activeUsers} Active Employees</span>
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
              <span className="text-xs text-neutral-400 font-medium block">Department Health</span>
              <span className="text-3xl font-bold text-white mt-1 block">{execData.departmentHealth}</span>
              <span className="text-xs text-amber-400 mt-2 block font-semibold">{execData.tasks.delayed} Delayed, {execData.tasks.blocked} Blocked</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECT FORECAST & VARIANCE ENGINE */}
      {activeTab === 'PROJECTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projectData.map(p => (
            <div key={p.id} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg">{p.name}</h3>
                  {p.drsRequestId && <p className="text-xs text-neutral-400">DRS Request: {p.drsRequestId}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${p.health === 'ON_TRACK' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {p.health}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Overall Progress</span>
                  <span className="font-bold">{p.progressPct}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${p.progressPct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-neutral-400 block text-[10px]">Estimated / Actual</span>
                  <span className="font-bold text-white">{p.actualHours}h / {p.estimatedHours}h</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-neutral-400 block text-[10px]">Variance %</span>
                  <span className={`font-bold ${p.variancePct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{p.variancePct}%</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-neutral-400 block text-[10px]">Forecast Finish</span>
                  <span className="font-bold text-indigo-300">{new Date(p.forecastDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: EMPLOYEE LEADERBOARDS */}
      {activeTab === 'LEADERBOARDS' && leaderboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Top 10 Performing Employees
            </h3>
            <div className="space-y-3">
              {leaderboardData.topPerformers.map((item: any, idx: number) => (
                <div key={item.user.id} className="flex justify-between items-center p-3 bg-neutral-950 rounded-xl border border-white/5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-400 w-4">{idx + 1}.</span>
                    <div>
                      <span className="font-bold text-white block">{item.user.name}</span>
                      <span className="text-[10px] text-neutral-400">{item.user.designation || item.user.role} • {item.user.employeeId}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 text-sm block">{item.productivityScore}%</span>
                    <span className="text-[10px] text-neutral-400">{item.completedTasks} Tasks Done</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Highest Carry Forward Counts
            </h3>
            <div className="space-y-3">
              {leaderboardData.highestCarryForward.map((item: any, idx: number) => (
                <div key={item.user.id} className="flex justify-between items-center p-3 bg-neutral-950 rounded-xl border border-white/5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-400 w-4">{idx + 1}.</span>
                    <div>
                      <span className="font-bold text-white block">{item.user.name}</span>
                      <span className="text-[10px] text-neutral-400">{item.user.designation || item.user.role}</span>
                    </div>
                  </div>
                  <span className="font-bold text-amber-400 text-sm">{item.carryForwardCount} Carry Forwards</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
