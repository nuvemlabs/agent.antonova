/**
 * Abstract base class for issue adapters
 * Provides a consistent interface for different issue tracking systems
 */
export class IssueAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Get the next highest priority issue that's ready for work
   * @returns {Object|null} Issue object with normalized structure or null if no issues
   */
  async getNextIssue() {
    throw new Error('getNextIssue() must be implemented by subclass');
  }

  /**
   * Get all issues matching the given filters
   * @param {Object} filters - Filter criteria (status, labels, etc.)
   * @returns {Array} Array of issue objects
   */
  async getAllIssues(filters = {}) {
    throw new Error('getAllIssues() must be implemented by subclass');
  }

  /**
   * Update the status of an issue
   * @param {string|number} issueId - Issue identifier
   * @param {string} status - New status (backlog, ready, in-progress, blocked, review, done)
   * @returns {boolean} Success status
   */
  async updateIssueStatus(issueId, status) {
    throw new Error('updateIssueStatus() must be implemented by subclass');
  }

  /**
   * Get the priority score for an issue
   * @param {Object} issue - Issue object
   * @returns {number} Priority score (higher = more important)
   */
  async getIssuePriority(issue) {
    throw new Error('getIssuePriority() must be implemented by subclass');
  }

  /**
   * Parse issue body to extract structured information
   * @param {Object} issue - Raw issue object
   * @returns {Object} Parsed issue with goal, acceptance criteria, etc.
   */
  parseIssue(issue) {
    const body = issue.body || '';
    
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.url || issue.html_url,
      body: body,
      status: issue.status || 'unknown',
      priority: issue.priority || 0,
      goal: this.extractSection(body, 'Goal'),
      acceptanceCriteria: this.extractAcceptanceCriteria(body),
      technicalSpecs: this.extractSection(body, 'Technical Specs'),
      labels: issue.labels || []
    };
  }

  /**
   * Extract a section from issue body
   * @param {string} body - Issue body text
   * @param {string} sectionName - Section to extract
   * @returns {string} Section content
   */
  extractSection(body, sectionName) {
    const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, 'i');
    const match = body.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract acceptance criteria from issue body
   * @param {string} body - Issue body text
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
   * Get issues grouped by status
   * @returns {Object} Issues grouped by status (backlog, ready, in-progress, etc.)
   */
  async getIssuesSummary() {
    throw new Error('getIssuesSummary() must be implemented by subclass');
  }

  /**
   * Set the priority score for an issue
   * @param {string|number} issueId - Issue identifier
   * @param {number} priorityScore - New priority score
   * @returns {boolean} Success status
   */
  async setIssuePriority(issueId, priorityScore) {
    throw new Error('setIssuePriority() must be implemented by subclass');
  }
}

export default IssueAdapter;