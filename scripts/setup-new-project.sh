#!/bin/bash

PROJECT_NAME=$1
REPO_URL=$2

if [ -z "$PROJECT_NAME" ]; then
    echo "Usage: $0 <project-name> [repo-url]"
    echo ""
    echo "Examples:"
    echo "  $0 my-new-project"
    echo "  $0 my-new-project https://github.com/username/repo.git"
    exit 1
fi

echo "🚀 Setting up new project: $PROJECT_NAME"

# Create project directory
mkdir $PROJECT_NAME
cd $PROJECT_NAME

# Clone the repository (if URL provided)
if [ ! -z "$REPO_URL" ]; then
    echo "📥 Cloning repository: $REPO_URL"
    git clone $REPO_URL .
    if [ $? -ne 0 ]; then
        echo "❌ Failed to clone repository"
        exit 1
    fi
else
    echo "📁 Initializing new git repository"
    git init
fi

# Check if mcp-toolkit exists in the repository
if [ -d "mcp-toolkit" ]; then
    echo "✅ MCP Toolkit found in repository"
else
    echo "⚠️  MCP Toolkit not found in repository"
    echo "   Make sure the repository contains the mcp-toolkit directory"
    exit 1
fi

# Run installation
echo "🔧 Installing MCP Toolkit..."
./mcp-toolkit/scripts/install.sh

if [ $? -ne 0 ]; then
    echo "❌ Installation failed"
    exit 1
fi

# Initialize Task Master AI
echo "🎯 Initializing Task Master AI..."
npx task-master-ai init --name "$PROJECT_NAME" --yes

if [ $? -ne 0 ]; then
    echo "❌ Task Master AI initialization failed"
    exit 1
fi

echo ""
echo "🎉 Project $PROJECT_NAME setup with MCP Toolkit!"
echo ""
echo "📝 Next steps:"
echo "1. Update API keys in .cursor/mcp.json"
echo "2. Create your PRD and run: task-master parse-prd your-prd.txt"
echo "3. Start developing with enhanced workflow!"
echo ""
echo "🔧 Available MCP Servers:"
echo "   - test-generation: Automatic unit test generation"
echo "   - schema-generation: Project schema documentation"
echo "   - sequential-thinking: Structured problem-solving"
echo "   - workflow-integration: Enhanced workflow automation"
echo ""
echo "📚 Documentation: mcp-toolkit/docs/" 