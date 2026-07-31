"use client";

import { useState } from 'react';
import { UserCog, CalendarDays, Loader2 } from 'lucide-react';

export default function AttendancePage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6 text-purple-500" />
            Attendance Management
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Track daily team attendance, leaves, and work from home status.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px] bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
        <CalendarDays className="w-16 h-16 text-purple-500/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Attendance Module Initializing</h3>
        <p className="text-neutral-400 max-w-md mx-auto">
          The attendance module is being connected to the DRS HR system. You will soon be able to mark daily attendance and request leaves directly from this dashboard.
        </p>
      </div>
    </div>
  );
}
