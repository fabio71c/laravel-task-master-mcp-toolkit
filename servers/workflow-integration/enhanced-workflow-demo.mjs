#!/usr/bin/env node

/**
 * Enhanced Workflow Demo with Test Generation
 * 
 * This script demonstrates the enhanced Task Master AI workflow
 * that includes automatic test generation.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';

class EnhancedWorkflowDemo {
    constructor() {
        this.projectRoot = process.cwd();
    }

    async callTaskMasterTool(toolName, params = {}) {
        return new Promise((resolve, reject) => {
            const taskMasterProcess = spawn('npx', ['task-master-ai', toolName, ...this.paramsToArgs(params)], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';

            taskMasterProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            taskMasterProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            taskMasterProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output, error });
                } else {
                    reject(new Error(`Task Master command failed: ${error}`));
                }
            });
        });
    }

    paramsToArgs(params) {
        const args = [];
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'boolean') {
                if (value) args.push(`--${key}`);
            } else if (Array.isArray(value)) {
                args.push(`--${key}`, value.join(','));
            } else {
                args.push(`--${key}`, value.toString());
            }
        }
        return args;
    }

    async callTestGenerationTool(toolName, params = {}) {
        return new Promise((resolve, reject) => {
            const testProcess = spawn('node', ['mcp-test-generation-server.mjs'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const request = {
                jsonrpc: "2.0",
                id: Date.now(),
                method: "tools/call",
                params: {
                    name: toolName,
                    arguments: params
                }
            };

            let output = '';
            let error = '';

            testProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            testProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const response = JSON.parse(output);
                        resolve(response.result);
                    } catch (e) {
                        reject(new Error('Failed to parse test generation response'));
                    }
                } else {
                    reject(new Error(`Test generation failed: ${error}`));
                }
            });

            testProcess.stdin.write(JSON.stringify(request) + '\n');
            testProcess.stdin.end();
        });
    }

    async demonstrateEnhancedWorkflow() {
        console.log('🎬 Enhanced Task Master AI Workflow Demo');
        console.log('='.repeat(50));
        console.log('This demo shows the enhanced workflow with automatic test generation');
        console.log('');

        try {
            // Step 1: Show current task status
            console.log('📋 Step 1: Current Task Status');
            console.log('Getting current tasks...');

            const tasksResult = await this.callTaskMasterTool('get-tasks');
            console.log('✅ Tasks retrieved successfully');
            console.log('');

            // Step 2: Simulate completing a task (Task 15 - Add date-updated field)
            console.log('🎯 Step 2: Simulating Task Completion');
            console.log('Task 15: Add date-updated field to database tasks');
            console.log('');

            // Step 3: Generate tests for the completed task
            console.log('🧪 Step 3: Automatic Test Generation');
            console.log('Generating tests for Task 15...');

            const testResult = await this.callTestGenerationTool('generate_tests_for_task', {
                taskId: '15',
                taskType: 'migration',
                changedFiles: [
                    'database/migrations/2025_07_18_175459_add_date_updated_to_tasks_table.php',
                    'app/Models/Task.php',
                    'app/Observers/TaskObserver.php'
                ],
                projectRoot: this.projectRoot
            });

            if (testResult.success) {
                console.log(`✅ Tests generated successfully!`);
                console.log(`📁 Test files: ${testResult.testFiles.join(', ')}`);
                console.log(`📊 Estimated coverage: ${testResult.coverage}%`);
                console.log('');

                // Step 4: Run the generated tests
                console.log('🏃 Step 4: Running Generated Tests');
                console.log('Executing tests...');

                const runResult = await this.callTestGenerationTool('run_tests', {
                    testFiles: testResult.testFiles,
                    projectRoot: this.projectRoot
                });

                if (runResult.success) {
                    console.log(`✅ All tests passed!`);
                    console.log(`📈 Test results: ${runResult.passed}/${runResult.total} passed`);
                    console.log(`📊 Coverage: ${runResult.coverage}%`);
                    console.log('');

                    // Step 5: Validate test quality
                    console.log('🔍 Step 5: Test Quality Validation');
                    console.log('Validating test quality...');

                    const qualityResult = await this.callTestGenerationTool('validate_test_quality', {
                        testFiles: testResult.testFiles,
                        projectRoot: this.projectRoot
                    });

                    console.log(`📊 Test quality score: ${qualityResult.quality}%`);
                    if (qualityResult.issues.length > 0) {
                        console.log(`⚠️  Issues found:`);
                        qualityResult.issues.forEach(issue => console.log(`   - ${issue}`));
                    } else {
                        console.log(`✅ No quality issues found`);
                    }
                    console.log('');

                    // Step 6: Update task status to done
                    console.log('✅ Step 6: Task Completion');
                    console.log('All tests passed - task can be marked as done');
                    console.log('Use: task-master set-status -i 15 -s done');
                    console.log('');

                } else {
                    console.log(`❌ Some tests failed: ${runResult.failed}/${runResult.total}`);
                    console.log(`🔧 Test fixes needed before marking task complete`);
                    console.log('');
                }
            } else {
                console.log(`❌ Test generation failed: ${testResult.error}`);
                console.log('');
            }

            // Step 7: Show enhanced workflow summary
            console.log('📊 Enhanced Workflow Summary');
            console.log('='.repeat(30));
            console.log('✅ Schema generation (existing)');
            console.log('✅ Test generation (NEW)');
            console.log('✅ Test execution (NEW)');
            console.log('✅ Quality validation (NEW)');
            console.log('✅ Coverage tracking (NEW)');
            console.log('✅ Task completion only after tests pass (NEW)');
            console.log('');
            console.log('🎉 Enhanced workflow successfully demonstrated!');
            console.log('');
            console.log('💡 Benefits of the enhanced workflow:');
            console.log('   - Automatic test coverage for all new features');
            console.log('   - Quality assurance built into the workflow');
            console.log('   - No features can be marked "done" without tests');
            console.log('   - Improved code reliability and maintainability');

        } catch (error) {
            console.error('❌ Demo failed:', error.message);
            process.exit(1);
        }
    }

    async showWorkflowComparison() {
        console.log('\n🔄 Workflow Comparison');
        console.log('='.repeat(30));
        console.log('');
        console.log('📋 BEFORE (Current Workflow):');
        console.log('   1. Complete feature implementation');
        console.log('   2. Mark task as "done"');
        console.log('   3. (Optional) Manual test creation');
        console.log('');
        console.log('📋 AFTER (Enhanced Workflow):');
        console.log('   1. Complete feature implementation');
        console.log('   2. 🔄 Automatic test generation');
        console.log('   3. 🏃 Automatic test execution');
        console.log('   4. 🔍 Test quality validation');
        console.log('   5. 📊 Coverage tracking');
        console.log('   6. ✅ Mark task as "done" (only if tests pass)');
        console.log('');
        console.log('🎯 Key Improvements:');
        console.log('   - ✅ Guaranteed test coverage');
        console.log('   - ✅ Quality gates built-in');
        console.log('   - ✅ No manual test creation needed');
        console.log('   - ✅ Consistent test patterns');
        console.log('   - ✅ Better code reliability');
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const demo = new EnhancedWorkflowDemo();

    if (args.length === 0) {
        await demo.demonstrateEnhancedWorkflow();
        await demo.showWorkflowComparison();
    } else {
        const command = args[0];
        switch (command) {
            case 'demo':
                await demo.demonstrateEnhancedWorkflow();
                break;
            case 'comparison':
                await demo.showWorkflowComparison();
                break;
            default:
                console.log('Usage: node enhanced-workflow-demo.mjs [demo|comparison]');
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

export { EnhancedWorkflowDemo };