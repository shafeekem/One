import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { SecurityEvent } from '../../types.js';
import { FileText, RefreshCw, Search } from 'lucide-react';

export const EventsView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ events: SecurityEvent[] }>('/events');
      setEvents(res.events || []);
    } catch (err: any) {
      showToast('Failed to load events: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [activeOrg, refreshKey]);

  const filteredEvents = events.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.message.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      e.sourceIp.includes(q) ||
      e.destinationIp.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Security Events &amp; Telemetry</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Suricata, Nginx, Wazuh &amp; CoreDNS logs</span>
            <span aria-hidden="true">·</span>
            <span>{events.length} ingested events</span>
          </div>
        </div>

        <button
          onClick={loadEvents}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg max-w-md">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter events by IP, message, source..."
          className="flex-1 bg-transparent text-xs text-slate-100 font-mono focus:outline-none"
        />
      </div>

      <div className="space-y-3 font-mono text-xs">
        {filteredEvents.map(evt => (
          <div key={evt.id} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">{evt.source}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-200">{evt.eventType}</span>
              </div>
              <span
                className={`font-bold ${
                  evt.severity === 'CRITICAL'
                    ? 'text-rose-400'
                    : evt.severity === 'HIGH'
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                }`}
              >
                {evt.severity}
              </span>
            </div>

            <div className="p-2 rounded bg-slate-950 text-slate-300 border border-slate-800 leading-relaxed">
              {evt.message}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
              <span>Src: {evt.sourceIp}</span>
              <span>&rarr;</span>
              <span>Dst: {evt.destinationIp}:{evt.port || 0} ({evt.protocol})</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(evt.timestamp).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
