/**
 * GitHub GraphQL API utilities for Projects v2
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute a GraphQL query using GitHub CLI
 */
export async function graphql(query, variables = {}) {
  try {
    const variablesJson = Object.keys(variables).length > 0 
      ? `-F ${Object.entries(variables).map(([k, v]) => `${k}=${v}`).join(' -F ')}`
      : '';
    
    const command = `gh api graphql ${variablesJson} -f query='${query}'`;
    const { stdout } = await execAsync(command);
    
    return JSON.parse(stdout);
  } catch (error) {
    console.error('GraphQL query failed:', error.message);
    throw error;
  }
}

/**
 * GraphQL queries for GitHub Projects v2
 */
export const queries = {
  /**
   * Get project items with custom fields
   */
  getProjectItems: `
    query GetProjectItems($owner: String!, $name: String!, $projectNumber: Int!) {
      repository(owner: $owner, name: $name) {
        projectV2(number: $projectNumber) {
          id
          title
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  id
                  number
                  title
                  body
                  url
                  state
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  body
                  url
                  state
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      ... on ProjectV2SingleSelectField {
                        id
                        name
                      }
                    }
                    id
                    name
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    field {
                      ... on ProjectV2Field {
                        id
                        name
                      }
                    }
                    number
                  }
                  ... on ProjectV2ItemFieldTextValue {
                    field {
                      ... on ProjectV2Field {
                        id
                        name
                      }
                    }
                    text
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  /**
   * Get project fields configuration
   */
  getProjectFields: `
    query GetProjectFields($owner: String!, $name: String!, $projectNumber: Int!) {
      repository(owner: $owner, name: $name) {
        projectV2(number: $projectNumber) {
          id
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `,

  /**
   * Update item field value
   */
  updateItemFieldValue: `
    mutation UpdateProjectV2ItemFieldValue(
      $projectId: ID!
      $itemId: ID!
      $fieldId: ID!
      $value: ProjectV2FieldValue!
    ) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: $value
      }) {
        projectV2Item {
          id
        }
      }
    }
  `
};

/**
 * Helper to extract field values from project item
 */
export function extractFieldValues(item) {
  const fields = {};
  
  if (!item.fieldValues?.nodes) return fields;
  
  for (const fieldValue of item.fieldValues.nodes) {
    if (fieldValue.field?.name) {
      const fieldName = fieldValue.field.name;
      
      if (fieldValue.name !== undefined) {
        // Single select field
        fields[fieldName] = fieldValue.name;
      } else if (fieldValue.number !== undefined) {
        // Number field
        fields[fieldName] = fieldValue.number;
      } else if (fieldValue.text !== undefined) {
        // Text field
        fields[fieldName] = fieldValue.text;
      }
    }
  }
  
  return fields;
}

/**
 * Calculate priority score from field values
 */
export function calculatePriorityScore(fields, config = {}) {
  const {
    impactMap = {
      'Critical': 40,
      'High': 30,
      'Medium': 20,
      'Low': 10
    },
    urgencyMap = {
      'Immediate': 4,
      'Soon': 3,
      'Normal': 2,
      'Eventually': 1
    },
    effortMap = {
      'XS': 1,
      'S': 2,
      'M': 3,
      'L': 5,
      'XL': 8
    }
  } = config;
  
  const impact = impactMap[fields.Impact] || impactMap.Medium;
  const urgency = urgencyMap[fields.Urgency] || urgencyMap.Normal;
  const effort = effortMap[fields.Effort] || effortMap.M;
  const manualAdjustment = fields['Priority Adjustment'] || 0;
  
  // Base formula: (Impact × Urgency × 10) / Effort + Manual Adjustment
  const baseScore = Math.round((impact * urgency * 10) / effort);
  const totalScore = baseScore + manualAdjustment;
  
  return {
    score: totalScore,
    components: {
      impact,
      urgency,
      effort,
      manualAdjustment,
      baseScore
    }
  };
}