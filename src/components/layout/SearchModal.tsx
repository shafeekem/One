import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { Search, X, Server, BellRing, Flame, Wrench, Bug, Crosshair } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, setActiveTab } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const [assetsRes, alertsRes, incidentsRes, toolsRes, vulnsRes] = await Promise.all([
          ApiClient.request<{ assets: any[] }>('/assets'),
          ApiClient.request<{ alerts: any[] }>('/alerts'),
          ApiClient.request<{ incidents: any[] }>('/incidents'),
          ApiClient.request<{ tools: any[] }>('/tools'),
          ApiClient.request<{ vulnerabilities: any[] }>('/vulnerabilities'),
        ]);

        const matched: any[] = [];

        // Assets
        assetsRes.assets?.forEach(a => {
          if (a.hostname.toLowerCase().includes(q) || a.ipAddress.includes(q)) {
            matched.push({ type: 'asset', title: a.hostname, subtitle: `${a.ipAddress} · ${a.criticality}`, tab: 'assets' });
          }
        });

        // Alerts
        alertsRes.alerts?.forEach(a => {
          if (a.title.toLowerCase().includes(q) || a.source.toLowerCase().includes(q)) {
            matched.push({ type: 'alert', title: a.title, subtitle: `${a.severity} · ${a.status}`, tab: 'alerts' });
          }
        });

        // Incidents
        incidentsRes.incidents?.forEach(i => {
          if (i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)) {
            matched.push({ type: 'incident', title: i.title, subtitle: `Stage: ${i.stage} · Lead: ${i.leadResponder}`, tab: 'incidents' });
          }
        });

        // Tools
        toolsRes.tools?.forEach(t => {
          if (t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) {
            matched.push({ type: 'tool', title: t.name, subtitle: `${t.category} · ${t.availabilityState}`, tab: 'tools' });
          }
        });

        // Vulns
        vulnsRes.vulnerabilities?.forEach(v => {
          if (v.cveId.toLowerCase().includes(q) || v.title.toLowerCase().includes(q)) {
            matched.push({ type: 'vuln', title: v.cveId, subtitle: `${v.title} · CVSS ${v.cvssScore}`, tab: 'vulnerabilities' });
          }
        });

        setResults(matched.slice(0, 8));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, searchOpen]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search assets, alerts, incidents, tools, CVEs..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-mono"
            autoFocus
          />
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="p-2 max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-xs text-slate-400 font-mono">
              Searching verified operational records...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 font-mono">
              No records matching &quot;{query}&quot; in active tenant scope.
            </div>
          )}

          {!loading && results.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveTab(item.tab);
                setSearchOpen(false);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-slate-800/80 transition-colors group"
            >
              <div className="p-2 rounded bg-slate-800 text-slate-300 group-hover:text-emerald-400">
                {item.type === 'asset' && <Server className="w-4 h-4" />}
                {item.type === 'alert' && <BellRing className="w-4 h-4" />}
                {item.type === 'incident' && <Flame className="w-4 h-4" />}
                {item.type === 'tool' && <Wrench className="w-4 h-4" />}
                {item.type === 'vuln' && <Bug className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {item.subtitle}
                </div>
              </div>
            </button>
          ))}

          {!query && (
            <div className="p-3 text-xs text-slate-400">
              <span className="font-mono text-[11px] uppercase tracking-wider block mb-2 text-slate-400">Quick Navigation</span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                <button
                  onClick={() => { setActiveTab('soc'); setSearchOpen(false); }}
                  className="p-2 text-left bg-slate-800/40 hover:bg-slate-800 rounded text-slate-300"
                >
                  SOC Overview
                </button>
                <button
                  onClick={() => { setActiveTab('assessments'); setSearchOpen(false); }}
                  className="p-2 text-left bg-slate-800/40 hover:bg-slate-800 rounded text-slate-300"
                >
                  Scope Engine & Validator
                </button>
                <button
                  onClick={() => { setActiveTab('terminal'); setSearchOpen(false); }}
                  className="p-2 text-left bg-slate-800/40 hover:bg-slate-800 rounded text-slate-300"
                >
                  Terminal & JUPITER CLI
                </button>
                <button
                  onClick={() => { setActiveTab('evidence'); setSearchOpen(false); }}
                  className="p-2 text-left bg-slate-800/40 hover:bg-slate-800 rounded text-slate-300"
                >
                  Evidence Vault (SHA-256)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
