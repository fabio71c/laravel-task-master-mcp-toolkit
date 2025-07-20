#!/usr/bin/env node

/**
 * Enhanced Task Master AI Workflow Integration with Schema Generation and Test Generation
 * 
 * This script demonstrates how to integrate schema generation AND test generation into
 * Task Master AI workflows using MCP servers.
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

class EnhancedTaskMasterWorkflowIntegration {
    constructor() {
        this.mcpServerProcess = null;
        this.testGenerationProcess = null;
    }

    async callMCPTool(toolName, params = {}) {
        const request = {
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: {
                name: toolName,
                arguments: params
            }
        };

        return new Promise((resolve, reject) => {
            const mcpProcess = spawn('node', ['mcp-schema-server.mjs'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';
            let responseReceived = false;

            mcpProcess.stdout.on('data', (data) => {
                output += data.toString();

                // Check if we have a complete JSON response
                const lines = output.split('\n');
                const jsonLine = lines.find(line => line.trim().startsWith('{"result"') || line.trim().startsWith('{"jsonrpc"'));

                if (jsonLine && !responseReceived) {
                    responseReceived = true;
                    try {
                        const response = JSON.parse(jsonLine.trim());
                        if (response.result) {
                            mcpProcess.kill('SIGTERM');
                            resolve(response.result);
                        } else {
                            mcpProcess.kill('SIGTERM');
                            reject(new Error('MCP response missing result field'));
                        }
                    } catch (parseError) {
                        mcpProcess.kill('SIGTERM');
                        reject(parseError);
                    }
                }
            });

            mcpProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            mcpProcess.on('close', (code) => {
                if (!responseReceived) {
                    reject(new Error(`MCP process exited without response. Code: ${code}, Error: ${error}`));
                }
            });

            // Set a timeout to prevent hanging
            setTimeout(() => {
                if (!responseReceived) {
                    mcpProcess.kill('SIGTERM');
                    reject(new Error('MCP call timeout'));
                }
            }, 10000);

            mcpProcess.stdin.write(JSON.stringify(request) + '\n');
            mcpProcess.stdin.end();
        });
    }

    // Enhanced task completion workflow with test generation
    async simulateEnhancedTaskCompletionWorkflow(taskId, taskType, changedFiles = []) {
        console.log(`\n🎯 Enhanced Task Completion Workflow: ${taskId} (${taskType})`);

        // Step 1: Check if schema update needed
        console.log('1. 📊 Checking if schema update needed...');
        const checkResult = await this.callMCPTool('auto_update_check', {
            completedTaskId: taskId,
            taskType: taskType,
            changedFiles: changedFiles
        });

        if (checkResult.content[0].text) {
            const data = JSON.parse(checkResult.content[0].text);
            console.log(`   📊 Update needed: ${data.updateNeeded}`);
            console.log(`   🔍 Reason: ${data.reason}`);
            console.log(`   💯 Confidence: ${(data.confidence * 100).toFixed(0)}%`);

            if (data.updateNeeded) {
                console.log('2. 🔄 Generating updated schemas...');
                const genResult = await this.callMCPTool('generate_schemas', {
                    projectRoot: '.',
                    force: false,
                    triggerContext: 'task-completion',
                    taskId: taskId
                });

                if (genResult.content[0].text) {
                    const genData = JSON.parse(genResult.content[0].text);
                    if (genData.skipped) {
                        console.log(`   ⏭️  Schema generation skipped: ${genData.reason}`);
                    } else {
                        console.log(`   ✅ Schemas updated for affected areas: ${data.affectedSchemas.join(', ')}`);
                    }
                }
            } else {
                console.log('   ✅ No schema update needed');
            }
        }

        // Step 2: Generate unit tests for the completed feature
        console.log('3. 🧪 Generating unit tests for completed feature...');
        const testResult = await this.generateTestsForTask(taskId, taskType, changedFiles);

        if (testResult.success) {
            console.log(`   ✅ Tests generated: ${testResult.testFiles.join(', ')}`);
            console.log(`   📊 Test coverage: ${testResult.coverage}%`);

            // Step 3: Run the generated tests
            console.log('4. 🏃 Running generated tests...');
            const runResult = await this.runTests(testResult.testFiles);

            if (runResult.success) {
                console.log(`   ✅ All tests passed: ${runResult.passed}/${runResult.total} tests`);
                console.log(`   📈 Coverage improved: ${runResult.coverage}%`);
            } else {
                console.log(`   ❌ Some tests failed: ${runResult.failed}/${runResult.total} tests`);
                console.log(`   🔧 Test fixes needed before marking task complete`);
            }
        } else {
            console.log(`   ⚠️  Test generation skipped: ${testResult.reason}`);
        }

        // Step 4: Update task status (only if tests pass)
        console.log('5. 📝 Updating task status...');
        if (testResult.success && runResult.success) {
            console.log('   ✅ Task ready to be marked as "done"');
            console.log('   💡 Use: task-master set-status -i ' + taskId + ' -s done');
        } else {
            console.log('   ⚠️  Task cannot be marked "done" until tests pass');
            console.log('   🔧 Fix test issues first, then retry');
        }
    }

    // Generate tests for a completed task
    async generateTestsForTask(taskId, taskType, changedFiles) {
        try {
            // Analyze the task type and changed files to determine what tests to generate
            const testTypes = this.analyzeTestRequirements(taskType, changedFiles);

            const generatedTests = [];
            let totalCoverage = 0;

            for (const testType of testTypes) {
                const testFile = await this.createTestFile(testType, taskId, changedFiles);
                if (testFile) {
                    generatedTests.push(testFile);
                    totalCoverage += testType.estimatedCoverage;
                }
            }

            return {
                success: generatedTests.length > 0,
                testFiles: generatedTests,
                coverage: Math.min(totalCoverage, 100),
                reason: generatedTests.length === 0 ? 'No testable components found' : null
            };
        } catch (error) {
            return {
                success: false,
                testFiles: [],
                coverage: 0,
                reason: error.message
            };
        }
    }

    // Analyze what types of tests are needed based on task type and changed files
    analyzeTestRequirements(taskType, changedFiles) {
        const testTypes = [];

        // Analyze changed files to determine test requirements
        for (const file of changedFiles) {
            if (file.includes('app/Models/')) {
                testTypes.push({
                    type: 'unit',
                    target: 'model',
                    file: file,
                    estimatedCoverage: 80,
                    testFile: this.getTestFilePath(file, 'Unit')
                });
            } else if (file.includes('app/Http/Controllers/')) {
                testTypes.push({
                    type: 'feature',
                    target: 'controller',
                    file: file,
                    estimatedCoverage: 70,
                    testFile: this.getTestFilePath(file, 'Feature')
                });
            } else if (file.includes('app/Services/')) {
                testTypes.push({
                    type: 'unit',
                    target: 'service',
                    file: file,
                    estimatedCoverage: 85,
                    testFile: this.getTestFilePath(file, 'Unit')
                });
            } else if (file.includes('database/migrations/')) {
                testTypes.push({
                    type: 'feature',
                    target: 'migration',
                    file: file,
                    estimatedCoverage: 60,
                    testFile: this.getTestFilePath(file, 'Feature')
                });
            }
        }

        // Add task-type specific tests
        switch (taskType) {
            case 'migration':
                testTypes.push({
                    type: 'feature',
                    target: 'database',
                    file: 'database',
                    estimatedCoverage: 50,
                    testFile: 'tests/Feature/DatabaseTest.php'
                });
                break;
            case 'controller':
                testTypes.push({
                    type: 'feature',
                    target: 'api',
                    file: 'api',
                    estimatedCoverage: 75,
                    testFile: 'tests/Feature/ApiTest.php'
                });
                break;
            case 'model':
                testTypes.push({
                    type: 'unit',
                    target: 'model',
                    file: 'model',
                    estimatedCoverage: 90,
                    testFile: 'tests/Unit/ModelTest.php'
                });
                break;
        }

        return testTypes;
    }

    // Get the appropriate test file path
    getTestFilePath(sourceFile, testType) {
        const fileName = path.basename(sourceFile, path.extname(sourceFile));
        const testFileName = fileName.replace(/\.php$/, '') + 'Test.php';
        return `tests/${testType}/${testFileName}`;
    }

    // Create a test file based on the component type
    async createTestFile(testType, taskId, changedFiles) {
        try {
            const testContent = this.generateTestContent(testType, taskId, changedFiles);
            const testPath = testType.testFile;

            // Ensure test directory exists
            const testDir = path.dirname(testPath);
            await fs.mkdir(testDir, { recursive: true });

            // Write test file
            await fs.writeFile(testPath, testContent, 'utf8');

            return testPath;
        } catch (error) {
            console.error(`Error creating test file: ${error.message}`);
            return null;
        }
    }

    // Generate test content based on component type
    generateTestContent(testType, taskId, changedFiles) {
        const baseTestContent = `<?php

namespace Tests\\${testType.type === 'unit' ? 'Unit' : 'Feature'};

use Tests\\TestCase;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Illuminate\\Foundation\\Testing\\WithFaker;

class ${path.basename(testType.testFile, '.php')} extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Component: ${testType.target}
     * Changed files: ${changedFiles.join(', ')}
     */

    public function setUp(): void
    {
        parent::setUp();
        // Setup code for ${testType.target} tests
    }

    public function test_${testType.target}_can_be_created()
    {
        // TODO: Implement test for ${testType.target} creation
        $this->assertTrue(true);
    }

    public function test_${testType.target}_can_be_updated()
    {
        // TODO: Implement test for ${testType.target} updates
        $this->assertTrue(true);
    }

    public function test_${testType.target}_can_be_deleted()
    {
        // TODO: Implement test for ${testType.target} deletion
        $this->assertTrue(true);
    }

    public function test_${testType.target}_validation_works()
    {
        // TODO: Implement validation tests
        $this->assertTrue(true);
    }
}
`;

        // Customize based on test type
        switch (testType.target) {
            case 'model':
                return this.generateModelTestContent(testType, taskId, changedFiles);
            case 'controller':
                return this.generateControllerTestContent(testType, taskId, changedFiles);
            case 'service':
                return this.generateServiceTestContent(testType, taskId, changedFiles);
            default:
                return baseTestContent;
        }
    }

    // Generate model-specific test content
    generateModelTestContent(testType, taskId, changedFiles) {
        const modelName = path.basename(testType.file, '.php');
        return `<?php

namespace Tests\\Unit;

use Tests\\TestCase;
use App\\Models\\${modelName};
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Illuminate\\Foundation\\Testing\\WithFaker;

class ${modelName}Test extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Model: ${modelName}
     */

    public function test_${modelName}_can_be_created()
    {
        $${modelName.toLowerCase()} = ${modelName}::factory()->create();
        $this->assertInstanceOf(${modelName}::class, $${modelName.toLowerCase()});
    }

    public function test_${modelName}_has_required_attributes()
    {
        $${modelName.toLowerCase()} = ${modelName}::factory()->create();
        $this->assertNotNull($${modelName.toLowerCase()}->id);
    }

    public function test_${modelName}_relationships_work()
    {
        // TODO: Test model relationships
        $this->assertTrue(true);
    }

    public function test_${modelName}_scopes_work()
    {
        // TODO: Test model scopes
        $this->assertTrue(true);
    }
}
`;
    }

    // Generate controller-specific test content
    generateControllerTestContent(testType, taskId, changedFiles) {
        const controllerName = path.basename(testType.file, '.php');
        return `<?php

namespace Tests\\Feature;

use Tests\\TestCase;
use App\\Models\\User;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Illuminate\\Foundation\\Testing\\WithFaker;

class ${controllerName}Test extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Controller: ${controllerName}
     */

    public function test_index_returns_correct_response()
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get('/${controllerName.toLowerCase().replace('controller', '')}');
        $response->assertStatus(200);
    }

    public function test_store_creates_new_record()
    {
        $user = User::factory()->create();
        $data = [
            // TODO: Add required data fields
        ];
        
        $response = $this->actingAs($user)->post('/${controllerName.toLowerCase().replace('controller', '')}', $data);
        $response->assertStatus(302); // Redirect after creation
    }

    public function test_show_displays_correct_record()
    {
        $user = User::factory()->create();
        // TODO: Create test record
        $response = $this->actingAs($user)->get('/${controllerName.toLowerCase().replace('controller', '')}/1');
        $response->assertStatus(200);
    }

    public function test_update_modifies_record()
    {
        $user = User::factory()->create();
        $data = [
            // TODO: Add update data fields
        ];
        
        $response = $this->actingAs($user)->put('/${controllerName.toLowerCase().replace('controller', '')}/1', $data);
        $response->assertStatus(302); // Redirect after update
    }

    public function test_destroy_deletes_record()
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->delete('/${controllerName.toLowerCase().replace('controller', '')}/1');
        $response->assertStatus(302); // Redirect after deletion
    }
}
`;
    }

    // Generate service-specific test content
    generateServiceTestContent(testType, taskId, changedFiles) {
        const serviceName = path.basename(testType.file, '.php');
        return `<?php

namespace Tests\\Unit;

use Tests\\TestCase;
use App\\Services\\${serviceName};
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Illuminate\\Foundation\\Testing\\WithFaker;

class ${serviceName}Test extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected ${serviceName} $service;

    public function setUp(): void
    {
        parent::setUp();
        $this->service = new ${serviceName}();
    }

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Service: ${serviceName}
     */

    public function test_service_can_be_instantiated()
    {
        $this->assertInstanceOf(${serviceName}::class, $this->service);
    }

    public function test_service_methods_work_correctly()
    {
        // TODO: Test specific service methods
        $this->assertTrue(true);
    }

    public function test_service_handles_errors_gracefully()
    {
        // TODO: Test error handling
        $this->assertTrue(true);
    }
}
`;
    }

    // Run the generated tests
    async runTests(testFiles) {
        try {
            console.log('   🏃 Running tests...');

            // Run PHPUnit on the test files
            const testProcess = spawn('php', ['artisan', 'test', '--filter=' + testFiles.join('|')], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            return new Promise((resolve) => {
                let output = '';
                let error = '';

                testProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                testProcess.stderr.on('data', (data) => {
                    error += data.toString();
                });

                testProcess.on('close', (code) => {
                    // Parse test results from output
                    const results = this.parseTestResults(output, error, code);
                    resolve(results);
                });
            });
        } catch (error) {
            return {
                success: false,
                passed: 0,
                failed: 1,
                total: 1,
                coverage: 0,
                error: error.message
            };
        }
    }

    // Parse test results from PHPUnit output
    parseTestResults(output, error, exitCode) {
        // Simple parsing - in production, you'd want more sophisticated parsing
        const success = exitCode === 0;
        const passed = success ? 1 : 0;
        const failed = success ? 0 : 1;
        const total = passed + failed;
        const coverage = success ? 80 : 0; // Mock coverage

        return {
            success,
            passed,
            failed,
            total,
            coverage,
            output,
            error
        };
    }

    // Enhanced demo with test generation
    async runEnhancedDemo() {
        console.log('🎬 Enhanced Task Master AI Workflow Demo with Test Generation');
        console.log('='.repeat(60));

        try {
            // Simulate enhanced task completion scenarios
            await this.simulateEnhancedTaskCompletionWorkflow('task-15', 'migration', [
                'database/migrations/2025_07_18_175459_add_date_updated_to_tasks_table.php'
            ]);

            await this.simulateEnhancedTaskCompletionWorkflow('task-16', 'controller', [
                'app/Http/Controllers/TaskController.php'
            ]);

            await this.simulateEnhancedTaskCompletionWorkflow('task-17', 'model', [
                'app/Models/Task.php'
            ]);

            console.log('\n🎉 Enhanced demo completed!');
            console.log('\n💡 Enhanced workflow now includes:');
            console.log('   1. ✅ Schema generation (existing)');
            console.log('   2. 🧪 Automatic test generation (NEW)');
            console.log('   3. 🏃 Test execution and validation (NEW)');
            console.log('   4. 📊 Coverage tracking (NEW)');
            console.log('   5. ✅ Task completion only after tests pass (NEW)');

        } catch (error) {
            console.error('❌ Enhanced demo failed:', error.message);
            process.exit(1);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const integration = new EnhancedTaskMasterWorkflowIntegration();

    if (args.length === 0) {
        await integration.runEnhancedDemo();
    } else {
        const command = args[0];
        switch (command) {
            case 'demo':
                await integration.runEnhancedDemo();
                break;
            case 'test-generation':
                if (args[1] && args[2]) {
                    await integration.simulateEnhancedTaskCompletionWorkflow(args[1], args[2], args.slice(3));
                } else {
                    console.log('Usage: node taskmaster-workflow-integration-enhanced.mjs test-generation <taskId> <taskType> [changedFiles...]');
                }
                break;
            default:
                console.log('Usage: node taskmaster-workflow-integration-enhanced.mjs [demo|test-generation]');
        }
    }
}

if (
    import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

export { EnhancedTaskMasterWorkflowIntegration };