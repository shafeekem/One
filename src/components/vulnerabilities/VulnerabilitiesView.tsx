import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { Vulnerability, VulnStatus } from '../../types.js';
import { Bug, CheckCircle2, AlertTriangle, RefreshCw, X, ShieldAlert } from 'lucide-react';

export const VulnerabilitiesView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updating, setUpdating] = useState(false);

  const loadVulns = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ vulnerabilities: Vulnerability[] }>('/vulnerabilities');
      setVulns(res.vulnerabilities || []);
      if (selectedVuln) {
        const found = res.vulnerabilities?.find(v => v.id === selectedVuln.id);
        if (found) setSelectedVuln(found);
      }
    } catch (err: any) {
      showToast('Failed to load vulnerabilities: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVulns();
  }, [activeOrg, refreshKey]);

  const handleUpdateStatus = async (vulnId: string, newStatus: VulnStatus) => {
    setUpdating(true);
    try {
      const res = await ApiClient.request<{ vulnerability: Vulnerability }>(`/vulnerabilities/${vulnId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Vulnerability status updated to ${newStatus}`, 'success');
      setVulns(prev => prev.map(v => (v.id === vulnId ? res.vulnerability : v)));
      if (selectedVuln?.id === vulnId) setSelectedVuln(res.vulnerability);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const filteredVulns = statusFilter === 'ALL' ? vulns : vulns.filter(v => v.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Vulnerability Management</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>CVE identification &amp; CVSS severity matrix</span>
            <span aria-hidden="true">·</span>
            <span>{vulns.length} records</span>
          </div>
        </div>

        <button
          onClick={loadVulns}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-3 ${selectedVuln ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {filteredVulns.map(vuln => (
            <div
              key={vuln.id}
              onClick={() => setSelectedVuln(vuln)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedVuln?.id === vuln.id
                  ? 'bg-slate-800/80 border-rose-500/50 shadow-md'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-400">{vuln.cveId}</span>
                    <span className="font-mono text-[10px] text-slate-400">CVSS {vuln.cvssScore}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 mt-1">{vuln.title}</h3>
                </div>
                <span
                  className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    vuln.status === 'IN_REMEDIATION'
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                      : vuln.status === 'MITIGATED'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                  }`}
                >
                  {vuln.status}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {vuln.description}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-3 text-xs text-slate-400 font-mono">
                <span>Discovered By: {vuln.discoveredBy}</span>
                <span aria-hidden="true">·</span>
                <span>Due: {vuln.dueDate}</span>
                <span aria-hidden="true">·</span>
                <span>Assigned: {vuln.assignedTo || 'Unassigned'}</span>
              </div>
            </div>
          ))}
        </div>

        {selectedVuln && (
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-4 h-fit sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-200">
                  {selectedVuln.cveId} Details
                </h3>
              </div>
              <button onClick={() => setSelectedVuln(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-100">{selectedVuln.title}</div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-mono">
                {selectedVuln.description}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
              <div className="text-slate-400 font-semibold mb-1">Remediation Guidance:</div>
              <p className="text-emerald-300 leading-relaxed">{selectedVuln.remediationGuidance}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Update Remediation Status
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  onClick={() => handleUpdateStatus(selectedVuln.id, 'IN_REMEDIATION')}
                  disabled={updating}
                  className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                >
                  In Remediation
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedVuln.id, 'MITIGATED')}
                  disabled={updating}
                  className="py-1.5 px-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-800"
                >
                  Mark Mitigated
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
