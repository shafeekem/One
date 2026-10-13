export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'FALSE_POSITIVE';

export type IncidentStage = 'NEW' | 'TRIAGED' | 'INVESTIGATING' | 'CONTAINMENT' | 'ERADICATION' | 'RECOVERY' | 'RESOLVED' | 'CLOSED';

export type VulnStatus = 'OPEN' | 'CONFIRMED' | 'IN_REMEDIATION' | 'MITIGATED' | 'ACCEPTED_RISK' | 'RESOLVED' | 'FALSE_POSITIVE';

export type ToolAvailability = 'CATALOGUED' | 'AVAILABLE' | 'INSTALLED' | 'UNAVAILABLE' | 'REQUIRES_REMOTE_WORKER';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  projectId: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: 'Enterprise' | 'Professional' | 'Standard';
  region: string;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  environment: 'Production' | 'Staging' | 'Laboratory';
  createdAt: string;
}

export interface Asset {
  id: string;
  organizationId: string;
  projectId: string;
  hostname: string;
  ipAddress: string;
  os: string;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  environment: 'Production' | 'DMZ' | 'Internal' | 'Cloud';
  status: 'ACTIVE' | 'OFFLINE' | 'DECOMMISSIONED';
  tags: string[];
  observedServices: string[];
  vulnerabilitiesCount: number;
  lastObservedAt: string;
}

export interface Alert {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  source: string;
  assetId?: string;
  assetHostname?: string;
  assignee?: string;
  indicators: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  summary: string;
  severity: Severity;
  stage: IncidentStage;
  leadResponder: string;
  affectedAssets: string[];
  relatedAlertIds: string[];
  timeline: Array<{ timestamp: string; note: string; author: string }>;
  tasks: Array<{ id: string; title: string; completed: boolean; assignee: string }>;
  containmentNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityEvent {
  id: string;
  organizationId: string;
  projectId: string;
  source: string;
  eventType: string;
  severity: Severity;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port?: number;
  message: string;
  rawPayload?: string;
  timestamp: string;
}

export interface Vulnerability {
  id: string;
  organizationId: string;
  projectId: string;
  cveId: string;
  title: string;
  description: string;
  severity: Severity;
  cvssScore: number;
  status: VulnStatus;
  affectedAssetIds: string[];
  remediationGuidance: string;
  discoveredBy: string;
  assignedTo?: string;
  dueDate: string;
  verified: boolean;
  createdAt: string;
}

export interface ThreatIndicator {
  id: string;
  organizationId: string;
  projectId: string;
  type: 'IP' | 'DOMAIN' | 'URL' | 'FILE_HASH_SHA256' | 'CERT_SHA1';
  value: string;
  threatType: string;
  confidence: number;
  source: string;
  mitreTechnique: string;
  expiresAt: string;
  createdAt: string;
}

export interface AssessmentScope {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  writtenAuthorizationRef: string;
  targetInclusions: string[];
  targetExclusions: string[];
  permittedTools: string[];
  state: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
  validFrom: string;
  validUntil: string;
  approvedBy?: string;
  approvedAt?: string;
  emergencyStopContact: string;
}

export interface AssessmentRun {
  id: string;
  organizationId: string;
  projectId: string;
  scopeId: string;
  toolId: string;
  target: string;
  status: 'QUEUED' | 'VALIDATING' | 'AWAITING_APPROVAL' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'CANCELLED';
  policyEvaluation: {
    passed: boolean;
    reason: string;
    targetInScope: boolean;
    targetExcluded: boolean;
    toolPermitted: boolean;
    timeValid: boolean;
    approvalPresent: boolean;
  };
  dispatchedWorkerId?: string;
  output?: string;
  findingsCount?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ToolCatalogEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  officialUrl: string;
  license: string;
  resourceClass: 'Small' | 'Medium' | 'Large' | 'Enterprise';
  availabilityState: ToolAvailability;
  verifiedVersion?: string;
  lastVerificationDate?: string;
  supportedEnvironments: string[];
  requiredPermissions: string[];
  requiresScopeAuthorization: boolean;
}

export interface WorkerNode {
  id: string;
  name: string;
  environment: string;
  os: string;
  architecture: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
  status: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE' | 'OFFLINE' | 'UNKNOWN';
  networkPolicy: 'RESTRICTED_EGRESS' | 'ISOLATED_NO_NET' | 'LAB_INTERNAL_ONLY';
  installedToolIds: string[];
  activeJobsCount: number;
  lastCheckAt: string;
  statusDetails?: string;
}

export interface EvidenceItem {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256Hash: string;
  classification: 'RESTRICTED' | 'CONFIDENTIAL' | 'INTERNAL';
  uploadedBy: string;
  chainOfCustody: Array<{
    timestamp: string;
    action: string;
    actor: string;
    details: string;
  }>;
  fileData?: string;
  createdAt: string;
}

export interface SecurityLab {
  id: string;
  name: string;
  profile: 'JUPITER-SHELL' | 'LAB-SHELL' | 'ASSESSMENT-SHELL' | 'FORENSICS-SHELL' | 'ANALYSIS-SHELL';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  targetEnvironment: string;
  status: 'READY' | 'RUNNING' | 'STOPPED';
  expiresInMinutes: number;
  activeSessionUser?: string;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  projectId: string;
  actor: string;
  action: string;
  resource: string;
  result: 'ALLOWED' | 'DENIED' | 'ERROR';
  reason?: string;
  correlationId: string;
  ipAddress: string;
  timestamp: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  totalControls: number;
  compliantControls: number;
  inProgressControls: number;
  gapControls: number;
  lastAssessedAt: string;
  certificationStatus: 'SELF_ASSESSED' | 'INDEPENDENT_AUDIT_PENDING' | 'FORMALLY_CERTIFIED';
}

export interface SystemHealthData {
  status: string;
  subsystems: {
    frontend: { status: string; latencyMs: number };
    apiGateway: { status: string; latencyMs: number; port: number };
    database: { status: string; mode: string; recordsCount: number };
    scopeEngine: { status: string; policyVersion: string; mode: string };
    workers: { total: number; healthy: number; maintenance: number };
    evidenceStorage: { status: string; encryption: string };
    geminiAssistant: { status: string; model: string; configured: boolean };
  };
  lastCheck: string;
}
