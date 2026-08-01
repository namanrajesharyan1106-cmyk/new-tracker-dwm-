"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, CheckSquare, Settings2, Clock, CheckCircle2, Copy, Users, Paperclip, AlertCircle, Link } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  progress: number;
  targetDate: string;
  estimatedHours: number;
  section: { id: string; name: string };
  team: { id: string; name: string };
  assignedTo: { id: string; name: string; email: string };
  createdBy: { id: string; name: string };
  dependencies: { id: string; title: string }[];
  attachmentUrl: string;
}

import TaskDrawer from '@/components/TaskDrawer';

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DEPARTMENT_ADMIN';
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'my_tasks', 'created_by_me'
  
  // Drawer State
  const [selectedDrawerTaskId, setSelectedDrawerTaskId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Master Data for Selects
  const [usersList, setUsersList] = useState<{id: string, name: string}[]>([]);
  const [sectionsList, setSectionsList] = useState<{id: string, name: string}[]>([]);
  const [teamsList, setTeamsList] = useState<{id: string, name: string}[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({ 
    title: '', description: '', priority: 'MEDIUM', sectionId: '', teamId: '', assignedToId: '', targetDate: '', estimatedHours: 0, dependencyIds: [] 
  });
  
  // Bulk Selection
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkAssignTo, setBulkAssignTo] = useState('');

  const [error, setError] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks?page=${page}&limit=10&search=${search}&filter=${filter}`);
      setTasks(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    if (!isAdmin) return;
    try {
      const [uRes, sRes, tRes] = await Promise.all([
        api.get('/master-data/users?limit=100'),
        api.get('/master-data/sections?limit=100'),
        api.get('/master-data/teams?limit=100')
      ]);
      setUsersList(uRes.data.data);
      setSectionsList(sRes.data.data);
      setTeamsList(tRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [isAdmin]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData };
      if (!payload.sectionId) delete payload.sectionId;
      if (!payload.teamId) delete payload.teamId;
      if (!payload.assignedToId) delete payload.assignedToId;
      if (!payload.targetDate) delete payload.targetDate;
      if (!payload.estimatedHours) delete payload.estimatedHours;
      else payload.estimatedHours = parseFloat(payload.estimatedHours);

      if (editingId) {
        await api.put(`/tasks/${editingId}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClone = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/clone`);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      await api.put(`/tasks/${id}/progress`, { progress });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tasks/bulk-assign', { taskIds: selectedTasks, assignedToId: bulkAssignTo });
      setIsBulkAssignModalOpen(false);
      setSelectedTasks([]);
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error assigning tasks');
    }
  };

  const openModal = (task?: Task) => {
    if (task) {
      setEditingId(task.id);
      setFormData({ 
        title: task.title, 
        description: task.description || '', 
        priority: task.priority,
        sectionId: task.section?.id || '',
        teamId: task.team?.id || '',
        assignedToId: task.assignedTo?.id || '',
        targetDate: task.targetDate ? new Date(task.targetDate).toISOString().split('T')[0] : '',
        estimatedHours: task.estimatedHours || 0,
        dependencyIds: task.dependencies.map(d => d.id)
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', description: '', priority: 'MEDIUM', sectionId: '', teamId: '', assignedToId: '', targetDate: '', estimatedHours: 0, dependencyIds: [] });
    }
    setError('');
    setIsModalOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (priority === 'MEDIUM') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  };

  const getStatusColor = (status: string) => {
    if (status === 'COMPLETED') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (status === 'IN_PROGRESS') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    if (status === 'DELAYED' || status === 'OVERDUE') return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (status === 'BLOCKED') return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <TaskDrawer 
        taskId={selectedDrawerTaskId} 
        onClose={() => setSelectedDrawerTaskId(null)} 
        onTaskUpdated={fetchTasks}
      />
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-500" />
            Task Management
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Create, assign, and track progress across the organization.</p>
        </div>
        
        <div className="flex flex-wrap w-full sm:w-auto items-center gap-3">
          {isAdmin && (
            <select 
              value={filter} 
              onChange={e => { setFilter(e.target.value); setPage(1); }}
              className="bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white cursor-pointer"
            >
              <option value="all">All Tasks</option>
              <option value="my_tasks">Assigned To Me</option>
              <option value="created_by_me">Created By Me</option>
            </select>
          )}

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-neutral-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-neutral-500 transition-all"
            />
          </div>

          {selectedTasks.length > 0 && isAdmin && (
            <button 
              onClick={() => setIsBulkAssignModalOpen(true)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Users className="w-4 h-4" />
              Bulk Assign ({selectedTasks.length})
            </button>
          )}

          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-white/5 text-neutral-400 font-medium border-b border-white/10">
              <tr>
                {isAdmin && <th className="px-4 py-4 w-10"></th>}
                <th className="px-6 py-4">Task Details</th>
                <th className="px-6 py-4">Status & Priority</th>
                <th className="px-6 py-4">Assignment</th>
                <th className="px-6 py-4 text-center">Progress</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading tasks...
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No tasks found.</td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    key={task.id} 
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    {isAdmin && (
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTasks([...selectedTasks, task.id]);
                            else setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                          }}
                          className="w-4 h-4 text-blue-500 rounded border-neutral-700 bg-neutral-900"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4" onClick={() => setSelectedDrawerTaskId(task.id)}>
                      <div className="font-medium text-white mb-1 hover:text-blue-400 transition-colors">{task.title}</div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        {task.targetDate && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(task.targetDate).toLocaleDateString()}</span>
                        )}
                        {task.dependencies.length > 0 && (
                          <span className="flex items-center gap-1 text-orange-400"><Link className="w-3 h-3" /> {task.dependencies.length} Dep(s)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={() => setSelectedDrawerTaskId(task.id)}>
                      <div className="flex flex-col gap-2 items-start">
                        <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded border ${getPriorityColor(task.priority)}`}>
                          {task.priority} PRIORITY
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs" onClick={() => setSelectedDrawerTaskId(task.id)}>
                      {task.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                            {task.assignedTo.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-neutral-300">{task.assignedTo.name}</div>
                            <div className="text-neutral-500">{task.team?.name || task.section?.name || 'No Team'}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={() => setSelectedDrawerTaskId(task.id)}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-white">{task.progress}%</span>
                        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.progress < 100 && (
                          <button onClick={() => handleUpdateProgress(task.id, 100)} title="Mark Complete" className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => handleClone(task.id)} title="Clone Task" className="p-2 text-neutral-400 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => openModal(task)} title="Edit Task" className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(task.id)} title="Delete Task" className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-neutral-400">Showing page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded-lg border border-white/10 text-neutral-400 hover:bg-white/5 disabled:opacity-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded-lg border border-white/10 text-neutral-400 hover:bg-white/5 disabled:opacity-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Modal (Create/Edit) */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">{editingId ? 'Edit Task' : 'Create Task'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Task Title *</label>
                    <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Description</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Due Date</label>
                    <input type="date" value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
                  </div>

                  {isAdmin && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Section</label>
                        <select value={formData.sectionId} onChange={e => setFormData({...formData, sectionId: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                          <option value="">None</option>
                          {sectionsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Team</label>
                        <select value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                          <option value="">None</option>
                          {teamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Assign To</label>
                        <select value={formData.assignedToId} onChange={e => setFormData({...formData, assignedToId: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none">
                          <option value="">Unassigned</option>
                          {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Estimated Hours</label>
                        <input type="number" min="0" step="0.5" value={formData.estimatedHours} onChange={e => setFormData({...formData, estimatedHours: e.target.value})} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                    {editingId ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk Assign Modal */}
      <AnimatePresence>
        {isBulkAssignModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsBulkAssignModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6">
              <h3 className="text-xl font-semibold mb-2">Bulk Assign Tasks</h3>
              <p className="text-sm text-neutral-400 mb-6">Assign {selectedTasks.length} tasks to a user.</p>
              
              <form onSubmit={handleBulkAssign} className="space-y-4">
                {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Select User *</label>
                  <select required value={bulkAssignTo} onChange={e => setBulkAssignTo(e.target.value)} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
                    <option value="" disabled>Select User</option>
                    {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsBulkAssignModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-300">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium">Assign Tasks</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
