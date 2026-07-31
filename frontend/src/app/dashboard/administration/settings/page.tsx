"use client";
import { Settings, Loader2 } from 'lucide-react';
export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-neutral-400" />
        <h2 className="text-2xl font-bold">System Settings</h2>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
        <Settings className="w-16 h-16 text-neutral-400/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Global Settings</h3>
        <p className="text-neutral-400">Configure global application properties and workflow rules here.</p>
      </div>
    </div>
  );
}
