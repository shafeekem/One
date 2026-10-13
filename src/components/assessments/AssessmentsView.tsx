import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import { AssessmentScope, AssessmentRun } from '../../types.js';
import {
  Crosshair,
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  PowerOff,
  X,
  FileCheck2,
  Lock,
} from 'lucide-react';

export const AssessmentsView: React.FC = () => {
  const { activeOrg, refreshKey, showToast } = useApp();
  const [scopes, setScopes] = useState<AssessmentScope[]>([]);
  const [runs, setRuns] = useState<AssessmentRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatcher form state
  const [selectedTool, setSelectedTool] = useState('nmap');
  const [targetInput, setTargetInput] = useState('10.0.4.10');
  const [dispatching, setDispatching] = useState(false);
  const [lastDispatchResult, setLastDispatchResult] = useState<any>(null);

  // Scope test suite state
  const [runningSuite, setRunningSuite] = useState(false);
  const [suiteResults, setSuiteResults] = useState<any[] | null>(null);

  // New Scope modal state
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [newScopeName, setNewScopeName] = useState('');
  const [newAuthRef, setNewAuthRef] = useState('');
  const [newInclusions, setNewInclusions] = useState('10.0.4.10, 10.0.4.22, 10.0.4.0/28');
  const [newExclusions, setNewExclusions] = useState('10.0.4.1, 10.0.4.254, backup-san-01.apexdefense.internal');
  const [newPermittedTools, setNewPermittedTools] = useState('nmap, testssl, owasp-zap, semgrep, trivy');
  const [newEmergencyContact, setNewEmergencyContact] = useState('soc-emergency@apexdefense.internal / +1-555-0199');
  const [submittingScope, setSubmittingScope] = useState(false);

  // Emergency stop confirmation
  const [confirmEmergencyStop, setConfirmEmergencyStop] = useState(false);
  const [stoppingEmergency, setStoppingEmergency] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scRes, rnRes] = await Promise.all([
        ApiClient.request<{ scopes: AssessmentScope[] }>('/assessment-scopes'),
        ApiClient.request<{ runs: AssessmentRun[] }>('/assessment-runs'),
      ]);
      setScopes(scRes.scopes || []);
      setRuns(rnRes.runs || []);
    } catch (err: any) {
      showToast('Failed to load assessment data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg, refreshKey]);

  const activeScope = scopes[0] || null;

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScope) {
      showToast('No active assessment scope found', 'error');
      return;
    }

    setDispatching(true);
    setLastDispatchResult(null);

    try {
      const res = await ApiClient.request('/assessment-runs/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          scopeId: activeScope.id,
          toolId: selectedTool,
          target: targetInput.trim(),
        }),
      });

      setLastDispatchResult(res);
      showToast(`Execution Authorized: Dispatched to ${res.run?.dispatchedWorkerId}`, 'success');
      loadData();
    } catch (err: any) {
      setLastDispatchResult({
        success: false,
        status: 'POLICY_DENIED',
        error: err.message,
      });
      showToast('Scope Policy Rejection: ' + err.message, 'error');
      loadData();
    } finally {
      setDispatching(false);
    }
  };

  const handleRunScopeSuite = async () => {
    setRunningSuite(true);
    setSuiteResults(null);
    try {
      const res = await ApiClient.request('/scope-test/run', {
        method: 'POST',
      });
      setSuiteResults(res.results);
      if (res.allPassed) {
        showToast('All 4 Scope Isolation Acceptance Tests Passed!', 'success');
      } else {
        showToast('Scope Isolation Test Failure Detected', 'error');
      }
      loadData();
    } catch (err: any) {
      showToast('Test suite execution failed: ' + err.message, 'error');
    } finally {
      setRunningSuite(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (!activeScope) return;
    setStoppingEmergency(true);
    try {
      const res = await ApiClient.request(`/assessment-scopes/${activeScope.id}/emergency-stop`, {
        method: 'POST',
      });
      showToast('EMERGENCY STOP EXECUTED: All active testing halted!', 'success');
      setConfirmEmergencyStop(false);
      loadData();
    } catch (err: any) {
      showToast('Emergency stop failed: ' + err.message, 'error');
    } finally {
      setStoppingEmergency(false);
    }
  };

  const handleCreateScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScopeName.trim() || !newAuthRef.trim()) {
      showToast('Scope name and written authorization ref are required', 'error');
      return;
    }

    setSubmittingScope(true);
    try {
      const incArray = newInclusions.split(',').map(s => s.trim()).filter(Boolean);
      const excArray = newExclusions.split(',').map(s => s.trim()).filter(Boolean);
      const toolArray = newPermittedTools.split(',').map(s => s.trim()).filter(Boolean);

      const res = await ApiClient.request<{ scope: AssessmentScope }>('/assessment-scopes', {
        method: 'POST',
        body: JSON.stringify({
          name: newScopeName.trim(),
          writtenAuthorizationRef: newAuthRef.trim(),
          targetInclusions: incArray,
          targetExclusions: excArray,
          permittedTools: toolArray,
          emergencyStopContact: newEmergencyContact.trim(),
        }),
      });

      showToast(`Assessment Scope '${res.scope.name}' registered & active`, 'success');
      setShowScopeModal(false);
      setNewScopeName('');
      setNewAuthRef('');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingScope(false);
    }
  };

  const handleUpdateScopeState = async (scopeId: string, newState: string) => {
    try {
      await ApiClient.request(`/assessment-scopes/${scopeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: newState }),
      });
      showToast(`Scope state updated to ${newState}`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight font-mono flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-emerald-400" />
            <span>Authorized Assessment &amp; Scope Engine</span>
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>Machine-enforceable rules of engagement</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Pre-dispatch fail-closed policy</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Emergency Stop Button (Section 12) */}
          <button
            onClick={() => setConfirmEmergencyStop(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 rounded-md transition-colors"
            title="Execute Emergency Stop on all active testing operations"
          >
            <PowerOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Emergency Stop</span>
          </button>

          <button
            onClick={() => setShowScopeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Scope</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Emergency Stop Confirmation Sheet */}
      {confirmEmergencyStop && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-300 font-bold font-mono text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>EMERGENCY STOP CONFIRMATION DIRECTIVE</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            This action will immediately set the active assessment scope to <strong>PAUSED</strong>, cancel all queued and running worker jobs, and broadcast a priority audit alert across the operations center.
          </p>
          <div className="flex gap-2 font-mono text-xs">
            <button
              onClick={handleEmergencyStop}
              disabled={stoppingEmergency}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded"
            >
              {stoppingEmergency ? 'Halting All Runs...' : 'CONFIRM EMERGENCY HALT'}
            </button>
            <button
              onClick={() => setConfirmEmergencyStop(false)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Scope Rules of Engagement Banner */}
      {activeScope ? (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-100">{activeScope.name}</h2>
              </div>
              <div className="mt-1 text-xs text-slate-400 font-mono">
                Written Authorization: <span className="text-slate-200">{activeScope.writtenAuthorizationRef}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">State:</span>
              <select
                value={activeScope.state}
                onChange={e => handleUpdateScopeState(activeScope.id, e.target.value)}
                className={`font-mono text-xs font-bold px-2 py-1 rounded border bg-slate-950 focus:outline-none cursor-pointer ${
                  activeScope.state === 'ACTIVE'
                    ? 'text-emerald-400 border-emerald-800/60'
                    : activeScope.state === 'PAUSED'
                    ? 'text-amber-400 border-amber-800/60'
                    : 'text-slate-400 border-slate-800'
                }`}
              >
                <option value="ACTIVE">ACTIVE (Authorized)</option>
                <option value="PAUSED">PAUSED (Suspended)</option>
                <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          {/* Inclusions and Exclusions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Inclusions */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-emerald-900/40 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Target Inclusions (Authorized Perimeter)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeScope.targetInclusions.map((inc, idx) => (
                  <span key={idx} className="p-1 rounded bg-slate-900 text-slate-200 border border-slate-800">
                    {inc}
                  </span>
                ))}
              </div>
            </div>

            {/* Exclusions */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-rose-900/40 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold uppercase tracking-wider">
                <XCircle className="w-4 h-4" />
                <span>Target Exclusions (Strict Prohibitions)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeScope.targetExclusions.map((exc, idx) => (
                  <span key={idx} className="p-1 rounded bg-slate-900 text-rose-300 border border-rose-950">
                    {exc}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono border-t border-slate-800/60">
            <span>Permitted Tools: <strong className="text-slate-200">{activeScope.permittedTools.join(', ')}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Approved By: {activeScope.approvedBy || 'CISO'}</span>
            <span aria-hidden="true">·</span>
            <span>Emergency Contact: {activeScope.emergencyStopContact}</span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
          No assessment scope registered for active organization.
        </div>
      )}

      {/* Mandatory Scope Isolation Test Suite (Section 29.1) */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-slate-100">
                Mandatory Scope-Isolation Test Runner (Section 29.1)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Verifies that out-of-scope and excluded targets are rejected before worker dispatch and logged to the audit stream.
            </p>
          </div>

          <button
            onClick={handleRunScopeSuite}
            disabled={runningSuite}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold font-mono text-cyan-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shrink-0"
          >
            <Play className={`w-3.5 h-3.5 ${runningSuite ? 'animate-spin' : ''}`} />
            <span>{runningSuite ? 'Executing Suite...' : 'Run Scope Test Suite'}</span>
          </button>
        </div>

        {suiteResults && (
          <div className="space-y-2.5">
            <div className="text-xs font-mono text-slate-300">
              Verified Test Evidence ({suiteResults.filter(r => r.pass).length} / {suiteResults.length} Passed):
            </div>
            <div className="space-y-2">
              {suiteResults.map((r, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs font-mono ${
                    r.pass
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                      : 'bg-rose-950/20 border-rose-800/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-100">{r.step}</div>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        r.pass ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {r.pass ? 'VERIFIED PASS' : 'FAILED'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{r.description}</p>
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                    <span>Target: {r.target}</span>
                    <span aria-hidden="true">·</span>
                    <span>Result: {r.actualResult}</span>
                    <span aria-hidden="true">·</span>
                    <span>Audit Logged: {r.auditRecorded ? 'Yes' : 'No'}</span>
                    <span aria-hidden="true">·</span>
                    <span>Worker Dispatched: {r.workerDispatched ? 'Yes' : 'No (Blocked)'}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 italic">
                    Reason: {r.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Execution Dispatcher & Historical Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Scope Dispatcher Form */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Execute Scope-Checked Assessment
          </div>
          <form onSubmit={handleDispatch} className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Select Tool:</label>
              <select
                value={selectedTool}
                onChange={e => setSelectedTool(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="nmap">nmap (Network Scanner - In Scope)</option>
                <option value="testssl">testssl.sh (TLS Checker - In Scope)</option>
                <option value="owasp-zap">owasp-zap (Web Scanner - In Scope)</option>
                <option value="trivy">trivy (Vuln Scanner - In Scope)</option>
                <option value="metasploit">metasploit (Exploit Framework - Prohibited in scope)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Target Host / IP / Subnet:</label>
              <input
                type="text"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                placeholder="e.g. 10.0.4.10 or 10.0.4.254"
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
              <div className="mt-1 text-[11px] text-slate-400 font-mono">
                Try <code>10.0.4.10</code> (In Scope) vs <code>10.0.4.254</code> (Excluded) vs <code>8.8.8.8</code> (Out of Scope).
              </div>
            </div>

            <button
              type="submit"
              disabled={dispatching}
              className="w-full py-2 px-3 text-xs font-semibold font-mono bg-emerald-400 hover:bg-emerald-300 text-emerald-950 rounded-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{dispatching ? 'Evaluating Scope Policy...' : 'Submit to Scope Engine'}</span>
            </button>
          </form>

          {/* Real-time Dispatch Result Display */}
          {lastDispatchResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono ${
                lastDispatchResult.success
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              }`}
            >
              <div className="font-bold">
                {lastDispatchResult.success ? 'DISPATCH SUCCESSFUL' : 'POLICY REJECTION (BLOCKED)'}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                {lastDispatchResult.message || lastDispatchResult.error}
              </p>
              {lastDispatchResult.correlationId && (
                <div className="mt-1 text-[10px] text-slate-400">
                  Correlation ID: {lastDispatchResult.correlationId}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Historical Assessment Runs */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Verified Assessment Execution History
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {runs.map(run => (
              <div key={run.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-200">
                    {run.toolId.toUpperCase()} &rarr; {run.target}
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      run.status === 'COMPLETED' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {run.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Worker: {run.dispatchedWorkerId || 'None'} · Timestamp: {new Date(run.createdAt).toLocaleString()}
                </div>

                {run.output && (
                  <pre className="p-2.5 rounded bg-slate-900 text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-36">
                    {run.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Register New Assessment Scope Modal */}
      {showScopeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">Register Assessment Scope</h3>
              <button onClick={() => setShowScopeModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateScope} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Scope Name / Operation Title:</label>
                <input
                  type="text"
                  value={newScopeName}
                  onChange={e => setNewScopeName(e.target.value)}
                  placeholder="e.g. Q4 Perimeter Audit"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Written Authorization Reference:</label>
                <input
                  type="text"
                  value={newAuthRef}
                  onChange={e => setNewAuthRef(e.target.value)}
                  placeholder="e.g. SEC-AUTH-2026-Q4-099 (CISO Signed)"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Inclusions (Comma-separated CIDRs, IPs, FQDNs):</label>
                <textarea
                  value={newInclusions}
                  onChange={e => setNewInclusions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Exclusions (Critical Blacklisted Subnets/Hosts):</label>
                <textarea
                  value={newExclusions}
                  onChange={e => setNewExclusions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-rose-300 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Permitted Tools (Comma-separated tool IDs):</label>
                <input
                  type="text"
                  value={newPermittedTools}
                  onChange={e => setNewPermittedTools(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Emergency Stop Contact:</label>
                <input
                  type="text"
                  value={newEmergencyContact}
                  onChange={e => setNewEmergencyContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScopeModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingScope}
                  className="px-3.5 py-1.5 bg-emerald-400 text-emerald-950 font-bold rounded"
                >
                  {submittingScope ? 'Enrolling...' : 'Enroll & Activate Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
