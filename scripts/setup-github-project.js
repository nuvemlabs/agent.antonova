#!/usr/bin/env node

/**
 * Setup GitHub Project with custom fields for Antonova agent
 * Creates a new project or configures an existing one with priority fields
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';

const execAsync = promisify(exec);

function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function getUserInput(prompt) {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function checkProjectExists(owner, repo, projectNumber) {
  try {
    const { stdout } = await execAsync(`gh project view ${projectNumber} --owner ${owner} --format json`);
    const project = JSON.parse(stdout);
    return project;
  } catch (error) {
    return null;
  }
}

async function createProject(owner, repo) {
  console.log('🆕 Creating new GitHub Project...');
  
  const title = await getUserInput('Project title (default: "Antonova Agent Backlog"): ') || 'Antonova Agent Backlog';
  
  try {
    const { stdout } = await execAsync(`gh project create --owner ${owner} --title "${title}" --format json`);
    const project = JSON.parse(stdout);
    console.log(`✅ Created project: ${project.title} (#${project.number})`);
    return project;
  } catch (error) {
    console.error('❌ Failed to create project:', error.message);
    throw error;
  }
}

async function addCustomFields(projectNumber, owner) {
  console.log('🔧 Adding custom fields to project...');
  
  const fields = [
    {
      name: 'Status',
      type: 'single-select',
      options: ['Backlog', 'Ready', 'In Progress', 'Blocked', 'Review', 'Done']
    },
    {
      name: 'Impact',
      type: 'single-select', 
      options: ['Critical', 'High', 'Medium', 'Low']
    },
    {
      name: 'Urgency',
      type: 'single-select',
      options: ['Immediate', 'Soon', 'Normal', 'Eventually']
    },
    {
      name: 'Effort',
      type: 'single-select',
      options: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      name: 'Priority Score',
      type: 'number'
    },
    {
      name: 'Priority Adjustment',
      type: 'number'
    }
  ];
  
  for (const field of fields) {
    try {
      console.log(`  Adding field: ${field.name}`);
      
      if (field.type === 'single-select') {
        const optionsArgs = field.options.map(opt => `--single-select-option "${opt}"`).join(' ');
        await execAsync(`gh project field-create ${projectNumber} --owner ${owner} --name "${field.name}" --data-type SINGLE_SELECT ${optionsArgs}`);
      } else if (field.type === 'number') {
        await execAsync(`gh project field-create ${projectNumber} --owner ${owner} --name "${field.name}" --data-type NUMBER`);
      }
      
      console.log(`  ✅ Added: ${field.name}`);
    } catch (error) {
      console.log(`  ⚠️  Field may already exist: ${field.name}`);
    }
  }
}

async function linkRepository(projectNumber, owner, repo) {
  console.log('🔗 Linking repository to project...');
  
  try {
    await execAsync(`gh project link ${projectNumber} --owner ${owner} --repo ${repo}`);
    console.log(`✅ Linked repository ${owner}/${repo} to project`);
  } catch (error) {
    console.log(`⚠️  Repository may already be linked: ${error.message}`);
  }
}

async function createSampleConfig(owner, repo, projectNumber) {
  const configContent = {
    adapter: 'github-projects',
    github: {
      owner,
      repo,
      projectNumber: parseInt(projectNumber)
    },
    prioritization: {
      formula: 'default',
      statuses: {
        backlog: ['Backlog'],
        ready: ['Ready'],
        inProgress: ['In Progress'],
        blocked: ['Blocked'],
        review: ['Review'],
        done: ['Done']
      },
      impactMap: {
        'Critical': 40,
        'High': 30,
        'Medium': 20,
        'Low': 10
      },
      urgencyMap: {
        'Immediate': 4,
        'Soon': 3,
        'Normal': 2,
        'Eventually': 1
      },
      effortMap: {
        'XS': 1,
        'S': 2,
        'M': 3,
        'L': 5,
        'XL': 8
      }
    }
  };
  
  console.log('📄 Sample .antonova/config.json:');
  console.log(JSON.stringify(configContent, null, 2));
  console.log('');
  console.log('💡 Save this to .antonova/config.json in your target repository');
}

async function main() {
  console.log('🚀 GitHub Project Setup for Antonova Agent');
  console.log('='.repeat(50));
  
  try {
    // Get repository information
    const owner = await getUserInput('GitHub owner/organization: ');
    const repo = await getUserInput('Repository name: ');
    
    if (!owner || !repo) {
      console.error('❌ Owner and repository name are required');
      process.exit(1);
    }
    
    // Check if user wants to use existing project or create new one
    const useExisting = await getUserInput('Use existing project? (y/N): ');
    
    let project;
    if (useExisting.toLowerCase() === 'y') {
      const projectNumber = await getUserInput('Project number: ');
      project = await checkProjectExists(owner, repo, projectNumber);
      
      if (!project) {
        console.error(`❌ Project #${projectNumber} not found`);
        process.exit(1);
      }
      
      console.log(`✅ Found existing project: ${project.title} (#${project.number})`);
    } else {
      project = await createProject(owner, repo);
    }
    
    // Add custom fields
    await addCustomFields(project.number, owner);
    
    // Link repository
    await linkRepository(project.number, owner, repo);
    
    // Show sample configuration
    await createSampleConfig(owner, repo, project.number);
    
    console.log('');
    console.log('🎉 Setup complete!');
    console.log(`📊 Project URL: https://github.com/orgs/${owner}/projects/${project.number}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Create .antonova/config.json with the configuration above');
    console.log('2. Add issues to your project');
    console.log('3. Set Impact, Urgency, and Effort values for each issue');
    console.log('4. Run your Antonova agent!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);