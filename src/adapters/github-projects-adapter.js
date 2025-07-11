/**
 * GitHub Projects v2 adapter for issue management
 * Uses GraphQL API to interact with GitHub Projects
 */
import { IssueAdapter } from './issue-adapter.js';
import { graphql, queries, extractFieldValues, calculatePriorityScore } from '../utils/github-graphql.js';

export class GitHubProjectsAdapter extends IssueAdapter {
  constructor(config) {
    super(config);
    
    // Required config
    this.owner = config.github?.owner;
    this.repo = config.github?.repo;
    this.projectNumber = config.github?.projectNumber;
    
    if (!this.owner || !this.repo || !this.projectNumber) {
      throw new Error('GitHubProjectsAdapter requires github.owner, github.repo, and github.projectNumber in config');
    }
    
    // Optional config
    this.priorityFormula = config.prioritization?.formula || 'default';
    this.statusMapping = config.prioritization?.statuses || {
      backlog: ['Backlog'],
      ready: ['Ready'],
      inProgress: ['In Progress'],
      blocked: ['Blocked'],
      review: ['Review'],
      done: ['Done']
    };
    
    // Cache for project metadata
    this.projectId = null;
    this.fields = null;
  }

  /**
   * Initialize the adapter by fetching project metadata
   */
  async initialize() {
    if (this.projectId && this.fields) return;
    
    const result = await graphql(queries.getProjectFields, {
      owner: this.owner,
      name: this.repo,
      projectNumber: this.projectNumber
    });
    
    const project = result.data?.repository?.projectV2;
    if (!project) {
      throw new Error(`Project #${this.projectNumber} not found in ${this.owner}/${this.repo}`);
    }
    
    this.projectId = project.id;
    this.fields = {};
    
    // Build field lookup map
    for (const field of project.fields.nodes) {
      this.fields[field.name] = {
        id: field.id,
        dataType: field.dataType,
        options: field.options || []
      };
    }
  }

  /**
   * Get the next highest priority issue that's ready for work
   */
  async getNextIssue() {
    await this.initialize();
    
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
    await this.initialize();
    
    const result = await graphql(queries.getProjectItems, {
      owner: this.owner,
      name: this.repo,
      projectNumber: this.projectNumber
    });
    
    const items = result.data?.repository?.projectV2?.items?.nodes || [];
    const issues = [];
    
    for (const item of items) {
      if (!item.content || item.content.state === 'CLOSED') continue;
      
      const fields = extractFieldValues(item);
      const status = this.getStatusFromFields(fields);
      
      // Apply filters
      if (filters.status && status !== filters.status) continue;
      if (filters.labels && filters.labels.length > 0) {
        const itemLabels = item.content.labels?.nodes?.map(l => l.name) || [];
        const hasAllLabels = filters.labels.every(label => itemLabels.includes(label));
        if (!hasAllLabels) continue;
      }
      
      const priorityInfo = calculatePriorityScore(fields, this.config.prioritization);
      
      issues.push({
        id: item.id,
        projectItemId: item.id,
        number: item.content.number,
        title: item.content.title,
        body: item.content.body,
        url: item.content.url,
        labels: item.content.labels?.nodes?.map(l => l.name) || [],
        status,
        priority: priorityInfo.score,
        priorityComponents: priorityInfo.components,
        fields,
        raw: item
      });
    }
    
    return issues;
  }

  /**
   * Update the status of an issue
   */
  async updateIssueStatus(issueId, status) {
    await this.initialize();
    
    const statusField = this.fields['Status'];
    if (!statusField) {
      throw new Error('Status field not found in project');
    }
    
    // Find the option ID for the status
    const statusOption = statusField.options.find(opt => 
      this.statusMapping[status]?.includes(opt.name) || opt.name === status
    );
    
    if (!statusOption) {
      throw new Error(`Status option not found for: ${status}`);
    }
    
    try {
      await graphql(queries.updateItemFieldValue, {
        projectId: this.projectId,
        itemId: issueId,
        fieldId: statusField.id,
        value: { singleSelectOptionId: statusOption.id }
      });
      
      console.log(`✅ Updated issue ${issueId} status to: ${status}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update issue ${issueId} status:`, error.message);
      return false;
    }
  }

  /**
   * Get the priority score for an issue
   */
  async getIssuePriority(issue) {
    if (issue.priority !== undefined) return issue.priority;
    
    const fields = issue.fields || extractFieldValues(issue);
    const priorityInfo = calculatePriorityScore(fields, this.config.prioritization);
    return priorityInfo.score;
  }

  /**
   * Set the priority score for an issue
   */
  async setIssuePriority(issueId, priorityScore) {
    await this.initialize();
    
    const priorityField = this.fields['Priority Score'];
    if (!priorityField) {
      console.warn('Priority Score field not found in project, attempting to use Priority Adjustment');
      
      // Try to use Priority Adjustment field instead
      const adjustmentField = this.fields['Priority Adjustment'];
      if (!adjustmentField) {
        throw new Error('Neither Priority Score nor Priority Adjustment field found in project');
      }
      
      return this.updateFieldValue(issueId, adjustmentField.id, { number: priorityScore });
    }
    
    return this.updateFieldValue(issueId, priorityField.id, { number: priorityScore });
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
   * Helper: Update a field value
   */
  async updateFieldValue(itemId, fieldId, value) {
    try {
      await graphql(queries.updateItemFieldValue, {
        projectId: this.projectId,
        itemId,
        fieldId,
        value
      });
      return true;
    } catch (error) {
      console.error('Failed to update field value:', error.message);
      return false;
    }
  }

  /**
   * Helper: Get status from field values
   */
  getStatusFromFields(fields) {
    const statusValue = fields['Status'];
    if (!statusValue) return 'unknown';
    
    // Check each status mapping
    for (const [status, values] of Object.entries(this.statusMapping)) {
      if (values.includes(statusValue)) {
        return status;
      }
    }
    
    // If no mapping found, return the raw value lowercased
    return statusValue.toLowerCase().replace(/\s+/g, '-');
  }
}

export default GitHubProjectsAdapter;