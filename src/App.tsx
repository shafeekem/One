import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Header } from './components/layout/Header.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { BottomNav } from './components/layout/BottomNav.js';
import { SearchModal } from './components/layout/SearchModal.js';
import { ToastContainer } from './components/layout/ToastContainer.js';

// Views
import { SocDashboard } from './components/soc/SocDashboard.js';
import { AlertsView } from './components/alerts/AlertsView.js';
import { IncidentsView } from './components/incidents/IncidentsView.js';
import { AssetsView } from './components/assets/AssetsView.js';
import { EventsView } from './components/events/EventsView.js';
import { AssessmentsView } from './components/assessments/AssessmentsView.js';
import { TerminalView } from './components/terminal/TerminalView.js';
import { ToolsCatalogView } from './components/tools/ToolsCatalogView.js';
import { WorkersView } from './components/workers/WorkersView.js';
import { VulnerabilitiesView } from './components/vulnerabilities/VulnerabilitiesView.js';
import { ThreatIntelligenceView } from './components/threats/ThreatIntelligenceView.js';
import { EvidenceVaultView } from './components/evidence/EvidenceVaultView.js';
import { LabsView } from './components/labs/LabsView.js';
import { ComplianceView } from './components/compliance/ComplianceView.js';
import { AssistantView } from './components/assistant/AssistantView.js';
import { AuditView } from './components/audit/AuditView.js';
import { SystemHealthView } from './components/health/SystemHealthView.js';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'soc':
        return <SocDashboard />;
      case 'alerts':
        return <AlertsView />;
      case 'incidents':
        return <IncidentsView />;
      case 'assets':
        return <AssetsView />;
      case 'events':
        return <EventsView />;
      case 'assessments':
        return <AssessmentsView />;
      case 'terminal':
        return <TerminalView />;
      case 'tools':
        return <ToolsCatalogView />;
      case 'workers':
        return <WorkersView />;
      case 'vulnerabilities':
        return <VulnerabilitiesView />;
      case 'threats':
        return <ThreatIntelligenceView />;
      case 'evidence':
        return <EvidenceVaultView />;
      case 'labs':
        return <LabsView />;
      case 'compliance':
        return <ComplianceView />;
      case 'assistant':
        return <AssistantView />;
      case 'audit':
        return <AuditView />;
      case 'health':
        return <SystemHealthView />;
      default:
        return <SocDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
          {renderActiveView()}
        </main>
      </div>

      <BottomNav />
      <SearchModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
