# MCP Toolkit Setup Guide

This guide will help you set up the Task Master AI MCP Toolkit in your projects.

## 🚀 Quick Setup

### For New Projects

```bash
# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Run the setup script
./mcp-toolkit/scripts/setup-new-project.sh my-new-project
```

### For Existing Projects

```bash
# Navigate to your project directory
cd your-existing-project

# Install the MCP toolkit
./mcp-toolkit/scripts/install.sh
```

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git** (for version control)
- **API Keys** for AI providers (OpenAI, OpenRouter, etc.)

## 🔧 Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install @modelcontextprotocol/sdk js-yaml

# Install Task Master AI globally
npm install -g task-master-ai
```

### 3. Configure API Keys

Edit `.cursor/mcp.json` and update your API keys:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "OPENAI_API_KEY": "your-openai-key-here",
        "OPENROUTER_API_KEY": "your-openrouter-key-here"
      }
    }
  }
}
```

### 4. Initialize Task Master AI

```bash
# Initialize Task Master AI
npx task-master-ai init --name "Your Project Name" --yes

# Configure AI models
npx task-master-ai models --setup
```

### 5. Create Your PRD

Create a Product Requirements Document (PRD) for your project:

```bash
# Use the template
cp mcp-toolkit/templates/example-prd.txt your-project-prd.txt

# Edit the PRD with your project details
nano your-project-prd.txt
```

### 6. Parse Your PRD

```bash
# Parse your PRD to generate tasks
npx task-master-ai parse-prd your-project-prd.txt
```

## 🎯 Available MCP Servers

### Test Generation Server

**Purpose**: Automatically generates unit tests for completed tasks

**Features**:
- Laravel test templates
- Coverage analysis
- Quality validation
- Test execution

**Usage**:
```bash
# Generate tests for a completed task
node mcp-test-generation-server.mjs generate_tests_for_task \
  --taskId 15 \
  --taskType controller \
  --changedFiles "app/Http/Controllers/TaskController.php"
```

### Schema Generation Server

**Purpose**: Generates comprehensive project documentation

**Features**:
- Database schema documentation
- API endpoint documentation
- Business logic documentation
- Component architecture documentation

**Usage**:
```bash
# Generate schemas
./generate-schemas.sh generate

# Check schema freshness
node mcp-schema-server.mjs check_schema_freshness
```

### Sequential Thinking Server

**Purpose**: Provides structured problem-solving approach

**Features**:
- Step-by-step reasoning
- Decision trees
- Solution validation

**Usage**:
```bash
# Start the sequential thinking server
node mcp-sequential-thinking.js
```

### Workflow Integration Server

**Purpose**: Enhanced workflow automation

**Features**:
- Test generation integration
- Quality gates
- Coverage tracking
- Automated validation

**Usage**:
```bash
# Run enhanced workflow demo
node enhanced-workflow-demo.mjs
```

## 🔍 Troubleshooting

### Common Issues

**1. MCP Server Not Starting**
```bash
# Check if dependencies are installed
npm list @modelcontextprotocol/sdk

# Reinstall if needed
npm install @modelcontextprotocol/sdk
```

**2. API Key Issues**
```bash
# Verify API keys in .cursor/mcp.json
cat .cursor/mcp.json

# Test API connection
npx task-master-ai models
```

**3. Permission Issues**
```bash
# Make scripts executable
chmod +x mcp-toolkit/scripts/*.sh
chmod +x generate-schemas.sh
```

**4. Task Master AI Not Found**
```bash
# Install globally
npm install -g task-master-ai

# Or use npx
npx task-master-ai --version
```

### Getting Help

- Check the [Usage Guide](USAGE.md) for detailed usage instructions
- Review the [API Reference](API.md) for technical details
- Open an issue on GitHub for bugs or feature requests

## 🎉 Next Steps

After setup, you can:

1. **Create your first PRD** and parse it with Task Master AI
2. **Explore the MCP servers** and their capabilities
3. **Customize the workflow** for your specific needs
4. **Share with your team** and collaborate on projects

Happy coding! 🚀 