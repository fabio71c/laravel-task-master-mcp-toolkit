# Task Master AI MCP Toolkit

Custom MCP servers and workflow enhancements for Task Master AI projects.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd <your-repo>

# Install MCP toolkit
./mcp-toolkit/scripts/install.sh

# Initialize Task Master AI
npx task-master-ai init --name "Your Project" --yes
```

## 🎯 Available MCP Servers

### **Test Generation Server**
- **Files**: `mcp-test-generation-server.mjs`, `test-generator.mjs`
- **Purpose**: Automatic unit test generation for completed tasks
- **Features**: Laravel test templates, coverage analysis, quality validation

### **Schema Generation Server**
- **Files**: `mcp-schema-server.mjs`, `schema-generator.mjs`, `generate-schemas.sh`
- **Purpose**: Automatic project schema documentation
- **Features**: Database, API, business logic, and component architecture schemas

### **Sequential Thinking Server**
- **Files**: `mcp-sequential-thinking.js`
- **Purpose**: Structured problem-solving approach
- **Features**: Step-by-step reasoning, decision trees, solution validation

### **Workflow Integration Server**
- **Files**: `taskmaster-workflow-integration-enhanced.mjs`, `enhanced-workflow-demo.mjs`
- **Purpose**: Enhanced workflow automation
- **Features**: Test generation, execution, quality gates, coverage tracking

## 🔧 Configuration

Update `.cursor/mcp.json` with your API keys:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "env": {
        "OPENAI_API_KEY": "your-key-here",
        "OPENROUTER_API_KEY": "your-key-here"
      }
    }
  }
}
```

## 📚 Documentation

- [Setup Guide](docs/SETUP.md)
- [Usage Guide](docs/USAGE.md)
- [API Reference](docs/API.md)

## 🛠️ Installation Scripts

- `install.sh` - Install MCP toolkit in current project
- `setup-new-project.sh` - Set up new project with MCP toolkit
- `update-toolkit.sh` - Update MCP toolkit components

## 📁 Directory Structure

```
mcp-toolkit/
├── servers/
│   ├── test-generation/
│   │   ├── mcp-test-generation-server.mjs
│   │   └── test-generator.mjs
│   ├── schema-generation/
│   │   ├── mcp-schema-server.mjs
│   │   ├── schema-generator.mjs
│   │   └── generate-schemas.sh
│   ├── sequential-thinking/
│   │   └── mcp-sequential-thinking.js
│   └── workflow-integration/
│       ├── taskmaster-workflow-integration-enhanced.mjs
│       └── enhanced-workflow-demo.mjs
├── templates/
│   └── cursor-mcp.json
├── scripts/
│   ├── install.sh
│   ├── setup-new-project.sh
│   └── update-toolkit.sh
├── docs/
│   ├── SETUP.md
│   ├── USAGE.md
│   └── API.md
└── README.md
```

## 🎉 Features

- ✅ **Automatic Test Generation** - Creates unit tests for completed tasks
- ✅ **Schema Documentation** - Generates comprehensive project schemas
- ✅ **Sequential Thinking** - Structured problem-solving approach
- ✅ **Enhanced Workflow** - Integrated test generation and validation
- ✅ **Quality Gates** - Ensures tests pass before task completion
- ✅ **Coverage Tracking** - Monitors test coverage improvements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 