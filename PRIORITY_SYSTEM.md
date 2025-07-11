# Priority System Documentation

The Antonova agent now supports flexible, fine-tuned prioritization through an adapter-based system that works with both GitHub labels and GitHub Projects.

## 🏗️ Architecture

```
IssueEngine
    ↓
Adapter (auto-detected)
    ↓
GitHub Labels or GitHub Projects
```

## 🎯 Priority Systems

### GitHub Projects (Recommended)

**Setup:**
```bash
npm run setup-project
```

**Features:**
- Fine-grained priority scores (0-1000+)
- Visual drag-and-drop management
- Automatic calculation from Impact × Urgency ÷ Effort
- Manual adjustment field for fine-tuning

**Custom Fields:**
- **Status**: Backlog, Ready, In Progress, Blocked, Review, Done
- **Impact**: Critical (40), High (30), Medium (20), Low (10)
- **Urgency**: Immediate (4), Soon (3), Normal (2), Eventually (1)
- **Effort**: XS (1), S (2), M (3), L (5), XL (8)
- **Priority Score**: Calculated automatically
- **Priority Adjustment**: Manual fine-tuning (+/- points)

**Priority Calculation:**
```
Priority Score = (Impact × Urgency × 10) ÷ Effort + Manual Adjustment
```

### GitHub Labels (Fallback)

**Setup:**
```bash
npm run setup
```

**Features:**
- Simple 4-tier priority system
- Works with existing GitHub Issues workflow
- No additional setup required

**Labels:**
- 🔴 `priority-critical` (1000 pts)
- 🟠 `priority-high` (800 pts)
- 🟡 `priority-medium` (600 pts)
- 🟢 `priority-low` (400 pts)

## 📊 Status Flow

```
Backlog → Ready → In Progress → Review → Done
   ↓        ↓           ↓          ↓
(Blocked) (Blocked)  (Blocked)  (Blocked)
```

- **Backlog**: Needs refinement, unclear specs
- **Ready**: Fully specified, can be worked on
- **In Progress**: Agent actively working
- **Blocked**: Waiting on external dependency
- **Review**: PR created, awaiting review
- **Done**: Completed and merged

## 🛠️ Configuration

Create `.antonova/config.json` in your repository:

```json
{
  "adapter": "github-projects",
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "projectNumber": 1
  },
  "prioritization": {
    "statuses": {
      "backlog": ["Backlog"],
      "ready": ["Ready"],
      "inProgress": ["In Progress"],
      "blocked": ["Blocked"],
      "review": ["Review"],
      "done": ["Done"]
    }
  }
}
```

## 🎮 CLI Commands

### Priority Management
```bash
# List all issues by priority
npm run priority list

# Set specific priority score
npm run priority set 42 850

# Show detailed breakdown
npm run priority show 42

# View priority distribution
npm run priority summary

# Recalculate all scores
npm run priority recalc
```

### Project Setup
```bash
# Setup GitHub Project with custom fields
npm run setup-project

# Setup GitHub labels (fallback)
npm run setup
```

## 🚀 Usage Examples

### GitHub Projects Workflow

1. **Setup Project:**
   ```bash
   npm run setup-project
   ```

2. **Add Issues to Project**

3. **Set Priority Fields:**
   - Impact: Critical
   - Urgency: Immediate  
   - Effort: Medium
   - Auto-calculated score: 533

4. **Fine-tune Priority:**
   ```bash
   npm run priority set 42 600
   ```

5. **View Queue:**
   ```bash
   npm run priority list
   ```

### Multi-Repository Support

The agent adapts to each repository's configuration:

```bash
# Repo A: Uses GitHub Projects
cd /project-a
npm start  # Uses GitHub Projects adapter

# Repo B: Uses Labels
cd /project-b  
npm start  # Uses GitHub Labels adapter
```

## 🔧 Advanced Features

### Custom Priority Formulas
```json
{
  "prioritization": {
    "formula": "impact * urgency * 10 / effort",
    "impactMap": {
      "Critical": 50,
      "High": 35,
      "Medium": 20,
      "Low": 10
    }
  }
}
```

### Repository-Specific Status Mapping
```json
{
  "prioritization": {
    "statuses": {
      "ready": ["Ready for Dev", "Refined", "Spec Complete"],
      "inProgress": ["In Development", "Coding", "Building"]
    }
  }
}
```

## 📈 Benefits

1. **Fine Control**: 0-1000+ priority scores vs just 4 categories
2. **Visual Management**: GitHub Projects kanban/table views
3. **Cross-Repository**: Works with any repo's existing workflow  
4. **Non-Breaking**: Can run alongside existing systems
5. **Automated + Manual**: Base calculation with manual overrides
6. **Extensible**: Easy to add new adapters (Jira, Linear, etc.)

## 🔮 Future Enhancements

- **Jira Adapter**: Full Jira integration with epic/story support
- **Linear Adapter**: Linear issue tracking support
- **Custom Scripts**: Repository-specific priority logic
- **Webhooks**: Real-time priority updates
- **Analytics**: Priority trend analysis and reporting