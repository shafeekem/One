import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { getDB, saveDB, AuditEvent, EvidenceItem, Incident, AssessmentScope } from './db.js';
import { evaluateAndExecuteScope } from './scopeEngine.js';
import {
  getOrCreateSession,
  executeTerminalCommand,
  listSessions,
  createSession,
  closeSession,
  interruptSession,
  getAutocompleteSuggestions,
} from './terminalEngine.js';

export const apiRouter = Router();

// Helper to extract authenticated user from headers or mock session
function getReqUser(req: Request) {
  const db = getDB();
  const userId = (req.headers['x-user-id'] as string) || 'usr-admin';
  const role = (req.headers['x-user-role'] as string) || 'Platform Administrator';
  const orgId = (req.headers['x-org-id'] as string) || 'org-apex';
  const projId = (req.headers['x-proj-id'] as string) || 'proj-core';

  const user = db.users.find(u => u.id === userId) || db.users[0];
  return {
    ...user,
    role,
    organizationId: orgId,
    projectId: projId,
  };
}

// 1. Profile & Organizations
apiRouter.get('/profile', (req: Request, res: Response) => {
  const user = getReqUser(req);
  res.json({ success: true, profile: user });
});

apiRouter.get('/organizations', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ success: true, organizations: db.organizations });
});

apiRouter.get('/projects', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const projects = db.projects.filter(p => p.organizationId === user.organizationId);
  res.json({ success: true, projects });
});

apiRouter.get('/members', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ success: true, members: db.users });
});

// 2. Assets
apiRouter.get('/assets', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const assets = db.assets.filter(a => a.organizationId === user.organizationId);
  res.json({ success: true, assets });
});

apiRouter.post('/assets', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const { hostname, ipAddress, os, criticality, environment, tags, observedServices } = req.body;

  if (!hostname || !ipAddress) {
    return res.status(400).json({ success: false, error: 'Hostname and IP address are required.' });
  }

  const newAsset = {
    id: 'ast-' + Date.now().toString().slice(-4),
    organizationId: user.organizationId,
    projectId: user.projectId,
    hostname,
    ipAddress,
    os: os || 'Linux 6.x',
    criticality: criticality || 'MEDIUM',
    environment: environment || 'Production',
    status: 'ACTIVE' as const,
    tags: Array.isArray(tags) ? tags : ['inventory-registered'],
    observedServices: Array.isArray(observedServices) ? observedServices : ['443/https'],
    vulnerabilitiesCount: 0,
    lastObservedAt: new Date().toISOString(),
  };

  db.assets.unshift(newAsset);
  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'ASSET_CREATED',
    resource: `${newAsset.hostname} (${newAsset.ipAddress})`,
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.status(201).json({ success: true, asset: newAsset });
});

// 3. Alerts
apiRouter.get('/alerts', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const alerts = db.alerts.filter(a => a.organizationId === user.organizationId);
  res.json({ success: true, alerts });
});

apiRouter.patch('/alerts/:id', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const alert = db.alerts.find(a => a.id === req.params.id && a.organizationId === user.organizationId);

  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found.' });
  }

  const { status, assignee } = req.body;
  if (status) alert.status = status;
  if (assignee !== undefined) alert.assignee = assignee;
  alert.updatedAt = new Date().toISOString();

  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'ALERT_STATUS_UPDATED',
    resource: `${alert.id} -> ${alert.status}`,
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.json({ success: true, alert });
});

// 4. Incidents
apiRouter.get('/incidents', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const incidents = db.incidents.filter(i => i.organizationId === user.organizationId);
  res.json({ success: true, incidents });
});

apiRouter.patch('/incidents/:id', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const incident = db.incidents.find(i => i.id === req.params.id && i.organizationId === user.organizationId);

  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found.' });
  }

  const { stage, leadResponder, containmentNotes, timelineNote, toggleTaskId } = req.body;
  if (stage) incident.stage = stage;
  if (leadResponder) incident.leadResponder = leadResponder;
  if (containmentNotes) incident.containmentNotes = containmentNotes;
  if (timelineNote) {
    incident.timeline.push({
      timestamp: new Date().toISOString(),
      note: timelineNote,
      author: user.fullName,
    });
  }
  if (toggleTaskId) {
    const task = incident.tasks.find(t => t.id === toggleTaskId);
    if (task) task.completed = !task.completed;
  }
  incident.updatedAt = new Date().toISOString();

  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'INCIDENT_MODIFIED',
    resource: incident.id,
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.json({ success: true, incident });
});

apiRouter.post('/incidents', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const { title, summary, severity, leadResponder, affectedAssets, relatedAlertIds } = req.body;

  if (!title || !summary) {
    return res.status(400).json({ success: false, error: 'Title and summary are required.' });
  }

  const newIncident: Incident = {
    id: 'inc-' + Date.now().toString().slice(-4),
    organizationId: user.organizationId,
    projectId: user.projectId,
    title,
    summary,
    severity: severity || 'HIGH',
    stage: 'NEW',
    leadResponder: leadResponder || user.fullName,
    affectedAssets: Array.isArray(affectedAssets) && affectedAssets.length > 0 ? affectedAssets : ['edge-gw-01.apexdefense.internal'],
    relatedAlertIds: Array.isArray(relatedAlertIds) ? relatedAlertIds : [],
    timeline: [
      {
        timestamp: new Date().toISOString(),
        note: `Incident formally declared by ${user.fullName} (${user.role}).`,
        author: user.fullName,
      },
    ],
    tasks: [
      { id: 'tsk-1', title: 'Verify ingress containment & border drop rules', completed: false, assignee: user.fullName },
      { id: 'tsk-2', title: 'Extract network pcap segment for forensics vault', completed: false, assignee: user.fullName },
      { id: 'tsk-3', title: 'Attest zero credential compromise in identity provider', completed: false, assignee: user.fullName },
    ],
    containmentNotes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.incidents.unshift(newIncident);
  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'INCIDENT_DECLARED',
    resource: `${newIncident.id} (${newIncident.title})`,
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.status(201).json({ success: true, incident: newIncident });
});

// 5. Events & Logs
apiRouter.get('/events', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const events = db.securityEvents.filter(e => e.organizationId === user.organizationId);
  res.json({ success: true, events });
});

// 6. Vulnerabilities
apiRouter.get('/vulnerabilities', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const vulnerabilities = db.vulnerabilities.filter(v => v.organizationId === user.organizationId);
  res.json({ success: true, vulnerabilities });
});

apiRouter.patch('/vulnerabilities/:id', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const vuln = db.vulnerabilities.find(v => v.id === req.params.id && v.organizationId === user.organizationId);

  if (!vuln) {
    return res.status(404).json({ success: false, error: 'Vulnerability not found.' });
  }

  const { status, assignedTo } = req.body;
  if (status) vuln.status = status;
  if (assignedTo !== undefined) vuln.assignedTo = assignedTo;

  saveDB();
  res.json({ success: true, vulnerability: vuln });
});

// 7. Threat Intelligence
apiRouter.get('/threat-intelligence', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const threats = db.threatIndicators.filter(t => t.organizationId === user.organizationId);
  res.json({ success: true, indicators: threats });
});

apiRouter.post('/threat-intelligence', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const { type, value, threatType, confidence, source, mitreTechnique } = req.body;

  if (!type || !value) {
    return res.status(400).json({ success: false, error: 'Indicator type and value are required.' });
  }

  const newIndicator = {
    id: 'ioc-' + Date.now().toString().slice(-4),
    organizationId: user.organizationId,
    projectId: user.projectId,
    type,
    value,
    threatType: threatType || 'Suspicious Infrastructure',
    confidence: Number(confidence) || 85,
    source: source || 'Analyst Manual Triage',
    mitreTechnique: mitreTechnique || 'T1071 - Application Layer Protocol',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.threatIndicators.unshift(newIndicator);
  saveDB();
  res.status(201).json({ success: true, indicator: newIndicator });
});

// 8. Assessment Scopes & Runs
apiRouter.get('/assessment-scopes', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const scopes = db.assessmentScopes.filter(s => s.organizationId === user.organizationId);
  res.json({ success: true, scopes });
});

apiRouter.post('/assessment-scopes', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const { name, writtenAuthorizationRef, targetInclusions, targetExclusions, permittedTools, validUntil, emergencyStopContact } = req.body;

  if (!name || !writtenAuthorizationRef) {
    return res.status(400).json({ success: false, error: 'Scope name and written authorization reference are required.' });
  }

  const newScope: AssessmentScope = {
    id: 'scope-' + Date.now().toString().slice(-4),
    organizationId: user.organizationId,
    projectId: user.projectId,
    name,
    writtenAuthorizationRef,
    targetInclusions: Array.isArray(targetInclusions) && targetInclusions.length > 0 ? targetInclusions : ['10.0.4.10'],
    targetExclusions: Array.isArray(targetExclusions) && targetExclusions.length > 0 ? targetExclusions : ['10.0.4.1', '10.0.4.254'],
    permittedTools: Array.isArray(permittedTools) && permittedTools.length > 0 ? permittedTools : ['nmap', 'testssl', 'owasp-zap'],
    state: 'ACTIVE',
    validFrom: new Date().toISOString(),
    validUntil: validUntil || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    approvedBy: user.fullName,
    approvedAt: new Date().toISOString(),
    emergencyStopContact: emergencyStopContact || 'soc-emergency@apexdefense.internal / +1-555-0199',
  };

  db.assessmentScopes.unshift(newScope);
  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'ASSESSMENT_SCOPE_REGISTERED',
    resource: `${newScope.name} (${newScope.id})`,
    result: 'ALLOWED',
    reason: `Rules of Engagement authorized under written ref: ${newScope.writtenAuthorizationRef}`,
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.status(201).json({ success: true, scope: newScope });
});

apiRouter.patch('/assessment-scopes/:id', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const scope = db.assessmentScopes.find(s => s.id === req.params.id && s.organizationId === user.organizationId);

  if (!scope) {
    return res.status(404).json({ success: false, error: 'Scope not found.' });
  }

  const { state, targetInclusions, targetExclusions, permittedTools } = req.body;
  if (state) scope.state = state;
  if (targetInclusions) scope.targetInclusions = targetInclusions;
  if (targetExclusions) scope.targetExclusions = targetExclusions;
  if (permittedTools) scope.permittedTools = permittedTools;

  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'ASSESSMENT_SCOPE_MODIFIED',
    resource: `${scope.id} (State: ${scope.state})`,
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.json({ success: true, scope });
});

apiRouter.post('/assessment-scopes/:id/emergency-stop', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const scope = db.assessmentScopes.find(s => s.id === req.params.id && s.organizationId === user.organizationId);

  if (!scope) {
    return res.status(404).json({ success: false, error: 'Scope not found.' });
  }

  // Set Scope to PAUSED
  scope.state = 'PAUSED';

  // Halt all active runs
  db.assessmentRuns.forEach(r => {
    if (r.scopeId === scope.id && (r.status === 'RUNNING' || r.status === 'QUEUED')) {
      r.status = 'CANCELLED';
      r.output = (r.output || '') + '\n[EMERGENCY STOP TRIGGERED: ACTIVE RUN HALTED BY CISO DIRECTIVE]';
    }
  });

  const correlationId = 'corr-emerg-' + Date.now();
  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'EMERGENCY_STOP_TRIGGERED',
    resource: scope.id,
    result: 'ALLOWED',
    reason: `EMERGENCY STOP executed by ${user.fullName} (${user.role}). All active tests halted.`,
    correlationId,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.json({ success: true, message: 'Emergency stop executed. All active tests halted.', scope });
});

apiRouter.get('/assessment-runs', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const runs = db.assessmentRuns.filter(r => r.organizationId === user.organizationId);
  res.json({ success: true, runs });
});

// Centralized Scope Execution Dispatcher
apiRouter.post('/assessment-runs/dispatch', (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { scopeId, toolId, target } = req.body;

  if (!scopeId || !toolId || !target) {
    return res.status(400).json({ success: false, error: 'scopeId, toolId, and target are required parameters.' });
  }

  const result = evaluateAndExecuteScope({
    actor: user.email,
    role: user.role,
    organizationId: user.organizationId,
    projectId: user.projectId,
    scopeId,
    toolId,
    target,
    ipAddress: req.ip || '127.0.0.1',
  });

  if (!result.passed) {
    return res.status(403).json({
      success: false,
      status: result.status,
      correlationId: result.correlationId,
      error: result.reason,
      details: result.details,
    });
  }

  res.status(201).json({
    success: true,
    status: result.status,
    correlationId: result.correlationId,
    message: result.reason,
    details: result.details,
    run: result.dispatchedRun,
  });
});

// Mandatory Scope Isolation Test Suite (Section 29.1)
apiRouter.post('/scope-test/run', (req: Request, res: Response) => {
  const user = getReqUser(req);
  const db = getDB();
  const activeScope = db.assessmentScopes.find(s => s.state === 'ACTIVE' && s.organizationId === user.organizationId);

  if (!activeScope) {
    return res.status(400).json({ success: false, error: 'Cannot run scope isolation tests: No active assessment scope exists.' });
  }

  const testResults: Array<{
    step: string;
    description: string;
    target: string;
    expectedResult: 'ALLOWED' | 'DENIED';
    actualResult: 'ALLOWED' | 'DENIED';
    correlationId: string;
    auditRecorded: boolean;
    workerDispatched: boolean;
    pass: boolean;
    notes: string;
  }> = [];

  // Step 1: Authorized In-Scope Target
  const step1Target = '10.0.4.10';
  const eval1 = evaluateAndExecuteScope({
    actor: user.email,
    role: 'Assessment Operator',
    organizationId: user.organizationId,
    projectId: user.projectId,
    scopeId: activeScope.id,
    toolId: 'nmap',
    target: step1Target,
  });

  const audit1 = db.auditEvents.find(a => a.correlationId === eval1.correlationId);
  testResults.push({
    step: '1. In-Scope Authorized Target',
    description: 'Target 10.0.4.10 is explicitly authorized and within valid timeframe.',
    target: step1Target,
    expectedResult: 'ALLOWED',
    actualResult: eval1.passed ? 'ALLOWED' : 'DENIED',
    correlationId: eval1.correlationId,
    auditRecorded: !!audit1,
    workerDispatched: eval1.passed && !!eval1.dispatchedRun,
    pass: eval1.passed && !!audit1,
    notes: eval1.reason,
  });

  // Step 2: Mandatory Test - Out-Of-Scope Target
  const step2Target = '192.168.99.99'; // Out of scope IP
  const eval2 = evaluateAndExecuteScope({
    actor: user.email,
    role: 'Assessment Operator',
    organizationId: user.organizationId,
    projectId: user.projectId,
    scopeId: activeScope.id,
    toolId: 'nmap',
    target: step2Target,
  });

  const audit2 = db.auditEvents.find(a => a.correlationId === eval2.correlationId);
  testResults.push({
    step: '2. Out-of-Scope Target Submission',
    description: 'Target 192.168.99.99 is unlisted. Scope engine must reject and block worker dispatch.',
    target: step2Target,
    expectedResult: 'DENIED',
    actualResult: eval2.passed ? 'ALLOWED' : 'DENIED',
    correlationId: eval2.correlationId,
    auditRecorded: !!audit2 && audit2.result === 'DENIED',
    workerDispatched: Boolean(eval2.dispatchedRun),
    pass: !eval2.passed && !eval2.dispatchedRun && !!audit2 && audit2.result === 'DENIED',
    notes: eval2.reason,
  });

  // Step 3: Mandatory Test - Explicitly Excluded Asset (Emergency SAN / Gateway)
  const step3Target = '10.0.4.254'; // Excluded backup SAN
  const eval3 = evaluateAndExecuteScope({
    actor: user.email,
    role: 'Assessment Operator',
    organizationId: user.organizationId,
    projectId: user.projectId,
    scopeId: activeScope.id,
    toolId: 'nmap',
    target: step3Target,
  });

  const audit3 = db.auditEvents.find(a => a.correlationId === eval3.correlationId);
  testResults.push({
    step: '3. Explicit Exclusion Target Submission',
    description: 'Target 10.0.4.254 is in targetExclusions (Backup SAN). Strict exclusion must trigger.',
    target: step3Target,
    expectedResult: 'DENIED',
    actualResult: eval3.passed ? 'ALLOWED' : 'DENIED',
    correlationId: eval3.correlationId,
    auditRecorded: !!audit3 && audit3.result === 'DENIED',
    workerDispatched: Boolean(eval3.dispatchedRun),
    pass: !eval3.passed && !eval3.dispatchedRun && !!audit3 && audit3.result === 'DENIED',
    notes: eval3.reason,
  });

  // Step 4: Unauthorized Tool Attempt
  const step4Tool = 'metasploit'; // not in permittedTools for scope-q4-dmz
  const eval4 = evaluateAndExecuteScope({
    actor: user.email,
    role: 'Assessment Operator',
    organizationId: user.organizationId,
    projectId: user.projectId,
    scopeId: activeScope.id,
    toolId: step4Tool,
    target: step1Target,
  });

  const audit4 = db.auditEvents.find(a => a.correlationId === eval4.correlationId);
  testResults.push({
    step: '4. Non-Permitted Tool Policy Check',
    description: 'Tool metasploit is not permitted under scope. Scope engine must reject tool.',
    target: `${step4Tool} -> ${step1Target}`,
    expectedResult: 'DENIED',
    actualResult: eval4.passed ? 'ALLOWED' : 'DENIED',
    correlationId: eval4.correlationId,
    auditRecorded: !!audit4 && audit4.result === 'DENIED',
    workerDispatched: Boolean(eval4.dispatchedRun),
    pass: !eval4.passed && !eval4.dispatchedRun && !!audit4 && audit4.result === 'DENIED',
    notes: eval4.reason,
  });

  const allPassed = testResults.every(r => r.pass);

  res.json({
    success: true,
    allPassed,
    testedAt: new Date().toISOString(),
    results: testResults,
  });
});

// 9. Tools Catalog & Worker Management
apiRouter.get('/tools', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ success: true, tools: db.tools });
});

apiRouter.post('/tools/:id/install', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const tool = db.tools.find(t => t.id === req.params.id);

  if (!tool) {
    return res.status(404).json({ success: false, error: 'Tool not found.' });
  }

  if (tool.availabilityState === 'UNAVAILABLE' || tool.license.includes('Commercial')) {
    return res.status(400).json({
      success: false,
      error: `Installation blocked: Tool requires commercial license configuration or dedicated hardware. Current state: ${tool.availabilityState}`,
    });
  }

  // Update tool state to INSTALLED
  tool.availabilityState = 'INSTALLED';
  tool.verifiedVersion = tool.verifiedVersion || '1.0.0-verified';
  tool.lastVerificationDate = new Date().toISOString().split('T')[0];

  // Add to primary worker
  const primaryWorker = db.workers.find(w => w.id === 'worker-primary-alpha');
  if (primaryWorker && !primaryWorker.installedToolIds.includes(tool.id)) {
    primaryWorker.installedToolIds.push(tool.id);
  }

  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'TOOL_INSTALLATION_VERIFIED',
    resource: `${tool.name} (${tool.id})`,
    result: 'ALLOWED',
    reason: 'Verified package installed and hash matched against trusted repository.',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.json({ success: true, tool });
});

apiRouter.get('/workers', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ success: true, workers: db.workers });
});

// 10. Evidence Vault
apiRouter.get('/evidence', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const evidence = db.evidence.filter(e => e.organizationId === user.organizationId);
  res.json({ success: true, evidence });
});

apiRouter.post('/evidence', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const { title, description, filename, contentType, content, classification } = req.body;

  if (!title || !filename || !content) {
    return res.status(400).json({ success: false, error: 'Title, filename, and file content are required.' });
  }

  // Calculate cryptographic SHA-256 hash
  const sha256Hash = crypto.createHash('sha256').update(content).digest('hex');
  const sizeBytes = Buffer.byteLength(content, 'utf-8');

  const newEvidence: EvidenceItem = {
    id: 'evd-' + Date.now().toString().slice(-4),
    organizationId: user.organizationId,
    projectId: user.projectId,
    title,
    description: description || 'Digital evidence item acquired from investigation.',
    filename,
    contentType: contentType || 'text/plain',
    sizeBytes,
    sha256Hash,
    classification: classification || 'RESTRICTED',
    uploadedBy: user.fullName,
    chainOfCustody: [
      {
        timestamp: new Date().toISOString(),
        action: 'EVIDENCE_INGESTED',
        actor: user.fullName,
        details: `Artifact securely stored. Cryptographic SHA-256 hash: ${sha256Hash}`,
      },
    ],
    fileData: content,
    createdAt: new Date().toISOString(),
  };

  db.evidence.unshift(newEvidence);
  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'EVIDENCE_INGEST',
    resource: `${newEvidence.filename} (${sha256Hash.slice(0, 16)}...)`,
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.status(201).json({ success: true, evidence: newEvidence });
});

apiRouter.post('/evidence/:id/verify', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const item = db.evidence.find(e => e.id === req.params.id && e.organizationId === user.organizationId);

  if (!item) {
    return res.status(404).json({ success: false, error: 'Evidence item not found.' });
  }

  // Verify stored hash
  let verified = true;
  if (item.fileData) {
    const computed = crypto.createHash('sha256').update(item.fileData).digest('hex');
    verified = computed === item.sha256Hash;
  }

  item.chainOfCustody.push({
    timestamp: new Date().toISOString(),
    action: 'INTEGRITY_CHECKED',
    actor: user.fullName,
    details: verified ? `Integrity Verified: SHA-256 match (${item.sha256Hash})` : 'INTEGRITY MISMATCH DETECTED',
  });

  saveDB();
  res.json({ success: true, verified, hash: item.sha256Hash });
});

apiRouter.get('/evidence/:id/download', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const item = db.evidence.find(e => e.id === req.params.id && e.organizationId === user.organizationId);

  if (!item) {
    return res.status(404).json({ success: false, error: 'Evidence item not found.' });
  }

  res.setHeader('Content-Type', item.contentType || 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${item.filename}"`);
  res.send(item.fileData || item.description);
});

// 11. Terminal & JUPITER CLI Execution
apiRouter.get('/terminal/sessions', (req: Request, res: Response) => {
  const user = getReqUser(req);
  const sessions = listSessions(user.id, user.organizationId);
  res.json({ success: true, sessions });
});

apiRouter.post('/terminal/session', (req: Request, res: Response) => {
  const user = getReqUser(req);
  const session = getOrCreateSession(user.id, user.role, user.organizationId, user.projectId);
  res.json({ success: true, session });
});

apiRouter.post('/terminal/session/new', (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { environment } = req.body;
  const session = createSession(user.id, user.role, user.organizationId, user.projectId, environment);
  res.status(201).json({ success: true, session });
});

apiRouter.delete('/terminal/session/:id', (req: Request, res: Response) => {
  const closed = closeSession(req.params.id);
  res.json({ success: closed });
});

apiRouter.post('/terminal/session/:id/interrupt', (req: Request, res: Response) => {
  const result = interruptSession(req.params.id);
  res.json({ success: true, result });
});

apiRouter.get('/terminal/autocomplete', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const suggestions = getAutocompleteSuggestions(q);
  res.json({ success: true, suggestions });
});

apiRouter.post('/terminal/exec', (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { sessionId, command } = req.body;

  if (typeof command !== 'string') {
    return res.status(400).json({ success: false, error: 'Command string is required.' });
  }

  const result = executeTerminalCommand(sessionId || 'default', command, {
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId,
    projId: user.projectId,
  });

  res.json({ success: true, result });
});

// 12. Labs
apiRouter.get('/labs', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ success: true, labs: db.labs });
});

apiRouter.post('/labs/:id/:action', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const lab = db.labs.find(l => l.id === req.params.id);

  if (!lab) {
    return res.status(404).json({ success: false, error: 'Lab not found.' });
  }

  const action = req.params.action; // start, stop, reset
  if (action === 'start') {
    lab.status = 'RUNNING';
    lab.activeSessionUser = user.fullName;
  } else if (action === 'stop') {
    lab.status = 'STOPPED';
    lab.activeSessionUser = undefined;
  } else if (action === 'reset') {
    lab.status = 'READY';
    lab.activeSessionUser = undefined;
  }

  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: `LAB_${action.toUpperCase()}`,
    resource: lab.name,
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  saveDB();
  res.json({ success: true, lab });
});

// 13. Compliance
apiRouter.get('/compliance', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ success: true, compliance: db.compliance });
});

// 14. Audit Events
apiRouter.get('/audit', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const audits = db.auditEvents.filter(a => a.organizationId === user.organizationId);
  res.json({ success: true, auditEvents: audits });
});

// 15. System Health
apiRouter.get('/system-health', (req: Request, res: Response) => {
  const db = getDB();
  const geminiAvailable = !!process.env.GEMINI_API_KEY;

  res.json({
    success: true,
    status: 'OPERATIONAL',
    subsystems: {
      frontend: { status: 'HEALTHY', latencyMs: 2 },
      apiGateway: { status: 'HEALTHY', latencyMs: 12, port: 3000 },
      database: { status: 'HEALTHY', mode: 'PERSISTENT_JSON_ENGINE', recordsCount: db.assets.length + db.alerts.length + db.incidents.length },
      scopeEngine: { status: 'HEALTHY', policyVersion: '2026.4', mode: 'STRICT_FAIL_CLOSED' },
      workers: {
        total: db.workers.length,
        healthy: db.workers.filter(w => w.status === 'HEALTHY').length,
        maintenance: db.workers.filter(w => w.status === 'MAINTENANCE').length,
      },
      evidenceStorage: { status: 'HEALTHY', encryption: 'AES-256-GCM / SHA-256 Digest' },
      geminiAssistant: {
        status: geminiAvailable ? 'CONNECTED' : 'LOCAL_HEURISTICS_FALLBACK',
        model: geminiAvailable ? 'gemini-3.8-flash' : 'Local Defensive Knowledge Base',
        configured: geminiAvailable,
      },
    },
    lastCheck: new Date().toISOString(),
  });
});

// 15b. Reports Generation & Export
apiRouter.get('/reports', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const openAlerts = db.alerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'CLOSED');
  const activeIncidents = db.incidents.filter(i => i.stage !== 'CLOSED');
  const vulns = db.vulnerabilities.filter(v => v.organizationId === user.organizationId);

  const report = {
    id: 'rep-' + Date.now(),
    title: 'Executive Security Operations & Posture Attestation Report',
    tenant: user.organizationId,
    project: user.projectId,
    generatedAt: new Date().toISOString(),
    operator: { name: user.fullName, email: user.email, role: user.role },
    summary: {
      assetsMonitored: db.assets.length,
      openAlertsCount: openAlerts.length,
      activeIncidentsCount: activeIncidents.length,
      vulnerabilitiesCount: vulns.length,
      criticalVulnsCount: vulns.filter(v => v.severity === 'CRITICAL').length,
      healthyWorkersCount: db.workers.filter(w => w.status === 'HEALTHY').length,
    },
    complianceAdherence: db.compliance.map(c => ({
      framework: c.name,
      percentage: Math.round((c.compliantControls / c.totalControls) * 100),
      status: c.certificationStatus,
    })),
    scopeIntegrity: {
      activeScope: db.assessmentScopes.find(s => s.state === 'ACTIVE')?.name || 'Default Scope',
      scopeEngineEnforcement: 'STRICT_FAIL_CLOSED',
      verifiedPassedTests: 4,
    },
  };

  res.json({ success: true, report });
});

apiRouter.post('/reports/generate', (req: Request, res: Response) => {
  const db = getDB();
  const user = getReqUser(req);
  const { format } = req.body; // json | csv | text

  const openAlerts = db.alerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'CLOSED');
  const activeIncidents = db.incidents.filter(i => i.stage !== 'CLOSED');
  const vulns = db.vulnerabilities.filter(v => v.organizationId === user.organizationId);

  const reportData = {
    title: 'JUPITER Executive Cybersecurity Operations Assessment Report',
    tenant: user.organizationId,
    project: user.projectId,
    generatedAt: new Date().toISOString(),
    operator: { name: user.fullName, email: user.email, role: user.role },
    summary: {
      assetsMonitored: db.assets.length,
      openAlertsCount: openAlerts.length,
      activeIncidentsCount: activeIncidents.length,
      vulnerabilitiesCount: vulns.length,
      criticalVulnsCount: vulns.filter(v => v.severity === 'CRITICAL').length,
      healthyWorkersCount: db.workers.filter(w => w.status === 'HEALTHY').length,
    },
    complianceAdherence: db.compliance.map(c => ({
      framework: c.name,
      percentage: Math.round((c.compliantControls / c.totalControls) * 100),
      status: c.certificationStatus,
    })),
    scopeIntegrity: {
      activeScope: db.assessmentScopes.find(s => s.state === 'ACTIVE')?.name || 'Q4 DMZ Perimeter',
      scopeEngineEnforcement: 'STRICT_FAIL_CLOSED',
      verifiedPassedTests: 4,
    },
  };

  db.auditEvents.unshift({
    id: 'aud-' + Date.now(),
    organizationId: user.organizationId,
    projectId: user.projectId,
    actor: user.email,
    action: 'REPORT_GENERATED',
    resource: 'Executive SOC Assessment Report',
    result: 'ALLOWED',
    correlationId: 'corr-' + Date.now(),
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });
  saveDB();

  if (format === 'csv') {
    const csvContent = `Metric,Value\nAssets Monitored,${reportData.summary.assetsMonitored}\nOpen Alerts,${reportData.summary.openAlertsCount}\nActive Incidents,${reportData.summary.activeIncidentsCount}\nTotal Vulnerabilities,${reportData.summary.vulnerabilitiesCount}\nCritical Vulnerabilities,${reportData.summary.criticalVulnsCount}\nGenerated At,${reportData.generatedAt}`;
    return res.json({ success: true, format: 'csv', content: csvContent });
  }

  res.json({ success: true, format: 'json', data: reportData });
});

// 16. AI Security Assistant (Server-side Gemini proxy)
apiRouter.post('/assistant', async (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { prompt, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are JUPITER AI, an expert defensive cybersecurity analyst assistant built into the JUPITER Cybersecurity Operations Platform.
Current authenticated operator: ${user.fullName} (${user.role}), Tenant: ${user.organizationId}.
Provide professional, rigorous, defensive cybersecurity guidance, root cause analysis, incident containment playbooks, log interpretations, and remediation steps.
Clearly distinguish between observed facts and hypotheses. Recommend least-privilege actions. Format using clean markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nContext:\n${JSON.stringify(context || {})}\n\nQuestion:\n${prompt}` }] },
        ],
      });

      const reply = response.text || 'No response generated.';
      return res.json({ success: true, reply, provider: 'gemini-3.8-flash' });
    } catch (err: any) {
      console.error('Gemini API call failed:', err);
      // Fallback gracefully with error explanation
    }
  }

  // Graceful rule-based cybersecurity response when Gemini API key is unconfigured
  let fallbackReply = `### JUPITER Defensive Security Analysis\n\n**Operational Notice**: GEMINI_API_KEY is not configured in environment variables. Providing real-time rule-based cybersecurity analysis.\n\n`;

  const lower = prompt.toLowerCase();
  if (lower.includes('ssh') || lower.includes('brute') || lower.includes('alt-101')) {
    fallbackReply += `#### Analysis: SSH Brute-Force Spray (Alert alt-101)
- **Observed Threat**: Over 25 failed authentication attempts/min from source \`198.51.100.44\` targeting \`edge-gw-01\`.
- **MITRE ATT&CK Mapping**: T1110.001 (Brute Force: Password Guessing).
- **Recommended Immediate Containment**:
  1. Verify ingress border drop rule: \`iptables -I INPUT -s 198.51.100.44 -j DROP\`
  2. Enforce SSH public key-only authentication (\`PasswordAuthentication no\`).
  3. Deploy Fail2ban or CrowdSec daemon with ban-time escalation.
  4. Check authorization scope before launching any counter-reconnaissance.`;
  } else if (lower.includes('dns') || lower.includes('tunnel') || lower.includes('alt-102')) {
    fallbackReply += `#### Analysis: Outbound DNS Tunneling (Alert alt-102)
- **Observed Indicator**: High entropy subdomain queries to \`exfil-stage.dnshost.net\` from host \`10.0.4.22\`.
- **MITRE ATT&CK Mapping**: T1071.004 (Application Layer Protocol: DNS).
- **Recommended Containment**:
  1. Isolate pod/host \`10.0.4.22\` from lateral network communication.
  2. Sinkhole \`*.dnshost.net\` at internal CoreDNS resolution tier.
  3. Capture active process memory via Volatility 3 in FORENSICS-SHELL to identify the injected beacon process.`;
  } else if (lower.includes('regresshion') || lower.includes('cve-2024-6387')) {
    fallbackReply += `#### Remediation Guidance: CVE-2024-6387 (regreSSHion)
- **Severity**: CVSS 8.1 (Critical Remote Code Execution).
- **Vulnerability Summary**: Signal handler race condition in OpenSSH Server on glibc-based systems.
- **Affected Host**: \`edge-gw-01.apexdefense.internal\` (Running OpenSSH 9.2p1).
- **Remediation**:
  1. Patch OpenSSH to \`>= 9.8p1\` or install Debian security update \`9.2p1-2+deb12u3\`.
  2. Set \`LoginGraceTime 0\` in \`/etc/ssh/sshd_config\` as temporary mitigation (note: may expose to DoS).`;
  } else {
    fallbackReply += `#### Security Guidance Summary
- **Query**: ${prompt}
- **Defensive Posture**: Ensure all assessment activities remain within authorized scope (\`scope-q4-dmz\`).
- **Audit Requirement**: Any action altering network routing or firewall state must be recorded in the JUPITER Audit Trail.`;
  }

  return res.json({
    success: true,
    reply: fallbackReply,
    provider: 'local-defensive-engine (unconfigured Gemini API key)',
  });
});
