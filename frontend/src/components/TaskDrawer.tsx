"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, MessageSquare, Paperclip, CheckSquare, 
  AlertTriangle, User, Calendar, Plus, Send, CornerDownRight, Loader2 
} from 'lucide-react';
import api from '@/lib/axios';

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export default function TaskDrawer({ taskId, onClose, onTaskUpdated }: TaskDrawerProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments' | 'history'>('details');

  // Comment State
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Subtask State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails(taskId);
    } else {
      setTask(null);
    }
  }, [taskId]);

  const fetchTaskDetails = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks/${id}/details`);
      setTask(res.data.data);
    } catch (err) {
      console.error('Failed to load task details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !taskId) return;

    try {
      setSubmittingComment(true);
      const res = await api.post(`/tasks/${taskId}/comments`, { comment: commentText });
      setTask((prev: any) => ({
        ...prev,
        comments: [res.data.data, ...(prev.comments || [])]
      }));
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !taskId || !task) return;

    try {
      setCreatingSubtask(true);
      const res = await api.post('/tasks', {
        title: newSubtaskTitle,
        parentTaskId: taskId,
        projectId: task.projectId,
        sectionId: task.sectionId,
        teamId: task.teamId,
        type: 'SUBTASK'
      });
      setTask((prev: any) => ({
        ...prev,
        subtasks: [...(prev.subtasks || []), res.data.data]
      }));
      setNewSubtaskTitle('');
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingSubtask(false);
    }
  };

  if (!taskId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-neutral-900 border-l border-white/10 h-full flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {task?.type || 'TASK'}
              </span>
              {task?.status && (
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                  task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  task.status === 'DELAYED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  task.status === 'BLOCKED' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {task.status}
                </span>
              )}
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading details...
            </div>
          ) : !task ? (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              Task not found.
            </div>
          ) : (
            <>
              {/* Title & Meta Info */}
              <div className="p-6 border-b border-white/10 space-y-3">
                <h3 className="text-xl font-bold text-white">{task.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {task.description || 'No description provided.'}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-neutral-400 pt-2">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Assigned to: <strong className="text-neutral-200">{task.assignedTo?.name || 'Unassigned'}</strong></span>
                  </div>
                  {task.targetDate && (
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Target: <strong className="text-neutral-200">{new Date(task.targetDate).toLocaleDateString()}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/10 px-6 bg-white/5">
                {[
                  { id: 'details', label: 'Details', icon: CheckSquare },
                  { id: 'subtasks', label: `Subtasks (${task.subtasks?.length || 0})`, icon: CornerDownRight },
                  { id: 'comments', label: `Comments (${task.comments?.length || 0})`, icon: MessageSquare },
                  { id: 'history', label: 'Delays & Blockers', icon: AlertTriangle }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id 
                        ? 'border-indigo-500 text-indigo-400' 
                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* DETAILS TAB */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div className="bg-neutral-950/60 p-4 rounded-xl border border-white/10 space-y-3">
                      <div className="flex justify-between text-xs text-neutral-400">
                        <span>Overall Progress</span>
                        <span className="font-semibold text-indigo-400">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full transition-all duration-500" 
                          style={{ width: `${task.progress}%` }} 
                        />
                      </div>
                    </div>

                    {task.project && (
                      <div className="bg-neutral-950/60 p-4 rounded-xl border border-white/10">
                        <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">Associated Project</span>
                        <div className="text-sm font-medium text-amber-400">{task.project.name}</div>
                        {task.project.drsRequestId && <div className="text-xs text-neutral-500 mt-1">DRS Request #{task.project.drsRequestId}</div>}
                      </div>
                    )}

                    {task.attachmentUrl && (
                      <div className="space-y-2">
                        <span className="text-xs text-neutral-400 uppercase tracking-wider block">Attachments</span>
                        <div className="flex items-center space-x-2 p-3 bg-neutral-950 rounded-xl border border-white/10 text-sm text-blue-400">
                          <Paperclip className="w-4 h-4" />
                          <a href={task.attachmentUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">
                            {task.attachmentUrl}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUBTASKS TAB */}
                {activeTab === 'subtasks' && (
                  <div className="space-y-6">
                    <form onSubmit={handleCreateSubtask} className="flex gap-2">
                      <input 
                        type="text" 
                        value={newSubtaskTitle}
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        placeholder="Add a new subtask..."
                        className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button 
                        type="submit"
                        disabled={creatingSubtask}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1"
                      >
                        {creatingSubtask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                      </button>
                    </form>

                    <div className="space-y-2">
                      {(!task.subtasks || task.subtasks.length === 0) ? (
                        <p className="text-sm text-neutral-500 text-center py-4">No subtasks created yet.</p>
                      ) : (
                        task.subtasks.map((st: any) => (
                          <div key={st.id} className="p-3 bg-neutral-950 rounded-xl border border-white/10 flex items-center justify-between text-sm">
                            <span className="text-neutral-200">{st.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${st.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                              {st.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* COMMENTS TAB */}
                {activeTab === 'comments' && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddComment} className="space-y-3">
                      <textarea 
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none h-20"
                      />
                      <button 
                        type="submit"
                        disabled={submittingComment}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 ml-auto"
                      >
                        {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Post Comment
                      </button>
                    </form>

                    <div className="space-y-4">
                      {(!task.comments || task.comments.length === 0) ? (
                        <p className="text-sm text-neutral-500 text-center py-4">No comments yet.</p>
                      ) : (
                        task.comments.map((c: any) => (
                          <div key={c.id} className="p-4 bg-neutral-950 rounded-xl border border-white/10 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-indigo-400">{c.author?.name || 'User'}</span>
                              <span className="text-neutral-500">{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-neutral-300 leading-normal">{c.comment}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    <h4 className="text-sm font-semibold text-neutral-300">Delay & Blocker History Logs</h4>
                    
                    {(!task.delayHistory?.length && !task.blockHistory?.length) ? (
                      <p className="text-sm text-neutral-500 text-center py-4">No delay or blocker logs recorded for this task.</p>
                    ) : (
                      <div className="space-y-3">
                        {task.delayHistory?.map((dh: any) => (
                          <div key={dh.id} className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                            <div className="flex justify-between text-xs text-amber-400 font-semibold">
                              <span>Delay Reason: {dh.reason}</span>
                              <span>{new Date(dh.createdAt).toLocaleDateString()}</span>
                            </div>
                            {dh.comments && <p className="text-xs text-neutral-300">Remarks: {dh.comments}</p>}
                            <p className="text-xs text-neutral-400">Estimated delay: {dh.estimatedDelayDays} day(s)</p>
                          </div>
                        ))}

                        {task.blockHistory?.map((bh: any) => (
                          <div key={bh.id} className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1">
                            <div className="flex justify-between text-xs text-red-400 font-semibold">
                              <span>Blocker: {bh.reason}</span>
                              <span>{new Date(bh.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
