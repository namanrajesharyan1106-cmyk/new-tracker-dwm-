"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Printer, Filter, Calendar, 
  Search, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Clock 
} from 'lucide-react';
import api from '@/lib/axios';

export default function OperationsReportsPage() {
  const [reportType, setReportType] = useState<string>('TASKS');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/operations/analytics/reports?reportType=${reportType}`);
      setReportData(res.data.data || []);
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]).filter(k => typeof reportData[0][k] !== 'object');
    const rows = reportData.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType.toLowerCase()}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredData = reportData.filter(row => {
    if (!search) return true;
    return JSON.stringify(row).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
            <FileText className="w-8 h-8 text-indigo-400" />
            Executive Operational Reporting & Export Engine
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            Generate, filter, and export automated reports across projects, tasks, attendance, delays, and employee productivity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs border border-white/10 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Report Selector Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-neutral-900/50 p-4 rounded-xl border border-white/10">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Report Category:</span>

        <button 
          onClick={() => setReportType('TASKS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportType === 'TASKS' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white bg-neutral-950'}`}
        >
          Daily & Task Execution Report
        </button>

        <button 
          onClick={() => setReportType('PROJECT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportType === 'PROJECT' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white bg-neutral-950'}`}
        >
          Project Performance Report
        </button>

        <button 
          onClick={() => setReportType('EMPLOYEE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportType === 'EMPLOYEE' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white bg-neutral-950'}`}
        >
          Employee Productivity Report
        </button>

        <div className="ml-auto relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search report..."
            className="bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none w-48"
          />
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-20 text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Generating report from live database...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-20 text-center text-neutral-500">No records found for selected report category.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-white/5 uppercase text-[10px] text-neutral-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Title / Entity</th>
                  <th className="p-3.5">Assignee / Lead</th>
                  <th className="p-3.5">Status / State</th>
                  <th className="p-3.5">Progress / Metric</th>
                  <th className="p-3.5">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.map((row: any, idx: number) => (
                  <tr key={row.id || idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 text-neutral-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-white max-w-xs truncate">{row.title || row.name || 'N/A'}</td>
                    <td className="p-3.5 text-neutral-300">{row.assignedTo?.name || row.user?.name || 'Unassigned'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : row.status === 'DELAYED' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {row.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-white">{row.progress ? `${row.progress}%` : row.productivityScore ? `${row.productivityScore}%` : '100%'}</td>
                    <td className="p-3.5 text-neutral-500">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Today'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
