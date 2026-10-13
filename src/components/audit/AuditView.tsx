import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { AuditEvent } from '../../types.js';
import { History, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react';

export const AuditView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [audits, setAudits] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResult, setFilterResult] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const loadAudits = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ auditEvents: AuditEvent[] }>('/audit');
      setAudits(res.auditEvents || []);
    } catch (err: any) {
      showToast('Failed to load audit events: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, [activeOrg, refreshKey]);

  const filteredAudits = audits.filter(a => {
    if (filterResult !== 'ALL' && a.result !== filterResult) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        a.action.toLowerCase().includes(q) ||
        a.actor.toLowerCase().includes(q) ||
        a.resource.toLowerCase().includes(q) ||
        a.correlationId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Security Audit Trail</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Immutable security event ledger</span>
            <span aria-hidden="true">·</span>
            <span>{audits.length} recorded events</span>
          </div>
        </div>

        <button
          onClick={loadAudits}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          {['ALL', 'ALLOWED', 'DENIED', 'ERROR'].map(res => (
            <button
              key={res}
              onClick={() => setFilterResult(res)}
              className={`px-3 py-1 rounded transition-colors ${
                filterResult === res
                  ? 'bg-slate-800 text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {res}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg max-w-sm flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, actor, correlation..."
            className="flex-1 bg-transparent text-xs text-slate-100 font-mono focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2.5 font-mono text-xs">
        {filteredAudits.map(event => (
          <div
            key={event.id}
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              event.result === 'DENIED'
                ? 'bg-rose-950/20 border-rose-900/40 text-slate-200'
                : 'bg-slate-900/70 border-slate-800/80 text-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-slate-100">
                {event.result === 'ALLOWED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>{event.action}</span>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  event.result === 'ALLOWED'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                    : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                }`}
              >
                {event.result}
              </span>
            </div>

            <div className="text-[11px] text-slate-300">
              Resource: <span className="text-cyan-400">{event.resource}</span>
            </div>

            {event.reason && (
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                Reason: {event.reason}
              </p>
            )}

            <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-3 text-[10px] text-slate-400">
              <span>Actor: {event.actor}</span>
              <span aria-hidden="true">·</span>
              <span>Correlation: {event.correlationId}</span>
              <span aria-hidden="true">·</span>
              <span>Client IP: {event.ipAddress}</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(event.timestamp).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
