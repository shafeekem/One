import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization, Project, Profile } from '../types.js';
import { ApiClient } from '../api/client.js';

export type ActiveTab =
  | 'soc'
  | 'alerts'
  | 'incidents'
  | 'assets'
  | 'events'
  | 'assessments'
  | 'terminal'
  | 'tools'
  | 'workers'
  | 'vulnerabilities'
  | 'threats'
  | 'evidence'
  | 'labs'
  | 'compliance'
  | 'assistant'
  | 'audit'
  | 'health';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  organizations: Organization[];
  projects: Project[];
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization) => void;
  activeProject: Project | null;
  setActiveProject: (proj: Project) => void;
  activeRole: string;
  setActiveRole: (role: string) => void;
  currentUser: Profile | null;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AVAILABLE_ROLES = [
  'Platform Administrator',
  'Organization Administrator',
  'Security Manager',
  'SOC Analyst',
  'Incident Responder',
  'Security Engineer',
  'Assessment Operator',
  'Forensic Analyst',
  'Tool Operator',
  'Auditor',
  'Read-Only Viewer',
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('soc');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [activeRole, setActiveRoleState] = useState<string>('Platform Administrator');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast-' + Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const setActiveOrg = (org: Organization) => {
    setActiveOrgState(org);
    ApiClient.setContext({ orgId: org.id });
    // find default project for this org
    const orgProjects = projects.filter(p => p.organizationId === org.id);
    if (orgProjects.length > 0) {
      setActiveProjectState(orgProjects[0]);
      ApiClient.setContext({ projId: orgProjects[0].id });
    }
    triggerRefresh();
    showToast(`Switched active organization to ${org.name}`, 'info');
  };

  const setActiveProject = (proj: Project) => {
    setActiveProjectState(proj);
    ApiClient.setContext({ projId: proj.id });
    triggerRefresh();
    showToast(`Switched active project scope to ${proj.name}`, 'info');
  };

  const setActiveRole = (role: string) => {
    setActiveRoleState(role);
    ApiClient.setContext({ userRole: role });
    triggerRefresh();
    showToast(`Switched active role simulator to ${role}`, 'info');
  };

  useEffect(() => {
    async function init() {
      try {
        const orgRes = await ApiClient.request<{ success: boolean; organizations: Organization[] }>('/organizations');
        if (orgRes.organizations?.length > 0) {
          setOrganizations(orgRes.organizations);
          setActiveOrgState(orgRes.organizations[0]);
          ApiClient.setContext({ orgId: orgRes.organizations[0].id });
        }

        const projRes = await ApiClient.request<{ success: boolean; projects: Project[] }>('/projects');
        if (projRes.projects?.length > 0) {
          setProjects(projRes.projects);
          setActiveProjectState(projRes.projects[0]);
          ApiClient.setContext({ projId: projRes.projects[0].id });
        }

        const profRes = await ApiClient.request<{ success: boolean; profile: Profile }>('/profile');
        if (profRes.profile) {
          setCurrentUser(profRes.profile);
        }
      } catch (err) {
        console.error('Failed to initialize app context:', err);
      }
    }
    init();
  }, []);

  return (
    <AppContext.Provider
      value={{
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
        currentUser,
        searchOpen,
        setSearchOpen,
        mobileMenuOpen,
        setMobileMenuOpen,
        toasts,
        showToast,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
