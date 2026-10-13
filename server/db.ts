import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  projectId: string;
  avatarUrl?: string;
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
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'FALSE_POSITIVE';
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
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  stage: 'NEW' | 'TRIAGED' | 'INVESTIGATING' | 'CONTAINMENT' | 'ERADICATION' | 'RECOVERY' | 'RESOLVED' | 'CLOSED';
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
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
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
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number;
  status: 'OPEN' | 'CONFIRMED' | 'IN_REMEDIATION' | 'MITIGATED' | 'ACCEPTED_RISK' | 'RESOLVED' | 'FALSE_POSITIVE';
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
  targetInclusions: string[]; // CIDRs, FQDNs, IPs
  targetExclusions: string[]; // Critical systems, emergency lines
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
  availabilityState: 'CATALOGUED' | 'AVAILABLE' | 'INSTALLED' | 'UNAVAILABLE' | 'REQUIRES_REMOTE_WORKER';
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
  fileData?: string; // Base64 or mock content
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

export interface JupiterDB {
  organizations: Organization[];
  projects: Project[];
  users: Profile[];
  assets: Asset[];
  alerts: Alert[];
  incidents: Incident[];
  securityEvents: SecurityEvent[];
  vulnerabilities: Vulnerability[];
  threatIndicators: ThreatIndicator[];
  assessmentScopes: AssessmentScope[];
  assessmentRuns: AssessmentRun[];
  tools: ToolCatalogEntry[];
  workers: WorkerNode[];
  evidence: EvidenceItem[];
  labs: SecurityLab[];
  auditEvents: AuditEvent[];
  compliance: ComplianceFramework[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'jupiter_db.json');

function seedDatabase(): JupiterDB {
  const org1: Organization = {
    id: 'org-apex',
    name: 'Apex Cyber Defense Inc.',
    slug: 'apex-cyber',
    tier: 'Enterprise',
    region: 'us-east-1',
    createdAt: '2026-01-10T00:00:00Z',
  };

  const org2: Organization = {
    id: 'org-titan',
    name: 'Titan Financial Global SOC',
    slug: 'titan-soc',
    tier: 'Enterprise',
    region: 'eu-west-1',
    createdAt: '2026-02-15T00:00:00Z',
  };

  const proj1: Project = {
    id: 'proj-core',
    organizationId: 'org-apex',
    name: 'Core Perimeter & DMZ Security',
    description: 'Continuous monitoring and security assessment of external-facing ingress surfaces.',
    environment: 'Production',
    createdAt: '2026-01-15T00:00:00Z',
  };

  const proj2: Project = {
    id: 'proj-pay',
    organizationId: 'org-apex',
    name: 'PCI-DSS Enclave Audit',
    description: 'Cardholder data environment vulnerability assessment and penetration testing.',
    environment: 'Production',
    createdAt: '2026-03-01T00:00:00Z',
  };

  const users: Profile[] = [
    {
      id: 'usr-admin',
      email: 'shafeekemkarnthur@gmail.com',
      fullName: 'Shafeek E M (Operator)',
      role: 'Platform Administrator',
      organizationId: 'org-apex',
      projectId: 'proj-core',
    },
    {
      id: 'usr-soc',
      email: 'analyst.chen@apexdefense.internal',
      fullName: 'Sarah Chen',
      role: 'SOC Analyst',
      organizationId: 'org-apex',
      projectId: 'proj-core',
    },
    {
      id: 'usr-op',
      email: 'alex.ross@apexdefense.internal',
      fullName: 'Alex Ross',
      role: 'Assessment Operator',
      organizationId: 'org-apex',
      projectId: 'proj-core',
    },
    {
      id: 'usr-auditor',
      email: 'elena.rostova@auditing.internal',
      fullName: 'Elena Rostova',
      role: 'Auditor',
      organizationId: 'org-apex',
      projectId: 'proj-core',
    },
  ];

  const assets: Asset[] = [
    {
      id: 'ast-01',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      hostname: 'edge-gw-01.apexdefense.internal',
      ipAddress: '10.0.4.10',
      os: 'Debian GNU/Linux 12 (Bookworm)',
      criticality: 'CRITICAL',
      environment: 'DMZ',
      status: 'ACTIVE',
      tags: ['ingress', 'nginx', 'tls-termination'],
      observedServices: ['443/https (nginx/1.24)', '80/http (redirect)', '22/ssh (OpenSSH 9.2p1)'],
      vulnerabilitiesCount: 2,
      lastObservedAt: '2026-10-13T04:30:00Z',
    },
    {
      id: 'ast-02',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      hostname: 'api-cluster-us-east.internal',
      ipAddress: '10.0.4.22',
      os: 'Ubuntu 24.04 LTS',
      criticality: 'HIGH',
      environment: 'Production',
      status: 'ACTIVE',
      tags: ['k8s-node', 'microservices', 'jwt-auth'],
      observedServices: ['8443/https (envoy)', '6443/kube-apiserver', '9100/node-exporter'],
      vulnerabilitiesCount: 1,
      lastObservedAt: '2026-10-13T04:25:00Z',
    },
    {
      id: 'ast-03',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      hostname: 'db-cluster-primary.apexdefense.internal',
      ipAddress: '10.0.4.40',
      os: 'Rocky Linux 9.3',
      criticality: 'CRITICAL',
      environment: 'Production',
      status: 'ACTIVE',
      tags: ['postgresql', 'vault-integrated', 'encrypted-at-rest'],
      observedServices: ['5432/postgresql (PostgreSQL 16.2)', '22/ssh'],
      vulnerabilitiesCount: 0,
      lastObservedAt: '2026-10-13T04:15:00Z',
    },
    {
      id: 'ast-04',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      hostname: 'backup-san-01.apexdefense.internal',
      ipAddress: '10.0.4.254',
      os: 'TrueNAS SCALE 23.10',
      criticality: 'CRITICAL',
      environment: 'Production',
      status: 'ACTIVE',
      tags: ['emergency-backup', 'excluded-from-scans'],
      observedServices: ['443/https', '2049/nfs'],
      vulnerabilitiesCount: 0,
      lastObservedAt: '2026-10-13T04:10:00Z',
    },
  ];

  const alerts: Alert[] = [
    {
      id: 'alt-101',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      title: 'Potential SSH Brute-Force Spray Detected on Edge Gateway',
      description: 'Multiple consecutive failed authentication attempts from untrusted external IP addresses exceeding 25 attempts/minute.',
      severity: 'HIGH',
      status: 'INVESTIGATING',
      source: 'Wazuh HIDS / Suricata',
      assetId: 'ast-01',
      assetHostname: 'edge-gw-01.apexdefense.internal',
      assignee: 'Sarah Chen',
      indicators: ['198.51.100.44', 'auth-fail-spike'],
      createdAt: '2026-10-13T03:52:10Z',
      updatedAt: '2026-10-13T04:12:00Z',
    },
    {
      id: 'alt-102',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      title: 'Anomalous Outbound DNS Tunneling Heuristic Alert',
      description: 'High entropy subdomain requests queried through edge gateway nameserver matching known data staging techniques.',
      severity: 'CRITICAL',
      status: 'NEW',
      source: 'Zeek CoreDNS Analyzer',
      assetId: 'ast-02',
      assetHostname: 'api-cluster-us-east.internal',
      assignee: 'Shafeek E M (Operator)',
      indicators: ['exfil-stage.dnshost.net', '203.0.113.89'],
      createdAt: '2026-10-13T04:18:22Z',
      updatedAt: '2026-10-13T04:18:22Z',
    },
    {
      id: 'alt-103',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      title: 'Privilege Escalation Vector in Staging Container Runtime',
      description: 'Container breakout mitigation triggered by AppArmor profile enforcement on worker daemon.',
      severity: 'MEDIUM',
      status: 'ACKNOWLEDGED',
      source: 'Falco Runtime Security',
      assetId: 'ast-02',
      assetHostname: 'api-cluster-us-east.internal',
      assignee: 'Alex Ross',
      indicators: ['cap_sys_admin_denied', 'cgroup_escape_prevented'],
      createdAt: '2026-10-13T02:40:00Z',
      updatedAt: '2026-10-13T03:10:00Z',
    },
  ];

  const incidents: Incident[] = [
    {
      id: 'inc-501',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      title: 'Targeted Credential Stuffing & Lateral Reconnaissance Attempt',
      summary: 'Automated adversary botnet targeting edge bastion ingress, correlated with DNS beaconing alerts.',
      severity: 'HIGH',
      stage: 'CONTAINMENT',
      leadResponder: 'Sarah Chen',
      affectedAssets: ['edge-gw-01.apexdefense.internal', 'api-cluster-us-east.internal'],
      relatedAlertIds: ['alt-101', 'alt-102'],
      timeline: [
        { timestamp: '2026-10-13T03:55:00Z', note: 'Incident declared following surge in high-confidence ingress alerts.', author: 'Sarah Chen' },
        { timestamp: '2026-10-13T04:05:00Z', note: 'Rate-limiting IP blocklist pushed to edge Cloudflare firewall.', author: 'Alex Ross' },
        { timestamp: '2026-10-13T04:20:00Z', note: 'Memory forensics session initiated to inspect potential compromised worker processes.', author: 'Sarah Chen' },
      ],
      tasks: [
        { id: 'tsk-01', title: 'Verify iptables / border firewall drop rules', completed: true, assignee: 'Alex Ross' },
        { id: 'tsk-02', title: 'Extract Zeek connection telemetry for past 6 hours', completed: true, assignee: 'Sarah Chen' },
        { id: 'tsk-03', title: 'Validate zero compromised identities in Entra / Keycloak', completed: false, assignee: 'Shafeek E M (Operator)' },
      ],
      containmentNotes: 'Ingress traffic from offending subnet 198.51.100.0/24 successfully dropped at edge BGP router.',
      createdAt: '2026-10-13T03:55:00Z',
      updatedAt: '2026-10-13T04:25:00Z',
    },
  ];

  const securityEvents: SecurityEvent[] = [
    {
      id: 'evt-01',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      source: 'Suricata-IDS',
      eventType: 'ET SCAN Potential SSH Scan OUTBOUND',
      severity: 'MEDIUM',
      sourceIp: '198.51.100.44',
      destinationIp: '10.0.4.10',
      protocol: 'TCP',
      port: 22,
      message: 'Suricata rule 2001219 matched repeated connection attempts',
      timestamp: '2026-10-13T04:42:15Z',
    },
    {
      id: 'evt-02',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      source: 'Nginx-Access',
      eventType: 'WAF Rule Violation',
      severity: 'HIGH',
      sourceIp: '203.0.113.89',
      destinationIp: '10.0.4.10',
      protocol: 'HTTPS',
      port: 443,
      message: 'SQL Injection signature detected in query param: id=1 UNION SELECT',
      timestamp: '2026-10-13T04:40:02Z',
    },
    {
      id: 'evt-03',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      source: 'CoreDNS',
      eventType: 'High Entropy Query',
      severity: 'CRITICAL',
      sourceIp: '10.0.4.22',
      destinationIp: '10.0.4.2',
      protocol: 'UDP',
      port: 53,
      message: 'Query 7f8a91b2c3d4e5f6.exfil-stage.dnshost.net exceeds entropy threshold 4.8',
      timestamp: '2026-10-13T04:18:20Z',
    },
  ];

  const vulnerabilities: Vulnerability[] = [
    {
      id: 'vuln-01',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      cveId: 'CVE-2024-6387',
      title: 'OpenSSH regreSSHion Remote Code Execution Vulnerability',
      description: 'Signal handler race condition in OpenSSH server allowing unauthenticated RCE on glibc-based Linux systems.',
      severity: 'CRITICAL',
      cvssScore: 8.1,
      status: 'IN_REMEDIATION',
      affectedAssetIds: ['ast-01'],
      remediationGuidance: 'Upgrade OpenSSH package to version >= 9.8p1 or apply vendor backported patch.',
      discoveredBy: 'Trivy System Audit',
      assignedTo: 'Alex Ross',
      dueDate: '2026-10-16',
      verified: true,
      createdAt: '2026-10-10T12:00:00Z',
    },
    {
      id: 'vuln-02',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      cveId: 'CVE-2023-44487',
      title: 'HTTP/2 Rapid Reset Denial of Service (Stream Reset Flood)',
      description: 'Flaw in HTTP/2 protocol stream handling allowing resource exhaustion via continuous stream resets.',
      severity: 'HIGH',
      cvssScore: 7.5,
      status: 'MITIGATED',
      affectedAssetIds: ['ast-01', 'ast-02'],
      remediationGuidance: 'Configure keepalive_requests and limit concurrent stream limits in reverse proxy.',
      discoveredBy: 'OWASP ZAP Assessment',
      assignedTo: 'Sarah Chen',
      dueDate: '2026-10-20',
      verified: true,
      createdAt: '2026-10-08T09:30:00Z',
    },
  ];

  const threatIndicators: ThreatIndicator[] = [
    {
      id: 'ioc-01',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      type: 'IP',
      value: '198.51.100.44',
      threatType: 'Known Credential Brute-Force Actor',
      confidence: 94,
      source: 'AlienVault OTX / AbuseIPDB',
      mitreTechnique: 'T1110.001 - Brute Force: Password Guessing',
      expiresAt: '2026-11-13T00:00:00Z',
      createdAt: '2026-10-12T14:00:00Z',
    },
    {
      id: 'ioc-02',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      type: 'DOMAIN',
      value: 'exfil-stage.dnshost.net',
      threatType: 'Suspected C2 / DNS Tunneling Infrastructure',
      confidence: 88,
      source: 'MISP Community Feed',
      mitreTechnique: 'T1071.004 - Application Layer Protocol: DNS',
      expiresAt: '2026-11-01T00:00:00Z',
      createdAt: '2026-10-13T04:00:00Z',
    },
    {
      id: 'ioc-03',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      type: 'FILE_HASH_SHA256',
      value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      threatType: 'Ransomware Dropper Stager Payload',
      confidence: 99,
      source: 'VirusTotal Intelligence',
      mitreTechnique: 'T1059.004 - Command and Scripting Interpreter: Unix Shell',
      expiresAt: '2027-01-01T00:00:00Z',
      createdAt: '2026-10-05T10:00:00Z',
    },
  ];

  const assessmentScopes: AssessmentScope[] = [
    {
      id: 'scope-q4-dmz',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      name: 'Q4 DMZ Perimeter Authorized Security Assessment',
      writtenAuthorizationRef: 'SEC-AUTH-2026-Q4-089 (Authorized by CISO Office)',
      targetInclusions: [
        '10.0.4.10',
        '10.0.4.22',
        '10.0.4.0/28',
        'edge-gw-01.apexdefense.internal',
        'api-cluster-us-east.internal',
      ],
      targetExclusions: [
        '10.0.4.1', // Default Gateway / Critical BGP router
        '10.0.4.254', // Emergency Backup SAN (CRITICAL - EXCLUDED)
        'backup-san-01.apexdefense.internal',
        '10.0.4.40', // Primary production database
      ],
      permittedTools: [
        'nmap',
        'testssl',
        'owasp-zap',
        'semgrep',
        'nikto',
        'trivy',
        'curl',
        'dig',
      ],
      state: 'ACTIVE',
      validFrom: '2026-10-01T00:00:00Z',
      validUntil: '2026-11-01T23:59:59Z',
      approvedBy: 'Shafeek E M (Operator)',
      approvedAt: '2026-10-01T09:00:00Z',
      emergencyStopContact: 'soc-emergency@apexdefense.internal / +1-555-0199',
    },
  ];

  const assessmentRuns: AssessmentRun[] = [
    {
      id: 'run-01',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      scopeId: 'scope-q4-dmz',
      toolId: 'nmap',
      target: '10.0.4.10',
      status: 'COMPLETED',
      policyEvaluation: {
        passed: true,
        reason: 'Target 10.0.4.10 is explicitly authorized within scope-q4-dmz. Tool nmap permitted. Authorization valid.',
        targetInScope: true,
        targetExcluded: false,
        toolPermitted: true,
        timeValid: true,
        approvalPresent: true,
      },
      dispatchedWorkerId: 'worker-primary-alpha',
      output: 'PORT   STATE SERVICE VERSION\n22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2\n80/tcp open  http    nginx 1.24.0\n443/tcp open ssl/http nginx 1.24.0\nService Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel',
      findingsCount: 1,
      startedAt: '2026-10-12T16:00:00Z',
      completedAt: '2026-10-12T16:02:18Z',
      createdAt: '2026-10-12T15:59:50Z',
    },
  ];

  const tools: ToolCatalogEntry[] = [
    // 1. Linux & Utilities
    {
      id: 'gnu-coreutils',
      name: 'GNU Coreutils & Text Utilities',
      category: 'Linux & Command-Line Utilities',
      description: 'Core GNU utilities including grep, awk, sed, jq, find, xargs, and standard stream processors.',
      officialUrl: 'https://www.gnu.org/software/coreutils/',
      license: 'GPLv3',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '9.4',
      lastVerificationDate: '2026-10-10',
      supportedEnvironments: ['JUPITER-SHELL', 'LAB-SHELL', 'Worker Host'],
      requiredPermissions: ['cli.execute'],
      requiresScopeAuthorization: false,
    },
    {
      id: 'curl',
      name: 'cURL & HTTPie',
      category: 'Linux & Command-Line Utilities',
      description: 'Command line tool and library for transferring data with URLs, supporting HTTP/HTTPS/FTP.',
      officialUrl: 'https://curl.se/',
      license: 'curl license (MIT-like)',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '8.5.0',
      lastVerificationDate: '2026-10-10',
      supportedEnvironments: ['JUPITER-SHELL', 'Worker Host'],
      requiredPermissions: ['cli.execute', 'net.outbound'],
      requiresScopeAuthorization: false,
    },
    // 2. Network Discovery & Diagnostics
    {
      id: 'nmap',
      name: 'Nmap Network Scanner',
      category: 'Network Discovery & Diagnostics',
      description: 'Network exploration tool and security / port scanner supporting advanced OS & version detection.',
      officialUrl: 'https://nmap.org/',
      license: 'NPSL / GPLv2 compatible',
      resourceClass: 'Medium',
      availabilityState: 'INSTALLED',
      verifiedVersion: '7.94SVN',
      lastVerificationDate: '2026-10-12',
      supportedEnvironments: ['ASSESSMENT-SHELL', 'Worker Host'],
      requiredPermissions: ['assessment.execute', 'net.raw_sockets'],
      requiresScopeAuthorization: true,
    },
    {
      id: 'rustscan',
      name: 'RustScan Modern Port Scanner',
      category: 'Network Discovery & Diagnostics',
      description: 'Fast, async port scanner written in Rust that discovers ports in seconds and pipes to Nmap.',
      officialUrl: 'https://github.com/RustScan/RustScan',
      license: 'GPLv3',
      resourceClass: 'Medium',
      availabilityState: 'AVAILABLE',
      verifiedVersion: '2.3.0',
      lastVerificationDate: '2026-10-09',
      supportedEnvironments: ['ASSESSMENT-SHELL'],
      requiredPermissions: ['assessment.execute'],
      requiresScopeAuthorization: true,
    },
    {
      id: 'tshark',
      name: 'TShark / Wireshark CLI',
      category: 'Network Discovery & Diagnostics',
      description: 'Network protocol analyzer that captures packet data and decodes hundreds of network protocols.',
      officialUrl: 'https://www.wireshark.org/docs/man-pages/tshark.html',
      license: 'GPLv2',
      resourceClass: 'Large',
      availabilityState: 'INSTALLED',
      verifiedVersion: '4.2.2',
      lastVerificationDate: '2026-10-11',
      supportedEnvironments: ['FORENSICS-SHELL', 'Worker Host'],
      requiredPermissions: ['forensics.read', 'net.capture'],
      requiresScopeAuthorization: false,
    },
    // 3. Web Application Security
    {
      id: 'owasp-zap',
      name: 'OWASP ZAP (Zed Attack Proxy)',
      category: 'Web Application Security',
      description: 'Full-featured web application vulnerability scanner and security assessment proxy.',
      officialUrl: 'https://www.zaproxy.org/',
      license: 'Apache 2.0',
      resourceClass: 'Medium',
      availabilityState: 'INSTALLED',
      verifiedVersion: '2.14.0',
      lastVerificationDate: '2026-10-12',
      supportedEnvironments: ['ASSESSMENT-SHELL', 'Worker Host'],
      requiredPermissions: ['assessment.web', 'assessment.execute'],
      requiresScopeAuthorization: true,
    },
    {
      id: 'nikto',
      name: 'Nikto Web Server Scanner',
      category: 'Web Application Security',
      description: 'Web server scanner that tests for over 6700 potentially dangerous files and outdated server software.',
      officialUrl: 'https://cirt.net/Nikto2',
      license: 'GPLv2',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '2.5.0',
      lastVerificationDate: '2026-10-08',
      supportedEnvironments: ['ASSESSMENT-SHELL'],
      requiredPermissions: ['assessment.web'],
      requiresScopeAuthorization: true,
    },
    {
      id: 'burp-suite',
      name: 'Burp Suite Professional Integration',
      category: 'Web Application Security',
      description: 'Commercial enterprise web penetration testing framework and REST API integration gateway.',
      officialUrl: 'https://portswigger.net/burp',
      license: 'Commercial License Required',
      resourceClass: 'Large',
      availabilityState: 'UNAVAILABLE',
      lastVerificationDate: undefined,
      supportedEnvironments: ['Requires Commercial License & Remote Worker'],
      requiredPermissions: ['enterprise.burp'],
      requiresScopeAuthorization: true,
    },
    // 4. Vulnerability Assessment & System Auditing
    {
      id: 'trivy',
      name: 'Trivy Security Scanner',
      category: 'Vulnerability Assessment & System Auditing',
      description: 'Comprehensive vulnerability scanner for containers, file systems, Git repositories, and cloud.',
      officialUrl: 'https://trivy.dev/',
      license: 'Apache 2.0',
      resourceClass: 'Medium',
      availabilityState: 'INSTALLED',
      verifiedVersion: '0.49.1',
      lastVerificationDate: '2026-10-12',
      supportedEnvironments: ['Worker Host', 'ANALYSIS-SHELL'],
      requiredPermissions: ['vuln.scan'],
      requiresScopeAuthorization: false,
    },
    {
      id: 'lynis',
      name: 'Lynis Host Security Auditor',
      category: 'Vulnerability Assessment & System Auditing',
      description: 'Battle-tested security auditing tool for systems running Linux, macOS, or Unix-based OS.',
      officialUrl: 'https://cisofy.com/lynis/',
      license: 'GPLv3',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '3.1.0',
      lastVerificationDate: '2026-10-10',
      supportedEnvironments: ['Worker Host'],
      requiredPermissions: ['audit.host'],
      requiresScopeAuthorization: false,
    },
    {
      id: 'greenbone-openvas',
      name: 'Greenbone Community / OpenVAS',
      category: 'Vulnerability Assessment & System Auditing',
      description: 'Full-featured vulnerability scanner with daily updated vulnerability management test feed.',
      officialUrl: 'https://www.greenbone.net/en/community-edition/',
      license: 'GPLv2',
      resourceClass: 'Enterprise',
      availabilityState: 'REQUIRES_REMOTE_WORKER',
      supportedEnvironments: ['Dedicated Cluster Node'],
      requiredPermissions: ['assessment.enterprise_scan'],
      requiresScopeAuthorization: true,
    },
    // 5. Password Security & Credential Auditing
    {
      id: 'john-the-ripper',
      name: 'John the Ripper Jumbo',
      category: 'Password Security & Credential Auditing',
      description: 'Fast password cracker supporting hundreds of hash and cipher types for authorized auditing.',
      officialUrl: 'https://www.openwall.com/john/',
      license: 'GPLv2',
      resourceClass: 'Large',
      availabilityState: 'AVAILABLE',
      verifiedVersion: '1.9.0-jumbo-1',
      lastVerificationDate: '2026-10-05',
      supportedEnvironments: ['ASSESSMENT-SHELL'],
      requiredPermissions: ['assessment.credentials'],
      requiresScopeAuthorization: true,
    },
    {
      id: 'gitleaks',
      name: 'Gitleaks Secret Scanner',
      category: 'Password Security & Credential Auditing',
      description: 'SAST tool for detecting and preventing hardcoded secrets like passwords, api keys, and tokens in git.',
      officialUrl: 'https://github.com/gitleaks/gitleaks',
      license: 'MIT',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '8.18.2',
      lastVerificationDate: '2026-10-11',
      supportedEnvironments: ['Worker Host', 'ANALYSIS-SHELL'],
      requiredPermissions: ['code.audit'],
      requiresScopeAuthorization: false,
    },
    // 6. Wireless & Radio Security
    {
      id: 'aircrack-ng',
      name: 'Aircrack-ng Suite',
      category: 'Wireless & Radio Security',
      description: 'Complete suite of tools to assess WiFi network security. Requires compatible physical wireless adapter.',
      officialUrl: 'https://www.aircrack-ng.org/',
      license: 'GPLv2',
      resourceClass: 'Medium',
      availabilityState: 'UNAVAILABLE',
      supportedEnvironments: ['Requires Dedicated Hardware RF Transceiver'],
      requiredPermissions: ['wireless.rf_access'],
      requiresScopeAuthorization: true,
    },
    // 7. Digital Forensics & Incident Response
    {
      id: 'sleuthkit',
      name: 'The Sleuth Kit (TSK)',
      category: 'Digital Forensics & Incident Response',
      description: 'Library and collection of command line tools that allow you to investigate disk images.',
      officialUrl: 'https://www.sleuthkit.org/',
      license: 'CPL / IBM Public License',
      resourceClass: 'Large',
      availabilityState: 'INSTALLED',
      verifiedVersion: '4.12.1',
      lastVerificationDate: '2026-10-09',
      supportedEnvironments: ['FORENSICS-SHELL', 'Worker Host'],
      requiredPermissions: ['forensics.analyze'],
      requiresScopeAuthorization: false,
    },
    {
      id: 'volatility3',
      name: 'Volatility 3 Memory Forensics',
      category: 'Digital Forensics & Incident Response',
      description: 'Advanced memory forensics framework for incident response and malware analysis.',
      officialUrl: 'https://www.volatilityfoundation.org/',
      license: 'Vapor License (Volatile Systems)',
      resourceClass: 'Large',
      availabilityState: 'AVAILABLE',
      verifiedVersion: '2.5.2',
      lastVerificationDate: '2026-10-07',
      supportedEnvironments: ['FORENSICS-SHELL'],
      requiredPermissions: ['forensics.memory'],
      requiresScopeAuthorization: false,
    },
    // 8. Malware Analysis & Reverse Engineering
    {
      id: 'ghidra',
      name: 'NSA Ghidra Software Reverse Engineering',
      category: 'Malware Analysis & Reverse Engineering',
      description: 'Software reverse engineering framework created and maintained by the National Security Agency.',
      officialUrl: 'https://ghidra-sre.org/',
      license: 'Apache 2.0',
      resourceClass: 'Large',
      availabilityState: 'AVAILABLE',
      verifiedVersion: '11.0.1',
      lastVerificationDate: '2026-10-08',
      supportedEnvironments: ['ANALYSIS-SHELL'],
      requiredPermissions: ['malware.reverse'],
      requiresScopeAuthorization: false,
    },
    {
      id: 'yara',
      name: 'YARA Pattern Matching Swiss Army Knife',
      category: 'Malware Analysis & Reverse Engineering',
      description: 'Tool aimed at helping malware researchers identify and classify malware samples.',
      officialUrl: 'https://virustotal.github.io/yara/',
      license: 'BSD 3-Clause',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '4.5.0',
      lastVerificationDate: '2026-10-12',
      supportedEnvironments: ['Worker Host', 'ANALYSIS-SHELL'],
      requiredPermissions: ['malware.yara'],
      requiresScopeAuthorization: false,
    },
    // 9. Active Directory & Identity Security
    {
      id: 'bloodhound',
      name: 'BloodHound Community Edition',
      category: 'Active Directory & Identity Security',
      description: 'Graph theory tool for uncovering hidden and unintended relationships in Active Directory domains.',
      officialUrl: 'https://github.com/SpecterOps/BloodHound',
      license: 'GPLv3',
      resourceClass: 'Medium',
      availabilityState: 'AVAILABLE',
      verifiedVersion: '5.10.0',
      lastVerificationDate: '2026-10-06',
      supportedEnvironments: ['ASSESSMENT-SHELL'],
      requiredPermissions: ['assessment.activedirectory'],
      requiresScopeAuthorization: true,
    },
    // 10. Cloud Security
    {
      id: 'prowler',
      name: 'Prowler Multi-Cloud Security Assessment',
      category: 'Cloud Security',
      description: 'Open source security tool for AWS, Azure, GCP, and Kubernetes CIS benchmarks.',
      officialUrl: 'https://github.com/prowler-cloud/prowler',
      license: 'Apache 2.0',
      resourceClass: 'Medium',
      availabilityState: 'INSTALLED',
      verifiedVersion: '4.1.2',
      lastVerificationDate: '2026-10-11',
      supportedEnvironments: ['Worker Host'],
      requiredPermissions: ['cloud.audit'],
      requiresScopeAuthorization: true,
    },
    // 11. Source Code & Supply Chain Security
    {
      id: 'semgrep',
      name: 'Semgrep Static Analysis Engine',
      category: 'Source Code & Supply-Chain Security',
      description: 'Fast, open-source static analysis engine for finding bugs, detecting vulnerabilities, and enforcing standards.',
      officialUrl: 'https://semgrep.dev/',
      license: 'LGPLv2.1',
      resourceClass: 'Medium',
      availabilityState: 'INSTALLED',
      verifiedVersion: '1.65.0',
      lastVerificationDate: '2026-10-12',
      supportedEnvironments: ['Worker Host'],
      requiredPermissions: ['code.audit'],
      requiresScopeAuthorization: false,
    },
    // 12. OSINT & Threat Intelligence
    {
      id: 'theharvester',
      name: 'theHarvester OSINT Reconnaissance',
      category: 'OSINT & Threat Intelligence',
      description: 'E-mails, subdomains and names harvester using multiple public data sources.',
      officialUrl: 'https://github.com/laramies/theHarvester',
      license: 'GPLv2',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '4.4.4',
      lastVerificationDate: '2026-10-10',
      supportedEnvironments: ['Worker Host'],
      requiredPermissions: ['osint.gather'],
      requiresScopeAuthorization: false,
    },
    // 13. SIEM, SOC & Threat Hunting
    {
      id: 'wazuh',
      name: 'Wazuh Open Source Security Platform',
      category: 'SIEM, SOC & Threat Hunting',
      description: 'Unified XDR and SIEM protection for endpoints and cloud workloads.',
      officialUrl: 'https://wazuh.com/',
      license: 'GPLv2',
      resourceClass: 'Enterprise',
      availabilityState: 'INSTALLED',
      verifiedVersion: '4.8.0',
      lastVerificationDate: '2026-10-13',
      supportedEnvironments: ['Dedicated Cluster Node'],
      requiredPermissions: ['soc.admin'],
      requiresScopeAuthorization: false,
    },
    // 14. Exploit Research & Labs
    {
      id: 'metasploit',
      name: 'Metasploit Framework',
      category: 'Exploit Research & Secure Laboratory Testing',
      description: 'Penetration testing framework for security auditing and exploit validation. Restrict to authorized targets.',
      officialUrl: 'https://www.metasploit.com/',
      license: 'BSD 3-Clause',
      resourceClass: 'Medium',
      availabilityState: 'AVAILABLE',
      verifiedVersion: '6.4.2',
      lastVerificationDate: '2026-10-09',
      supportedEnvironments: ['ASSESSMENT-SHELL', 'LAB-SHELL'],
      requiredPermissions: ['assessment.exploit'],
      requiresScopeAuthorization: true,
    },
    // 15. API Security
    {
      id: 'schemathesis',
      name: 'Schemathesis API Fuzzing',
      category: 'API Security',
      description: 'Specification-based testing tool for Open API and GraphQL applications.',
      officialUrl: 'https://schemathesis.readthedocs.io/',
      license: 'MIT',
      resourceClass: 'Medium',
      availabilityState: 'AVAILABLE',
      verifiedVersion: '3.25.0',
      lastVerificationDate: '2026-10-08',
      supportedEnvironments: ['ASSESSMENT-SHELL'],
      requiredPermissions: ['assessment.api'],
      requiresScopeAuthorization: true,
    },
    // 16. Mobile Application Security
    {
      id: 'mobsf',
      name: 'MobSF (Mobile Security Framework)',
      category: 'Mobile Application Security',
      description: 'Automated, all-in-one mobile application (Android/iOS) pen-testing and malware analysis framework.',
      officialUrl: 'https://github.com/MobSF/Mobile-Security-Framework-MobSF',
      license: 'GPLv3',
      resourceClass: 'Large',
      availabilityState: 'REQUIRES_REMOTE_WORKER',
      supportedEnvironments: ['Isolated Lab VM'],
      requiredPermissions: ['mobile.audit'],
      requiresScopeAuthorization: true,
    },
    // 17. Cryptography & Certificate Management
    {
      id: 'testssl',
      name: 'testssl.sh TLS/SSL Cipher Checker',
      category: 'Cryptography & Certificate Management',
      description: 'Free command-line tool which checks a server\'s service on any port for the support of TLS/SSL ciphers and flaws.',
      officialUrl: 'https://testssl.sh/',
      license: 'GPLv2',
      resourceClass: 'Small',
      availabilityState: 'INSTALLED',
      verifiedVersion: '3.0.8',
      lastVerificationDate: '2026-10-12',
      supportedEnvironments: ['Worker Host', 'ASSESSMENT-SHELL'],
      requiredPermissions: ['crypto.test'],
      requiresScopeAuthorization: true,
    },
    // 18. Containers & Virtualization
    {
      id: 'docker-cli',
      name: 'Docker Engine CLI & Containerd',
      category: 'Containers, Virtualization & Laboratory Infrastructure',
      description: 'Container virtualization runtime for running isolated security tool micro-containers.',
      officialUrl: 'https://www.docker.com/',
      license: 'Apache 2.0',
      resourceClass: 'Medium',
      availabilityState: 'INSTALLED',
      verifiedVersion: '26.0.0',
      lastVerificationDate: '2026-10-12',
      supportedEnvironments: ['Worker Host'],
      requiredPermissions: ['container.exec'],
      requiresScopeAuthorization: false,
    },
  ];

  const workers: WorkerNode[] = [
    {
      id: 'worker-primary-alpha',
      name: 'Worker Node Alpha (Ingress Execution)',
      environment: 'Isolated MicroVM Cluster',
      os: 'Debian 12 (Hardened Kernel 6.6)',
      architecture: 'x86_64',
      cpuCores: 8,
      memoryGb: 16,
      storageGb: 200,
      status: 'HEALTHY',
      networkPolicy: 'RESTRICTED_EGRESS',
      installedToolIds: ['gnu-coreutils', 'curl', 'nmap', 'owasp-zap', 'trivy', 'lynis', 'gitleaks', 'yara', 'prowler', 'semgrep', 'testssl'],
      activeJobsCount: 0,
      lastCheckAt: '2026-10-13T04:45:00Z',
      statusDetails: 'All daemon health checks passing. Heartbeat 42ms.',
    },
    {
      id: 'worker-forensics-01',
      name: 'Worker Node Gamma (Forensic Processing)',
      environment: 'High-RAM Storage Enclave',
      os: 'Ubuntu 24.04 (Air-gapped Storage)',
      architecture: 'x86_64',
      cpuCores: 16,
      memoryGb: 64,
      storageGb: 1000,
      status: 'HEALTHY',
      networkPolicy: 'ISOLATED_NO_NET',
      installedToolIds: ['sleuthkit', 'tshark', 'yara'],
      activeJobsCount: 0,
      lastCheckAt: '2026-10-13T04:44:30Z',
      statusDetails: 'Read-only storage mounts verified. Integrity checks nominal.',
    },
    {
      id: 'worker-remote-cloud',
      name: 'Worker Node Delta (Enterprise Scanners)',
      environment: 'AWS Dedicated VPC',
      os: 'Enterprise Linux 9',
      architecture: 'x86_64',
      cpuCores: 32,
      memoryGb: 128,
      storageGb: 2000,
      status: 'MAINTENANCE',
      networkPolicy: 'RESTRICTED_EGRESS',
      installedToolIds: ['greenbone-openvas', 'wazuh'],
      activeJobsCount: 0,
      lastCheckAt: '2026-10-13T03:30:00Z',
      statusDetails: 'Scheduled maintenance window for patch deployment.',
    },
  ];

  const sampleEvidenceContent = 'JUPITER SECURITY EVIDENCE ACQUISITION RECORD\nTarget: 10.0.4.10\nCollector: Wazuh HIDS Agent\nArtifact: TCP Dump segment during SSH brute force\nSHA256: 3a54b38d61... Verified.';
  const sampleHash = crypto.createHash('sha256').update(sampleEvidenceContent).digest('hex');

  const evidence: EvidenceItem[] = [
    {
      id: 'evd-01',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      title: 'Packet Capture: Ingress SSH Brute-Force Spray Sample',
      description: 'Pcapng capture of external TCP SYN packets on port 22 originating from 198.51.100.44.',
      filename: 'ssh_spray_capture_20261013.pcapng',
      contentType: 'application/vnd.tcpdump.pcap',
      sizeBytes: 142850,
      sha256Hash: sampleHash,
      classification: 'RESTRICTED',
      uploadedBy: 'Sarah Chen',
      chainOfCustody: [
        {
          timestamp: '2026-10-13T04:00:15Z',
          action: 'EVIDENCE_INGESTED',
          actor: 'Sarah Chen',
          details: 'Captured directly from edge-gw-01 ingress interface eth0 via tcpdump.',
        },
        {
          timestamp: '2026-10-13T04:02:00Z',
          action: 'INTEGRITY_VERIFIED',
          actor: 'System Automated Guard',
          details: `SHA-256 hash verified: ${sampleHash}`,
        },
      ],
      createdAt: '2026-10-13T04:00:15Z',
    },
  ];

  const labs: SecurityLab[] = [
    {
      id: 'lab-01',
      name: 'SOC Triage: Investigating Ingress Reconnaissance',
      profile: 'LAB-SHELL',
      difficulty: 'Beginner',
      description: 'Practice analyzing realistic auth logs, identifying offending IP subnets, and drafting iptables block rules.',
      targetEnvironment: 'Synthetic DMZ Sandbox (Ubuntu 24.04)',
      status: 'READY',
      expiresInMinutes: 60,
    },
    {
      id: 'lab-02',
      name: 'Authorized Assessment: Perimeter Service Auditing',
      profile: 'ASSESSMENT-SHELL',
      difficulty: 'Intermediate',
      description: 'Execute scope-restricted port discovery, service version detection, and TLS cipher analysis on test machines.',
      targetEnvironment: 'Isolated Lab Network (172.28.0.0/24)',
      status: 'READY',
      expiresInMinutes: 90,
    },
    {
      id: 'lab-03',
      name: 'Digital Forensics: Linux Memory & Disk Artifacts',
      profile: 'FORENSICS-SHELL',
      difficulty: 'Advanced',
      description: 'Analyze raw memory dumps using Volatility 3 to uncover injected shellcode and rogue cron jobs.',
      targetEnvironment: 'Forensics Enclave (Read-Only Disk Images)',
      status: 'READY',
      expiresInMinutes: 120,
    },
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: 'aud-001',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      actor: 'Shafeek E M (Operator)',
      action: 'ASSESSMENT_SCOPE_APPROVED',
      resource: 'scope-q4-dmz',
      result: 'ALLOWED',
      reason: 'Written authorization reference SEC-AUTH-2026-Q4-089 validated.',
      correlationId: 'corr-init-001',
      ipAddress: '10.0.1.50',
      timestamp: '2026-10-01T09:00:00Z',
    },
    {
      id: 'aud-002',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      actor: 'Sarah Chen',
      action: 'EVIDENCE_INGEST',
      resource: 'evd-01',
      result: 'ALLOWED',
      reason: 'Chain-of-custody recorded and initial SHA-256 computed.',
      correlationId: 'corr-evd-001',
      ipAddress: '10.0.1.55',
      timestamp: '2026-10-13T04:00:15Z',
    },
    {
      id: 'aud-003',
      organizationId: 'org-apex',
      projectId: 'proj-core',
      actor: 'Alex Ross',
      action: 'ASSESSMENT_RUN_DISPATCH',
      resource: 'nmap -> 10.0.4.10',
      result: 'ALLOWED',
      reason: 'Target is authorized in scope-q4-dmz.',
      correlationId: 'corr-run-001',
      ipAddress: '10.0.1.52',
      timestamp: '2026-10-12T16:00:00Z',
    },
  ];

  const compliance: ComplianceFramework[] = [
    {
      id: 'soc2',
      name: 'SOC 2 Type II (Security & Confidentiality)',
      version: '2024 Trust Services Criteria',
      totalControls: 64,
      compliantControls: 58,
      inProgressControls: 4,
      gapControls: 2,
      lastAssessedAt: '2026-10-01',
      certificationStatus: 'SELF_ASSESSED',
    },
    {
      id: 'iso27001',
      name: 'ISO/IEC 27001:2022',
      version: 'Annex A Information Security Controls',
      totalControls: 93,
      compliantControls: 84,
      inProgressControls: 7,
      gapControls: 2,
      lastAssessedAt: '2026-09-15',
      certificationStatus: 'INDEPENDENT_AUDIT_PENDING',
    },
    {
      id: 'pci-dss',
      name: 'PCI-DSS v4.0.1',
      version: 'Requirement 11 - Regular Testing',
      totalControls: 48,
      compliantControls: 42,
      inProgressControls: 5,
      gapControls: 1,
      lastAssessedAt: '2026-10-10',
      certificationStatus: 'SELF_ASSESSED',
    },
  ];

  return {
    organizations: [org1, org2],
    projects: [proj1, proj2],
    users,
    assets,
    alerts,
    incidents,
    securityEvents,
    vulnerabilities,
    threatIndicators,
    assessmentScopes,
    assessmentRuns,
    tools,
    workers,
    evidence,
    labs,
    auditEvents,
    compliance,
  };
}

let dbInstance: JupiterDB | null = null;

export function getDB(): JupiterDB {
  if (dbInstance) {
    return dbInstance;
  }

  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      dbInstance = JSON.parse(content);
      return dbInstance!;
    } catch (err) {
      console.error('Error reading jupiter_db.json, re-seeding:', err);
    }
  }

  dbInstance = seedDatabase();
  saveDB();
  return dbInstance;
}

export function saveDB(): void {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbInstance, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save jupiter_db.json:', err);
  }
}
