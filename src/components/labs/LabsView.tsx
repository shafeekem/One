import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { SecurityLab } from '../../types.js';
import { FlaskConical, Play, Square, RotateCcw, RefreshCw } from 'lucide-react';

export const LabsView: React.FC = () => {
  const { showToast, setActiveTab } = useApp();
  const [labs, setLabs] = useState<SecurityLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadLabs = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ labs: SecurityLab[] }>('/labs');
      setLabs(res.labs || []);
    } catch (err: any) {
      showToast('Failed to load labs: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabs();
  }, []);

  const handleLabAction = async (labId: string, action: 'start' | 'stop' | 'reset') => {
    setActionInProgress(labId + '-' + action);
    try {
      const res = await ApiClient.request<{ lab: SecurityLab }>(`/labs/${labId}/${action}`, {
        method: 'POST',
      });
      showToast(`Lab '${res.lab.name}' status updated to ${res.lab.status}`, 'success');
      setLabs(prev => prev.map(l => (l.id === labId ? res.lab : l)));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Isolated Security Labs &amp; Training</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Air-gapped disposable environments for hands-on exercises</span>
            <span aria-hidden="true">·</span>
            <span>{labs.length} modules</span>
          </div>
        </div>

        <button
          onClick={loadLabs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {labs.map(lab => {
          const isRunning = lab.status === 'RUNNING';

          return (
            <div key={lab.id} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">{lab.name}</h3>
                    <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                      Profile: {lab.profile}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      isRunning
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {lab.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {lab.description}
                </p>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs space-y-1 text-slate-400">
                  <div>Target: {lab.targetEnvironment}</div>
                  <div>Difficulty: {lab.difficulty} · TTL: {lab.expiresInMinutes}m</div>
                  {lab.activeSessionUser && (
                    <div className="text-emerald-400 font-bold">Active: {lab.activeSessionUser}</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {!isRunning ? (
                  <button
                    onClick={() => handleLabAction(lab.id, 'start')}
                    disabled={actionInProgress === `${lab.id}-start`}
                    className="flex-1 py-1.5 px-3 text-xs font-mono font-bold bg-emerald-400 hover:bg-emerald-300 text-emerald-950 rounded flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Launch Lab</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab('terminal')}
                      className="flex-1 py-1.5 px-3 text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-center transition-colors hover:bg-cyan-900"
                    >
                      Connect Terminal
                    </button>
                    <button
                      onClick={() => handleLabAction(lab.id, 'stop')}
                      disabled={actionInProgress === `${lab.id}-stop`}
                      className="p-1.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded hover:bg-rose-900"
                      title="Stop Lab"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleLabAction(lab.id, 'reset')}
                      disabled={actionInProgress === `${lab.id}-reset`}
                      className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                      title="Reset Lab Environment"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
