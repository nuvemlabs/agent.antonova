import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GitHub Issue Query Engine
 * Finds the highest priority ready issue for the agent to work on
 */
export class IssueEngine {
  constructor(repoOwner = 'nuvemlabs', repoName = 'agent.antonova') {
    this.repoOwner = repoOwner;
    this.repoName = repoName;
    this.repo = `${repoOwner}/${repoName}`;
  }

  /**
   * Find the highest priority ready issue
   * @returns {Object|null} Issue object or null if no ready issues
   */
  async getNextIssue() {
    try {
      console.log('🔍 Searching for highest priority ready issue...');
      
      // Query for ready issues, sorted by priority
      const issues = await this.queryReadyIssues();
      
      if (issues.length === 0) {
        console.log('📭 No ready issues found');
        return null;
      }

      // Sort by priority and return the highest priority issue
      const prioritizedIssue = this.prioritizeIssues(issues)[0];
      
      console.log(`🎯 Found issue #${prioritizedIssue.number}: ${prioritizedIssue.title}`);
      console.log(`   Priority: ${this.getIssuePriority(prioritizedIssue)}`);
      console.log(`   Labels: ${prioritizedIssue.labels.map(label => label.name).join(', ')}`);
      
      return prioritizedIssue;
    } catch (error) {
      console.error('❌ Error fetching next issue:', error.message);
      return null;
    }
  }

  /**
   * Query GitHub for issues with 'ready' label
   * @returns {Array} Array of issue objects
   */
  async queryReadyIssues() {
    try {
      const command = `gh issue list -R ${this.repo} --label "ready" --state open --json number,title,body,labels,url,createdAt`;
      const { stdout } = await execAsync(command);
      
      if (!stdout.trim()) {
        return [];
      }
      
      return JSON.parse(stdout);
    } catch (error) {
      console.error('❌ Error querying ready issues:', error.message);
      return [];
    }
  }

  /**
   * Prioritize issues based on priority labels
   * @param {Array} issues Array of issue objects
   * @returns {Array} Sorted array with highest priority first
   */
  prioritizeIssues(issues) {
    const priorityOrder = {
      'priority-critical': 1,
      'priority-high': 2,
      'priority-medium': 3,
      'priority-low': 4,
      'default': 5
    };

    return issues.sort((a, b) => {
      const aPriority = this.getIssuePriority(a);
      const bPriority = this.getIssuePriority(b);
      
      const aOrder = priorityOrder[aPriority] || priorityOrder.default;
      const bOrder = priorityOrder[bPriority] || priorityOrder.default;
      
      // If same priority, sort by creation date (older first)
      if (aOrder === bOrder) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      
      return aOrder - bOrder;
    });
  }

  /**
   * Extract priority from issue labels
   * @param {Object} issue Issue object
   * @returns {string} Priority level
   */
  getIssuePriority(issue) {
    const labels = issue.labels || [];
    const priorityLabel = labels.find(label => 
      label.name && label.name.startsWith('priority-')
    );
    return priorityLabel ? priorityLabel.name : 'default';
  }

  /**
   * Parse issue for structured information
   * @param {Object} issue Issue object
   * @returns {Object} Parsed issue data
   */
  parseIssue(issue) {
    const body = issue.body || '';
    
    return {
      number: issue.number,
      title: issue.title,
      url: issue.url,
      labels: (issue.labels || []).map(label => label.name),
      priority: this.getIssuePriority(issue),
      goal: this.extractSection(body, 'Goal'),
      acceptanceCriteria: this.extractAcceptanceCriteria(body),
      technicalSpecs: this.extractSection(body, 'Technical Specs'),
      rawBody: body
    };
  }

  /**
   * Extract a section from issue body
   * @param {string} body Issue body text
   * @param {string} sectionName Section to extract
   * @returns {string} Section content
   */
  extractSection(body, sectionName) {
    const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, 'i');
    const match = body.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract acceptance criteria from issue body
   * @param {string} body Issue body text
   * @returns {Array} Array of acceptance criteria
   */
  extractAcceptanceCriteria(body) {
    const section = this.extractSection(body, 'Acceptance Criteria');
    const criteriaRegex = /- \[ \] (.*)/g;
    const criteria = [];
    let match;
    
    while ((match = criteriaRegex.exec(section)) !== null) {
      criteria.push({
        text: match[1].trim(),
        completed: false
      });
    }
    
    return criteria;
  }

  /**
   * Update issue status
   * @param {number} issueNumber Issue number
   * @param {string} status New status (in-progress, review, etc.)
   */
  async updateIssueStatus(issueNumber, status) {
    try {
      console.log(`🏷️  Updating issue #${issueNumber} status to: ${status}`);
      
      // Remove existing status labels
      const statusLabels = ['ready', 'in-progress', 'blocked', 'review'];
      for (const label of statusLabels) {
        try {
          await execAsync(`gh issue edit ${issueNumber} -R ${this.repo} --remove-label "${label}"`);
        } catch (error) {
          // Ignore errors for labels that don't exist
        }
      }
      
      // Add new status label
      await execAsync(`gh issue edit ${issueNumber} -R ${this.repo} --add-label "${status}"`);
      
      console.log(`✅ Issue #${issueNumber} status updated to: ${status}`);
    } catch (error) {
      console.error(`❌ Error updating issue #${issueNumber} status:`, error.message);
    }
  }

  /**
   * Get all issues in different states for dashboard
   * @returns {Object} Issues grouped by status
   */
  async getIssuesSummary() {
    try {
      const command = `gh issue list -R ${this.repo} --state open --json number,title,labels,url --limit 100`;
      const { stdout } = await execAsync(command);
      
      if (!stdout.trim()) {
        return { ready: [], inProgress: [], blocked: [], review: [] };
      }
      
      const allIssues = JSON.parse(stdout);
      
      return {
        ready: allIssues.filter(issue => issue.labels.some(label => label.name === 'ready')),
        inProgress: allIssues.filter(issue => issue.labels.some(label => label.name === 'in-progress')),
        blocked: allIssues.filter(issue => issue.labels.some(label => label.name === 'blocked')),
        review: allIssues.filter(issue => issue.labels.some(label => label.name === 'review'))
      };
    } catch (error) {
      console.error('❌ Error getting issues summary:', error.message);
      return { ready: [], inProgress: [], blocked: [], review: [] };
    }
  }
}

export default IssueEngine;