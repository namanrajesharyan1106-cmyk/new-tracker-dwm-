"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, Users, Shield, Check, Search, Loader2, FileText, ArrowRight, Building, Plus, AlertCircle 
} from 'lucide-react';
import api from '@/lib/axios';

interface Section {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  employeeId: string;
  role: string;
}

interface ApprovalRoute {
  sectionId: string;
  sectionName: string;
  sponsorId?: string;
  sponsorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  approverId?: string;
  approverName?: string;
  finalAuthorityId?: string;
  finalAuthorityName?: string;
}

export default function DRSApprovalRoutingMappingPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [routes, setRoutes] = useState<ApprovalRoute[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Route Modal
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [sponsorId, setSponsorId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [finalAuthorityId, setFinalAuthorityId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sectionsRes, usersRes] = await Promise.all([
        api.get('/master-data/sections'),
        api.get('/master-data/users')
      ]);

      const secList: Section[] = sectionsRes.data?.data || [];
      const userList: User[] = usersRes.data?.data || [];
      
      setSections(secList);
      setUsers(userList);

      // Generate dynamic routing entries for each database department/section
      const mappedRoutes: ApprovalRoute[] = secList.map(sec => ({
        sectionId: sec.id,
        sectionName: sec.name,
        sponsorName: userList.find(u => u.role === 'SUPER_ADMIN')?.name || 'Super Admin',
        reviewerName: userList.find(u => u.role === 'DEPARTMENT_ADMIN')?.name || 'Dept Manager',
        approverName: userList.find(u => u.role === 'SUPER_ADMIN')?.name || 'Plant Manager',
        finalAuthorityName: 'Executive Plant Authority'
      }));

      setRoutes(mappedRoutes);
    } catch (err) {
      console.error('Failed to load DRS mapping data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditRoute = (r: ApprovalRoute) => {
    const sec = sections.find(s => s.id === r.sectionId);
    if (!sec) return;
    setSelectedSection(sec);
    setSponsorId(r.sponsorId || '');
    setReviewerId(r.reviewerId || '');
    setApproverId(r.approverId || '');
    setFinalAuthorityId(r.finalAuthorityId || '');
    setShowModal(true);
  };

  const handleSaveRoute = async () => {
    if (!selectedSection) return;
    try {
      setSaving(true);
      setSaveSuccess(false);

      // Save routing mapping
      setRoutes(prev => prev.map(r => {
        if (r.sectionId === selectedSection.id) {
          return {
            ...r,
            sponsorId,
            sponsorName: users.find(u => u.id === sponsorId)?.name || r.sponsorName,
            reviewerId,
            reviewerName: users.find(u => u.id === reviewerId)?.name || r.reviewerName,
            approverId,
            approverName: users.find(u => u.id === approverId)?.name || r.approverName,
            finalAuthorityId,
            finalAuthorityName: users.find(u => u.id === finalAuthorityId)?.name || r.finalAuthorityName,
          };
        }
        return r;
      }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save DRS route', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <Layers className="w-8 h-8 text-blue-400" />
            DRS Approval Routing Governance Mapping
          </h2>
          <p className="text-neutral-400 text-xs mt-1">
            Dynamic Approval Routing: Department $\rightarrow$ Sponsor $\rightarrow$ Department Reviewer $\rightarrow$ Management Approver $\rightarrow$ Final Authority.
          </p>
        </div>
      </div>

      {/* Department Routing Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-20 text-neutral-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading DRS Approval Routes...
        </div>
      ) : routes.length === 0 ? (
        <div className="p-20 text-center text-neutral-500">No departments found in Master Data. Create Sections first.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {routes.map(r => (
            <div key={r.sectionId} className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  {r.sectionName}
                </h3>
                <button 
                  onClick={() => handleOpenEditRoute(r)}
                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold"
                >
                  Configure Route
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded-xl border border-white/5">
                  <span className="text-neutral-400 font-semibold">1. Project Sponsor</span>
                  <span className="font-bold text-white">{r.sponsorName || 'Unassigned'}</span>
                </div>

                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded-xl border border-white/5">
                  <span className="text-neutral-400 font-semibold">2. Department Reviewer</span>
                  <span className="font-bold text-amber-400">{r.reviewerName || 'Unassigned'}</span>
                </div>

                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded-xl border border-white/5">
                  <span className="text-neutral-400 font-semibold">3. Management Approver</span>
                  <span className="font-bold text-emerald-400">{r.approverName || 'Unassigned'}</span>
                </div>

                <div className="flex items-center justify-between bg-neutral-950 p-3 rounded-xl border border-white/5">
                  <span className="text-neutral-400 font-semibold">4. Final Authority</span>
                  <span className="font-bold text-purple-400">{r.finalAuthorityName || 'Unassigned'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT APPROVAL ROUTE MODAL */}
      {showModal && selectedSection && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-white">
              Configure Approval Route for <span className="text-blue-400">{selectedSection.name}</span>
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">1. Project Sponsor</label>
              <select 
                value={sponsorId}
                onChange={e => setSponsorId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">-- Select Sponsor --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">2. Department Reviewer</label>
              <select 
                value={reviewerId}
                onChange={e => setReviewerId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">-- Select Reviewer --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">3. Management Approver</label>
              <select 
                value={approverId}
                onChange={e => setApproverId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">-- Select Approver --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 uppercase block mb-1">4. Final Authority</label>
              <select 
                value={finalAuthorityId}
                onChange={e => setFinalAuthorityId(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">-- Select Final Authority --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-neutral-400 hover:text-white">Cancel</button>
              <button onClick={handleSaveRoute} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Route Config
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
