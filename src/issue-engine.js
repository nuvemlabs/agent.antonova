import { loadRepoConfig, createAdapter } from "./config/repo-config.js";
import { GitHubLabelsAdapter } from "./adapters/github-labels-adapter.js";

/**
 * Issue Engine - Adapter-based issue management
 * Automatically selects the appropriate adapter based on repository configuration
 */
export class IssueEngine {
  constructor(
    repoOwner = "nuvemlabs",
    repoName = "agent.antonova",
    configOverrides = {}
  ) {
    this.repoOwner = repoOwner;
    this.repoName = repoName;
    this.repo = `${repoOwner}/${repoName}`;
    this.configOverrides = configOverrides;
    this.adapter = null;
    this.initialized = false;
  }

  /**
   * Initialize the engine with the appropriate adapter
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Try to load repository configuration
      const config = await loadRepoConfig(".", {
        ...this.configOverrides,
        github: {
          owner: this.repoOwner,
          repo: this.repoName,
          ...this.configOverrides.github,
        },
      });
      console.log(config);

      console.log(`🔧 Using ${config.adapter} adapter for ${this.repo}`);
      this.adapter = await createAdapter(config);
    } catch (error) {
      // Fallback to labels adapter if config loading fails
      console.log(`📝 No config found, using default GitHub labels adapter`);
      this.adapter = new GitHubLabelsAdapter({
        github: {
          owner: this.repoOwner,
          repo: this.repoName,
        },
      });
    }

    this.initialized = true;
  }

  /**
   * Find the highest priority ready issue
   * @returns {Object|null} Issue object or null if no ready issues
   */
  async getNextIssue() {
    await this.initialize();

    try {
      console.log("🔍 Searching for highest priority ready issue...");
      const issue = await this.adapter.getNextIssue();

      if (!issue) {
        console.log("📭 No ready issues found");
        return null;
      }

      console.log(`🎯 Found issue #${issue.number}: ${issue.title}`);
      console.log(`   Priority Score: ${issue.priority}`);
      if (issue.labels?.length > 0) {
        console.log(`   Labels: ${issue.labels.join(", ")}`);
      }

      return issue;
    } catch (error) {
      console.error("❌ Error fetching next issue:", error.message);
      return null;
    }
  }

  /**
   * Query for ready issues
   * @returns {Array} Array of issue objects
   */
  async queryReadyIssues() {
    await this.initialize();
    return this.adapter.getAllIssues({ status: "ready" });
  }

  /**
   * Prioritize issues (for compatibility)
   * @param {Array} issues Array of issue objects
   * @returns {Array} Sorted array with highest priority first
   */
  prioritizeIssues(issues) {
    return issues.sort((a, b) => {
      const aPriority = a.priority || 0;
      const bPriority = b.priority || 0;
      return bPriority - aPriority;
    });
  }

  /**
   * Get issue priority (for compatibility)
   * @param {Object} issue Issue object
   * @returns {number|string} Priority value
   */
  getIssuePriority(issue) {
    return issue.priority || "default";
  }

  /**
   * Parse issue for structured information
   * @param {Object} issue Issue object
   * @returns {Object} Parsed issue data
   */
  parseIssue(issue) {
    return this.adapter.parseIssue(issue);
  }

  /**
   * Extract a section from issue body
   * @param {string} body Issue body text
   * @param {string} sectionName Section to extract
   * @returns {string} Section content
   */
  extractSection(body, sectionName) {
    return this.adapter.extractSection(body, sectionName);
  }

  /**
   * Extract acceptance criteria from issue body
   * @param {string} body Issue body text
   * @returns {Array} Array of acceptance criteria
   */
  extractAcceptanceCriteria(body) {
    return this.adapter.extractAcceptanceCriteria(body);
  }

  /**
   * Update issue status
   * @param {number} issueNumber Issue number
   * @param {string} status New status (backlog, ready, in-progress, blocked, review, done)
   */
  async updateIssueStatus(issueNumber, status) {
    await this.initialize();

    try {
      console.log(`🏷️  Updating issue #${issueNumber} status to: ${status}`);
      const success = await this.adapter.updateIssueStatus(issueNumber, status);

      if (success) {
        console.log(`✅ Issue #${issueNumber} status updated to: ${status}`);
      }
      
      return success;
    } catch (error) {
      console.error(
        `❌ Error updating issue #${issueNumber} status:`,
        error.message
      );
      return false;
    }
  }

  /**
   * Get all issues in different states for dashboard
   * @returns {Object} Issues grouped by status
   */
  async getIssuesSummary() {
    await this.initialize();

    try {
      return await this.adapter.getIssuesSummary();
    } catch (error) {
      console.error("❌ Error getting issues summary:", error.message);
      return {
        backlog: [],
        ready: [],
        inProgress: [],
        blocked: [],
        review: [],
        done: [],
      };
    }
  }

  /**
   * Set priority for an issue (for GitHub Projects adapter)
   * @param {number} issueNumber Issue number
   * @param {number} priorityScore Priority score
   */
  async setIssuePriority(issueNumber, priorityScore) {
    await this.initialize();

    if (typeof this.adapter.setIssuePriority !== "function") {
      console.warn(
        "⚠️  Current adapter does not support setting priority scores"
      );
      return false;
    }

    try {
      console.log(
        `🎯 Setting issue #${issueNumber} priority to: ${priorityScore}`
      );
      const success = await this.adapter.setIssuePriority(
        issueNumber,
        priorityScore
      );

      if (success) {
        console.log(
          `✅ Issue #${issueNumber} priority updated to: ${priorityScore}`
        );
      }
      return success;
    } catch (error) {
      console.error(
        `❌ Error setting issue #${issueNumber} priority:`,
        error.message
      );
      return false;
    }
  }
}

export default IssueEngine;
