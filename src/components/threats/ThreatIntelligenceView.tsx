import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { ThreatIndicator } from '../../types.js';
import { Radio, Plus, RefreshCw, X } from 'lucide-react';

export const ThreatIntelligenceView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [type, setType] = useState<'IP' | 'DOMAIN' | 'URL' | 'FILE_HASH_SHA256' | 'CERT_SHA1'>('IP');
  const [value, setValue] = useState('');
  const [threatType, setThreatType] = useState('Malicious Infrastructure');
  const [confidence, setConfidence] = useState('90');
  const [mitreTechnique, setMitreTechnique] = useState('T1071.001 - Web Protocols');
  const [submitting, setSubmitting] = useState(false);

  const loadIndicators = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ indicators: ThreatIndicator[] }>('/threat-intelligence');
      setIndicators(res.indicators || []);
    } catch (err: any) {
      showToast('Failed to load threat indicators: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndicators();
  }, [activeOrg, refreshKey]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      showToast('Indicator value is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await ApiClient.request('/threat-intelligence', {
        method: 'POST',
        body: JSON.stringify({
          type,
          value: value.trim(),
          threatType,
          confidence: Number(confidence),
          source: 'Analyst SOC Ingest',
          mitreTechnique,
        }),
      });

      showToast(`Indicator '${value}' successfully added to intelligence feed`, 'success');
      setShowAddModal(false);
      setValue('');
      loadIndicators();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Threat Intelligence Feeds</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Verified Indicators of Compromise (IOCs)</span>
            <span aria-hidden="true">·</span>
            <span>{indicators.length} active indicators</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Indicator</span>
          </button>
          <button
            onClick={loadIndicators}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {indicators.map(ioc => (
          <div key={ioc.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                  {ioc.type}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-100">{ioc.value}</span>
              </div>
              <span className="font-mono text-xs text-amber-400">
                Confidence: {ioc.confidence}%
              </span>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Threat Classification: {ioc.threatType}
            </p>

            <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-3 text-xs text-slate-400 font-mono">
              <span className="text-emerald-400">MITRE: {ioc.mitreTechnique}</span>
              <span aria-hidden="true">·</span>
              <span>Source: {ioc.source}</span>
              <span aria-hidden="true">·</span>
              <span>Expires: {new Date(ioc.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 font-mono">Add Threat Indicator</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Indicator Type:</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none"
                >
                  <option value="IP">IP Address</option>
                  <option value="DOMAIN">Domain Name</option>
                  <option value="URL">Full URL</option>
                  <option value="FILE_HASH_SHA256">SHA-256 Hash</option>
                  <option value="CERT_SHA1">Certificate Fingerprint</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Indicator Value:</label>
                <input
                  type="text"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="e.g. 198.51.100.88 or bad-domain.net"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Threat Type:</label>
                <input
                  type="text"
                  value={threatType}
                  onChange={e => setThreatType(e.target.value)}
                  placeholder="e.g. C2 Beaconing Node"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">MITRE ATT&amp;CK Technique:</label>
                <input
                  type="text"
                  value={mitreTechnique}
                  onChange={e => setMitreTechnique(e.target.value)}
                  placeholder="e.g. T1071.004 - DNS"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-emerald-400 text-emerald-950 font-bold rounded"
                >
                  {submitting ? 'Adding...' : 'Add Indicator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
