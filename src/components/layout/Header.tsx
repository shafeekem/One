import React from 'react';
import { useApp, AVAILABLE_ROLES } from '../../context/AppContext.js';
import { Shield, Search, Activity, UserCheck, Building2, FolderGit2, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    organizations,
    projects,
    activeOrg,
    setActiveOrg,
    activeProject,
    setActiveProject,
    activeRole,
    setActiveRole,
    setSearchOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-md px-3 md:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => setActiveTab('soc')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-wider text-slate-100 font-mono">JUPITER</span>
                <span className="text-[10px] uppercase font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-800/50">SEC-OPS</span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-400 tracking-tight">Cybersecurity Operations Platform</p>
            </div>
          </div>
        </div>

        {/* Center: Tenant & Project Controls */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Org Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-md">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400">Org:</span>
            <select
              value={activeOrg?.id || ''}
              onChange={e => {
                const found = organizations.find(o => o.id === e.target.value);
                if (found) setActiveOrg(found);
              }}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id} className="bg-slate-900 text-slate-100">
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-md">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400">Project:</span>
            <select
              value={activeProject?.id || ''}
              onChange={e => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) setActiveProject(found);
              }}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            >
              {projects.map(proj => (
                <option key={proj.id} value={proj.id} className="bg-slate-900 text-slate-100">
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Role Simulator, Search, Health */}
        <div className="flex items-center gap-2">
          {/* Role Simulator Switcher */}
          <div className="flex items-center gap-1 text-xs bg-slate-900/80 border border-slate-800 px-2 py-1.5 rounded-md text-slate-200">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline text-slate-400">Role:</span>
            <select
              value={activeRole}
              onChange={e => setActiveRole(e.target.value)}
              className="bg-transparent text-slate-100 text-xs font-mono focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
              title="Switch user role simulator to audit backend RBAC controls"
            >
              {AVAILABLE_ROLES.map(r => (
                <option key={r} value={r} className="bg-slate-900 text-slate-100">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:text-slate-200 rounded-md transition-colors"
            title="Global Quick Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-mono text-[11px]">Search</span>
            <kbd className="hidden lg:inline-block font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded text-slate-400">⌘K</kbd>
          </button>

          {/* System Health Status Indicator */}
          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs border transition-colors ${
              activeTab === 'health'
                ? 'bg-slate-800 border-slate-600 text-emerald-400'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
            title="System Subsystem Diagnostics"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline font-mono text-[11px]">HEALTH</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
