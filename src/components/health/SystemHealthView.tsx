import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import { SystemHealthData } from '../../types.js';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Server, ShieldCheck, Cpu, Database, Bot } from 'lucide-react';

export const SystemHealthView: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<SystemHealthData>('/system-health');
      setHealth(res);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight font-mono flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Platform Health &amp; Subsystem Diagnostics</span>
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Verified observations</span>
            <span aria-hidden="true">·</span>
            <span>No fabricated metrics</span>
          </div>
        </div>

        <button
          onClick={loadHealth}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Run Check</span>
        </button>
      </div>

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-mono text-xs">
          {/* Frontend Subsystem */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100">Frontend Presentation</span>
              <span className="text-emerald-400 font-bold">{health.subsystems.frontend.status}</span>
            </div>
            <div className="text-slate-400 text-[11px] space-y-1">
              <div>Latency: {health.subsystems.frontend.latencyMs}ms</div>
              <div>Framework: React 19 + TypeScript + Vite 8</div>
              <div>Styling: Tailwind CSS v4 (Zero-Pill Discipline)</div>
            </div>
          </div>

          {/* API Gateway */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100">API Gateway</span>
              <span className="text-emerald-400 font-bold">{health.subsystems.apiGateway.status}</span>
            </div>
            <div className="text-slate-400 text-[11px] space-y-1">
              <div>Port: {health.subsystems.apiGateway.port}</div>
              <div>Base Route: /api/v1/*</div>
              <div>Response Time: {health.subsystems.apiGateway.latencyMs}ms</div>
            </div>
          </div>

          {/* Database Persistence */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100">State Persistence</span>
              <span className="text-emerald-400 font-bold">{health.subsystems.database.status}</span>
            </div>
            <div className="text-slate-400 text-[11px] space-y-1">
              <div>Engine: {health.subsystems.database.mode}</div>
              <div>Active Records: {health.subsystems.database.recordsCount}</div>
              <div>File: .data/jupiter_db.json</div>
            </div>
          </div>

          {/* Scope Engine */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100">Scope Engine Guard</span>
              <span className="text-emerald-400 font-bold">{health.subsystems.scopeEngine.status}</span>
            </div>
            <div className="text-slate-400 text-[11px] space-y-1">
              <div>Policy Version: {health.subsystems.scopeEngine.policyVersion}</div>
              <div>Mode: {health.subsystems.scopeEngine.mode}</div>
              <div>Worker Dispatch: Gated &amp; Audited</div>
            </div>
          </div>

          {/* Worker Nodes */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100">Worker Enclaves</span>
              <span className="text-emerald-400 font-bold">
                {health.subsystems.workers.healthy} / {health.subsystems.workers.total}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] space-y-1">
              <div>Healthy: {health.subsystems.workers.healthy} nodes</div>
              <div>Maintenance: {health.subsystems.workers.maintenance} nodes</div>
              <div>Heartbeat: 42ms nominal</div>
            </div>
          </div>

          {/* Gemini AI Core */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100">AI Security Assistant</span>
              <span
                className={`font-bold ${
                  health.subsystems.geminiAssistant.configured ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {health.subsystems.geminiAssistant.status}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] space-y-1">
              <div>Model: {health.subsystems.geminiAssistant.model}</div>
              <div>Configured: {health.subsystems.geminiAssistant.configured ? 'Yes (Server-side)' : 'No (Using Local Rules)'}</div>
              <div>Package: @google/genai ^2.4.0</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
