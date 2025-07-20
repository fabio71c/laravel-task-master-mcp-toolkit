#!/bin/bash

echo "🚀 Installing Task Master AI MCP Toolkit..."

# Check if we're in a project directory
if [ ! -f "package.json" ] && [ ! -f "composer.json" ] && [ ! -f "artisan" ]; then
    echo "⚠️  Warning: This doesn't appear to be a project directory."
    echo "   Make sure you're in your project root before running this script."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create necessary directories
mkdir -p .cursor
mkdir -p scripts

echo "📁 Creating directories..."

# Copy MCP servers
echo "📋 Copying MCP servers..."

# Test Generation Server
if [ -f "mcp-toolkit/servers/test-generation/mcp-test-generation-server.mjs" ]; then
    cp mcp-toolkit/servers/test-generation/mcp-test-generation-server.mjs ./
    cp mcp-toolkit/servers/test-generation/test-generator.mjs ./
    echo "✅ Test Generation Server copied"
else
    echo "⚠️  Test Generation Server files not found"
fi

# Schema Generation Server
if [ -f "mcp-toolkit/servers/schema-generation/mcp-schema-server.mjs" ]; then
    cp mcp-toolkit/servers/schema-generation/mcp-schema-server.mjs ./
    cp mcp-toolkit/servers/schema-generation/schema-generator.mjs ./
    cp mcp-toolkit/servers/schema-generation/generate-schemas.sh ./
    chmod +x generate-schemas.sh
    echo "✅ Schema Generation Server copied"
else
    echo "⚠️  Schema Generation Server files not found"
fi

# Sequential Thinking Server
if [ -f "mcp-toolkit/servers/sequential-thinking/mcp-sequential-thinking.js" ]; then
    cp mcp-toolkit/servers/sequential-thinking/mcp-sequential-thinking.js ./
    echo "✅ Sequential Thinking Server copied"
else
    echo "⚠️  Sequential Thinking Server files not found"
fi

# Workflow Integration Server
if [ -f "mcp-toolkit/servers/workflow-integration/taskmaster-workflow-integration-enhanced.mjs" ]; then
    cp mcp-toolkit/servers/workflow-integration/taskmaster-workflow-integration-enhanced.mjs ./
    cp mcp-toolkit/servers/workflow-integration/enhanced-workflow-demo.mjs ./
    echo "✅ Workflow Integration Server copied"
else
    echo "⚠️  Workflow Integration Server files not found"
fi

# Copy templates
echo "📋 Copying templates..."
if [ -f "mcp-toolkit/templates/cursor-mcp.json" ]; then
    cp mcp-toolkit/templates/cursor-mcp.json .cursor/mcp.json
    echo "✅ Cursor MCP configuration copied"
else
    echo "⚠️  Cursor MCP template not found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f "package.json" ]; then
    npm install @modelcontextprotocol/sdk js-yaml
    echo "✅ Dependencies installed"
else
    echo "⚠️  No package.json found - skipping npm install"
fi

# Install Task Master AI if not already installed
if ! command -v task-master-ai &> /dev/null; then
    echo "📦 Installing Task Master AI..."
    npm install -g task-master-ai
    echo "✅ Task Master AI installed"
else
    echo "✅ Task Master AI already installed"
fi

echo ""
echo "🎉 MCP Toolkit installed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Update API keys in .cursor/mcp.json"
echo "2. Initialize Task Master AI: task-master init --name 'Your Project' --yes"
echo "3. Create your PRD and run: task-master parse-prd your-prd.txt"
echo ""
echo "🔧 Available MCP Servers:"
echo "   - test-generation: Automatic unit test generation"
echo "   - schema-generation: Project schema documentation"
echo "   - sequential-thinking: Structured problem-solving"
echo "   - workflow-integration: Enhanced workflow automation"
echo ""
echo "📚 Documentation: mcp-toolkit/docs/" 