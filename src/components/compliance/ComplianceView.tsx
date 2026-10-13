import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { ComplianceFramework } from '../../types.js';
import { FileCheck2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export const ComplianceView: React.FC = () => {
  const { showToast } = useApp();
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompliance = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ compliance: ComplianceFramework[] }>('/compliance');
      setFrameworks(res.compliance || []);
    } catch (err: any) {
      showToast('Failed to load compliance frameworks: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Compliance Posture &amp; Audit Readiness</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>SOC 2 Type II, ISO/IEC 27001 &amp; PCI-DSS 4.0</span>
            <span aria-hidden="true">·</span>
            <span>Continuous security control mapping</span>
          </div>
        </div>

        <button
          onClick={loadCompliance}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {frameworks.map(fw => {
          const percentage = Math.round((fw.compliantControls / fw.totalControls) * 100);

          return (
            <div key={fw.id} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{fw.name}</h3>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{fw.version}</div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Control Adherence</span>
                  <span className="text-emerald-400 font-bold">{percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Compliant Controls:</span>
                  <span className="text-emerald-400 font-bold">{fw.compliantControls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">In Progress:</span>
                  <span className="text-amber-400">{fw.inProgressControls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Identified Gaps:</span>
                  <span className="text-rose-400">{fw.gapControls}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Certification: {fw.certificationStatus}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
