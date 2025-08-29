/**
 * Report Generator - Creates comprehensive HTML test reports
 * Transforms raw test data into actionable visual reports with HUD partnership model
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { TestLogEntry, VisualState } from './test-logger';

export interface TestResult {
  testId: string;
  name: string;
  description: string;
  passed: boolean;
  duration: number;
  issues: Issue[];
  visualState?: VisualState;
  consoleEntries?: TestLogEntry[];
  category: 'PASS' | 'USER_REVIEW' | 'HUD_AUTO_FIX';
}

export interface Issue {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'USER_REVIEW' | 'HUD_AUTO_FIX' | 'INFRASTRUCTURE' | 'PERFORMANCE';
  description: string;
  data: any;
  visualEvidence?: VisualState[];
  consoleEvidence?: TestLogEntry[];
  suggestedAction?: string;
  assignee: 'USER' | 'HUD';
}

export interface TestSuiteResult {
  sessionId: string;
  timestamp: string;
  duration: number;
  results: TestResult[];
  issues: Issue[];
  summary: TestSummary;
  performance: PerformanceMetrics;
  hudActions: HudAction[];
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  userReviewTests: number;
  hudAutoFixTests: number;
  criticalIssues: number;
  performanceIssues: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  memoryUsage: number;
  slowOperations: Array<{ operation: string; duration: number; threshold: number }>;
}

export interface HudAction {
  id: string;
  type: 'AUTO_FIX' | 'PERFORMANCE_OPTIMIZATION' | 'INFRASTRUCTURE_REPAIR';
  description: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  details: any;
}

export class ReportGenerator {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  async generateComprehensiveReport(testSuiteResult: TestSuiteResult): Promise<string> {
    const reportPath = join(this.outputDir, 'report.html');
    
    // Generate the HTML report
    const htmlContent = this.generateHTMLReport(testSuiteResult);
    
    // Write to file
    writeFileSync(reportPath, htmlContent, 'utf8');
    
    // Generate additional files
    await this.generateSupportingFiles(testSuiteResult);
    
    console.log(`[ReportGenerator] Comprehensive report generated: ${reportPath}`);
    return reportPath;
  }

  private generateHTMLReport(data: TestSuiteResult): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Track Edits Test Report - ${data.sessionId}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="dashboard">
        ${this.generateHeader(data)}
        ${this.generateSummaryStats(data)}
        ${this.generateHudPartnershipPanel(data)}
        ${this.generateTestResults(data)}
        ${this.generatePerformanceSection(data)}
        ${this.generateIssuesSection(data)}
    </div>
    <script>
        ${this.getInteractiveScript()}
    </script>
</body>
</html>`;
  }

  private getReportStyles(): string {
    return `
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 700;
        }
        
        .header-meta {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }
        
        .stat-number {
            font-size: 3em;
            font-weight: 800;
            margin-bottom: 5px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .stat-number.success { color: #10b981; }
        .stat-number.warning { color: #f59e0b; }
        .stat-number.error { color: #ef4444; }
        
        .stat-label {
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            font-size: 0.9em;
            letter-spacing: 0.5px;
        }
        
        .collaboration-panel {
            background: white;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .collaboration-header {
            background: #f1f5f9;
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .collaboration-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        
        .user-tasks, .hud-tasks {
            padding: 25px;
        }
        
        .user-tasks {
            border-right: 1px solid #e2e8f0;
        }
        
        .user-tasks h3 {
            color: #3b82f6;
            margin: 0 0 20px 0;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .hud-tasks h3 {
            color: #10b981;
            margin: 0 0 20px 0;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .issue-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .issue-card.user-issue {
            border-left: 4px solid #3b82f6;
        }
        
        .issue-card.hud-fix {
            border-left: 4px solid #10b981;
        }
        
        .issue-card h4 {
            margin: 0 0 10px 0;
            color: #1e293b;
        }
        
        .issue-severity {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        
        .severity-high { background: #fef2f2; color: #dc2626; }
        .severity-medium { background: #fef3c7; color: #d97706; }
        .severity-low { background: #f0fdf4; color: #16a34a; }
        
        .section {
            background: white;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .section-header {
            background: #f8fafc;
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
            border-radius: 12px 12px 0 0;
        }
        
        .section-header h2 {
            margin: 0;
            color: #1e293b;
            font-size: 1.5em;
        }
        
        .section-content {
            padding: 25px;
        }
        
        .test-result {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        
        .test-result.passed {
            border-left: 4px solid #10b981;
        }
        
        .test-result.failed {
            border-left: 4px solid #ef4444;
        }
        
        .test-result.needs-review {
            border-left: 4px solid #f59e0b;
        }
        
        .test-header {
            padding: 15px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .test-title {
            font-weight: 600;
            color: #1e293b;
        }
        
        .test-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .status-passed { background: #dcfce7; color: #16a34a; }
        .status-failed { background: #fee2e2; color: #dc2626; }
        .status-review { background: #fef3c7; color: #d97706; }
        
        .test-details {
            padding: 20px;
            display: none;
        }
        
        .test-details.expanded {
            display: block;
        }
        
        .expandable {
            transition: all 0.3s ease;
        }
        
        .visual-evidence {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        
        .console-evidence {
            background: #1e293b;
            color: #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .suggested-action {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        
        .suggested-action strong {
            color: #1d4ed8;
        }
        
        .no-issues {
            text-align: center;
            padding: 40px;
            color: #64748b;
        }
        
        .performance-metric {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .performance-metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 600;
            color: #475569;
        }
        
        .metric-value {
            font-weight: 700;
        }
        
        .metric-good { color: #16a34a; }
        .metric-warning { color: #d97706; }
        .metric-bad { color: #dc2626; }
        
        @media (max-width: 768px) {
            .collaboration-content {
                grid-template-columns: 1fr;
            }
            
            .user-tasks {
                border-right: none;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .summary-stats {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    `;
  }

  private generateHeader(data: TestSuiteResult): string {
    const duration = Math.round(data.duration / 1000);
    
    return `
        <div class="header">
            <h1>Track Edits Test Report</h1>
            <div class="header-meta">
                <div><strong>Session:</strong> ${data.sessionId}</div>
                <div><strong>Timestamp:</strong> ${data.timestamp}</div>
                <div><strong>Duration:</strong> ${duration}s</div>
                <div><strong>Framework:</strong> Track Edits Iterative Testing Suite v1.0</div>
            </div>
        </div>
    `;
  }

  private generateSummaryStats(data: TestSuiteResult): string {
    return `
        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-number">${data.summary.totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number success">${data.summary.passedTests}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number error">${data.summary.failedTests}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number warning">${data.summary.userReviewTests}</div>
                <div class="stat-label">Needs Review</div>
            </div>
            <div class="stat-card">
                <div class="stat-number success">${data.summary.hudAutoFixTests}</div>
                <div class="stat-label">Auto-Fixed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number error">${data.summary.criticalIssues}</div>
                <div class="stat-label">Critical Issues</div>
            </div>
        </div>
    `;
  }

  private generateHudPartnershipPanel(data: TestSuiteResult): string {
    const userIssues = data.issues.filter(issue => issue.assignee === 'USER');
    const hudActions = data.hudActions.filter(action => action.status === 'COMPLETED');

    return `
        <div class="collaboration-panel">
            <div class="collaboration-header">
                <h2>🤝 HUD Partnership Model</h2>
                <p>Clear division of responsibilities between user review and automated HUD actions</p>
            </div>
            <div class="collaboration-content">
                <div class="user-tasks">
                    <h3>👤 User Review Required</h3>
                    ${userIssues.length > 0 ? userIssues.map(issue => `
                        <div class="issue-card user-issue">
                            <span class="issue-severity severity-${issue.severity.toLowerCase()}">${issue.severity}</span>
                            <h4>${issue.description}</h4>
                            <p><strong>Type:</strong> ${issue.type}</p>
                            ${issue.suggestedAction ? `
                                <div class="suggested-action">
                                    <strong>Suggested Action:</strong> ${issue.suggestedAction}
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : `
                        <div class="no-issues">
                            <h4>🎉 No User Issues Found!</h4>
                            <p>All visual and UX aspects are working correctly.</p>
                        </div>
                    `}
                </div>
                
                <div class="hud-tasks">
                    <h3>🤖 HUD Auto-Fixed</h3>
                    ${hudActions.length > 0 ? hudActions.map(action => `
                        <div class="issue-card hud-fix">
                            <h4>${action.description}</h4>
                            <p><strong>Type:</strong> ${action.type}</p>
                            <p><strong>Status:</strong> <span style="color: #16a34a;">✓ ${action.status}</span></p>
                        </div>
                    `).join('') : `
                        <div class="no-issues">
                            <h4>No Infrastructure Issues</h4>
                            <p>All technical systems are functioning properly.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
  }

  private generateTestResults(data: TestSuiteResult): string {
    return `
        <div class="section">
            <div class="section-header">
                <h2>📊 Detailed Test Results</h2>
            </div>
            <div class="section-content">
                ${data.results.map(result => this.generateTestResultCard(result)).join('')}
            </div>
        </div>
    `;
  }

  private generateTestResultCard(result: TestResult): string {
    const statusClass = result.category === 'PASS' ? 'passed' : 
                       result.category === 'USER_REVIEW' ? 'needs-review' : 'failed';
    const statusLabel = result.category === 'PASS' ? 'PASSED' : 
                       result.category === 'USER_REVIEW' ? 'NEEDS REVIEW' : 'FAILED';

    return `
        <div class="test-result ${statusClass}">
            <div class="test-header" onclick="toggleTestDetails('${result.testId}')">
                <div class="test-title">${result.name}</div>
                <div class="test-status status-${statusClass.replace('needs-review', 'review')}">${statusLabel}</div>
            </div>
            <div id="details-${result.testId}" class="test-details">
                <p><strong>Description:</strong> ${result.description}</p>
                <p><strong>Duration:</strong> ${result.duration}ms</p>
                
                ${result.issues.length > 0 ? `
                    <h4>Issues Found:</h4>
                    ${result.issues.map(issue => `
                        <div class="issue-card">
                            <span class="issue-severity severity-${issue.severity.toLowerCase()}">${issue.severity}</span>
                            <h4>${issue.description}</h4>
                            <p><strong>Category:</strong> ${issue.category}</p>
                            <p><strong>Assignee:</strong> ${issue.assignee}</p>
                            ${issue.suggestedAction ? `
                                <div class="suggested-action">
                                    <strong>Suggested Action:</strong> ${issue.suggestedAction}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                ` : ''}
                
                ${result.visualState ? `
                    <h4>Visual State:</h4>
                    <div class="visual-evidence">
                        <p><strong>Side Panel Visible:</strong> ${result.visualState.sidePanelVisible}</p>
                        <p><strong>Ribbon State:</strong> ${result.visualState.ribbonState}</p>
                        <p><strong>Edit Highlights:</strong> ${result.visualState.editHighlights.length} found</p>
                        <p><strong>Document:</strong> ${result.visualState.documentState.filePath} (${result.visualState.documentState.characterCount} chars)</p>
                    </div>
                ` : ''}
                
                ${result.consoleEntries && result.consoleEntries.length > 0 ? `
                    <h4>Console Evidence:</h4>
                    <div class="console-evidence">
                        ${result.consoleEntries.slice(0, 5).map(entry => 
                            `[${entry.level}] ${entry.component}: ${entry.action} - ${JSON.stringify(entry.data).substring(0, 100)}`
                        ).join('<br>')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
  }

  private generatePerformanceSection(data: TestSuiteResult): string {
    return `
        <div class="section">
            <div class="section-header">
                <h2>⚡ Performance Metrics</h2>
            </div>
            <div class="section-content">
                <div class="performance-metric">
                    <div class="metric-label">Average Response Time</div>
                    <div class="metric-value ${data.performance.averageResponseTime < 16 ? 'metric-good' : 'metric-warning'}">
                        ${data.performance.averageResponseTime.toFixed(2)}ms
                    </div>
                </div>
                <div class="performance-metric">
                    <div class="metric-label">Memory Usage</div>
                    <div class="metric-value ${data.performance.memoryUsage < 512 * 1024 * 1024 ? 'metric-good' : 'metric-warning'}">
                        ${Math.round(data.performance.memoryUsage / 1024 / 1024)}MB
                    </div>
                </div>
                ${data.performance.slowOperations.length > 0 ? `
                    <div class="performance-metric">
                        <div class="metric-label">Slow Operations</div>
                        <div class="metric-value metric-warning">${data.performance.slowOperations.length} found</div>
                    </div>
                    ${data.performance.slowOperations.map(op => `
                        <div class="performance-metric">
                            <div class="metric-label">&nbsp;&nbsp;${op.operation}</div>
                            <div class="metric-value metric-bad">${op.duration.toFixed(2)}ms (>${op.threshold}ms)</div>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        </div>
    `;
  }

  private generateIssuesSection(data: TestSuiteResult): string {
    if (data.issues.length === 0) {
      return `
        <div class="section">
            <div class="section-header">
                <h2>🎉 No Issues Found</h2>
            </div>
            <div class="section-content">
                <div class="no-issues">
                    <h3>Excellent! All tests passed without issues.</h3>
                    <p>The Track Edits plugin is functioning correctly across all tested scenarios.</p>
                </div>
            </div>
        </div>
      `;
    }

    const criticalIssues = data.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = data.issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = data.issues.filter(i => i.severity === 'MEDIUM');
    const lowIssues = data.issues.filter(i => i.severity === 'LOW');

    return `
        <div class="section">
            <div class="section-header">
                <h2>🚨 Issues Summary</h2>
            </div>
            <div class="section-content">
                ${[...criticalIssues, ...highIssues, ...mediumIssues, ...lowIssues].map(issue => `
                    <div class="issue-card">
                        <span class="issue-severity severity-${issue.severity.toLowerCase()}">${issue.severity}</span>
                        <h4>${issue.description}</h4>
                        <p><strong>Type:</strong> ${issue.type}</p>
                        <p><strong>Category:</strong> ${issue.category}</p>
                        <p><strong>Assignee:</strong> ${issue.assignee}</p>
                        ${issue.suggestedAction ? `
                            <div class="suggested-action">
                                <strong>Suggested Action:</strong> ${issue.suggestedAction}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
  }

  private getInteractiveScript(): string {
    return `
        function toggleTestDetails(testId) {
            const details = document.getElementById('details-' + testId);
            if (details.classList.contains('expanded')) {
                details.classList.remove('expanded');
            } else {
                details.classList.add('expanded');
            }
        }
        
        // Auto-expand failed tests
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.test-result.failed .test-details').forEach(function(element) {
                element.classList.add('expanded');
            });
        });
    `;
  }

  private async generateSupportingFiles(data: TestSuiteResult): Promise<void> {
    // Generate raw JSON data file
    const jsonPath = join(this.outputDir, 'test-data.json');
    writeFileSync(jsonPath, JSON.stringify(data, null, 2));

    // Generate CSV for analysis
    const csvPath = join(this.outputDir, 'test-results.csv');
    const csvContent = this.generateCSVReport(data);
    writeFileSync(csvPath, csvContent);

    // Generate executive summary
    const summaryPath = join(this.outputDir, 'executive-summary.md');
    const summaryContent = this.generateExecutiveSummary(data);
    writeFileSync(summaryPath, summaryContent);

    console.log(`[ReportGenerator] Supporting files generated: JSON, CSV, Summary`);
  }

  private generateCSVReport(data: TestSuiteResult): string {
    const headers = ['Test ID', 'Name', 'Category', 'Duration (ms)', 'Issues Count', 'Severity'];
    const rows = data.results.map(result => [
      result.testId,
      result.name.replace(/,/g, ';'), // Escape commas
      result.category,
      result.duration,
      result.issues.length,
      result.issues.length > 0 ? result.issues[0].severity : 'NONE'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private generateExecutiveSummary(data: TestSuiteResult): string {
    const successRate = Math.round((data.summary.passedTests / data.summary.totalTests) * 100);
    const duration = Math.round(data.duration / 1000);

    return `# Track Edits Test Suite - Executive Summary

**Session**: ${data.sessionId}  
**Date**: ${data.timestamp}  
**Duration**: ${duration} seconds  
**Success Rate**: ${successRate}%

## Key Results

- **Total Tests**: ${data.summary.totalTests}
- **Passed**: ${data.summary.passedTests}
- **Failed**: ${data.summary.failedTests}
- **Needs User Review**: ${data.summary.userReviewTests}
- **Auto-Fixed by HUD**: ${data.summary.hudAutoFixTests}

## Critical Issues

${data.summary.criticalIssues > 0 ? 
  data.issues.filter(i => i.severity === 'CRITICAL').map(issue => 
    `- **${issue.type}**: ${issue.description}`
  ).join('\n') : 
  '✅ No critical issues found'
}

## Performance Summary

- **Average Response Time**: ${data.performance.averageResponseTime.toFixed(2)}ms
- **Memory Usage**: ${Math.round(data.performance.memoryUsage / 1024 / 1024)}MB
- **Slow Operations**: ${data.performance.slowOperations.length}

## HUD Partnership Results

**User Focus Areas**: ${data.issues.filter(i => i.assignee === 'USER').length} issues requiring user review  
**HUD Automated**: ${data.hudActions.filter(a => a.status === 'COMPLETED').length} infrastructure fixes completed

## Next Steps

1. Review HTML report for detailed analysis
2. Address user-assigned issues (visual/UX problems)  
3. Verify HUD auto-fixes are working correctly
4. ${successRate < 95 ? 'Investigate failed tests and rerun suite' : 'Monitor performance in production environment'}

---

*Generated by Track Edits Iterative Testing Suite v1.0*
`;
  }
}