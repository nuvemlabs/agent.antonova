/**
 * GitHub Labels adapter for issue management
 * Uses traditional GitHub issue labels for priority and status management
 */
import { IssueAdapter } from './issue-adapter.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitHubLabelsAdapter extends IssueAdapter {
  constructor(config) {
    super(config);
    
    // Required config
    this.owner = config.github?.owner;
    this.repo = config.github?.repo;
    
    if (!this.owner || !this.repo) {
      throw new Error('GitHubLabelsAdapter requires github.owner and github.repo in config');
    }
    
    this.repoFullName = `${this.owner}/${this.repo}`;
    
    // Priority mapping for legacy labels
    this.priorityOrder = {
      'priority-critical': 1000,
      'priority-high': 800,
      'priority-medium': 600,
      'priority-low': 400,
      'default': 300
    };
    
    // Status label mapping
    this.statusLabels = {
      backlog: ['backlog', 'needs-refinement', 'draft'],
      ready: ['ready', 'ready-for-dev'],
      inProgress: ['in-progress', 'working'],
      blocked: ['blocked', 'on-hold'],
      review: ['review', 'in-review'],
      done: ['done', 'complete']
    };
  }

  /**
   * Get the next highest priority issue that's ready for work
   */
  async getNextIssue() {
    const readyIssues = await this.getAllIssues({ status: 'ready' });
    if (readyIssues.length === 0) return null;
    
    // Sort by priority score (descending) and return the highest
    readyIssues.sort((a, b) => b.priority - a.priority);
    return readyIssues[0];
  }

  /**
   * Get all issues matching the given filters
   */
  async getAllIssues(filters = {}) {
    try {
      let command = `gh issue list -R ${this.repoFullName} --state open --json number,title,body,labels,url,createdAt --limit 100`;
      
      // Add label filter if specified
      if (filters.status) {
        const statusLabels = this.statusLabels[filters.status] || [filters.status];
        const labelQuery = statusLabels.map(label => `--label "${label}"`).join(' ');
        command = `gh issue list -R ${this.repoFullName} --state open ${labelQuery} --json number,title,body,labels,url,createdAt --limit 100`;
      }
      
      const { stdout, stderr } = await execAsync(command);
      
      if (!stdout.trim()) {
        return [];
      }
      
      const rawIssues = JSON.parse(stdout);
      const issues = [];
      
      for (const rawIssue of rawIssues) {
        const labels = rawIssue.labels?.map(label => label.name) || [];
        const status = this.getStatusFromLabels(labels);
        
        // Apply additional filters
        if (filters.labels && filters.labels.length > 0) {
          const hasAllLabels = filters.labels.every(label => labels.includes(label));
          if (!hasAllLabels) continue;
        }
        
        const priority = this.getPriorityFromLabels(labels);
        
        issues.push({
          id: rawIssue.number.toString(),
          number: rawIssue.number,
          title: rawIssue.title,
          body: rawIssue.body,
          url: rawIssue.url,
          labels,
          status,
          priority,
          createdAt: rawIssue.createdAt,
          raw: rawIssue
        });
      }
      
      return issues;
    } catch (error) {
      if (error.message.includes('Resource not accessible by personal access token')) {
        console.error('❌ GitHub Token Permission Error:');
        console.error('   The current GitHub token lacks required permissions.');
        console.error('   Please run: gh auth refresh -s repo,read:org');
        console.error('   Or check your token permissions at: https://github.com/settings/tokens');
      } else if (error.message.includes('not found')) {
        console.error(`❌ Repository not found: ${this.repoFullName}`);
        console.error('   Please check the repository name and your access permissions.');
      } else {
        console.error('❌ Error querying issues:', error.message);
      }
      return [];
    }
  }

  /**
   * Update the status of an issue
   */
  async updateIssueStatus(issueId, status) {
    try {
      const issueNumber = typeof issueId === 'string' ? parseInt(issueId) : issueId;
      
      // Remove existing status labels
      const allStatusLabels = Object.values(this.statusLabels).flat();
      for (const label of allStatusLabels) {
        try {
          await execAsync(`gh issue edit ${issueNumber} -R ${this.repoFullName} --remove-label "${label}"`);
        } catch (error) {
          // Ignore errors for labels that don't exist
        }
      }
      
      // Add new status label
      const statusLabel = this.statusLabels[status]?.[0] || status;
      await execAsync(`gh issue edit ${issueNumber} -R ${this.repoFullName} --add-label "${statusLabel}"`);
      
      return true;
    } catch (error) {
      if (error.message.includes('Resource not accessible by personal access token')) {
        console.error('❌ GitHub Token Permission Error:');
        console.error('   Cannot update issue status due to insufficient permissions.');
        console.error('   Please run: gh auth refresh -s repo,write:org');
      } else {
        console.error(`❌ Failed to update issue ${issueId} status:`, error.message);
      }
      return false;
    }
  }

  /**
   * Get the priority score for an issue
   */
  async getIssuePriority(issue) {
    if (issue.priority !== undefined) return issue.priority;
    
    const labels = issue.labels || [];
    return this.getPriorityFromLabels(labels);
  }

  /**
   * Get issues grouped by status
   */
  async getIssuesSummary() {
    const allIssues = await this.getAllIssues();
    
    const summary = {
      backlog: [],
      ready: [],
      inProgress: [],
      blocked: [],
      review: [],
      done: []
    };
    
    for (const issue of allIssues) {
      const status = issue.status || 'unknown';
      if (summary[status]) {
        summary[status].push(issue);
      }
    }
    
    // Sort each status group by priority
    for (const status in summary) {
      summary[status].sort((a, b) => b.priority - a.priority);
    }
    
    return summary;
  }

  /**
   * Helper: Get priority score from labels
   */
  getPriorityFromLabels(labels) {
    for (const label of labels) {
      if (this.priorityOrder[label] !== undefined) {
        return this.priorityOrder[label];
      }
    }
    return this.priorityOrder.default;
  }

  /**
   * Helper: Get status from labels
   */
  getStatusFromLabels(labels) {
    for (const [status, statusLabels] of Object.entries(this.statusLabels)) {
      for (const statusLabel of statusLabels) {
        if (labels.includes(statusLabel)) {
          return status;
        }
      }
    }
    return 'unknown';
  }
}

export default GitHubLabelsAdapter;