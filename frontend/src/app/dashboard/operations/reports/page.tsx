"use client";

import { FileText, Loader2 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <FileText className="w-6 h-6 text-indigo-500" />
        <h2 className="text-2xl font-bold">Reports</h2>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
        <FileText className="w-16 h-16 text-indigo-500/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Reports Generating</h3>
        <p className="text-neutral-400">The reporting engine is aggregating data from projects, tasks, and daily closings.</p>
      </div>
    </div>
  );
}
