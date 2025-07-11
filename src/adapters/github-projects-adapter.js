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
    if (this.initialized) return;
    
    // Check token type and determine API mode
    await this.detectTokenType();
    
    if (this.isFineGrainedToken) {
      console.log('🔧 Fine-grained token detected - using enhanced REST API mode');
      this.fallbackMode = true;
      this.projectId = null;
      this.fields = {};
      this.initialized = true;
      return;
    } else if (this.isClassicPAT) {
      console.log('🔧 Classic PAT detected - using full GraphQL API mode');
      this.fallbackMode = false;
    }
    
    try {
      const result = await graphql(queries.getProjectFields, {
        owner: this.owner,
        projectNumber: this.projectNumber
      });
      
      const project = result.data?.user?.projectV2;
      if (!project) {
        throw new Error(`Project #${this.projectNumber} not found for user ${this.owner}`);
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
      
      this.initialized = true;
    } catch (error) {
      if (error.message.includes('Resource not accessible by personal access token')) {
        console.warn('⚠️  GitHub Projects GraphQL access not available - using enhanced fallback mode');
        console.warn('   This may be due to fine-grained token limitations with Projects v2 API');
        this.projectId = null;
        this.fields = {};
        this.fallbackMode = true;
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Detect if we're using a fine-grained token vs classic PAT
   */
  async detectTokenType() {
    if (this.tokenTypeChecked) return;
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('gh auth token');
      const token = stdout.trim();
      
      // Fine-grained tokens start with github_pat_, classic tokens start with ghp_
      this.isFineGrainedToken = token.startsWith('github_pat_') && token.length > 40;
      this.isClassicPAT = token.startsWith('ghp_');
      this.tokenTypeChecked = true;
      
      if (this.isFineGrainedToken) {
        console.log('🔍 Fine-grained Personal Access Token detected');
        console.log('   Using enhanced REST API mode for optimal compatibility');
      } else if (this.isClassicPAT) {
        console.log('🔍 Classic Personal Access Token detected');
        console.log('   Using full GraphQL API mode with project access');
      } else {
        console.log('🔍 Unknown token type - attempting full GraphQL API mode');
      }
    } catch (error) {
      // Default to assuming classic token if detection fails
      this.isFineGrainedToken = false;
      this.isClassicPAT = true;
      this.tokenTypeChecked = true;
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
    
    // If in fallback mode, use GitHub CLI instead of GraphQL
    if (this.fallbackMode) {
      return this.getAllIssuesFallback(filters);
    }
    
    try {
      const result = await graphql(queries.getProjectItems, {
        owner: this.owner,
        projectNumber: this.projectNumber
      });
      
      const items = result.data?.user?.projectV2?.items?.nodes || [];
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
    } catch (error) {
      if (error.message.includes('Resource not accessible by personal access token')) {
        console.warn('⚠️  Falling back to GitHub CLI for issue access');
        this.fallbackMode = true;
        return this.getAllIssuesFallback(filters);
      }
      throw error;
    }
  }

  /**
   * Enhanced fallback method using GitHub CLI and REST API
   * Provides full kanban-like functionality without GraphQL
   */
  async getAllIssuesFallback(filters = {}) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      let command = `gh issue list -R ${this.owner}/${this.repo} --state open --json number,title,body,labels,url,createdAt,assignees --limit 100`;
      
      // Add label filter if specified
      if (filters.status) {
        const statusLabels = this.statusMapping[filters.status] || [filters.status];
        const labelQuery = statusLabels.map(label => `--label "${label}"`).join(' ');
        command = `gh issue list -R ${this.owner}/${this.repo} --state open ${labelQuery} --json number,title,body,labels,url,createdAt,assignees --limit 100`;
      }
      
      const { stdout } = await execAsync(command);
      
      if (!stdout.trim()) {
        return [];
      }
      
      const rawIssues = JSON.parse(stdout);
      const issues = [];
      
      for (const rawIssue of rawIssues) {
        const labels = rawIssue.labels?.map(label => label.name) || [];
        
        // Apply additional filters
        if (filters.labels && filters.labels.length > 0) {
          const hasAllLabels = filters.labels.every(label => labels.includes(label));
          if (!hasAllLabels) continue;
        }
        
        // Simple priority calculation based on labels
        const priorityInfo = this.calculateSimplePriority(labels);
        const status = 'ready'; // All issues from ready filter are ready
        
        // Basic fields from issue metadata
        const parsedFields = { Status: status };
        
        issues.push({
          id: rawIssue.number.toString(),
          number: rawIssue.number,
          title: rawIssue.title,
          body: rawIssue.body,
          url: rawIssue.url,
          labels,
          status,
          priority: priorityInfo.score,
          priorityComponents: priorityInfo.components,
          assignees: rawIssue.assignees?.map(a => a.login) || [],
          createdAt: rawIssue.createdAt,
          enhancedMode: true,
          fields: parsedFields
        });
      }
      
      return issues;
    } catch (error) {
      console.error('❌ Error in enhanced mode:', error.message);
      return [];
    }
  }

  /**
   * Simple priority calculation based on labels
   */
  calculateSimplePriority(labels) {
    // Simple priority based on label presence
    let score = 100; // Base score
    
    if (labels.includes('priority-critical')) score = 1000;
    else if (labels.includes('priority-high')) score = 800;
    else if (labels.includes('priority-medium')) score = 600;
    else if (labels.includes('priority-low')) score = 400;
    
    // Add modifiers
    if (labels.includes('bug')) score += 50;
    if (labels.includes('security')) score += 100;
    if (labels.includes('core')) score += 25;
    
    return {
      score,
      components: {
        base: 100,
        priority: score - 100,
        simple: true
      }
    };
  }

  /**
   * Enhanced priority calculation using multiple factors
   */
  calculateEnhancedPriority(labels, issue) {
    const impact = this.getImpactFromLabels(labels);
    const urgency = this.getUrgencyFromLabels(labels);
    const effort = this.getEffortFromLabels(labels);
    
    // Apply the same formula as the GraphQL version
    const baseScore = (impact * urgency * 10) / effort;
    
    // Add bonuses for various factors
    let bonus = 0;
    
    // Age bonus - older ready issues get slight priority boost
    const ageInDays = (Date.now() - new Date(issue.createdAt)) / (1000 * 60 * 60 * 24);
    if (ageInDays > 7) bonus += Math.min(ageInDays * 2, 50);
    
    // Component-specific bonuses
    if (labels.includes('core')) bonus += 10;
    if (labels.includes('bug')) bonus += 15;
    if (labels.includes('security')) bonus += 25;
    
    const finalScore = Math.round(baseScore + bonus);
    
    return {
      score: finalScore,
      components: {
        impact,
        urgency, 
        effort,
        bonus,
        baseScore: Math.round(baseScore)
      }
    };
  }

  /**
   * Parse issue body and labels for project-like fields
   */
  parseIssueForFields(body, labels) {
    const fields = {};
    
    // Extract fields from issue body if formatted properly
    if (body) {
      // Look for field patterns like "Impact: High", "Effort: Medium"
      const impactMatch = body.match(/(?:^|\n)(?:Impact|Priority):\s*(\w+)/i);
      const effortMatch = body.match(/(?:^|\n)Effort:\s*(\w+)/i);
      const urgencyMatch = body.match(/(?:^|\n)Urgency:\s*(\w+)/i);
      
      if (impactMatch) fields.Impact = impactMatch[1];
      if (effortMatch) fields.Effort = effortMatch[1];
      if (urgencyMatch) fields.Urgency = urgencyMatch[1];
    }
    
    // Extract from labels as fallback
    fields.Impact = fields.Impact || this.extractFieldFromLabels(labels, 'impact', ['critical', 'high', 'medium', 'low']);
    fields.Effort = fields.Effort || this.extractFieldFromLabels(labels, 'effort', ['xs', 's', 'm', 'l', 'xl']);
    fields.Urgency = fields.Urgency || this.extractFieldFromLabels(labels, 'urgency', ['immediate', 'soon', 'normal', 'eventually']);
    
    return fields;
  }

  /**
   * Extract field value from labels
   */
  extractFieldFromLabels(labels, fieldType, validValues) {
    for (const label of labels) {
      const labelLower = label.toLowerCase();
      if (labelLower.includes(fieldType)) {
        for (const value of validValues) {
          if (labelLower.includes(value)) {
            return value.charAt(0).toUpperCase() + value.slice(1);
          }
        }
      }
    }
    return null;
  }

  /**
   * Get priority from labels (fallback mode)
   */
  getPriorityFromLabels(labels) {
    // Priority mapping for legacy labels
    const priorityOrder = {
      'priority-critical': 1000,
      'priority-high': 800,
      'priority-medium': 600,
      'priority-low': 400,
      'default': 300
    };
    
    for (const label of labels) {
      if (priorityOrder[label] !== undefined) {
        return priorityOrder[label];
      }
    }
    
    return priorityOrder.default;
  }

  /**
   * Extract impact from labels
   */
  getImpactFromLabels(labels) {
    const impactMap = this.config.prioritization?.impactMap || {
      'Critical': 40, 'High': 30, 'Medium': 20, 'Low': 10
    };
    
    for (const label of labels) {
      if (label.includes('priority-critical') || label.includes('critical')) return impactMap.Critical || 40;
      if (label.includes('priority-high') || label.includes('high')) return impactMap.High || 30;
      if (label.includes('priority-medium') || label.includes('medium')) return impactMap.Medium || 20;
      if (label.includes('priority-low') || label.includes('low')) return impactMap.Low || 10;
    }
    
    return impactMap.Medium || 20; // Default to medium impact
  }

  /**
   * Extract urgency from labels  
   */
  getUrgencyFromLabels(labels) {
    const urgencyMap = this.config.prioritization?.urgencyMap || {
      'Immediate': 4, 'Soon': 3, 'Normal': 2, 'Eventually': 1
    };
    
    for (const label of labels) {
      if (label.includes('urgent') || label.includes('immediate')) return urgencyMap.Immediate || 4;
      if (label.includes('soon') || label.includes('asap')) return urgencyMap.Soon || 3;
      if (label.includes('eventually') || label.includes('later')) return urgencyMap.Eventually || 1;
    }
    
    return urgencyMap.Normal || 2; // Default to normal urgency
  }

  /**
   * Extract effort from labels
   */
  getEffortFromLabels(labels) {
    const effortMap = this.config.prioritization?.effortMap || {
      'XS': 1, 'S': 2, 'M': 3, 'L': 5, 'XL': 8
    };
    
    for (const label of labels) {
      if (label.includes('effort-xs') || label.includes('trivial')) return effortMap.XS || 1;
      if (label.includes('effort-s') || label.includes('small')) return effortMap.S || 2;
      if (label.includes('effort-m') || label.includes('medium')) return effortMap.M || 3;
      if (label.includes('effort-l') || label.includes('large')) return effortMap.L || 5;
      if (label.includes('effort-xl') || label.includes('epic')) return effortMap.XL || 8;
    }
    
    return effortMap.M || 3; // Default to medium effort
  }

  /**
   * Get status from labels
   */
  getStatusFromLabels(labels) {
    for (const [status, statusLabels] of Object.entries(this.statusMapping)) {
      for (const statusLabel of statusLabels) {
        if (labels.includes(statusLabel.toLowerCase()) || labels.includes(statusLabel)) {
          return status;
        }
      }
    }
    
    return 'backlog'; // Default status
  }

  /**
   * Update the status of an issue
   */
  async updateIssueStatus(issueId, status) {
    await this.initialize();
    
    // In fallback mode (fine-grained token limitation), provide manual instructions
    if (this.fallbackMode) {
      return this.updateIssueStatusFallback(issueId, status);
    }
    
    const statusField = this.fields['Status'];
    if (!statusField) {
      throw new Error('Status field not found in project');
    }
    
    // Find the option ID for the status
    // Map our internal status names to project board option names
    const statusNameMap = {
      'backlog': 'Todo',
      'ready': 'Todo', 
      'inProgress': 'In Progress',
      'blocked': 'In Progress', // Project has no blocked column
      'review': 'In Progress',  // Project has no review column
      'done': 'Done'
    };
    
    const targetOptionName = statusNameMap[status] || status;
    const statusOption = statusField.options.find(opt => opt.name === targetOptionName);
    
    if (!statusOption) {
      throw new Error(`Status option not found for: ${status}`);
    }
    
    try {
      // Use gh project item-edit command directly
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const command = `gh project item-edit --id ${issueId} --field-id ${statusField.id} --project-id ${this.projectId} --single-select-option-id ${statusOption.id}`;
      await execAsync(command);
      
      console.log(`✅ Updated issue ${issueId} status to: ${status}`);
      return true;
    } catch (error) {
      if (error.message.includes('Resource not accessible by personal access token')) {
        console.warn('⚠️  Falling back to manual project board update');
        this.fallbackMode = true;
        return this.updateIssueStatusFallback(issueId, status);
      }
      console.error(`❌ Failed to update issue ${issueId} status:`, error.message);
      return false;
    }
  }

  /**
   * Update issue status using manual project board updates (fine-grained token limitation)
   */
  async updateIssueStatusFallback(issueId, status) {
    const issueNumber = typeof issueId === 'string' ? parseInt(issueId) : issueId;
    
    console.log(`⚠️  Fine-grained token limitation: Cannot directly update project Status field`);
    console.log(`   Issue #${issueNumber} needs to be moved to "${status}" column manually`);
    console.log(`   Project URL: https://github.com/${this.owner}/${this.repo}/projects/${this.projectNumber}`);
    console.log(`   
   📋 Manual Steps Required:
   1. Open the project board: https://github.com/${this.owner}/${this.repo}/projects/${this.projectNumber}
   2. Find issue #${issueNumber} in the current column
   3. Drag it to the "${status}" column
   
   🔧 Alternative Solutions:
   - Use a classic Personal Access Token instead of fine-grained token
   - Wait for GitHub to add Projects v2 support to fine-grained tokens
   - Use a GitHub App with proper project permissions
   `);
    
    // Return false to indicate that the status update was not completed automatically
    return false;
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
    
    // Map project board status to our internal status
    const projectStatusMap = {
      'Todo': 'ready',
      'In Progress': 'inProgress', 
      'Done': 'done'
    };
    
    return projectStatusMap[statusValue] || statusValue.toLowerCase().replace(/\s+/g, '-');
  }
}

export default GitHubProjectsAdapter;