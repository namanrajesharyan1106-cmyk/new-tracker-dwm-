"use client";

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const stats = [
  { name: 'Total Tasks', value: '142', icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { name: 'In Progress', value: '38', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { name: 'Delayed', value: '12', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  { name: 'Completion Rate', value: '84%', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Good Morning, Naman! 👋</h2>
          <p className="text-neutral-400 mt-1">Here is what's happening with your projects today.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
          + Add Personal Task
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group"
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-neutral-400 mt-1">{stat.name}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Tasks & Morning Plan */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Morning Plan */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="xl:col-span-1 bg-white/5 border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Morning Plan</h3>
            <span className="text-xs font-medium px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full">Today</span>
          </div>
          
          <div className="flex-1">
            <textarea 
              className="w-full h-full min-h-[150px] p-4 bg-neutral-900/50 border border-neutral-700 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder:text-neutral-500"
              placeholder="What are you working on today? (e.g. Complete DRS Ticket, Update Dashboard...)"
            />
          </div>
          <button className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors">
            Submit Plan
          </button>
        </motion.div>

        {/* Assigned Tasks */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Priority Tasks</h3>
            <button className="text-sm text-blue-400 hover:text-blue-300">View All</button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((task) => (
              <div key={task} className="group p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800 transition-colors cursor-pointer flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-5 h-5 rounded-full border-2 border-neutral-600 group-hover:border-blue-400 transition-colors" />
                  <div>
                    <h4 className="font-medium">Update Plant 6 Database Schema</h4>
                    <p className="text-sm text-neutral-400 mt-1 flex items-center gap-2">
                      <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-xs">DRS-102</span>
                      • High Priority
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Due Today</p>
                  <p className="text-xs text-neutral-500 mt-1">Extrusion Team</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
