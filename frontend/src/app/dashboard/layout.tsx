"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';
import {
  LayoutDashboard,
  CheckSquare,
  Layers,
  Users,
  UserCog,
  Calendar,
  Activity,
  Menu,
  X,
  Bell,
  LogOut,
  FileText,
  PieChart,
  ShieldAlert,
  Settings,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DEPARTMENT_ADMIN';

  const navigationGroups = [
    {
      group: 'Operations',
      adminOnly: false,
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
        { name: 'Morning Planning', href: '/dashboard/operations/planning', icon: Calendar, adminOnly: false },
        { name: 'Evening Closing', href: '/dashboard/operations/closing', icon: Clock, adminOnly: false },
        { name: 'My Tasks', href: '/dashboard/operations/tasks', icon: CheckSquare, adminOnly: false },
        { name: 'Team Tasks', href: '/dashboard/operations/tasks/team', icon: Users, adminOnly: false },
        { name: 'Requirement Workspace', href: '/dashboard/operations/projects', icon: Activity, adminOnly: false },
        { name: 'Attendance', href: '/dashboard/operations/attendance', icon: UserCog, adminOnly: false },
        { name: 'Reports', href: '/dashboard/operations/reports', icon: FileText, adminOnly: false },
        { name: 'Analytics', href: '/dashboard/operations/analytics', icon: PieChart, adminOnly: false },
        { name: 'Performance', href: '/dashboard/operations/performance', icon: TrendingUp, adminOnly: false },
        { name: 'Audit Logs', href: '/dashboard/operations/audit-logs', icon: ShieldAlert, adminOnly: false },
      ]
    },
    {
      group: 'Administration',
      adminOnly: true,
      items: [
        { name: 'Master Data', href: '/dashboard/administration/master-data', icon: Layers, adminOnly: true },
        { name: 'Sections', href: '/dashboard/administration/sections', icon: LayoutDashboard, adminOnly: true },
        { name: 'Teams', href: '/dashboard/administration/teams', icon: Users, adminOnly: true },
        { name: 'Roles', href: '/dashboard/administration/roles', icon: UserCog, adminOnly: true },
        { name: 'User Mapping', href: '/dashboard/administration/user-mapping', icon: Users, adminOnly: true },
        { name: 'DRS Mapping', href: '/dashboard/administration/drs-mapping', icon: Layers, adminOnly: true },
        { name: 'Settings', href: '/dashboard/administration/settings', icon: Settings, adminOnly: true },
      ]
    }
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-neutral-950 text-white flex overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900/50 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <Link href="/dashboard" className="flex items-center focus:outline-none">
                <Image
                  src="/ajay-group-logo.png"
                  alt="AJAY Group"
                  width={200}
                  height={60}
                  className="w-full h-auto object-contain max-w-[200px]"
                  priority
                />
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
              {navigationGroups.map((group) => {
                if (group.adminOnly && !isAdmin) return null;
                return (
                  <div key={group.group} className="mb-6">
                    <h3 className="px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                      {group.group}
                    </h3>
                    <div className="space-y-1">
                      {group.items.filter(item => !item.adminOnly || isAdmin).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${isActive
                                ? 'bg-blue-600/10 text-blue-400'
                                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                              }`}
                          >
                            <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-400' : 'text-neutral-500'}`} />
                            {item.name}
                            {isActive && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute left-0 w-1 h-8 bg-blue-500 rounded-r-full"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  NA
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">Naman Aryan</p>
                  <p className="text-xs text-neutral-500 truncate">Admin</p>
                </div>
                <button className="text-neutral-400 hover:text-red-400 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none" />

          <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50 backdrop-blur-xl z-10">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-4 text-neutral-400 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold capitalize">
                {pathname.split('/').pop() || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 z-10">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
