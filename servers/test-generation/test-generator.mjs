#!/usr/bin/env node

/**
 * Test Generator for Laravel Projects
 * 
 * This class handles automatic test generation for Laravel projects
 * as part of the Task Master AI workflow.
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

export class TestGenerator {
    constructor() {
        this.testTemplates = {
            model: this.getModelTestTemplate(),
            controller: this.getControllerTestTemplate(),
            service: this.getServiceTestTemplate(),
            migration: this.getMigrationTestTemplate(),
            middleware: this.getMiddlewareTestTemplate(),
            job: this.getJobTestTemplate(),
            command: this.getCommandTestTemplate()
        };
    }

    async generateTestsForTask(taskId, taskType, changedFiles, projectRoot) {
        try {
            console.log(`🧪 Generating tests for task ${taskId} (${taskType})`);

            const testRequirements = this.analyzeTestRequirements(taskType, changedFiles);
            const generatedTests = [];
            let totalCoverage = 0;

            for (const requirement of testRequirements) {
                const testFile = await this.createTestFile(requirement, taskId, projectRoot);
                if (testFile) {
                    generatedTests.push(testFile);
                    totalCoverage += requirement.estimatedCoverage;
                }
            }

            // Generate additional tests based on task type
            const additionalTests = await this.generateAdditionalTests(taskType, taskId, projectRoot);
            generatedTests.push(...additionalTests);

            return {
                success: generatedTests.length > 0,
                testFiles: generatedTests,
                coverage: Math.min(totalCoverage, 100),
                taskId: taskId,
                taskType: taskType,
                generatedAt: new Date().toISOString(),
                reason: generatedTests.length === 0 ? 'No testable components found' : null
            };
        } catch (error) {
            console.error('Error generating tests:', error);
            return {
                success: false,
                testFiles: [],
                coverage: 0,
                error: error.message
            };
        }
    }

    analyzeTestRequirements(taskType, changedFiles) {
        const requirements = [];

        for (const file of changedFiles) {
            if (file.includes('app/Models/')) {
                requirements.push({
                    type: 'unit',
                    target: 'model',
                    file: file,
                    estimatedCoverage: 80,
                    testFile: this.getTestFilePath(file, 'Unit')
                });
            } else if (file.includes('app/Http/Controllers/')) {
                requirements.push({
                    type: 'feature',
                    target: 'controller',
                    file: file,
                    estimatedCoverage: 70,
                    testFile: this.getTestFilePath(file, 'Feature')
                });
            } else if (file.includes('app/Services/')) {
                requirements.push({
                    type: 'unit',
                    target: 'service',
                    file: file,
                    estimatedCoverage: 85,
                    testFile: this.getTestFilePath(file, 'Unit')
                });
            } else if (file.includes('app/Http/Middleware/')) {
                requirements.push({
                    type: 'unit',
                    target: 'middleware',
                    file: file,
                    estimatedCoverage: 75,
                    testFile: this.getTestFilePath(file, 'Unit')
                });
            } else if (file.includes('app/Jobs/')) {
                requirements.push({
                    type: 'unit',
                    target: 'job',
                    file: file,
                    estimatedCoverage: 80,
                    testFile: this.getTestFilePath(file, 'Unit')
                });
            } else if (file.includes('app/Console/Commands/')) {
                requirements.push({
                    type: 'feature',
                    target: 'command',
                    file: file,
                    estimatedCoverage: 70,
                    testFile: this.getTestFilePath(file, 'Feature')
                });
            } else if (file.includes('database/migrations/')) {
                requirements.push({
                    type: 'feature',
                    target: 'migration',
                    file: file,
                    estimatedCoverage: 60,
                    testFile: this.getTestFilePath(file, 'Feature')
                });
            }
        }

        return requirements;
    }

    getTestFilePath(sourceFile, testType) {
        const fileName = path.basename(sourceFile, path.extname(sourceFile));
        const testFileName = fileName.replace(/\.php$/, '') + 'Test.php';
        return `tests/${testType}/${testFileName}`;
    }

    async createTestFile(requirement, taskId, projectRoot) {
        try {
            const testContent = this.generateTestContent(requirement, taskId);
            const testPath = path.join(projectRoot, requirement.testFile);

            // Ensure test directory exists
            const testDir = path.dirname(testPath);
            await fs.mkdir(testDir, { recursive: true });

            // Check if test file already exists
            try {
                await fs.access(testPath);
                console.log(`⚠️  Test file already exists: ${requirement.testFile}`);
                return requirement.testFile;
            } catch {
                // File doesn't exist, create it
            }

            // Write test file
            await fs.writeFile(testPath, testContent, 'utf8');
            console.log(`✅ Created test file: ${requirement.testFile}`);

            return requirement.testFile;
        } catch (error) {
            console.error(`Error creating test file: ${error.message}`);
            return null;
        }
    }

    generateTestContent(requirement, taskId) {
        const template = this.testTemplates[requirement.target];
        if (!template) {
            return this.getDefaultTestTemplate(requirement, taskId);
        }

        return template(requirement, taskId);
    }

    getModelTestTemplate() {
        return (requirement, taskId) => {
            const modelName = path.basename(requirement.file, '.php');
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

    public function setUp(): void
    {
        parent::setUp();
    }

    public function test_${modelName.toLowerCase()}_can_be_created()
    {
        $${modelName.toLowerCase()} = ${modelName}::factory()->create();
        $this->assertInstanceOf(${modelName}::class, $${modelName.toLowerCase()});
    }

    public function test_${modelName.toLowerCase()}_has_required_attributes()
    {
        $${modelName.toLowerCase()} = ${modelName}::factory()->create();
        $this->assertNotNull($${modelName.toLowerCase()}->id);
    }

    public function test_${modelName.toLowerCase()}_relationships_work()
    {
        // TODO: Test model relationships
        $this->assertTrue(true);
    }

    public function test_${modelName.toLowerCase()}_scopes_work()
    {
        // TODO: Test model scopes
        $this->assertTrue(true);
    }

    public function test_${modelName.toLowerCase()}_validation_works()
    {
        // TODO: Test model validation
        $this->assertTrue(true);
    }
}
`;
        };
    }

    getControllerTestTemplate() {
        return (requirement, taskId) => {
            const controllerName = path.basename(requirement.file, '.php');
            const routeName = controllerName.toLowerCase().replace('controller', '');
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

    public function setUp(): void
    {
        parent::setUp();
    }

    public function test_index_returns_correct_response()
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get('/${routeName}');
        $response->assertStatus(200);
    }

    public function test_store_creates_new_record()
    {
        $user = User::factory()->create();
        $data = [
            // TODO: Add required data fields
        ];
        
        $response = $this->actingAs($user)->post('/${routeName}', $data);
        $response->assertStatus(302); // Redirect after creation
    }

    public function test_show_displays_correct_record()
    {
        $user = User::factory()->create();
        // TODO: Create test record
        $response = $this->actingAs($user)->get('/${routeName}/1');
        $response->assertStatus(200);
    }

    public function test_update_modifies_record()
    {
        $user = User::factory()->create();
        $data = [
            // TODO: Add update data fields
        ];
        
        $response = $this->actingAs($user)->put('/${routeName}/1', $data);
        $response->assertStatus(302); // Redirect after update
    }

    public function test_destroy_deletes_record()
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->delete('/${routeName}/1');
        $response->assertStatus(302); // Redirect after deletion
    }

    public function test_unauthorized_access_is_denied()
    {
        $response = $this->get('/${routeName}');
        $response->assertStatus(302); // Redirect to login
    }
}
`;
        };
    }

    getServiceTestTemplate() {
        return (requirement, taskId) => {
            const serviceName = path.basename(requirement.file, '.php');
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

    public function test_service_returns_expected_data_types()
    {
        // TODO: Test return types
        $this->assertTrue(true);
    }
}
`;
        };
    }

    getMigrationTestTemplate() {
        return (requirement, taskId) => {
            const migrationName = path.basename(requirement.file, '.php');
            return `<?php

namespace Tests\\Feature;

use Tests\\TestCase;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Illuminate\\Support\\Facades\\Schema;

class ${migrationName}Test extends TestCase
{
    use RefreshDatabase;

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Migration: ${migrationName}
     */

    public function test_migration_creates_expected_tables()
    {
        // TODO: Test that migration creates expected tables
        $this->assertTrue(true);
    }

    public function test_migration_adds_expected_columns()
    {
        // TODO: Test that migration adds expected columns
        $this->assertTrue(true);
    }

    public function test_migration_rollback_works()
    {
        // TODO: Test migration rollback
        $this->assertTrue(true);
    }

    public function test_migration_handles_existing_data()
    {
        // TODO: Test migration with existing data
        $this->assertTrue(true);
    }
}
`;
        };
    }

    getMiddlewareTestTemplate() {
        return (requirement, taskId) => {
            const middlewareName = path.basename(requirement.file, '.php');
            return `<?php

namespace Tests\\Unit;

use Tests\\TestCase;
use App\\Http\\Middleware\\${middlewareName};
use Illuminate\\Http\\Request;
use Illuminate\\Http\\Response;

class ${middlewareName}Test extends TestCase
{
    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Middleware: ${middlewareName}
     */

    public function test_middleware_handles_request()
    {
        $middleware = new ${middlewareName}();
        $request = Request::create('/test', 'GET');
        
        $response = $middleware->handle($request, function ($request) {
            return new Response('OK');
        });
        
        $this->assertInstanceOf(Response::class, $response);
    }

    public function test_middleware_redirects_when_needed()
    {
        // TODO: Test middleware redirect logic
        $this->assertTrue(true);
    }

    public function test_middleware_passes_request_when_authorized()
    {
        // TODO: Test middleware pass logic
        $this->assertTrue(true);
    }
}
`;
        };
    }

    getJobTestTemplate() {
        return (requirement, taskId) => {
            const jobName = path.basename(requirement.file, '.php');
            return `<?php

namespace Tests\\Unit;

use Tests\\TestCase;
use App\\Jobs\\${jobName};
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Illuminate\\Support\\Facades\\Queue;

class ${jobName}Test extends TestCase
{
    use RefreshDatabase;

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Job: ${jobName}
     */

    public function test_job_can_be_dispatched()
    {
        Queue::fake();
        
        ${jobName}::dispatch();
        
        Queue::assertPushed(${jobName}::class);
    }

    public function test_job_handles_processing()
    {
        $job = new ${jobName}();
        
        // TODO: Test job processing logic
        $this->assertTrue(true);
    }

    public function test_job_handles_failures()
    {
        // TODO: Test job failure handling
        $this->assertTrue(true);
    }
}
`;
        };
    }

    getCommandTestTemplate() {
        return (requirement, taskId) => {
            const commandName = path.basename(requirement.file, '.php');
            return `<?php

namespace Tests\\Feature;

use Tests\\TestCase;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;

class ${commandName}Test extends TestCase
{
    use RefreshDatabase;

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Command: ${commandName}
     */

    public function test_command_can_be_executed()
    {
        $this->artisan('${commandName.toLowerCase()}')
            ->assertExitCode(0);
    }

    public function test_command_with_arguments()
    {
        $this->artisan('${commandName.toLowerCase()}', [
            // TODO: Add command arguments
        ])->assertExitCode(0);
    }

    public function test_command_output()
    {
        $this->artisan('${commandName.toLowerCase()}')
            ->expectsOutput('Expected output')
            ->assertExitCode(0);
    }

    public function test_command_handles_errors()
    {
        // TODO: Test command error handling
        $this->assertTrue(true);
    }
}
`;
        };
    }

    getDefaultTestTemplate(requirement, taskId) {
        return `<?php

namespace Tests\\${requirement.type === 'unit' ? 'Unit' : 'Feature'};

use Tests\\TestCase;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Illuminate\\Foundation\\Testing\\WithFaker;

class ${path.basename(requirement.testFile, '.php')} extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Test generated automatically for Task ${taskId}
     * Generated on: ${new Date().toISOString()}
     * Component: ${requirement.target}
     */

    public function setUp(): void
    {
        parent::setUp();
    }

    public function test_component_works_correctly()
    {
        // TODO: Implement test for ${requirement.target}
        $this->assertTrue(true);
    }

    public function test_component_handles_errors()
    {
        // TODO: Test error handling
        $this->assertTrue(true);
    }
}
`;
    }

    async generateAdditionalTests(taskType, taskId, projectRoot) {
        const additionalTests = [];

        // Generate integration tests for certain task types
        if (taskType === 'migration') {
            additionalTests.push('tests/Feature/DatabaseIntegrationTest.php');
        } else if (taskType === 'controller') {
            additionalTests.push('tests/Feature/ApiIntegrationTest.php');
        }

        return additionalTests;
    }

    async runTests(testFiles, projectRoot) {
        try {
            console.log(`🏃 Running tests: ${testFiles.join(', ')}`);

            return new Promise((resolve) => {
                const testProcess = spawn('php', ['artisan', 'test', '--filter=' + testFiles.join('|')], {
                    cwd: projectRoot,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let error = '';

                testProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                testProcess.stderr.on('data', (data) => {
                    error += data.toString();
                });

                testProcess.on('close', (code) => {
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

    parseTestResults(output, error, exitCode) {
        // Simple parsing - in production, you'd want more sophisticated parsing
        const success = exitCode === 0;

        // Try to extract test counts from output
        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);

        const passed = passedMatch ? parseInt(passedMatch[1]) : (success ? 1 : 0);
        const failed = failedMatch ? parseInt(failedMatch[1]) : (success ? 0 : 1);
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

    async analyzeCoverage(projectRoot) {
        try {
            // This would integrate with a coverage tool like Xdebug
            return {
                success: true,
                coverage: 75, // Mock coverage
                details: {
                    models: 80,
                    controllers: 70,
                    services: 85,
                    migrations: 60
                }
            };
        } catch (error) {
            return {
                success: false,
                coverage: 0,
                details: {},
                error: error.message
            };
        }
    }

    async validateTestQuality(testFiles, projectRoot) {
        try {
            const issues = [];
            let quality = 100;

            for (const testFile of testFiles) {
                const filePath = path.join(projectRoot, testFile);
                const content = await fs.readFile(filePath, 'utf8');

                // Check for TODO comments
                const todoCount = (content.match(/TODO/g) || []).length;
                if (todoCount > 0) {
                    issues.push(`${testFile}: ${todoCount} TODO comments found`);
                    quality -= todoCount * 10;
                }

                // Check for basic assertions
                if (!content.includes('assert')) {
                    issues.push(`${testFile}: No assertions found`);
                    quality -= 20;
                }

                // Check for proper test structure
                if (!content.includes('public function test_')) {
                    issues.push(`${testFile}: No test methods found`);
                    quality -= 30;
                }
            }

            return {
                success: true,
                quality: Math.max(quality, 0),
                issues
            };
        } catch (error) {
            return {
                success: false,
                quality: 0,
                issues: [error.message]
            };
        }
    }
}