#!/usr/bin/env node

/**
 * Task Master AI Schema Generation MCP Server
 * 
 * This MCP server provides schema generation capabilities for Task Master AI workflows.
 * It integrates seamlessly with task completion, builds, and updates to maintain
 * up-to-date project documentation for AI agents.
 * 
 * Features:
 * - Auto-detects framework (Laravel, Rails, Django, Express)
 * - Generates 4 comprehensive schema types (Database, API, Business Logic, Architecture)
 * - Version control and change tracking
 * - Integration hooks for Task Master AI workflows
 * - Automatic updates after builds/task completion
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskMasterSchemaGenerator } from './schema-generator.mjs';
import fs from 'fs/promises';
import path from 'path';

class TaskMasterSchemaMCPServer {
    constructor() {
        this.server = new Server({
            name: 'task-master-schema-generator',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });

        this.setupToolHandlers();
        this.setupErrorHandlers();
    }

    setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async() => {
            return {
                tools: [{
                        name: 'generate_schemas',
                        description: 'Generate comprehensive project schemas (database, API, business logic, architecture) with auto-framework detection',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                projectRoot: {
                                    type: 'string',
                                    description: 'Project root directory path. Defaults to current directory.',
                                    default: '.'
                                },
                                framework: {
                                    type: 'string',
                                    description: 'Force specific framework detection (laravel, rails, django, express). If not provided, auto-detects.',
                                    enum: ['laravel', 'rails', 'django', 'express']
                                },
                                force: {
                                    type: 'boolean',
                                    description: 'Force regeneration even if recent schemas exist (bypasses cooldown protection)',
                                    default: false
                                },
                                triggerContext: {
                                    type: 'string',
                                    description: 'Context that triggered schema generation (task-completion, build, manual, parse-prd)',
                                    enum: ['task-completion', 'build', 'manual', 'parse-prd', 'file-change'],
                                    default: 'manual'
                                },
                                taskId: {
                                    type: 'string',
                                    description: 'Task ID that triggered this schema update (for tracking purposes)'
                                }
                            }
                        }
                    },
                    {
                        name: 'get_schema_info',
                        description: 'Get information about current schemas, versions, and generation status',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                projectRoot: {
                                    type: 'string',
                                    description: 'Project root directory path. Defaults to current directory.',
                                    default: '.'
                                },
                                includeStats: {
                                    type: 'boolean',
                                    description: 'Include detailed statistics about schema content',
                                    default: false
                                }
                            }
                        }
                    },
                    {
                        name: 'check_schema_freshness',
                        description: 'Check if schemas need updating based on file changes and modification times',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                projectRoot: {
                                    type: 'string',
                                    description: 'Project root directory path. Defaults to current directory.',
                                    default: '.'
                                },
                                maxAge: {
                                    type: 'number',
                                    description: 'Maximum age in minutes before schemas are considered stale',
                                    default: 60
                                }
                            }
                        }
                    },
                    {
                        name: 'auto_update_check',
                        description: 'Intelligent check for whether schemas should be updated based on Task Master AI workflow context',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                projectRoot: {
                                    type: 'string',
                                    description: 'Project root directory path. Defaults to current directory.',
                                    default: '.'
                                },
                                completedTaskId: {
                                    type: 'string',
                                    description: 'ID of the task that was just completed'
                                },
                                taskType: {
                                    type: 'string',
                                    description: 'Type of task completed (database, api, model, controller, migration, etc.)',
                                    enum: ['database', 'migration', 'model', 'controller', 'api', 'route', 'middleware', 'service', 'test', 'config', 'frontend', 'other']
                                },
                                changedFiles: {
                                    type: 'array',
                                    description: 'List of files that were changed',
                                    items: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    },
                    {
                        name: 'schema_diff',
                        description: 'Compare current project state with last generated schemas to detect changes',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                projectRoot: {
                                    type: 'string',
                                    description: 'Project root directory path. Defaults to current directory.',
                                    default: '.'
                                }
                            }
                        }
                    },
                    {
                        name: 'integration_status',
                        description: 'Get status of Task Master AI integration and workflow hooks',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                projectRoot: {
                                    type: 'string',
                                    description: 'Project root directory path. Defaults to current directory.',
                                    default: '.'
                                }
                            }
                        }
                    }
                ]
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async(request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'generate_schemas':
                        return await this.handleGenerateSchemas(args);
                    case 'get_schema_info':
                        return await this.handleGetSchemaInfo(args);
                    case 'check_schema_freshness':
                        return await this.handleCheckSchemaFreshness(args);
                    case 'auto_update_check':
                        return await this.handleAutoUpdateCheck(args);
                    case 'schema_diff':
                        return await this.handleSchemaDiff(args);
                    case 'integration_status':
                        return await this.handleIntegrationStatus(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error executing ${name}: ${error.message}\n\nStack trace:\n${error.stack}`
                    }],
                    isError: true
                };
            }
        });
    }

    async handleGenerateSchemas(args) {
        const {
            projectRoot = '.',
                framework = null,
                force = false,
                triggerContext = 'manual',
                taskId = null
        } = args;

        const generator = new TaskMasterSchemaGenerator(projectRoot);

        // Check if generation should be skipped (unless forced)
        if (!force) {
            const freshness = await this.checkFreshness(generator);
            if (freshness.isFresh && triggerContext !== 'parse-prd') {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            skipped: true,
                            reason: 'Schemas are fresh (generated less than 5 minutes ago)',
                            lastGenerated: freshness.lastGenerated,
                            ageMinutes: freshness.ageMinutes
                        }, null, 2)
                    }]
                };
            }
        }

        const result = await generator.generateSchemas(framework ? { type: framework } : null);

        // Log the generation event
        await this.logGenerationEvent(generator, {
            triggerContext,
            taskId,
            result
        });

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: result.success,
                    framework: result.framework,
                    schemas: result.schemas,
                    timestamp: result.timestamp,
                    location: result.location,
                    triggerContext,
                    taskId
                }, null, 2)
            }]
        };
    }

    async handleGetSchemaInfo(args) {
        const { projectRoot = '.', includeStats = false } = args;

        const generator = new TaskMasterSchemaGenerator(projectRoot);
        const info = await generator.getSchemaInfo();

        if (includeStats && info.success) {
            // Add detailed statistics
            info.statistics = await this.getSchemaStatistics(generator);
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(info, null, 2)
            }]
        };
    }

    async handleCheckSchemaFreshness(args) {
        const { projectRoot = '.', maxAge = 60 } = args;

        const generator = new TaskMasterSchemaGenerator(projectRoot);
        const freshness = await this.checkFreshness(generator, maxAge);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(freshness, null, 2)
            }]
        };
    }

    async handleAutoUpdateCheck(args) {
        const {
            projectRoot = '.',
                completedTaskId = null,
                taskType = 'other',
                changedFiles = []
        } = args;

        const generator = new TaskMasterSchemaGenerator(projectRoot);

        // Check if update is needed based on task type and changed files
        const updateNeeded = await this.shouldAutoUpdate(generator, taskType, changedFiles);

        const result = {
            updateNeeded: updateNeeded.required,
            reason: updateNeeded.reason,
            confidence: updateNeeded.confidence,
            affectedSchemas: updateNeeded.affectedSchemas,
            completedTaskId,
            taskType,
            changedFiles
        };

        // If update is needed, also return freshness info
        if (updateNeeded.required) {
            const freshness = await this.checkFreshness(generator);
            result.currentStatus = freshness;
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };
    }

    async handleSchemaDiff(args) {
        const { projectRoot = '.' } = args;

        const generator = new TaskMasterSchemaGenerator(projectRoot);

        // This would implement actual diff logic
        // For now, return a placeholder
        const diff = {
            hasChanges: false,
            note: 'Schema diff functionality is planned for future implementation',
            recommendation: 'Run generate_schemas to ensure schemas are up-to-date'
        };

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(diff, null, 2)
            }]
        };
    }

    async handleIntegrationStatus(args) {
        const { projectRoot = '.' } = args;

        const status = {
            mcpServer: {
                running: true,
                version: '1.0.0',
                capabilities: ['generate_schemas', 'auto_update_check', 'schema_info']
            },
            taskMasterIntegration: {
                available: true,
                hooks: ['task-completion', 'parse-prd', 'build'],
                configPath: path.join(projectRoot, '.taskmaster', 'config.json')
            },
            schemaDirectory: path.join(projectRoot, '.taskmaster', 'schemas'),
            lastActivity: new Date().toISOString()
        };

        // Check if .taskmaster directory exists
        try {
            await fs.access(path.join(projectRoot, '.taskmaster'));
            status.taskMasterIntegration.initialized = true;
        } catch {
            status.taskMasterIntegration.initialized = false;
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(status, null, 2)
            }]
        };
    }

    // Helper methods
    async checkFreshness(generator, maxAgeMinutes = 5) {
        try {
            const info = await generator.getSchemaInfo();
            if (!info.success || !info.current) {
                return {
                    isFresh: false,
                    reason: 'No schemas exist',
                    lastGenerated: null,
                    ageMinutes: null
                };
            }

            const generatedAt = new Date(info.current.generatedAt);
            const ageMinutes = (Date.now() - generatedAt.getTime()) / (1000 * 60);

            return {
                isFresh: ageMinutes < maxAgeMinutes,
                reason: ageMinutes < maxAgeMinutes ? 'Schemas are fresh' : 'Schemas are stale',
                lastGenerated: info.current.generatedAt,
                ageMinutes: Math.round(ageMinutes * 10) / 10
            };
        } catch (error) {
            return {
                isFresh: false,
                reason: `Error checking freshness: ${error.message}`,
                lastGenerated: null,
                ageMinutes: null
            };
        }
    }

    async shouldAutoUpdate(generator, taskType, changedFiles) {
        // Define task types that should trigger schema updates
        const schemaAffectingTasks = {
            'database': { schemas: ['database'], confidence: 0.9 },
            'migration': { schemas: ['database'], confidence: 0.95 },
            'model': { schemas: ['database', 'businessLogic'], confidence: 0.8 },
            'controller': { schemas: ['api', 'businessLogic'], confidence: 0.8 },
            'api': { schemas: ['api'], confidence: 0.9 },
            'route': { schemas: ['api'], confidence: 0.9 },
            'middleware': { schemas: ['api', 'businessLogic'], confidence: 0.7 },
            'service': { schemas: ['businessLogic'], confidence: 0.6 },
            'config': { schemas: ['componentArchitecture'], confidence: 0.5 },
            'test': { schemas: [], confidence: 0.1 }
        };

        // Check file patterns that indicate schema updates needed
        const schemaAffectingFiles = [
            { pattern: /database\/migrations\//, schemas: ['database'], confidence: 0.95 },
            { pattern: /app\/Models\//, schemas: ['database', 'businessLogic'], confidence: 0.8 },
            { pattern: /app\/Http\/Controllers\//, schemas: ['api', 'businessLogic'], confidence: 0.8 },
            { pattern: /routes\//, schemas: ['api'], confidence: 0.9 },
            { pattern: /app\/Http\/Middleware\//, schemas: ['api', 'businessLogic'], confidence: 0.7 },
            { pattern: /app\/Services\//, schemas: ['businessLogic'], confidence: 0.6 },
            { pattern: /composer\.json$/, schemas: ['componentArchitecture'], confidence: 0.6 },
            { pattern: /config\//, schemas: ['componentArchitecture'], confidence: 0.4 }
        ];

        let updateRecommendation = {
            required: false,
            reason: 'No schema-affecting changes detected',
            confidence: 0,
            affectedSchemas: []
        };

        // Check task type
        if (schemaAffectingTasks[taskType]) {
            const task = schemaAffectingTasks[taskType];
            updateRecommendation = {
                required: task.confidence > 0.5,
                reason: `Task type '${taskType}' affects schemas: ${task.schemas.join(', ')}`,
                confidence: task.confidence,
                affectedSchemas: task.schemas
            };
        }

        // Check changed files
        if (changedFiles.length > 0) {
            let maxConfidence = 0;
            let allAffectedSchemas = new Set();
            let reasons = [];

            for (const file of changedFiles) {
                for (const filePattern of schemaAffectingFiles) {
                    if (filePattern.pattern.test(file)) {
                        maxConfidence = Math.max(maxConfidence, filePattern.confidence);
                        filePattern.schemas.forEach(schema => allAffectedSchemas.add(schema));
                        reasons.push(`${file} affects ${filePattern.schemas.join(', ')}`);
                    }
                }
            }

            if (maxConfidence > updateRecommendation.confidence) {
                updateRecommendation = {
                    required: maxConfidence > 0.5,
                    reason: reasons.join('; '),
                    confidence: maxConfidence,
                    affectedSchemas: Array.from(allAffectedSchemas)
                };
            }
        }

        return updateRecommendation;
    }

    async getSchemaStatistics(generator) {
        try {
            const currentDir = generator.currentDir;
            const stats = {};

            const schemaFiles = ['database-schema.yml', 'api-schema.yml', 'businessLogic-schema.yml', 'componentArchitecture-schema.yml'];

            for (const file of schemaFiles) {
                try {
                    const filePath = path.join(currentDir, file);
                    const stat = await fs.stat(filePath);
                    const content = await fs.readFile(filePath, 'utf8');

                    stats[file.replace('-schema.yml', '')] = {
                        size: stat.size,
                        lines: content.split('\n').length,
                        lastModified: stat.mtime,
                        exists: true
                    };
                } catch (error) {
                    stats[file.replace('-schema.yml', '')] = {
                        exists: false,
                        error: error.message
                    };
                }
            }

            return stats;
        } catch (error) {
            return { error: error.message };
        }
    }

    async logGenerationEvent(generator, context) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                triggerContext: context.triggerContext,
                taskId: context.taskId,
                framework: context.result.framework,
                schemas: context.result.schemas,
                success: context.result.success
            };

            // Log to a simple integration log file
            const logFile = path.join(generator.schemaDir, 'integration.log');
            const logLine = JSON.stringify(logEntry) + '\n';

            await fs.appendFile(logFile, logLine);
        } catch (error) {
            // Don't fail schema generation if logging fails
            console.warn('Failed to log schema generation event:', error.message);
        }
    }

    setupErrorHandlers() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };

        process.on('SIGINT', async() => {
            await this.server.close();
            process.exit(0);
        });
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Task Master AI Schema Generation MCP Server running on stdio');
    }
}

// Start the server
const server = new TaskMasterSchemaMCPServer();
server.start().catch(console.error);

export { TaskMasterSchemaMCPServer };