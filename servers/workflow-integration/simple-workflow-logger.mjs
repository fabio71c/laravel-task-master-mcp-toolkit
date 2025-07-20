#!/usr/bin/env node

/**
 * Simple Workflow Logger for Task Master AI
 * 
 * Tracks tool calls and task completion with minimal overhead.
 * Automatically displays log at the end of each task.
 */

import fs from "fs/promises";
import path from "path";

class SimpleWorkflowLogger {
    constructor() {
        this.logFile = ".taskmaster/workflow.log";
        this.currentTask = null;
        this.taskLogs = [];
    }

    async initialize() {
        try {
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
        } catch (error) {
            // Ignore directory creation errors
        }
    }

    async logToolCall(toolName, success, duration = 0, error = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: "tool-call",
            toolName,
            success,
            duration,
            error: error ? error.message : null
        };

        this.taskLogs.push(logEntry);
        await this.writeToFile(logEntry);
    }

    async logTaskStart(taskId, taskType) {
        this.currentTask = { id: taskId, type: taskType };
        this.taskLogs = []; // Reset for new task

        const logEntry = {
            timestamp: new Date().toISOString(),
            type: "task-start",
            taskId,
            taskType
        };

        this.taskLogs.push(logEntry);
        await this.writeToFile(logEntry);
    }

    async logTaskEnd(taskId, success, summary = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: "task-end",
            taskId,
            success,
            summary
        };

        this.taskLogs.push(logEntry);
        await this.writeToFile(logEntry);

        // Display task summary
        await this.displayTaskSummary();
    }

    async logWorkflowStep(step, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: "workflow-step",
            step,
            details
        };

        this.taskLogs.push(logEntry);
        await this.writeToFile(logEntry);
    }

    async writeToFile(logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + "
";
            await fs.appendFile(this.logFile, logLine);
        } catch (error) {
            console.warn("Failed to write to log file:", error.message);
        }
    }

    async displayTaskSummary() {
        if (!this.currentTask) return;

        console.log("
�� Task Workflow Summary");
        console.log("=".repeat(40));
        console.log(`Task ID: ${this.currentTask.id}`);
        console.log(`Task Type: ${this.currentTask.type}`);
        console.log(`Status: ${this.getTaskStatus()}`);
        console.log("");

        // Group logs by type
        const toolCalls = this.taskLogs.filter(log => log.type === "tool-call");
        const workflowSteps = this.taskLogs.filter(log => log.type === "workflow-step");

        if (toolCalls.length > 0) {
            console.log("🛠️  Tool Calls:");
            toolCalls.forEach(call => {
                const status = call.success ? "✅" : "❌";
                const duration = call.duration ? ` (${call.duration}ms)` : "";
                const error = call.error ? ` - ${call.error}` : "";
                console.log(`   ${status} ${call.toolName}${duration}${error}`);
            });
            console.log("");
        }

        if (workflowSteps.length > 0) {
            console.log("🔄 Workflow Steps:");
            workflowSteps.forEach(step => {
                console.log(`   📝 ${step.step}`);
                if (step.details && Object.keys(step.details).length > 0) {
                    Object.entries(step.details).forEach(([key, value]) => {
                        console.log(`      ${key}: ${value}`);
                    });
                }
            });
            console.log("");
        }

        // Summary statistics
        const totalCalls = toolCalls.length;
        const successfulCalls = toolCalls.filter(call => call.success).length;
        const failedCalls = totalCalls - successfulCalls;
        const avgDuration = toolCalls.length > 0 
            ? Math.round(toolCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / toolCalls.length)
            : 0;

        console.log("📊 Summary:");
        console.log(`   Total Tool Calls: ${totalCalls}`);
        console.log(`   Successful: ${successfulCalls}`);
        console.log(`   Failed: ${failedCalls}`);
        console.log(`   Average Duration: ${avgDuration}ms`);
        console.log("=".repeat(40));
        console.log("");
    }

    getTaskStatus() {
        const failedCalls = this.taskLogs.filter(log => 
            log.type === "tool-call" && !log.success
        );
        return failedCalls.length > 0 ? "⚠️  Completed with issues" : "✅ Completed successfully";
    }
}

// Create singleton instance
const logger = new SimpleWorkflowLogger();

export { SimpleWorkflowLogger, logger };
