#!/usr/bin/env node

/**
 * Task Master AI Schema Generator
 * 
 * Generates comprehensive project schemas for Laravel, Rails, Django, and Express
 * Auto-detects framework and creates YAML documentation for:
 * - Database structure, relationships, constraints
 * - API endpoints, routes, middleware 
 * - Business logic, models, policies, services
 * - Component architecture, dependencies, file organization
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class TaskMasterSchemaGenerator {
    constructor(projectRoot = '.') {
        this.projectRoot = path.resolve(projectRoot);
        this.schemaDir = path.join(this.projectRoot, '.taskmaster', 'schemas');
        this.currentDir = path.join(this.schemaDir, 'current');
        this.versionsDir = path.join(this.schemaDir, 'versions');
        this.historyDir = path.join(this.schemaDir, 'history');
    }

    async detectFramework() {
        try {
            // Check for Laravel
            if (await this.fileExists('artisan') && await this.fileExists('composer.json')) {
                const composerContent = await fs.readFile(path.join(this.projectRoot, 'composer.json'), 'utf8');
                if (composerContent.includes('laravel/framework')) {
                    return { type: 'laravel', version: this.extractLaravelVersion(composerContent) };
                }
            }

            // Check for Rails
            if (await this.fileExists('Gemfile') && await this.fileExists('config/application.rb')) {
                return { type: 'rails', version: 'detected' };
            }

            // Check for Django
            if (await this.fileExists('manage.py') && await this.fileExists('requirements.txt')) {
                return { type: 'django', version: 'detected' };
            }

            // Check for Express/Node.js
            if (await this.fileExists('package.json')) {
                const packageContent = await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf8');
                const pkg = JSON.parse(packageContent);
                if ((pkg.dependencies && pkg.dependencies.express) || (pkg.devDependencies && pkg.devDependencies.express)) {
                    return { type: 'express', version: (pkg.dependencies && pkg.dependencies.express) || (pkg.devDependencies && pkg.devDependencies.express) };
                }
            }

            return { type: 'unknown', version: null };
        } catch (error) {
            return { type: 'unknown', version: null, error: error.message };
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(path.join(this.projectRoot, filePath));
            return true;
        } catch {
            return false;
        }
    }

    extractLaravelVersion(composerContent) {
        try {
            const composer = JSON.parse(composerContent);
            return (composer.require && composer.require['laravel/framework']) || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    async ensureDirectories() {
        await fs.mkdir(this.schemaDir, { recursive: true });
        await fs.mkdir(this.currentDir, { recursive: true });
        await fs.mkdir(this.versionsDir, { recursive: true });
        await fs.mkdir(this.historyDir, { recursive: true });
    }

    async generateSchemas(framework = null) {
        await this.ensureDirectories();

        const detectedFramework = framework || await this.detectFramework();
        const timestamp = new Date().toISOString();

        let schemas = {};

        switch (detectedFramework.type) {
            case 'laravel':
                schemas = await this.generateLaravelSchemas();
                break;
            case 'rails':
                schemas = await this.generateRailsSchemas();
                break;
            case 'django':
                schemas = await this.generateDjangoSchemas();
                break;
            case 'express':
                schemas = await this.generateExpressSchemas();
                break;
            default:
                schemas = await this.generateGenericSchemas();
        }

        // Add metadata
        schemas.metadata = {
            framework: detectedFramework,
            generatedAt: timestamp,
            version: '1.0.0',
            projectRoot: this.projectRoot
        };

        // Save schemas
        await this.saveSchemas(schemas);

        return {
            success: true,
            framework: detectedFramework,
            schemas: Object.keys(schemas).filter(key => key !== 'metadata'),
            timestamp,
            location: this.currentDir
        };
    }

    async generateLaravelSchemas() {
        const schemas = {};

        // Database Schema
        schemas.database = await this.generateLaravelDatabaseSchema();

        // API/Route Schema
        schemas.api = await this.generateLaravelApiSchema();

        // Business Logic Schema
        schemas.businessLogic = await this.generateLaravelBusinessLogicSchema();

        // Component Architecture Schema
        schemas.componentArchitecture = await this.generateLaravelComponentSchema();

        return schemas;
    }

    async generateLaravelDatabaseSchema() {
        const schema = {
            type: 'database',
            framework: 'laravel',
            tables: {},
            relationships: [],
            constraints: [],
            indexes: []
        };

        try {
            // Try to get schema from existing service if available
            if (await this.fileExists('app/Services/DatabaseSchemaService.php')) {
                try {
                    const { stdout } = await execAsync('php artisan tinker --execute="echo json_encode((new App\\\\Services\\\\DatabaseSchemaService())->getSchema());"', {
                        cwd: this.projectRoot
                    });
                    const dbSchema = JSON.parse(stdout.trim());

                    for (const [tableName, tableData] of Object.entries(dbSchema)) {
                        schema.tables[tableName] = {
                            columns: tableData.columns || {},
                            foreignKeys: tableData.relations || [],
                            primaryKey: this.findPrimaryKey(tableData.columns || {}),
                            timestamps: this.hasTimestamps(tableData.columns || {})
                        };

                        // Extract relationships
                        if (tableData.relations) {
                            schema.relationships.push(...tableData.relations.map(rel => ({
                                table: tableName,
                                column: rel.column,
                                referencedTable: rel.on,
                                referencedColumn: rel.references,
                                type: 'foreign_key'
                            })));
                        }
                    }
                } catch (tinkerError) {
                    console.warn('Failed to use Laravel tinker, falling back to migration scanning:', tinkerError.message);
                    schema.tables = await this.scanLaravelMigrations();
                }
            } else {
                // Fallback: scan migration files
                schema.tables = await this.scanLaravelMigrations();
            }
        } catch (error) {
            schema.error = `Failed to generate database schema: ${error.message}`;
            console.error('Database schema generation error:', error);
        }

        return schema;
    }

    async generateLaravelApiSchema() {
        const schema = {
            type: 'api',
            framework: 'laravel',
            routes: {},
            middleware: [],
            controllers: {}
        };

        try {
            // Parse routes/web.php and routes/api.php
            const routeFiles = ['routes/web.php', 'routes/api.php'];

            for (const routeFile of routeFiles) {
                if (await this.fileExists(routeFile)) {
                    const routeContent = await fs.readFile(path.join(this.projectRoot, routeFile), 'utf8');
                    schema.routes[routeFile] = this.parsePhpRoutes(routeContent);
                }
            }

            // Scan controllers
            schema.controllers = await this.scanLaravelControllers();

            // Extract middleware
            if (await this.fileExists('app/Http/Kernel.php')) {
                const kernelContent = await fs.readFile(path.join(this.projectRoot, 'app/Http/Kernel.php'), 'utf8');
                schema.middleware = this.parseMiddleware(kernelContent);
            }
        } catch (error) {
            schema.error = `Failed to generate API schema: ${error.message}`;
            console.error('API schema generation error:', error);
        }

        return schema;
    }

    async generateLaravelBusinessLogicSchema() {
        const schema = {
            type: 'business_logic',
            framework: 'laravel',
            models: {},
            policies: {},
            services: {},
            events: {},
            jobs: {},
            rules: {},
            commands: {},
            middleware: {}
        };

        try {
            // Scan models
            schema.models = await this.scanDirectory('app/Models', '.php');

            // Scan policies
            if (await this.fileExists('app/Policies')) {
                schema.policies = await this.scanDirectory('app/Policies', '.php');
            }

            // Scan services
            if (await this.fileExists('app/Services')) {
                schema.services = await this.scanDirectory('app/Services', '.php');
            }

            // Scan events
            if (await this.fileExists('app/Events')) {
                schema.events = await this.scanDirectory('app/Events', '.php');
            }

            // Scan jobs
            if (await this.fileExists('app/Jobs')) {
                schema.jobs = await this.scanDirectory('app/Jobs', '.php');
            }

            // Scan validation rules
            if (await this.fileExists('app/Rules')) {
                schema.rules = await this.scanDirectory('app/Rules', '.php');
            }

            // Scan console commands
            if (await this.fileExists('app/Console/Commands')) {
                schema.commands = await this.scanDirectory('app/Console/Commands', '.php');
            }

            // Scan custom middleware
            if (await this.fileExists('app/Http/Middleware')) {
                schema.middleware = await this.scanDirectory('app/Http/Middleware', '.php');
            }
        } catch (error) {
            schema.error = `Failed to generate business logic schema: ${error.message}`;
            console.error('Business logic schema generation error:', error);
        }

        return schema;
    }

    async generateLaravelComponentSchema() {
        const schema = {
            type: 'component_architecture',
            framework: 'laravel',
            structure: {
                controllers: {},
                models: {},
                views: {},
                migrations: {},
                seeders: {},
                tests: {},
                config: {},
                routes: {}
            },
            dependencies: {},
            configuration: {}
        };

        try {
            // Scan directory structure
            schema.structure.controllers = await this.scanDirectory('app/Http/Controllers', '.php');
            schema.structure.models = await this.scanDirectory('app/Models', '.php');
            schema.structure.views = await this.scanDirectory('resources/views', '.blade.php');
            schema.structure.migrations = await this.scanDirectory('database/migrations', '.php');
            schema.structure.seeders = await this.scanDirectory('database/seeders', '.php');
            schema.structure.tests = await this.scanDirectory('tests', '.php');
            schema.structure.config = await this.scanDirectory('config', '.php');
            schema.structure.routes = await this.scanDirectory('routes', '.php');

            // Parse dependencies from composer.json
            if (await this.fileExists('composer.json')) {
                const composerContent = await fs.readFile(path.join(this.projectRoot, 'composer.json'), 'utf8');
                const composer = JSON.parse(composerContent);
                schema.dependencies = {
                    require: composer.require || {},
                    requireDev: composer['require-dev'] || {},
                    autoload: composer.autoload || {},
                    scripts: composer.scripts || {}
                };
            }

            // Parse Laravel-specific configuration
            schema.configuration = {
                appConfig: await this.parsePhpConfig('config/app.php'),
                databaseConfig: await this.parsePhpConfig('config/database.php'),
                servicesConfig: await this.parsePhpConfig('config/services.php')
            };
        } catch (error) {
            schema.error = `Failed to generate component architecture schema: ${error.message}`;
            console.error('Component architecture schema generation error:', error);
        }

        return schema;
    }

    // Framework stubs for future implementation
    async generateRailsSchemas() {
        return {
            database: { type: 'database', framework: 'rails', note: 'Rails schema generation implementation pending' },
            api: { type: 'api', framework: 'rails', note: 'Rails API schema generation implementation pending' },
            businessLogic: { type: 'business_logic', framework: 'rails', note: 'Rails business logic schema generation implementation pending' },
            componentArchitecture: { type: 'component_architecture', framework: 'rails', note: 'Rails component schema generation implementation pending' }
        };
    }

    async generateDjangoSchemas() {
        return {
            database: { type: 'database', framework: 'django', note: 'Django schema generation implementation pending' },
            api: { type: 'api', framework: 'django', note: 'Django API schema generation implementation pending' },
            businessLogic: { type: 'business_logic', framework: 'django', note: 'Django business logic schema generation implementation pending' },
            componentArchitecture: { type: 'component_architecture', framework: 'django', note: 'Django component schema generation implementation pending' }
        };
    }

    async generateExpressSchemas() {
        return {
            database: { type: 'database', framework: 'express', note: 'Express schema generation implementation pending' },
            api: { type: 'api', framework: 'express', note: 'Express API schema generation implementation pending' },
            businessLogic: { type: 'business_logic', framework: 'express', note: 'Express business logic schema generation implementation pending' },
            componentArchitecture: { type: 'component_architecture', framework: 'express', note: 'Express component schema generation implementation pending' }
        };
    }

    async generateGenericSchemas() {
        return {
            database: { type: 'database', framework: 'unknown', note: 'Framework-agnostic schema generation implementation pending' },
            api: { type: 'api', framework: 'unknown', note: 'Framework-agnostic API schema generation implementation pending' },
            businessLogic: { type: 'business_logic', framework: 'unknown', note: 'Framework-agnostic business logic schema generation implementation pending' },
            componentArchitecture: { type: 'component_architecture', framework: 'unknown', note: 'Framework-agnostic component schema generation implementation pending' }
        };
    }

    // Utility methods
    findPrimaryKey(columns) {
        for (const [name, info] of Object.entries(columns)) {
            if (info.key === 'PRI' || name === 'id') {
                return name;
            }
        }
        return null;
    }

    hasTimestamps(columns) {
        return 'created_at' in columns && 'updated_at' in columns;
    }

    async scanLaravelMigrations() {
        const tables = {};
        try {
            if (await this.fileExists('database/migrations')) {
                const files = await fs.readdir(path.join(this.projectRoot, 'database/migrations'));
                for (const file of files) {
                    if (file.endsWith('.php')) {
                        const content = await fs.readFile(path.join(this.projectRoot, 'database/migrations', file), 'utf8');
                        const tableInfo = this.parseMigrationFile(content, file);
                        if (tableInfo) {
                            tables[tableInfo.name] = tableInfo;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Error scanning migrations:', error.message);
        }
        return tables;
    }

    parseMigrationFile(content, filename) {
        // Basic parsing of Laravel migration files
        const createTableMatch = content.match(/Schema::create\(['"]([^'"]+)['"]/);
        if (createTableMatch) {
            return {
                name: createTableMatch[1],
                type: 'create',
                filename,
                columns: this.extractColumnsFromMigration(content),
                foreignKeys: this.extractForeignKeysFromMigration(content)
            };
        }

        // Handle table modifications
        const tableMatch = content.match(/Schema::table\(['"]([^'"]+)['"]/);
        if (tableMatch) {
            return {
                name: tableMatch[1],
                type: 'modify',
                filename,
                columns: this.extractColumnsFromMigration(content),
                foreignKeys: this.extractForeignKeysFromMigration(content)
            };
        }

        return null;
    }

    extractColumnsFromMigration(content) {
        const columns = {};
        const columnMatches = content.match(/\$table->\w+\([^;]+;/g);
        if (columnMatches) {
            for (const match of columnMatches) {
                const columnInfo = this.parseColumnDefinition(match);
                if (columnInfo) {
                    columns[columnInfo.name] = columnInfo;
                }
            }
        }
        return columns;
    }

    parseColumnDefinition(columnLine) {
        // Extract column type and name from Laravel migration syntax
        const typeMatch = columnLine.match(/\$table->(\w+)\(['"]([^'"]+)['"]/);
        if (typeMatch) {
            const [, type, name] = typeMatch;
            return {
                name,
                type,
                nullable: columnLine.includes('->nullable()'),
                default: this.extractDefault(columnLine),
                unique: columnLine.includes('->unique()'),
                index: columnLine.includes('->index()')
            };
        }
        return null;
    }

    extractDefault(columnLine) {
        const defaultMatch = columnLine.match(/->default\(([^)]+)\)/);
        return defaultMatch ? defaultMatch[1].replace(/['"]/g, '') : null;
    }

    extractForeignKeysFromMigration(content) {
        const foreignKeys = [];
        const foreignMatches = content.match(/\$table->foreign\([^;]+;/g);
        if (foreignMatches) {
            for (const match of foreignMatches) {
                const fkInfo = this.parseForeignKeyDefinition(match);
                if (fkInfo) {
                    foreignKeys.push(fkInfo);
                }
            }
        }
        return foreignKeys;
    }

    parseForeignKeyDefinition(fkLine) {
        const columnMatch = fkLine.match(/\$table->foreign\(['"]([^'"]+)['"]\)/);
        const referencesMatch = fkLine.match(/->references\(['"]([^'"]+)['"]\)/);
        const onMatch = fkLine.match(/->on\(['"]([^'"]+)['"]\)/);

        if (columnMatch && referencesMatch && onMatch) {
            return {
                column: columnMatch[1],
                references: referencesMatch[1],
                on: onMatch[1],
                onDelete: this.extractOnDelete(fkLine),
                onUpdate: this.extractOnUpdate(fkLine)
            };
        }
        return null;
    }

    extractOnDelete(fkLine) {
        const match = fkLine.match(/->onDelete\(['"]([^'"]+)['"]\)/);
        return match ? match[1] : null;
    }

    extractOnUpdate(fkLine) {
        const match = fkLine.match(/->onUpdate\(['"]([^'"]+)['"]\)/);
        return match ? match[1] : null;
    }

    parsePhpRoutes(content) {
        const routes = [];
        const routeMatches = content.match(/Route::(get|post|put|patch|delete|resource|group)\([^;]+;/g);
        if (routeMatches) {
            for (const match of routeMatches) {
                routes.push(this.parseRouteDefinition(match));
            }
        }
        return routes;
    }

    parseRouteDefinition(routeStr) {
        const methodMatch = routeStr.match(/Route::(\w+)/);
        const method = methodMatch ? methodMatch[1] : 'unknown';

        // Extract route path
        const pathMatch = routeStr.match(/Route::\w+\(['"]([^'"]+)['"]/);
        const path = pathMatch ? pathMatch[1] : 'unknown';

        // Extract controller/action
        const controllerMatch = routeStr.match(/(['"][^'"]*Controller[^'"]*['"])/);
        const controller = controllerMatch ? controllerMatch[1].replace(/['"]/g, '') : null;

        return {
            method,
            path,
            controller,
            definition: routeStr.trim(),
            type: method === 'resource' ? 'resource' : method === 'group' ? 'group' : 'single'
        };
    }

    async scanLaravelControllers() {
        const controllers = {};
        try {
            if (await this.fileExists('app/Http/Controllers')) {
                const files = await this.scanDirectory('app/Http/Controllers', '.php');
                for (const [name, file] of Object.entries(files)) {
                    if (file.content) {
                        controllers[name] = {
                            methods: this.extractPhpMethods(file.content),
                            extends: this.extractPhpExtends(file.content),
                            traits: this.extractPhpTraits(file.content),
                            uses: this.extractPhpUses(file.content),
                            namespace: this.extractPhpNamespace(file.content)
                        };
                    }
                }
            }
        } catch (error) {
            controllers.error = error.message;
        }
        return controllers;
    }

    parseMiddleware(content) {
        const middleware = [];
        // Extract middleware from Laravel Kernel
        const middlewareMatches = content.match(/'([^']+)'\s*=>\s*([^,\n]+)/g);
        if (middlewareMatches) {
            for (const match of middlewareMatches) {
                const parts = match.match(/'([^']+)'\s*=>\s*([^,\n]+)/);
                if (parts) {
                    middleware.push({
                        name: parts[1].trim(),
                        class: parts[2].trim().replace(/[,;]$/, '')
                    });
                }
            }
        }
        return middleware;
    }

    async scanDirectory(dirPath, extension = '') {
        const files = {};
        try {
            const fullPath = path.join(this.projectRoot, dirPath);
            if (await this.fileExists(dirPath)) {
                const entries = await fs.readdir(fullPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isFile() && (extension === '' || entry.name.endsWith(extension))) {
                        const filePath = path.join(fullPath, entry.name);
                        try {
                            const content = await fs.readFile(filePath, 'utf8');
                            const stats = await fs.stat(filePath);
                            files[entry.name] = {
                                path: path.relative(this.projectRoot, filePath),
                                size: content.length,
                                lastModified: stats.mtime,
                                content: content.substring(0, 5000) // Limit content size to 5KB
                            };
                        } catch (error) {
                            files[entry.name] = { error: error.message };
                        }
                    } else if (entry.isDirectory()) {
                        const subFiles = await this.scanDirectory(path.join(dirPath, entry.name), extension);
                        if (Object.keys(subFiles).length > 0) {
                            files[entry.name] = subFiles;
                        }
                    }
                }
            }
        } catch (error) {
            return { error: error.message };
        }
        return files;
    }

    extractPhpMethods(content) {
        const methods = [];
        const methodMatches = content.match(/(?:public|private|protected)\s+function\s+(\w+)\s*\([^)]*\)/g);
        if (methodMatches) {
            for (const match of methodMatches) {
                const nameMatch = match.match(/function\s+(\w+)/);
                if (nameMatch) {
                    methods.push({
                        name: nameMatch[1],
                        visibility: match.includes('public') ? 'public' : match.includes('private') ? 'private' : 'protected',
                        signature: match,
                        static: match.includes('static')
                    });
                }
            }
        }
        return methods;
    }

    extractPhpExtends(content) {
        const extendsMatch = content.match(/class\s+\w+\s+extends\s+([^\s{]+)/);
        return extendsMatch ? extendsMatch[1] : null;
    }

    extractPhpTraits(content) {
        const traits = [];
        const traitMatches = content.match(/use\s+([^;]+);/g);
        if (traitMatches) {
            for (const match of traitMatches) {
                const traitName = match.replace(/use\s+/, '').replace(';', '').trim();
                if (traitName && !traitName.includes('\\Http\\') && !traitName.includes('function') && traitName.includes('\\')) {
                    traits.push(traitName);
                }
            }
        }
        return traits;
    }

    extractPhpUses(content) {
        const uses = [];
        const useMatches = content.match(/^use\s+([^;]+);/gm);
        if (useMatches) {
            for (const match of useMatches) {
                const useName = match.replace(/use\s+/, '').replace(';', '').trim();
                if (useName && useName.includes('\\')) {
                    uses.push(useName);
                }
            }
        }
        return uses;
    }

    extractPhpNamespace(content) {
        const namespaceMatch = content.match(/namespace\s+([^;]+);/);
        return namespaceMatch ? namespaceMatch[1].trim() : null;
    }

    async parsePhpConfig(configPath) {
        try {
            if (await this.fileExists(configPath)) {
                const content = await fs.readFile(path.join(this.projectRoot, configPath), 'utf8');
                // Basic parsing of PHP config array
                return {
                    file: configPath,
                    content: content.substring(0, 1000), // First 1KB only
                    parsed: 'PHP config parsing not fully implemented'
                };
            }
        } catch (error) {
            return { error: error.message };
        }
        return {};
    }

    async saveSchemas(schemas) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Save current schemas
        for (const [name, schema] of Object.entries(schemas)) {
            if (name !== 'metadata') {
                const yamlContent = yaml.dump(schema, {
                    lineWidth: 120,
                    noCompatMode: true,
                    sortKeys: false,
                    flowLevel: 3
                });
                await fs.writeFile(path.join(this.currentDir, `${name}-schema.yml`), yamlContent);
            }
        }

        // Save metadata
        const metadataYaml = yaml.dump(schemas.metadata, {
            lineWidth: 120,
            noCompatMode: true
        });
        await fs.writeFile(path.join(this.currentDir, 'metadata.yml'), metadataYaml);

        // Save version
        const versionDir = path.join(this.versionsDir, `v${timestamp}`);
        await fs.mkdir(versionDir, { recursive: true });
        for (const [name, schema] of Object.entries(schemas)) {
            const yamlContent = yaml.dump(schema, {
                lineWidth: 120,
                noCompatMode: true,
                sortKeys: false,
                flowLevel: 3
            });
            await fs.writeFile(path.join(versionDir, `${name}.yml`), yamlContent);
        }

        // Log history
        const historyEntry = {
            timestamp,
            version: `v${timestamp}`,
            framework: schemas.metadata && schemas.metadata.framework,
            schemas: Object.keys(schemas).filter(key => key !== 'metadata'),
            changeLog: 'Schema generation completed successfully'
        };

        const historyFile = path.join(this.historyDir, 'changes.yml');
        let history = [];
        try {
            const existingHistory = await fs.readFile(historyFile, 'utf8');
            history = yaml.load(existingHistory) || [];
        } catch {
            // File doesn't exist yet
        }

        history.unshift(historyEntry);
        // Keep only last 50 entries
        history = history.slice(0, 50);

        await fs.writeFile(historyFile, yaml.dump(history, {
            lineWidth: 120,
            noCompatMode: true
        }));
    }

    async getSchemaInfo() {
        try {
            const metadataPath = path.join(this.currentDir, 'metadata.yml');
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = yaml.load(metadataContent);

            const versions = await this.listSchemaVersions();
            const schemas = await fs.readdir(this.currentDir);
            const availableSchemas = schemas.filter(file => file.endsWith('-schema.yml')).map(file => file.replace('-schema.yml', ''));

            return {
                success: true,
                current: metadata,
                availableSchemas,
                versions: versions.slice(0, 10), // Last 10 versions
                location: this.schemaDir
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                location: this.schemaDir
            };
        }
    }

    async listSchemaVersions() {
        try {
            const versions = await fs.readdir(this.versionsDir);
            return versions.sort().reverse(); // Latest first
        } catch {
            return [];
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        console.log(`
Task Master AI Schema Generator

Usage:
  node schema-generator.mjs generate [options]     Generate schemas for current project
  node schema-generator.mjs info [options]        Show schema information
  node schema-generator.mjs --help               Show this help

Options:
  --project <path>    Project root directory (default: current directory)
  --framework <type>  Force framework detection (laravel, rails, django, express)
  --force            Force regeneration even if recent schemas exist

Examples:
  node schema-generator.mjs generate
  node schema-generator.mjs generate --project /path/to/project --framework laravel
  node schema-generator.mjs info --project /path/to/project
`);
        return;
    }

    const projectArgIndex = args.indexOf('--project');
    const frameworkArgIndex = args.indexOf('--framework');

    const projectRoot = (projectArgIndex !== -1 && args[projectArgIndex + 1]) || '.';
    const framework = (frameworkArgIndex !== -1 && args[frameworkArgIndex + 1]) || null;
    const force = args.includes('--force');

    const generator = new TaskMasterSchemaGenerator(projectRoot);

    try {
        switch (command) {
            case 'generate':
                console.log('🔍 Detecting framework...');
                const detectedFramework = await generator.detectFramework();
                console.log(`📋 Framework detected: ${detectedFramework.type} ${detectedFramework.version || ''}`);

                console.log('🚀 Generating schemas...');
                const result = await generator.generateSchemas(framework ? { type: framework } : null);

                if (result.success) {
                    console.log(`✅ Schema generation completed successfully!`);
                    console.log(`📁 Location: ${result.location}`);
                    console.log(`📊 Generated schemas: ${result.schemas.join(', ')}`);
                    console.log(`🕒 Timestamp: ${result.timestamp}`);

                    // Show schema summary
                    const info = await generator.getSchemaInfo();
                    if (info.success && info.current) {
                        console.log(`\n📈 Schema Summary:`);
                        console.log(`   Framework: ${info.current.framework.type} ${info.current.framework.version || ''}`);
                        console.log(`   Available schemas: ${info.availableSchemas.length}`);
                        console.log(`   Version history: ${info.versions.length} versions`);
                    }
                } else {
                    console.error('❌ Schema generation failed');
                    process.exit(1);
                }
                break;

            case 'info':
                const info = await generator.getSchemaInfo();
                if (info.success) {
                    console.log('📊 Schema Information:');
                    console.log(`   Location: ${info.location}`);
                    if (info.current) {
                        console.log(`   Framework: ${info.current.framework.type} ${info.current.framework.version || ''}`);
                        console.log(`   Last generated: ${info.current.generatedAt}`);
                        console.log(`   Available schemas: ${info.availableSchemas.join(', ')}`);
                        console.log(`   Versions: ${info.versions.length} total`);
                    } else {
                        console.log('   Status: No schemas generated yet');
                    }
                } else {
                    console.error(`❌ Error getting schema info: ${info.error}`);
                    process.exit(1);
                }
                break;

            default:
                console.error(`❌ Unknown command: ${command}`);
                console.log('Use --help for usage information');
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// Export for use as module
export { TaskMasterSchemaGenerator };

// Run CLI if this file is executed directly
if (
    import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}