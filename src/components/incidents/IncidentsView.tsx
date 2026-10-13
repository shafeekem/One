import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { Incident, IncidentStage } from '../../types.js';
import { Flame, CheckSquare, Square, Plus, ShieldCheck, ArrowRight, RefreshCw, X } from 'lucide-react';

const STAGES: IncidentStage[] = [
  'NEW',
  'TRIAGED',
  'INVESTIGATING',
  'CONTAINMENT',
  'ERADICATION',
  'RECOVERY',
  'RESOLVED',
  'CLOSED',
];

export const IncidentsView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [newNote, setNewNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Declare modal state
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [incTitle, setIncTitle] = useState('');
  const [incSummary, setIncSummary] = useState('');
  const [incSeverity, setIncSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [declaring, setDeclaring] = useState(false);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request<{ incidents: Incident[] }>('/incidents');
      setIncidents(res.incidents || []);
      if (res.incidents?.length > 0 && !selectedIncident) {
        setSelectedIncident(res.incidents[0]);
      } else if (selectedIncident) {
        const found = res.incidents?.find(i => i.id === selectedIncident.id);
        if (found) setSelectedIncident(found);
      }
    } catch (err: any) {
      showToast('Failed to load incidents: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [activeOrg, refreshKey]);

  const handleStageChange = async (incidentId: string, newStage: IncidentStage) => {
    setUpdating(true);
    try {
      const res = await ApiClient.request<{ incident: Incident }>(`/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStage }),
      });
      showToast(`Incident transitioned to ${newStage}`, 'success');
      setIncidents(prev => prev.map(i => (i.id === incidentId ? res.incident : i)));
      setSelectedIncident(res.incident);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleTask = async (incidentId: string, taskId: string) => {
    try {
      const res = await ApiClient.request<{ incident: Incident }>(`/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ toggleTaskId: taskId }),
      });
      setIncidents(prev => prev.map(i => (i.id === incidentId ? res.incident : i)));
      setSelectedIncident(res.incident);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedIncident) return;
    try {
      const res = await ApiClient.request<{ incident: Incident }>(`/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ timelineNote: newNote.trim() }),
      });
      showToast('Incident timeline updated', 'success');
      setNewNote('');
      setIncidents(prev => prev.map(i => (i.id === selectedIncident.id ? res.incident : i)));
      setSelectedIncident(res.incident);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeclareIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim() || !incSummary.trim()) {
      showToast('Title and summary are required', 'error');
      return;
    }

    setDeclaring(true);
    try {
      const res = await ApiClient.request<{ incident: Incident }>('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: incTitle.trim(),
          summary: incSummary.trim(),
          severity: incSeverity,
        }),
      });
      showToast(`Incident declared: ${res.incident.title}`, 'success');
      setShowDeclareModal(false);
      setIncTitle('');
      setIncSummary('');
      loadIncidents();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeclaring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Security Incident Workbench</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span>Rigorous incident lifecycle management</span>
            <span aria-hidden="true">·</span>
            <span>{incidents.length} active investigations</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeclareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-rose-300 bg-rose-950/80 border border-rose-800/80 hover:bg-rose-900 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Declare Incident</span>
          </button>
          <button
            onClick={loadIncidents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1">
            Active Incidents
          </div>
          {incidents.map(inc => (
            <div
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedIncident?.id === inc.id
                  ? 'bg-slate-800/80 border-rose-500/50 shadow-md'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-100 line-clamp-1">{inc.title}</span>
                <span className="font-mono text-xs font-bold text-rose-400 shrink-0">{inc.severity}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{inc.summary}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Stage: {inc.stage}</span>
                <span>Lead: {inc.leadResponder}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Incident Details Workbench */}
        {selectedIncident && (
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-rose-400" />
                    <h2 className="text-base font-semibold text-slate-100">{selectedIncident.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                    <span>ID: {selectedIncident.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>Lead Responder: {selectedIncident.leadResponder}</span>
                    <span aria-hidden="true">·</span>
                    <span>Affected: {selectedIncident.affectedAssets.join(', ')}</span>
                  </div>
                </div>

                <div className="font-mono text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded">
                  CURRENT STAGE: {selectedIncident.stage}
                </div>
              </div>

              {/* Lifecycle Stage Controls */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Lifecycle Stage Progression
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-xs">
                  {STAGES.map(stage => {
                    const isCurrent = selectedIncident.stage === stage;
                    return (
                      <button
                        key={stage}
                        onClick={() => handleStageChange(selectedIncident.id, stage)}
                        disabled={updating}
                        className={`p-2 rounded border transition-colors ${
                          isCurrent
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {stage}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Response Task Checklist */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Containment & Remediation Checklist
                </div>
                <div className="space-y-2">
                  {selectedIncident.tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(selectedIncident.id, task.id)}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-xs">
                        <span className={task.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                          {task.title}
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Assignee: {task.assignee}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Log & Note Form */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Incident Action Timeline
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedIncident.timeline.map((entry, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="text-slate-300 font-semibold">{entry.author}</span>
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-slate-200 leading-relaxed font-mono text-xs">
                        {entry.note}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Log investigative finding or containment step..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-mono bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-md transition-colors"
                  >
                    Add Note
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Declare Incident Modal */}
      {showDeclareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Declare Security Incident</span>
              </h3>
              <button onClick={() => setShowDeclareModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeclareIncident} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Incident Title:</label>
                <input
                  type="text"
                  value={incTitle}
                  onChange={e => setIncTitle(e.target.value)}
                  placeholder="e.g. Lateral Movement attempt on API Cluster"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Severity Rating:</label>
                <select
                  value={incSeverity}
                  onChange={e => setIncSeverity(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Containment)</option>
                  <option value="HIGH">HIGH (Escalated Priority)</option>
                  <option value="MEDIUM">MEDIUM (Standard Triage)</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Executive Summary / Observations:</label>
                <textarea
                  value={incSummary}
                  onChange={e => setIncSummary(e.target.value)}
                  rows={3}
                  placeholder="Correlated indicators, affected endpoints, and initial containment steps..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeclareModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declaring}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded"
                >
                  {declaring ? 'Declaring...' : 'Declare Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
