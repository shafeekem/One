import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { ToolCatalogEntry, ToolAvailability } from '../../types.js';
import { Wrench, CheckCircle2, Download, AlertTriangle, ExternalLink, RefreshCw, Search } from 'lucide-react';

export const ToolsCatalogView: React.FC = () => {
  const { showToast } = useApp();
  const [tools, setTools] = useState<ToolCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const loadTools = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ tools: ToolCatalogEntry[] }>('/tools');
      setTools(res.tools || []);
    } catch (err: any) {
      showToast('Failed to load tool catalog: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(tools.map(t => t.category)))];

  const handleInstall = async (toolId: string) => {
    setInstallingId(toolId);
    try {
      const res = await ApiClient.request<{ tool: ToolCatalogEntry }>(`/tools/${toolId}/install`, {
        method: 'POST',
      });
      showToast(`Tool '${res.tool.name}' verified and installed on worker enclave!`, 'success');
      setTools(prev => prev.map(t => (t.id === toolId ? res.tool : t)));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setInstallingId(null);
    }
  };

  const filteredTools = tools.filter(tool => {
    if (selectedCategory !== 'ALL' && tool.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Cybersecurity Tool Registry</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>18 specialized domains</span>
            <span aria-hidden="true">·</span>
            <span>Verified availability &amp; audited installation states</span>
          </div>
        </div>

        <button
          onClick={loadTools}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tools by name, utility, or ID..."
            className="flex-1 bg-transparent text-xs text-slate-100 font-mono focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-200">
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Horizontal Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map(tool => {
          const isInstalled = tool.availabilityState === 'INSTALLED';
          const isAvailable = tool.availabilityState === 'AVAILABLE';
          const isUnavailable = tool.availabilityState === 'UNAVAILABLE';
          const isRemoteWorker = tool.availabilityState === 'REQUIRES_REMOTE_WORKER';

          return (
            <div
              key={tool.id}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{tool.name}</h3>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {tool.category}
                    </div>
                  </div>

                  {/* Availability Badge */}
                  <span
                    className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      isInstalled
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : isAvailable
                        ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60'
                        : isRemoteWorker
                        ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {tool.availabilityState}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {tool.description}
                </p>

                {/* Metadata with zero-pill discipline */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 font-mono">
                  <span>Class: {tool.resourceClass}</span>
                  <span aria-hidden="true">·</span>
                  <span>License: {tool.license}</span>
                  {tool.verifiedVersion && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>v{tool.verifiedVersion}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href={tool.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono"
                >
                  <span>Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {isAvailable && (
                  <button
                    onClick={() => handleInstall(tool.id)}
                    disabled={installingId === tool.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-800 transition-colors"
                  >
                    <Download className={`w-3.5 h-3.5 ${installingId === tool.id ? 'animate-bounce' : ''}`} />
                    <span>{installingId === tool.id ? 'Installing...' : 'Install on Worker'}</span>
                  </button>
                )}

                {isInstalled && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready for Scope Dispatch</span>
                  </div>
                )}

                {isUnavailable && (
                  <div className="text-[11px] font-mono text-slate-500">
                    License / Hardware Required
                  </div>
                )}

                {isRemoteWorker && (
                  <div className="text-[11px] font-mono text-amber-500">
                    Requires Dedicated Node
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
