import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { Alert, Severity, AlertStatus } from '../../types.js';
import { ShieldAlert, CheckCircle2, User, RefreshCw, X, ArrowUpRight } from 'lucide-react';

export const AlertsView: React.FC = () => {
  const { activeOrg, refreshKey, showToast, setActiveTab } = useApp();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ alerts: Alert[] }>('/alerts');
      setAlerts(res.alerts || []);
      if (selectedAlert) {
        const updated = res.alerts?.find(a => a.id === selectedAlert.id);
        if (updated) setSelectedAlert(updated);
      }
    } catch (err: any) {
      showToast('Failed to load alerts: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [activeOrg, refreshKey]);

  const handleUpdateStatus = async (alertId: string, newStatus: AlertStatus) => {
    setUpdating(true);
    try {
      const res = await ApiClient.request<{ alert: Alert }>(`/alerts/${alertId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Alert status updated to ${newStatus}`, 'success');
      setAlerts(prev => prev.map(a => (a.id === alertId ? res.alert : a)));
      if (selectedAlert?.id === alertId) setSelectedAlert(res.alert);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">SOC Alerts</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span>Verified telemetry from Wazuh, Suricata & Zeek</span>
            <span aria-hidden="true">·</span>
            <span>{filteredAlerts.length} records matching filters</span>
          </div>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Segmented Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Severity filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                severityFilter === sev
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          {['ALL', 'NEW', 'INVESTIGATING', 'ACKNOWLEDGED', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                statusFilter === st
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table / List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-3 ${selectedAlert ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs font-mono">
              No security alerts match the selected filters.
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedAlert?.id === alert.id
                    ? 'bg-slate-800/80 border-cyan-500/50 shadow-md'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {alert.title}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold shrink-0 ${
                      alert.severity === 'CRITICAL'
                        ? 'text-rose-400'
                        : alert.severity === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                {/* Metadata with zero-pill discipline */}
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
                  <span>Source: {alert.source}</span>
                  <span aria-hidden="true">·</span>
                  <span>Host: {alert.assetHostname || 'Unassigned'}</span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {alert.status}</span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Alert Inspection Drawer */}
        {selectedAlert && (
          <div className="p-4 md:p-5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-4 h-fit sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-200">
                  Alert Inspection
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-100">
                {selectedAlert.title}
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {selectedAlert.description}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Severity:</span>
                <span className="text-slate-200">{selectedAlert.severity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="text-cyan-400">{selectedAlert.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source Collector:</span>
                <span className="text-slate-200">{selectedAlert.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assignee:</span>
                <span className="text-slate-200">{selectedAlert.assignee || 'Unassigned'}</span>
              </div>
            </div>

            {/* Indicators */}
            {selectedAlert.indicators.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Extracted Indicators
                </div>
                <div className="space-y-1 font-mono text-xs">
                  {selectedAlert.indicators.map((ioc, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {ioc}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Triage Actions */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Triage Transition
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'INVESTIGATING')}
                  disabled={updating}
                  className="py-1.5 px-2 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                >
                  Investigate
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'RESOLVED')}
                  disabled={updating}
                  className="py-1.5 px-2 text-xs font-mono bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded border border-emerald-800/60 transition-colors"
                >
                  Resolve Alert
                </button>
              </div>

              <button
                onClick={() => setActiveTab('assistant')}
                className="w-full mt-2 py-1.5 px-3 text-xs font-mono bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 rounded border border-cyan-800/60 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Ask AI Assistant for Playbook</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
