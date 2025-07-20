#!/usr/bin/env node

/**
 * Test Generation MCP Server
 * 
 * This MCP server provides tools for automatically generating unit tests
 * as part of the Task Master AI workflow.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TestGenerator } from './test-generator.mjs';

const server = new Server({
    name: 'test-generation-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});

const testGenerator = new TestGenerator();

// Tool: Generate tests for a completed task
server.setRequestHandler('tools/call', async(request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
        case 'generate_tests_for_task':
            return await handleGenerateTestsForTask(args);
        case 'run_tests':
            return await handleRunTests(args);
        case 'analyze_test_coverage':
            return await handleAnalyzeTestCoverage(args);
        case 'validate_test_quality':
            return await handleValidateTestQuality(args);
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

async function handleGenerateTestsForTask(args) {
    const { taskId, taskType, changedFiles, projectRoot } = args;

    try {
        const result = await testGenerator.generateTestsForTask(taskId, taskType, changedFiles, projectRoot);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    testFiles: [],
                    coverage: 0
                }, null, 2)
            }]
        };
    }
}

async function handleRunTests(args) {
    const { testFiles, projectRoot } = args;

    try {
        const result = await testGenerator.runTests(testFiles, projectRoot);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    passed: 0,
                    failed: 0,
                    total: 0,
                    coverage: 0
                }, null, 2)
            }]
        };
    }
}

async function handleAnalyzeTestCoverage(args) {
    const { projectRoot } = args;

    try {
        const result = await testGenerator.analyzeCoverage(projectRoot);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    coverage: 0,
                    details: {}
                }, null, 2)
            }]
        };
    }
}

async function handleValidateTestQuality(args) {
    const { testFiles, projectRoot } = args;

    try {
        const result = await testGenerator.validateTestQuality(testFiles, projectRoot);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    quality: 0,
                    issues: []
                }, null, 2)
            }]
        };
    }
}

// List available tools
server.setRequestHandler('tools/list', async() => {
    return {
        tools: [{
                name: 'generate_tests_for_task',
                description: 'Generate unit tests for a completed task based on task type and changed files',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: {
                            type: 'string',
                            description: 'ID of the completed task'
                        },
                        taskType: {
                            type: 'string',
                            description: 'Type of task (migration, controller, model, etc.)'
                        },
                        changedFiles: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of files that were changed in the task'
                        },
                        projectRoot: {
                            type: 'string',
                            description: 'Root directory of the project'
                        }
                    },
                    required: ['taskId', 'taskType', 'projectRoot']
                }
            },
            {
                name: 'run_tests',
                description: 'Run generated tests and return results',
                inputSchema: {
                    type: 'object',
                    properties: {
                        testFiles: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of test files to run'
                        },
                        projectRoot: {
                            type: 'string',
                            description: 'Root directory of the project'
                        }
                    },
                    required: ['testFiles', 'projectRoot']
                }
            },
            {
                name: 'analyze_test_coverage',
                description: 'Analyze test coverage for the project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectRoot: {
                            type: 'string',
                            description: 'Root directory of the project'
                        }
                    },
                    required: ['projectRoot']
                }
            },
            {
                name: 'validate_test_quality',
                description: 'Validate the quality of generated tests',
                inputSchema: {
                    type: 'object',
                    properties: {
                        testFiles: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of test files to validate'
                        },
                        projectRoot: {
                            type: 'string',
                            description: 'Root directory of the project'
                        }
                    },
                    required: ['testFiles', 'projectRoot']
                }
            }
        ]
    };
});

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Test Generation MCP server started');