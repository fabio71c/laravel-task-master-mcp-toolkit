#!/bin/bash

# Task Master AI Schema Generation Integration Script
# 
# This script provides a simple interface for integrating schema generation
# into Task Master AI workflows, including parse-prd and other commands.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[SCHEMA]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SCHEMA]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[SCHEMA]${NC} $1"
}

print_error() {
    echo -e "${RED}[SCHEMA]${NC} $1"
}

# Default values
PROJECT_ROOT="."
FORCE=false
QUIET=false
COMMAND="generate"

# Help function
show_help() {
    cat << EOF
Task Master AI Schema Generation Integration

USAGE:
    ./generate-schemas.sh [COMMAND] [OPTIONS]

COMMANDS:
    generate    Generate comprehensive project schemas (default)
    info        Show current schema information  
    help        Show this help message

OPTIONS:
    --project-root <path>    Set project root directory (default: current directory)
    --force                  Force regeneration even if recent schemas exist
    --quiet                  Suppress non-essential output
    --framework <type>       Force framework detection (laravel, rails, django, express)

EXAMPLES:
    ./generate-schemas.sh generate
    ./generate-schemas.sh generate --project-root /path/to/project --force
    ./generate-schemas.sh info --quiet
    ./generate-schemas.sh generate --framework laravel

INTEGRATION:
    This script is designed to be called from Task Master AI workflows:
    - Automatically during parse-prd operations
    - Manually when project structure changes significantly  
    - As part of CI/CD pipelines for documentation updates

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        generate|info|help)
            COMMAND="$1"
            shift
            ;;
        --project-root)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        --framework)
            FRAMEWORK="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Handle help command
if [[ "$COMMAND" == "help" ]]; then
    show_help
    exit 0
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

# Check if schema generator exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_GENERATOR="$SCRIPT_DIR/schema-generator.mjs"

if [[ ! -f "$SCHEMA_GENERATOR" ]]; then
    print_error "Schema generator not found at: $SCHEMA_GENERATOR"
    exit 1
fi

# Build command arguments
ARGS=("$COMMAND")

if [[ "$PROJECT_ROOT" != "." ]]; then
    ARGS+=("--project" "$PROJECT_ROOT")
fi

if [[ -n "$FRAMEWORK" ]]; then
    ARGS+=("--framework" "$FRAMEWORK")
fi

if [[ "$FORCE" == true ]]; then
    ARGS+=("--force")
fi

# Execute schema generation
if [[ "$QUIET" == false ]]; then
    print_status "Running schema generation..."
    print_status "Command: node $SCHEMA_GENERATOR ${ARGS[*]}"
fi

# Run the command and capture output
if OUTPUT=$(node "$SCHEMA_GENERATOR" "${ARGS[@]}" 2>&1); then
    if [[ "$QUIET" == false ]]; then
        echo "$OUTPUT"
    fi
    
    # Extract key information for integration
    if [[ "$COMMAND" == "generate" ]]; then
        if echo "$OUTPUT" | grep -q "✅ Schema generation completed successfully!"; then
            SCHEMAS=$(echo "$OUTPUT" | grep "📊 Generated schemas:" | sed 's/.*📊 Generated schemas: //')
            LOCATION=$(echo "$OUTPUT" | grep "📁 Location:" | sed 's/.*📁 Location: //')
            
            print_success "Schema generation completed successfully"
            
            if [[ "$QUIET" == false ]]; then
                print_status "Generated schemas: $SCHEMAS"
                print_status "Location: $LOCATION"
            fi
            
            # Create integration markers for external tools
            echo "SCHEMA_SUCCESS=true" > /tmp/taskmaster-schema-status
            echo "SCHEMA_LOCATION=$LOCATION" >> /tmp/taskmaster-schema-status
            echo "SCHEMA_TYPES=$SCHEMAS" >> /tmp/taskmaster-schema-status
            echo "SCHEMA_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /tmp/taskmaster-schema-status
        else
            print_error "Schema generation completed but with issues"
            exit 1
        fi
    elif [[ "$COMMAND" == "info" ]]; then
        if echo "$OUTPUT" | grep -q "📊 Schema Information:"; then
            print_success "Schema information retrieved successfully"
        else
            print_warning "No schema information available"
        fi
    fi
else
    print_error "Schema generation failed"
    if [[ "$QUIET" == false ]]; then
        echo "$OUTPUT"
    fi
    exit 1
fi

# Integration success
if [[ "$QUIET" == false ]]; then
    print_success "Schema operation completed successfully"
fi

exit 0 