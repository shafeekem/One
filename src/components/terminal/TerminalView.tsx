import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.js';
import { ApiClient } from '../../api/client.js';
import {
  Terminal,
  CornerDownLeft,
  Trash2,
  Copy,
  Search,
  Plus,
  X,
  Radio,
  Sliders,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  PauseCircle,
  HelpCircle,
} from 'lucide-react';

interface TerminalLine {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  durationMs: number;
  timestamp: string;
  isPolicyDenied?: boolean;
}

interface SessionTab {
  sessionId: string;
  name: string;
  environment: string;
  history: TerminalLine[];
}

export const TerminalView: React.FC = () => {
  const { showToast, activeOrg, activeProject } = useApp();
  const [sessions, setSessions] = useState<SessionTab[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputVal, setInputVal] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [scanlines, setScanlines] = useState(false);
  const [fontSize, setFontSize] = useState<'text-xs' | 'text-sm' | 'text-base'>('text-xs');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSessions = async () => {
    try {
      const res = await ApiClient.request<{ sessions: SessionTab[] }>('/terminal/sessions');
      if (res.sessions && res.sessions.length > 0) {
        setSessions(res.sessions);
        if (!activeSessionId || !res.sessions.find(s => s.sessionId === activeSessionId)) {
          setActiveSessionId(res.sessions[0].sessionId);
        }
      } else {
        // Create initial default session
        const initRes = await ApiClient.request<{ session: SessionTab }>('/terminal/session', {
          method: 'POST',
        });
        setSessions([initRes.session]);
        setActiveSessionId(initRes.session.sessionId);
      }
    } catch (err: any) {
      showToast('Terminal init failed: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    loadSessions();
  }, [activeOrg, activeProject]);

  const activeSession = sessions.find(s => s.sessionId === activeSessionId) || sessions[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.history]);

  // Handle autocomplete input
  useEffect(() => {
    if (!inputVal.trim() || inputVal.startsWith('^')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await ApiClient.request<{ suggestions: string[] }>(
          `/terminal/autocomplete?q=${encodeURIComponent(inputVal)}`
        );
        setSuggestions(res.suggestions || []);
        setShowSuggestions((res.suggestions || []).length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [inputVal]);

  const createNewTab = async (environment = 'JUPITER-SHELL (Debian 12 / Restricted PTY)') => {
    try {
      const res = await ApiClient.request<{ session: SessionTab }>('/terminal/session/new', {
        method: 'POST',
        body: JSON.stringify({ environment }),
      });
      setSessions(prev => [...prev, res.session]);
      setActiveSessionId(res.session.sessionId);
      showToast(`Created new terminal tab: ${res.session.name}`, 'info');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const closeTab = async (e: React.MouseEvent, sessId: string) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      showToast('Cannot close the last terminal session', 'info');
      return;
    }

    try {
      await ApiClient.request(`/terminal/session/${sessId}`, { method: 'DELETE' });
      const remaining = sessions.filter(s => s.sessionId !== sessId);
      setSessions(remaining);
      if (activeSessionId === sessId) {
        setActiveSessionId(remaining[0].sessionId);
      }
      showToast('Terminal session closed', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const runCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    setExecuting(true);
    setInputVal('');
    setShowSuggestions(false);
    setCmdHistory(prev => [...prev, trimmed]);
    setHistoryIdx(-1);

    try {
      const res = await ApiClient.request<{ result: TerminalLine }>('/terminal/exec', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession?.sessionId || 'default',
          command: trimmed,
        }),
      });

      if (trimmed === 'clear') {
        setSessions(prev =>
          prev.map(s => (s.sessionId === activeSession?.sessionId ? { ...s, history: [] } : s))
        );
      } else {
        setSessions(prev =>
          prev.map(s =>
            s.sessionId === activeSession?.sessionId
              ? { ...s, history: [...s.history, res.result] }
              : s
          )
        );
      }
    } catch (err: any) {
      const errLine: TerminalLine = {
        id: 'err-' + Date.now(),
        command: trimmed,
        output: `Fatal terminal gateway error: ${err.message}`,
        exitCode: 1,
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
      setSessions(prev =>
        prev.map(s =>
          s.sessionId === activeSession?.sessionId
            ? { ...s, history: [...s.history, errLine] }
            : s
        )
      );
    } finally {
      setExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleInterrupt = async () => {
    if (!activeSession) return;
    try {
      const res = await ApiClient.request<{ result: TerminalLine }>(
        `/terminal/session/${activeSession.sessionId}/interrupt`,
        { method: 'POST' }
      );
      setSessions(prev =>
        prev.map(s =>
          s.sessionId === activeSession.sessionId
            ? { ...s, history: [...s.history, res.result] }
            : s
        )
      );
      showToast('Sent SIGINT (Interrupt)', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setInputVal(suggestions[0]);
        setShowSuggestions(false);
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      handleInterrupt();
    }
  };

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Output copied to clipboard', 'success');
  };

  const activeHistory = activeSession?.history || [];
  const filteredHistory = searchQuery
    ? activeHistory.filter(
        h =>
          h.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.output.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeHistory;

  return (
    <div className={`space-y-3 ${fullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4' : ''}`}>
      {/* Top Header & Session Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h1 className="text-base font-semibold text-slate-100 font-mono">
              JUPITER Controlled Terminal Gateway
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
            <span>Env: {activeSession?.environment || 'JUPITER-SHELL'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Restricted PTY</span>
            <span aria-hidden="true">·</span>
            <span>Policy Guard Active</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* SIGINT Ctrl-C Interrupt Button */}
          <button
            onClick={handleInterrupt}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded transition-colors"
            title="Send SIGINT Interrupt Signal (Ctrl+C)"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Ctrl+C</span>
          </button>

          {/* Search Output */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 text-xs border rounded transition-colors ${
              showSearch ? 'bg-slate-800 border-slate-600 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
            title="Search output buffer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Scanline CRT FX Toggle */}
          <button
            onClick={() => setScanlines(!scanlines)}
            className={`px-2 py-1 text-[11px] font-mono border rounded transition-colors ${
              scanlines ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle phosphor CRT scanlines"
          >
            CRT
          </button>

          {/* Font Size Toggle */}
          <button
            onClick={() => {
              if (fontSize === 'text-xs') setFontSize('text-sm');
              else if (fontSize === 'text-sm') setFontSize('text-base');
              else setFontSize('text-xs');
            }}
            className="px-2 py-1 text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-300 rounded"
            title="Adjust terminal font size"
          >
            {fontSize === 'text-xs' ? '12px' : fontSize === 'text-sm' ? '14px' : '16px'}
          </button>

          {/* Clear Buffer */}
          <button
            onClick={() => {
              if (activeSession) {
                setSessions(prev =>
                  prev.map(s => (s.sessionId === activeSession.sessionId ? { ...s, history: [] } : s))
                );
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 rounded"
            title="Clear buffer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded"
            title="Toggle fullscreen terminal"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Multi-Session Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
        {sessions.map(s => {
          const isActive = s.sessionId === activeSessionId;
          return (
            <div
              key={s.sessionId}
              onClick={() => setActiveSessionId(s.sessionId)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t border-l border-r cursor-pointer transition-colors select-none ${
                isActive
                  ? 'bg-slate-900 border-slate-700 text-emerald-400 font-bold'
                  : 'bg-slate-950/80 border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className={`w-3 h-3 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="truncate max-w-[140px]">{s.name}</span>
              {sessions.length > 1 && (
                <button
                  onClick={e => closeTab(e, s.sessionId)}
                  className="hover:text-rose-400 rounded p-0.5 text-slate-500"
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => createNewTab()}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md border border-dashed border-slate-800 transition-colors"
          title="Open new terminal session"
        >
          <Plus className="w-3 h-3" />
          <span>New Session</span>
        </button>
      </div>

      {/* Output Search Filter */}
      {showSearch && (
        <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search terminal output buffer..."
            className="flex-1 bg-transparent text-xs text-slate-100 font-mono focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-200">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Fast Mobile Quick Command Action Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono text-slate-300">
        <button
          onClick={() => runCommand('jupiter security-status')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0"
        >
          jupiter security-status
        </button>
        <button
          onClick={() => runCommand('jupiter assets')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0"
        >
          jupiter assets
        </button>
        <button
          onClick={() => runCommand('jupiter pentest nmap 10.0.4.10')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0 text-emerald-400"
        >
          pentest in-scope (10.0.4.10)
        </button>
        <button
          onClick={() => runCommand('jupiter pentest nmap 10.0.4.254')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0 text-rose-400"
        >
          pentest excluded (10.0.4.254)
        </button>
        <button
          onClick={() => runCommand('jupiter reports')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0 text-cyan-400"
        >
          jupiter reports
        </button>
        <button
          onClick={() => runCommand('jupiter compliance')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0"
        >
          jupiter compliance
        </button>
        <button
          onClick={() => runCommand('jupiter lab list')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0"
        >
          jupiter lab list
        </button>
        <button
          onClick={() => runCommand('rm -rf /')}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded shrink-0 text-amber-400"
          title="Test system policy denial filter"
        >
          test-policy-denial
        </button>
      </div>

      {/* Terminal Viewport */}
      <div
        className={`relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono ${fontSize} text-slate-200 ${
          fullscreen ? 'h-[calc(100vh-170px)]' : 'min-h-[460px] max-h-[620px]'
        } overflow-y-auto flex flex-col shadow-inner`}
      >
        {/* Optional Retro Scanline Effect */}
        {scanlines && (
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-70 z-10" />
        )}

        <div className="flex-1 space-y-4 relative z-0">
          {filteredHistory.map(entry => (
            <div key={entry.id} className="space-y-1">
              {entry.command && (
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-900/80 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">$</span>
                    <span className="text-slate-100 font-semibold">{entry.command}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>{entry.durationMs}ms</span>
                    <span className={entry.exitCode === 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                      [{entry.exitCode}]
                    </span>
                    <button
                      onClick={() => copyOutput(entry.output)}
                      className="hover:text-slate-300 p-0.5"
                      title="Copy output"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {entry.output && (
                <pre
                  className={`whitespace-pre-wrap leading-relaxed ${
                    entry.isPolicyDenied
                      ? 'text-rose-400 bg-rose-950/25 p-2.5 rounded border border-rose-900/50'
                      : 'text-slate-300'
                  }`}
                >
                  {entry.output}
                </pre>
              )}
            </div>
          ))}

          {executing && (
            <div className="flex items-center gap-2 text-cyan-400 animate-pulse font-mono text-xs">
              <span>$</span>
              <span>Executing via PTY gateway...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Autocomplete Popup */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-2 p-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl font-mono text-xs text-slate-300 space-y-1 max-h-32 overflow-y-auto">
            <div className="text-[10px] uppercase text-slate-400 px-1.5">Tab completion:</div>
            {suggestions.slice(0, 5).map((s, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setInputVal(s);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
                className="px-2 py-1 rounded hover:bg-slate-800 cursor-pointer flex items-center justify-between text-slate-200"
              >
                <span>{s}</span>
                <span className="text-[10px] text-slate-400">↵ click or Tab</span>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Virtual Function Keys Bar */}
        <div className="mt-3 pt-2 border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono text-slate-400">
          <button
            onClick={() => {
              if (suggestions.length > 0) {
                setInputVal(suggestions[0]);
                setShowSuggestions(false);
              }
            }}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:text-slate-200"
          >
            Tab
          </button>
          <button
            onClick={handleInterrupt}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:text-rose-300 text-rose-400"
          >
            Ctrl+C
          </button>
          <button
            onClick={() => {
              if (cmdHistory.length > 0) {
                const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
                setHistoryIdx(nextIdx);
                setInputVal(cmdHistory[nextIdx]);
              }
            }}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:text-slate-200 flex items-center gap-0.5"
          >
            <ArrowUp className="w-3 h-3" /> Up
          </button>
          <button
            onClick={() => {
              if (historyIdx !== -1) {
                const nextIdx = historyIdx + 1;
                if (nextIdx >= cmdHistory.length) {
                  setHistoryIdx(-1);
                  setInputVal('');
                } else {
                  setHistoryIdx(nextIdx);
                  setInputVal(cmdHistory[nextIdx]);
                }
              }
            }}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:text-slate-200 flex items-center gap-0.5"
          >
            <ArrowDown className="w-3 h-3" /> Down
          </button>
          <button
            onClick={() => setInputVal(prev => prev + ' | ')}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:text-slate-200"
          >
            |
          </button>
          <button
            onClick={() => setInputVal(prev => prev + ' --json')}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:text-slate-200"
          >
            --json
          </button>
        </div>

        {/* Command Input Prompt */}
        <form
          onSubmit={e => {
            e.preventDefault();
            runCommand(inputVal);
          }}
          className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2"
        >
          <span className="text-emerald-400 font-bold select-none">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executing}
            placeholder="Type 'jupiter --help', commands, or use buttons above..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-xs md:text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={executing || !inputVal.trim()}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
