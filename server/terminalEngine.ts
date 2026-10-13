import crypto from 'crypto';
import { getDB, saveDB, AuditEvent } from './db.js';
import { evaluateAndExecuteScope } from './scopeEngine.js';

export interface TerminalOutput {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  durationMs: number;
  timestamp: string;
  isPolicyDenied?: boolean;
}

export interface TerminalSession {
  sessionId: string;
  name: string;
  userId: string;
  organizationId: string;
  projectId: string;
  role: string;
  environment: string;
  history: TerminalOutput[];
  commandHistory: string[];
  createdAt: string;
  lastActiveAt: string;
}

const activeSessions = new Map<string, TerminalSession>();

function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if ((char === ' ' || char === '\t') && !inDouble && !inSingle) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

export function listSessions(userId: string, orgId: string): TerminalSession[] {
  return Array.from(activeSessions.values()).filter(
    s => s.userId === userId && s.organizationId === orgId
  );
}

export function getSession(sessionId: string): TerminalSession | undefined {
  return activeSessions.get(sessionId);
}

export function createSession(
  userId: string,
  role: string,
  orgId: string,
  projId: string,
  environment = 'JUPITER-SHELL (Debian 12 / Restricted PTY)'
): TerminalSession {
  const count = Array.from(activeSessions.values()).filter(
    s => s.userId === userId && s.organizationId === orgId
  ).length;

  const sessionId = 'term-' + crypto.randomBytes(6).toString('hex');
  const name = `Session ${count + 1} (${environment.split(' ')[0]})`;

  const session: TerminalSession = {
    sessionId,
    name,
    userId,
    organizationId: orgId,
    projectId: projId,
    role,
    environment,
    history: [
      {
        id: 'init-0',
        command: '',
        output: `JUPITER Controlled Terminal Subsystem [v2.4-SEC]\nAuthenticated as: ${userId} (${role})\nScope Environment: ${environment} | Tenant: ${orgId}\nType 'jupiter --help' for CLI commands or 'help' for shell utilities.\nType 'jupiter security-status' to view real-time posture.`,
        exitCode: 0,
        durationMs: 0,
        timestamp: new Date().toISOString(),
      },
    ],
    commandHistory: [],
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  activeSessions.set(session.sessionId, session);
  return session;
}

export function closeSession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

export function interruptSession(sessionId: string): TerminalOutput {
  const session = activeSessions.get(sessionId);
  const output: TerminalOutput = {
    id: 'int-' + Date.now(),
    command: '^C',
    output: '[SIGINT received] Execution interrupted by operator.',
    exitCode: 130,
    durationMs: 0,
    timestamp: new Date().toISOString(),
  };
  if (session) {
    session.history.push(output);
  }
  return output;
}

export function getOrCreateSession(userId: string, role: string, orgId: string, projId: string): TerminalSession {
  const existingList = listSessions(userId, orgId);
  if (existingList.length > 0) {
    existingList[0].lastActiveAt = new Date().toISOString();
    return existingList[0];
  }
  return createSession(userId, role, orgId, projId);
}

export function getAutocompleteSuggestions(partial: string): string[] {
  const trimmed = partial.trim();
  const allCommands = [
    'jupiter',
    'jupiter security-status',
    'jupiter assets',
    'jupiter asset-info',
    'jupiter alerts',
    'jupiter alert-info',
    'jupiter incidents',
    'jupiter incident-info',
    'jupiter events',
    'jupiter logs',
    'jupiter vulnerabilities',
    'jupiter threats',
    'jupiter indicators',
    'jupiter evidence',
    'jupiter compliance',
    'jupiter reports',
    'jupiter tools',
    'jupiter workers',
    'jupiter audit',
    'jupiter system-status',
    'jupiter lab list',
    'jupiter pentest',
    'whoami',
    'id',
    'uname -a',
    'date',
    'uptime',
    'echo',
    'cat',
    'ls',
    'pwd',
    'clear',
    'history',
    'help',
  ];

  if (!trimmed) return allCommands.slice(0, 10);
  return allCommands.filter(c => c.startsWith(trimmed));
}

export function executeTerminalCommand(
  sessionId: string,
  rawCommand: string,
  user: { id: string; email: string; role: string; orgId: string; projId: string }
): TerminalOutput {
  const session = activeSessions.get(sessionId) || getOrCreateSession(user.id, user.role, user.orgId, user.projId);
  const startTime = Date.now();
  const trimmed = rawCommand.trim();
  const db = getDB();

  if (!trimmed) {
    return {
      id: 'cmd-' + Date.now(),
      command: '',
      output: '',
      exitCode: 0,
      durationMs: 0,
      timestamp: new Date().toISOString(),
    };
  }

  session.commandHistory.push(trimmed);

  // Dangerous shell command protection
  const prohibitedPatterns = [
    'rm -rf /', 'mkfs', 'dd if=', ':(){ :|:& };:', 'chmod -R 777 /',
    'wget -o- | bash', 'curl | sh', '/etc/shadow', 'sudo su', 'passwd root',
    'useradd', 'visudo', 'iptables -f', 'shutdown', 'reboot', 'kill -9 1'
  ];

  if (prohibitedPatterns.some(p => trimmed.toLowerCase().includes(p))) {
    const correlationId = 'corr-' + crypto.randomBytes(6).toString('hex');
    db.auditEvents.unshift({
      id: 'aud-' + Date.now(),
      organizationId: user.orgId,
      projectId: user.projId,
      actor: user.id,
      action: 'TERMINAL_SECURITY_VIOLATION_BLOCKED',
      resource: trimmed.slice(0, 80),
      result: 'DENIED',
      reason: 'Prohibited command sequence blocked by JUPITER Security PTY Filter.',
      correlationId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
    saveDB();

    const output: TerminalOutput = {
      id: 'cmd-' + Date.now(),
      command: trimmed,
      output: `[SECURITY POLICY VIOLATION] Command rejected by JUPITER Gateway.\nPolicy: Arbitrary host mutation, destruction, or privilege escalation strictly prohibited.\nCorrelation ID: ${correlationId}\nIncident recorded in centralized security audit trail.`,
      exitCode: 126,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      isPolicyDenied: true,
    };
    session.history.push(output);
    return output;
  }

  const parts = tokenizeCommand(trimmed);
  const binary = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1);
  const isJson = args.includes('--json');
  const isCsv = args.includes('--csv');
  const isTable = args.includes('--table');
  const isQuiet = args.includes('--quiet');

  // Strip known flags from positional args
  const positionalArgs = args.filter(a => !a.startsWith('--'));

  let outputText = '';
  let exitCode = 0;

  if (binary === 'clear') {
    session.history = [];
    return {
      id: 'cmd-' + Date.now(),
      command: 'clear',
      output: '',
      exitCode: 0,
      durationMs: 1,
      timestamp: new Date().toISOString(),
    };
  }

  if (binary === 'pwd') {
    outputText = `/opt/jupiter/workspaces/${user.orgId}/${user.projId}`;
  } else if (binary === 'history') {
    outputText = session.commandHistory.map((cmd, idx) => `  ${(idx + 1).toString().padStart(4, ' ')}  ${cmd}`).join('\n');
  } else if (binary === 'help' || (binary === 'jupiter' && (args.length === 0 || args.includes('--help') || args.includes('-h')))) {
    outputText = `JUPITER Controlled Terminal Subsystem & CLI Reference:
============================================================
Core Security Operations Commands:
  jupiter security-status        Display overall posture, open alerts & worker health
  jupiter assets                 List monitored network assets (--json, --csv, --table)
  jupiter asset-info <id>        Detailed inspection of an asset (services, vulns)
  jupiter alerts                 List active alerts needing triage (--json, --table)
  jupiter alert-info <id>        Detailed inspection of alert indicators and history
  jupiter incidents              List security incidents & response stages
  jupiter incident-info <id>     Detailed incident timeline, tasks & affected hosts
  jupiter events                 List recent security telemetry & IDS events
  jupiter logs                   Search ingested log stream (--json, --table)
  jupiter vulnerabilities        List discovered CVEs & CVSS scores
  jupiter threats                List Threat Intelligence IOCs & MITRE techniques
  jupiter indicators             Alias for threats
  jupiter evidence               List evidence artifacts in Cryptographic Vault
  jupiter compliance             Audit readiness across SOC2, ISO27001, PCI-DSS
  jupiter reports                Generate and display executive SOC posture report
  jupiter tools                  Query 18-category cybersecurity tool registry
  jupiter workers                Status and resource quotas of worker enclaves
  jupiter audit                  View recent audit events & policy decisions
  jupiter system-status          Verify API, database, and isolated worker health
  jupiter lab [list|start|stop]  Manage isolated training laboratories
  jupiter pentest <tool> <tgt>   Execute scope-checked assessment (Enforces Rules of Engagement)

Supported Flags:
  --json, --csv, --table, --quiet

Standard Shell Utilities:
  whoami, id, uname -a, date, uptime, echo, cat, ls, pwd, history, clear, help`;
  } else if (binary === 'whoami') {
    outputText = `${user.email} (${user.role})`;
  } else if (binary === 'id') {
    outputText = `uid=1001(${user.email}) gid=1001(jupiter-ops) groups=1001(jupiter-ops),1002(soc-analysts),1003(pentesters)`;
  } else if (binary === 'uname' || binary === 'uname -a') {
    outputText = `Linux jupiter-shell-node 6.6.15-hardened #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`;
  } else if (binary === 'date') {
    outputText = new Date().toUTCString();
  } else if (binary === 'uptime') {
    outputText = ` 06:03:35 up 42 days,  9:29,  4 users,  load average: 0.14, 0.19, 0.18`;
  } else if (binary === 'echo') {
    outputText = positionalArgs.join(' ');
  } else if (binary === 'ls') {
    outputText = `drwx------  2 jupiter jupiter 4096 Oct 13 04:40 ./evidence_vault
-rw-r--r--  1 jupiter jupiter 1284 Oct 13 04:30 rules_of_engagement.json
-rw-r--r--  1 jupiter jupiter  420 Oct 13 04:32 scope_targets.cidr
-rw-r--r--  1 jupiter jupiter 3210 Oct 13 05:10 audit_log_summary.txt
-rwxr-xr-x  1 jupiter jupiter 8920 Oct 13 04:00 jupiter`;
  } else if (binary === 'cat') {
    const filename = positionalArgs[0];
    if (filename === 'rules_of_engagement.json' || filename === 'scope_targets.cidr') {
      const activeScope = db.assessmentScopes.find(s => s.state === 'ACTIVE' && s.organizationId === user.orgId);
      outputText = JSON.stringify(activeScope || { error: 'No active scope found' }, null, 2);
    } else if (filename === 'audit_log_summary.txt') {
      const recentAudits = db.auditEvents.slice(0, 5);
      outputText = recentAudits.map(a => `[${a.timestamp}] ${a.actor} -> ${a.action} (${a.result}): ${a.resource}`).join('\n');
    } else {
      outputText = `cat: ${filename || 'missing file operand'}: No such file or directory in sandbox`;
      exitCode = 1;
    }
  } else if (binary === 'jupiter') {
    const subCmd = positionalArgs[0]?.toLowerCase();

    switch (subCmd) {
      case 'security-status': {
        const openAlerts = db.alerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'CLOSED').length;
        const activeIncidents = db.incidents.filter(i => i.stage !== 'CLOSED').length;
        const openVulns = db.vulnerabilities.filter(v => v.status !== 'RESOLVED').length;
        const healthyWorkers = db.workers.filter(w => w.status === 'HEALTHY').length;

        if (isJson) {
          outputText = JSON.stringify({
            tenant: user.orgId,
            project: user.projId,
            openAlerts,
            activeIncidents,
            openVulns,
            healthyWorkers,
            totalWorkers: db.workers.length,
            platformStatus: 'OPERATIONAL_DEFENSE',
          }, null, 2);
        } else {
          outputText = `JUPITER SECURITY POSTURE SUMMARY
============================================================
Tenant Organization: ${user.orgId}
Project Enclave:     ${user.projId}
Active Alerts:       ${openAlerts} (Requires Triage)
Active Incidents:    ${activeIncidents} (1 in Containment Stage)
Open CVE Findings:   ${openVulns} (1 Critical CVE-2024-6387)
Execution Workers:   ${healthyWorkers} / ${db.workers.length} Healthy Nodes
Platform Defense:    ACTIVE (Strict Scope Validation Enforced)`;
        }
        break;
      }

      case 'assets': {
        const assets = db.assets.filter(a => a.organizationId === user.orgId);
        if (isQuiet) {
          outputText = assets.map(a => a.hostname).join('\n');
        } else if (isJson) {
          outputText = JSON.stringify(assets, null, 2);
        } else if (isCsv) {
          outputText = 'id,hostname,ipAddress,criticality,status,os\n' +
            assets.map(a => `${a.id},${a.hostname},${a.ipAddress},${a.criticality},${a.status},"${a.os}"`).join('\n');
        } else {
          outputText = `ID       HOSTNAME                               IP           CRITICALITY  STATUS\n` +
            `------------------------------------------------------------------------------------\n` +
            assets.map(a => `${a.id.padEnd(8)} ${a.hostname.padEnd(38)} ${a.ipAddress.padEnd(12)} ${a.criticality.padEnd(12)} ${a.status}`).join('\n');
        }
        break;
      }

      case 'asset-info': {
        const assetId = positionalArgs[1];
        if (!assetId) {
          outputText = `Usage: jupiter asset-info <asset-id or hostname>`;
          exitCode = 1;
          break;
        }
        const asset = db.assets.find(
          a => (a.id === assetId || a.hostname === assetId || a.ipAddress === assetId) && a.organizationId === user.orgId
        );
        if (!asset) {
          outputText = `Error: Asset '${assetId}' not found in active organization.`;
          exitCode = 1;
          break;
        }
        if (isJson) {
          outputText = JSON.stringify(asset, null, 2);
        } else {
          outputText = `ASSET DOSSIER: ${asset.hostname} (${asset.id})
------------------------------------------------------------
IP Address:          ${asset.ipAddress}
Operating System:    ${asset.os}
Criticality:         ${asset.criticality}
Environment:         ${asset.environment}
Status:              ${asset.status}
Observed Services:   ${asset.observedServices.join(', ')}
Tags:                ${asset.tags.join(', ')}
Vulnerabilities:     ${asset.vulnerabilitiesCount} linked
Last Observed:       ${asset.lastObservedAt}`;
        }
        break;
      }

      case 'alerts': {
        const alerts = db.alerts.filter(a => a.organizationId === user.orgId);
        if (isJson) {
          outputText = JSON.stringify(alerts, null, 2);
        } else if (isCsv) {
          outputText = 'id,severity,status,title,source,assetHostname\n' +
            alerts.map(a => `${a.id},${a.severity},${a.status},"${a.title}","${a.source}","${a.assetHostname || ''}"`).join('\n');
        } else {
          outputText = `ID       SEVERITY  STATUS         SOURCE                 TITLE\n` +
            `------------------------------------------------------------------------------------\n` +
            alerts.map(a => `${a.id.padEnd(8)} ${a.severity.padEnd(9)} ${a.status.padEnd(14)} ${(a.source || '').padEnd(22)} ${a.title.slice(0, 32)}`).join('\n');
        }
        break;
      }

      case 'alert-info': {
        const alertId = positionalArgs[1];
        if (!alertId) {
          outputText = `Usage: jupiter alert-info <alert-id>`;
          exitCode = 1;
          break;
        }
        const alert = db.alerts.find(a => a.id === alertId && a.organizationId === user.orgId);
        if (!alert) {
          outputText = `Error: Alert '${alertId}' not found.`;
          exitCode = 1;
          break;
        }
        if (isJson) {
          outputText = JSON.stringify(alert, null, 2);
        } else {
          outputText = `ALERT INSPECTION: ${alert.id}
------------------------------------------------------------
Title:               ${alert.title}
Severity:            ${alert.severity}
Status:              ${alert.status}
Source:              ${alert.source}
Target Host:         ${alert.assetHostname || 'Unassigned'}
Assignee:            ${alert.assignee || 'Unassigned'}
Created:             ${alert.createdAt}
Indicators:          ${alert.indicators.join(', ')}
Description:
${alert.description}`;
        }
        break;
      }

      case 'incidents': {
        const incidents = db.incidents.filter(i => i.organizationId === user.orgId);
        if (isJson) {
          outputText = JSON.stringify(incidents, null, 2);
        } else {
          outputText = `ID       SEVERITY  STAGE        LEAD RESPONDER  AFFECTED ASSETS\n` +
            `------------------------------------------------------------------------------------\n` +
            incidents.map(i => `${i.id.padEnd(8)} ${i.severity.padEnd(9)} ${i.stage.padEnd(12)} ${i.leadResponder.padEnd(15)} ${i.affectedAssets.join(', ')}`).join('\n');
        }
        break;
      }

      case 'incident-info': {
        const incId = positionalArgs[1];
        if (!incId) {
          outputText = `Usage: jupiter incident-info <incident-id>`;
          exitCode = 1;
          break;
        }
        const inc = db.incidents.find(i => i.id === incId && i.organizationId === user.orgId);
        if (!inc) {
          outputText = `Error: Incident '${incId}' not found.`;
          exitCode = 1;
          break;
        }
        if (isJson) {
          outputText = JSON.stringify(inc, null, 2);
        } else {
          outputText = `INCIDENT WORKBENCH RECORD: ${inc.id}
------------------------------------------------------------
Title:               ${inc.title}
Severity:            ${inc.severity}
Stage:               ${inc.stage}
Lead:                ${inc.leadResponder}
Affected:            ${inc.affectedAssets.join(', ')}
Summary:             ${inc.summary}
Containment:         ${inc.containmentNotes || 'None recorded'}
Tasks (${inc.tasks.filter(t => t.completed).length}/${inc.tasks.length} Done):
${inc.tasks.map(t => `  [${t.completed ? 'X' : ' '}] ${t.title} (${t.assignee})`).join('\n')}
Timeline (${inc.timeline.length} entries):
${inc.timeline.map(e => `  [${e.timestamp}] ${e.author}: ${e.note}`).join('\n')}`;
        }
        break;
      }

      case 'events':
      case 'logs': {
        const events = db.securityEvents.filter(e => e.organizationId === user.orgId);
        if (isJson) {
          outputText = JSON.stringify(events, null, 2);
        } else {
          outputText = `TIMESTAMP        SEV     SOURCE        FLOW                 MESSAGE\n` +
            `------------------------------------------------------------------------------------\n` +
            events.map(e => `${e.timestamp.slice(11, 19).padEnd(16)} ${e.severity.slice(0, 4).padEnd(7)} ${(e.source || '').padEnd(13)} ${e.sourceIp}->${e.destinationIp}  ${e.message.slice(0, 36)}`).join('\n');
        }
        break;
      }

      case 'vulnerabilities': {
        const vulns = db.vulnerabilities.filter(v => v.organizationId === user.orgId);
        if (isJson) {
          outputText = JSON.stringify(vulns, null, 2);
        } else {
          outputText = `CVE-ID          SEVERITY  CVSS  STATUS          TITLE\n` +
            `------------------------------------------------------------------------------------\n` +
            vulns.map(v => `${v.cveId.padEnd(15)} ${v.severity.padEnd(9)} ${v.cvssScore.toString().padEnd(5)} ${v.status.padEnd(15)} ${v.title.slice(0, 40)}`).join('\n');
        }
        break;
      }

      case 'threats':
      case 'indicators': {
        const threats = db.threatIndicators.filter(t => t.organizationId === user.orgId);
        if (isJson) {
          outputText = JSON.stringify(threats, null, 2);
        } else {
          outputText = `TYPE        CONF  VALUE                          TECHNIQUE\n` +
            `------------------------------------------------------------------------------------\n` +
            threats.map(t => `${t.type.padEnd(11)} ${t.confidence}%   ${t.value.padEnd(30)} ${t.mitreTechnique}`).join('\n');
        }
        break;
      }

      case 'evidence': {
        const evidence = db.evidence.filter(e => e.organizationId === user.orgId);
        if (isJson) {
          outputText = JSON.stringify(evidence, null, 2);
        } else {
          outputText = `ID       CLASSIFICATION  SHA-256 DIGEST (FIRST 16)  FILENAME\n` +
            `------------------------------------------------------------------------------------\n` +
            evidence.map(e => `${e.id.padEnd(8)} ${e.classification.padEnd(15)} ${e.sha256Hash.slice(0, 24)}...  ${e.filename}`).join('\n');
        }
        break;
      }

      case 'compliance': {
        if (isJson) {
          outputText = JSON.stringify(db.compliance, null, 2);
        } else {
          outputText = `FRAMEWORK                       VERSION         COMPLIANT   STATUS\n` +
            `------------------------------------------------------------------------------------\n` +
            db.compliance.map(c => `${c.name.slice(0, 30).padEnd(31)} ${c.version.slice(0, 14).padEnd(15)} ${c.compliantControls}/${c.totalControls} (${Math.round((c.compliantControls / c.totalControls) * 100)}%)  ${c.certificationStatus}`).join('\n');
        }
        break;
      }

      case 'reports': {
        const openAlerts = db.alerts.filter(a => a.status !== 'RESOLVED' && a.status !== 'CLOSED').length;
        const activeIncidents = db.incidents.filter(i => i.stage !== 'CLOSED').length;
        const vulns = db.vulnerabilities.filter(v => v.organizationId === user.orgId);
        outputText = `============================================================
JUPITER EXECUTIVE SECURITY OPERATIONS REPORT
Generated: ${new Date().toUTCString()}
Tenant: ${user.orgId} | Enclave: ${user.projId}
Author: ${user.email} (${user.role})
============================================================
1. PERIMETER POSTURE SUMMARY
   - Monitored Assets:     ${db.assets.length} hosts (DMZ, Production, Enclaves)
   - Unresolved Alerts:    ${openAlerts}
   - Active Incidents:     ${activeIncidents}
   - Discovered CVEs:      ${vulns.length} (${vulns.filter(v => v.severity === 'CRITICAL').length} Critical)

2. COMPLIANCE CONTROL ADHERENCE
${db.compliance.map(c => `   - ${c.name}: ${Math.round((c.compliantControls / c.totalControls) * 100)}% controls verified (${c.certificationStatus})`).join('\n')}

3. ATTESTATION & SCOPE INTEGRITY
   All assessment executions verified by Centralized Scope Engine.
   Zero out-of-scope executions permitted. Audit logs hashed and preserved.
============================================================`;
        break;
      }

      case 'tools': {
        if (isJson) {
          outputText = JSON.stringify(db.tools.map(t => ({ id: t.id, name: t.name, state: t.availabilityState, class: t.resourceClass })), null, 2);
        } else {
          outputText = `TOOL ID          AVAILABILITY STATE    CLASS     NAME\n` +
            `------------------------------------------------------------------------------------\n` +
            db.tools.map(t => `${t.id.padEnd(16)} ${t.availabilityState.padEnd(21)} ${t.resourceClass.padEnd(9)} ${t.name}`).join('\n');
        }
        break;
      }

      case 'workers': {
        if (isJson) {
          outputText = JSON.stringify(db.workers, null, 2);
        } else {
          outputText = `NODE ID                 STATUS    CORES  RAM(GB)  POLICY             OS\n` +
            `------------------------------------------------------------------------------------\n` +
            db.workers.map(w => `${w.id.padEnd(23)} ${w.status.padEnd(9)} ${w.cpuCores.toString().padEnd(6)} ${w.memoryGb.toString().padEnd(8)} ${w.networkPolicy.padEnd(18)} ${w.os}`).join('\n');
        }
        break;
      }

      case 'audit': {
        const audits = db.auditEvents.slice(0, 10);
        if (isJson) {
          outputText = JSON.stringify(audits, null, 2);
        } else {
          outputText = `TIMESTAMP            RESULT   ACTOR                 ACTION\n` +
            `------------------------------------------------------------------------------------\n` +
            audits.map(a => `${a.timestamp.slice(11, 19)} UTC       ${a.result.padEnd(8)} ${a.actor.padEnd(21)} ${a.action}`).join('\n');
        }
        break;
      }

      case 'system-status': {
        outputText = `JUPITER SUBSYSTEM HEALTH DIAGNOSTICS:
  API Gateway:         ONLINE (Port 3000, Express 4.21, Latency 14ms)
  PostgreSQL / State:  PERSISTENT (.data/jupiter_db.json)
  Scope Engine:        ENFORCED (Strict Pre-Dispatch Policy Guard)
  PTY Terminal:        CONFINED (Non-Root Sandbox)
  Workers Online:      ${db.workers.filter(w => w.status === 'HEALTHY').length}/${db.workers.length} Nodes (1 in Maintenance Window)
  Gemini AI Core:      ${process.env.GEMINI_API_KEY ? 'CONNECTED (Gemini 3.8 Flash Server-Side)' : 'LOCAL POLICY ENGINE (API key optional)'}`;
        break;
      }

      case 'lab': {
        const action = positionalArgs[1]?.toLowerCase();
        if (!action || action === 'list') {
          outputText = `LAB ID      STATUS   DIFFICULTY    PROFILE           NAME\n` +
            `------------------------------------------------------------------------------------\n` +
            db.labs.map(l => `${l.id.padEnd(11)} ${l.status.padEnd(8)} ${l.difficulty.padEnd(13)} ${l.profile.padEnd(17)} ${l.name}`).join('\n');
        } else if (action === 'start' || action === 'stop' || action === 'reset') {
          const labId = positionalArgs[2];
          const lab = db.labs.find(l => l.id === labId);
          if (!lab) {
            outputText = `Error: Lab '${labId}' not found. Run 'jupiter lab list'.`;
            exitCode = 1;
            break;
          }
          if (action === 'start') {
            lab.status = 'RUNNING';
            lab.activeSessionUser = user.email;
          } else if (action === 'stop') {
            lab.status = 'STOPPED';
            lab.activeSessionUser = undefined;
          } else {
            lab.status = 'READY';
            lab.activeSessionUser = undefined;
          }
          saveDB();
          outputText = `Lab '${lab.name}' status transitioned to ${lab.status}.`;
        } else {
          outputText = `Usage: jupiter lab [list | start <id> | stop <id> | reset <id>]`;
          exitCode = 1;
        }
        break;
      }

      case 'pentest':
      case 'assessment': {
        const toolId = positionalArgs[1];
        const target = positionalArgs[2];
        if (!toolId || !target) {
          outputText = `Usage: jupiter pentest <tool-id> <target>\nExample: jupiter pentest nmap 10.0.4.10\nNote: All executions pass through the mandatory Centralized Scope Engine.`;
          exitCode = 1;
          break;
        }

        const activeScope = db.assessmentScopes.find(s => s.state === 'ACTIVE' && s.organizationId === user.orgId);
        if (!activeScope) {
          outputText = `ERROR: No active authorized assessment scope found for organization '${user.orgId}'.\nActive scope approval required before dispatching pentest tools.`;
          exitCode = 1;
          break;
        }

        // Run scope evaluation
        const evalResult = evaluateAndExecuteScope({
          actor: user.email,
          role: user.role,
          organizationId: user.orgId,
          projectId: user.projId,
          scopeId: activeScope.id,
          toolId,
          target,
          ipAddress: '127.0.0.1 (Terminal PTY)',
        });

        if (!evalResult.passed) {
          outputText = `[SCOPE ENGINE REJECTION: DISPATCH ABORTED]\n` +
            `Status: ${evalResult.status}\n` +
            `Reason: ${evalResult.reason}\n` +
            `Correlation ID: ${evalResult.correlationId}\n` +
            `Audit: Event logged to security audit trail. Worker dispatch BLOCKED.`;
          exitCode = 126;
        } else {
          outputText = `[SCOPE VERIFIED - AUTHORIZED FOR EXECUTION]\n` +
            `Scope ID: ${activeScope.id}\n` +
            `Worker:   ${evalResult.dispatchedRun?.dispatchedWorkerId}\n` +
            `Correlation: ${evalResult.correlationId}\n\n` +
            `${evalResult.dispatchedRun?.output}`;
        }
        break;
      }

      default:
        outputText = `jupiter: unknown command '${subCmd || ''}'. Run 'jupiter --help' for available commands.`;
        exitCode = 1;
    }
  } else {
    outputText = `${binary}: command not found in restricted JUPITER PTY environment. Run 'help' or 'jupiter --help'.`;
    exitCode = 127;
  }

  const result: TerminalOutput = {
    id: 'cmd-' + Date.now(),
    command: trimmed,
    output: outputText,
    exitCode,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  session.history.push(result);
  return result;
}
