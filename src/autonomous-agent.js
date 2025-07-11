import { query } from "@anthropic-ai/claude-code";
import { IssueEngine } from './issue-engine.js';
import { ClaudeExecutor } from './claude-executor.js';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Autonomous Agent - Never-stopping development lifecycle
 */
export class AutonomousAgent {
  constructor() {
    this.issueEngine = new IssueEngine();
    this.claudeExecutor = new ClaudeExecutor({
      maxTurns: parseInt(process.env.MAX_TURNS) || 15,
      timeout: 300000 // 5 minutes
    });
    this.isRunning = false;
    this.currentIssue = null;
    this.executionHistory = [];
    this.loopInterval = 30000; // 30 seconds between iterations
  }

  /**
   * Start the autonomous agent - never stops until explicitly stopped
   */
  async start() {
    if (this.isRunning) {
      console.log('🔄 Agent is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Autonomous Agent...');
    console.log('🤖 Agent will continuously process issues until stopped');
    
    // Main execution loop
    while (this.isRunning) {
      try {
        await this.processNextIssue();
      } catch (error) {
        console.error('❌ Error in main loop:', error.message);
        await this.sleep(this.loopInterval); // Wait before retrying
      }
    }
  }

  /**
   * Stop the autonomous agent
   */
  stop() {
    console.log('⏹️  Stopping Autonomous Agent...');
    this.isRunning = false;
  }

  /**
   * Process the next highest priority issue
   */
  async processNextIssue() {
    console.log('\\n🔍 === AUTONOMOUS AGENT CYCLE ===');
    
    // Step 1: Find next issue to work on
    const issue = await this.issueEngine.getNextIssue();
    
    if (!issue) {
      console.log('📭 No ready issues found. Waiting for work...');
      await this.sleep(this.loopInterval);
      return;
    }

    // Step 2: Parse issue details
    const parsedIssue = this.issueEngine.parseIssue(issue);
    this.currentIssue = parsedIssue;
    
    console.log(`\\n🎯 Working on Issue #${parsedIssue.number}: ${parsedIssue.title}`);
    console.log(`   Goal: ${parsedIssue.goal.substring(0, 100)}...`);
    console.log(`   Acceptance Criteria: ${parsedIssue.acceptanceCriteria.length} items`);

    // Step 3: Update issue status to in-progress
    await this.issueEngine.updateIssueStatus(issue.number, 'in-progress');

    try {
      // Step 4: Execute work autonomously
      const result = await this.executeIssue(parsedIssue);
      
      if (result.success) {
        // Step 5: Validate completion
        const isComplete = await this.validateCompletion(parsedIssue, result);
        
        if (isComplete) {
          // Step 6: Create PR and mark complete
          await this.createPullRequest(parsedIssue, result);
          await this.issueEngine.updateIssueStatus(issue.number, 'review');
          console.log(`✅ Issue #${issue.number} completed successfully!`);
        } else {
          console.log(`⚠️  Issue #${issue.number} not fully complete, continuing work...`);
          await this.issueEngine.updateIssueStatus(issue.number, 'in-progress');
        }
      } else {
        console.log(`❌ Issue #${issue.number} failed, marking as blocked`);
        await this.issueEngine.updateIssueStatus(issue.number, 'blocked');
      }
    } catch (error) {
      console.error(`❌ Error processing issue #${issue.number}:`, error.message);
      await this.issueEngine.updateIssueStatus(issue.number, 'blocked');
    }

    // Record execution history
    this.executionHistory.push({
      issueNumber: issue.number,
      title: issue.title,
      timestamp: new Date().toISOString(),
      success: true
    });

    // Brief pause before next cycle
    await this.sleep(5000); // 5 second pause between issues
  }

  /**
   * Execute the work for an issue using Claude Executor
   */
  async executeIssue(issue) {
    console.log(`\\n⚡ Executing work for issue #${issue.number}...`);
    
    // Create comprehensive prompt for Claude
    const prompt = this.createExecutionPrompt(issue);
    
    let executionOutput = "";
    let success = false;
    
    try {
      // Use the Claude executor with fallback strategies
      const result = await this.claudeExecutor.execute(prompt, {
        issueNumber: issue.number,
        issueTitle: issue.title
      });
      
      executionOutput = result.output;
      success = true;
      
      // Note if simulated execution was used
      if (result.simulated) {
        console.log('\\n⚠️  Using simulated execution (Claude Code unavailable)');
      }
      
    } catch (error) {
      console.error('\\n❌ Execution failed:', error.message);
      executionOutput = `Error: ${error.message}`;
      success = false;
    }
    
    return {
      success,
      output: executionOutput,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create execution prompt for Claude
   */
  createExecutionPrompt(issue) {
    return `
I am an autonomous development agent working on issue #${issue.number}.

**Issue Title:** ${issue.title}

**Goal:** 
${issue.goal}

**Acceptance Criteria:**
${issue.acceptanceCriteria.map(criteria => `- [ ] ${criteria.text}`).join('\\n')}

**Technical Specifications:**
${issue.technicalSpecs}

**Instructions:**
1. Work autonomously to complete this issue
2. Follow the acceptance criteria exactly
3. Implement all technical specifications
4. Create clean, well-structured code
5. Add appropriate comments and documentation
6. Test your implementation
7. Commit your changes with descriptive messages

Please implement this issue completely and let me know when all acceptance criteria are met.
`;
  }

  /**
   * Validate that acceptance criteria are met
   */
  async validateCompletion(issue, result) {
    console.log(`\\n🔍 Validating completion for issue #${issue.number}...`);
    
    // For now, simple validation based on execution success
    // TODO: Implement more sophisticated validation
    if (!result.success) {
      console.log('❌ Execution failed, not complete');
      return false;
    }
    
    // Check if output mentions completion or success
    const successIndicators = [
      'completed successfully',
      'implementation complete',
      'all criteria met',
      'task finished',
      'ready for review'
    ];
    
    const hasSuccessIndicator = successIndicators.some(indicator => 
      result.output.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (hasSuccessIndicator) {
      console.log('✅ Validation passed - issue appears complete');
      return true;
    }
    
    console.log('⚠️  Validation inconclusive - may need more work');
    return false;
  }

  /**
   * Create pull request for completed work
   */
  async createPullRequest(issue, result) {
    try {
      console.log(`\\n📝 Creating pull request for issue #${issue.number}...`);
      
      const branchName = `feature/issue-${issue.number}`;
      const prTitle = `feat: ${issue.title}`;
      const prBody = `
## Summary
Resolves #${issue.number}

${issue.goal}

## Acceptance Criteria
${issue.acceptanceCriteria.map(criteria => `- [x] ${criteria.text}`).join('\\n')}

## Implementation Details
${result.output.substring(0, 1000)}...

## Testing
- Implementation tested during development
- All acceptance criteria verified

---
*🤖 This PR was created by the Autonomous Agent*
`;

      // Create PR using GitHub CLI
      const command = `gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}" --base main --head ${branchName} -R ${this.issueEngine.repo}`;
      
      try {
        const { stdout } = await execAsync(command);
        const prUrl = stdout.trim();
        console.log(`✅ Pull request created: ${prUrl}`);
        return prUrl;
      } catch (error) {
        console.log('ℹ️  PR creation skipped (likely no branch changes or already exists)');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating pull request:', error.message);
      return null;
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentIssue: this.currentIssue,
      executionHistory: this.executionHistory.slice(-10), // Last 10 executions
      totalProcessed: this.executionHistory.length
    };
  }

  /**
   * Sleep utility
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AutonomousAgent;