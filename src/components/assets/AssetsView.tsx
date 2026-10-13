import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { Asset } from '../../types.js';
import { Server, Plus, RefreshCw, X } from 'lucide-react';

export const AssetsView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [os, setOs] = useState('Debian GNU/Linux 12');
  const [criticality, setCriticality] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [environment, setEnvironment] = useState<'Production' | 'DMZ' | 'Internal' | 'Cloud'>('DMZ');
  const [submitting, setSubmitting] = useState(false);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ assets: Asset[] }>('/assets');
      setAssets(res.assets || []);
    } catch (err: any) {
      showToast('Failed to load assets: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [activeOrg, refreshKey]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname.trim() || !ipAddress.trim()) {
      showToast('Hostname and IP address are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await ApiClient.request('/assets', {
        method: 'POST',
        body: JSON.stringify({
          hostname: hostname.trim(),
          ipAddress: ipAddress.trim(),
          os,
          criticality,
          environment,
          tags: ['registered-host'],
          observedServices: ['443/https', '22/ssh'],
        }),
      });

      showToast(`Asset '${hostname}' successfully enrolled in inventory`, 'success');
      setShowAddModal(false);
      setHostname('');
      setIpAddress('');
      loadAssets();
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
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Monitored Asset Inventory</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Enclave discovery &amp; verified observation records</span>
            <span aria-hidden="true">·</span>
            <span>{assets.length} hosts</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Asset</span>
          </button>
          <button
            onClick={loadAssets}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assets.map(asset => (
          <div key={asset.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{asset.hostname}</h3>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">{asset.ipAddress}</div>
              </div>
              <span
                className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  asset.criticality === 'CRITICAL'
                    ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                }`}
              >
                {asset.criticality}
              </span>
            </div>

            <div className="text-xs text-slate-400 font-mono space-y-1">
              <div>OS: {asset.os}</div>
              <div>Environment: {asset.environment} · Status: {asset.status}</div>
            </div>

            {/* Observed Services */}
            <div className="pt-2 border-t border-slate-800/60">
              <div className="text-[11px] font-mono text-slate-400 mb-1">Observed Open Services:</div>
              <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                {asset.observedServices.map((svc, idx) => (
                  <span key={idx} className="p-1 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    {svc}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 font-mono">
              Last Telemetry: {new Date(asset.lastObservedAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 font-mono">Register New Network Asset</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Hostname / FQDN:</label>
                <input
                  type="text"
                  value={hostname}
                  onChange={e => setHostname(e.target.value)}
                  placeholder="e.g. bastion-prod-02.internal"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">IP Address:</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={e => setIpAddress(e.target.value)}
                  placeholder="e.g. 10.0.4.55"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Criticality:</label>
                  <select
                    value={criticality}
                    onChange={e => setCriticality(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Environment:</label>
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none"
                  >
                    <option value="DMZ">DMZ</option>
                    <option value="Production">Production</option>
                    <option value="Internal">Internal</option>
                    <option value="Cloud">Cloud</option>
                  </select>
                </div>
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
                  {submitting ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
