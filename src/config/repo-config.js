/**
 * Repository configuration loader
 * Loads .antonova/config.json from the target repository
 */
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  adapter: "github-labels",
  github: {
    owner: null,
    repo: null,
    projectNumber: null,
  },
  prioritization: {
    formula: "default",
    statuses: {
      backlog: ["Backlog", "Draft", "Needs Refinement"],
      ready: ["Ready", "Ready for Dev", "Refined"],
      inProgress: ["In Progress", "Working", "In Development"],
      blocked: ["Blocked", "On Hold", "Waiting"],
      review: ["Review", "PR Open", "In Review"],
      done: ["Done", "Complete", "Closed"],
    },
    impactMap: {
      Critical: 40,
      High: 30,
      Medium: 20,
      Low: 10,
    },
    urgencyMap: {
      Immediate: 4,
      Soon: 3,
      Normal: 2,
      Eventually: 1,
    },
    effortMap: {
      XS: 1,
      S: 2,
      M: 3,
      L: 5,
      XL: 8,
    },
  },
};

/**
 * Load configuration for a repository
 * @param {string} repoPath - Path to the repository
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Merged configuration
 */
export async function loadRepoConfig(repoPath = ".", overrides = {}) {
  const configPath = join(repoPath, ".antonova", "config.json");
  let fileConfig = {};

  try {
    console.log("💬 Trying to read config file");
    const configContent = await readFile(configPath, "utf-8");

    fileConfig = JSON.parse(configContent);
    console.log(`📄 Loaded config from ${configPath}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(
        `⚠️  Error loading config from ${configPath}:`,
        error.message
      );
    }
  }

  // Deep merge configurations: defaults <- file <- overrides
  const config = deepMerge(deepMerge(DEFAULT_CONFIG, fileConfig), overrides);
  // insert a question if user wants to proceed

  // Validate required fields based on adapter
  validateConfig(config);

  return config;
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  if (!config.adapter) {
    throw new Error("Configuration missing required field: adapter");
  }

  // Adapter-specific validation
  switch (config.adapter) {
    case "github-projects":
      if (
        !config.github?.owner ||
        !config.github?.repo ||
        !config.github?.projectNumber
      ) {
        throw new Error(
          "GitHub Projects adapter requires: github.owner, github.repo, github.projectNumber"
        );
      }
      break;

    case "github-labels":
      if (!config.github?.owner || !config.github?.repo) {
        throw new Error(
          "GitHub Labels adapter requires: github.owner, github.repo"
        );
      }
      break;

    case "custom":
      if (!config.customAdapter?.script) {
        throw new Error("Custom adapter requires: customAdapter.script");
      }
      break;
  }
}

/**
 * Create adapter instance based on configuration
 */
export async function createAdapter(config) {
  switch (config.adapter) {
    case "github-projects":
      const { GitHubProjectsAdapter } = await import(
        "../adapters/github-projects-adapter.js"
      );
      return new GitHubProjectsAdapter(config);

    case "github-labels":
      const { GitHubLabelsAdapter } = await import(
        "../adapters/github-labels-adapter.js"
      );
      return new GitHubLabelsAdapter(config);

    case "custom":
      const customModule = await import(config.customAdapter.script);
      return new customModule.default(config);

    default:
      throw new Error(`Unknown adapter type: ${config.adapter}`);
  }
}

export default { loadRepoConfig, createAdapter };
