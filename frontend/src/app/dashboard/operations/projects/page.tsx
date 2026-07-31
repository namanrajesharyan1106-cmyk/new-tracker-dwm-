"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Search, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '@/lib/axios';

interface Project {
  id: string;
  name: string;
  drsRequestId: string | null;
  progress: number;
  plannedProgress: number;
  variance: number;
  health: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  riskLevel: string;
  targetDate: string;
  section: { name: string } | null;
}

export default function ProjectProgressPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [search]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects?search=${search}&limit=50`);
      setProjects(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    if (health === 'ON_TRACK') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (health === 'AT_RISK') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            Project Progress
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Monitor the health and variance of all active DRS projects.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-neutral-500 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-40 text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full flex items-center justify-center h-40 text-neutral-500 bg-white/5 rounded-2xl border border-white/10">
            No projects found.
          </div>
        ) : (
          projects.map((project, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={project.id}
              className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden p-6 hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-white mb-1">{project.name}</h3>
                  <p className="text-xs text-neutral-400 flex items-center gap-2">
                    {project.drsRequestId && <span className="bg-white/10 px-2 py-0.5 rounded">DRS: {project.drsRequestId}</span>}
                    {project.section?.name && <span>{project.section.name}</span>}
                  </p>
                </div>
                <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded border ${getHealthColor(project.health)}`}>
                  {project.health.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-4 mb-4">
                {/* Actual Progress */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Actual Progress</span>
                    <span className="font-bold text-white">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${project.progress >= project.plannedProgress ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Planned Progress */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Planned Progress</span>
                    <span>{project.plannedProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neutral-500 rounded-full transition-all duration-1000"
                      style={{ width: `${project.plannedProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-400">Variance</div>
                  <div className="flex items-center gap-1 font-medium text-sm">
                    {getVarianceIcon(project.variance)}
                    <span className={project.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {Math.abs(project.variance)}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-neutral-400">
                  Target: <span className="text-white">{project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
