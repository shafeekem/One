import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { WorkerNode } from '../../types.js';
import { Cpu, RefreshCw, Server, Activity, ShieldCheck } from 'lucide-react';

export const WorkersView: React.FC = () => {
  const { showToast } = useApp();
  const [workers, setWorkers] = useState<WorkerNode[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ workers: WorkerNode[] }>('/workers');
      setWorkers(res.workers || []);
    } catch (err: any) {
      showToast('Failed to load workers: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Worker Infrastructure &amp; Enclaves</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Isolated MicroVM execution nodes</span>
            <span aria-hidden="true">·</span>
            <span>Truthful health reporting</span>
          </div>
        </div>

        <button
          onClick={loadWorkers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map(w => (
          <div key={w.id} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4 font-mono text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">{w.name}</h3>
                <div className="text-[11px] text-cyan-400 mt-0.5">{w.environment}</div>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  w.status === 'HEALTHY'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                    : w.status === 'MAINTENANCE'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                    : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                }`}
              >
                {w.status}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Operating System:</span>
                <span>{w.os}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Architecture:</span>
                <span>{w.architecture}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Compute Resources:</span>
                <span>{w.cpuCores} vCPU · {w.memoryGb} GB RAM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Storage Enclave:</span>
                <span>{w.storageGb} GB NVMe</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="text-slate-400">Network Isolation Policy:</div>
              <div className="p-1.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                {w.networkPolicy}
              </div>
            </div>

            {w.statusDetails && (
              <div className="text-[10px] text-slate-400 italic">
                {w.statusDetails}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span>Installed Tools: {w.installedToolIds.length}</span>
              <span>Active Jobs: {w.activeJobsCount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
