#!/usr/bin/env node

/**
 * View Workflow Log Script
 * 
 * Simple script to view and analyze workflow logs
 */

import fs from "fs/promises";
import path from "path";

async function viewWorkflowLog() {
    const logFile = ".taskmaster/workflow.log";
    
    try {
        const content = await fs.readFile(logFile, "utf8");
        const lines = content.trim().split("
");
        
        if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
            console.log("📝 No workflow logs found yet.");
            console.log("Run some tasks to generate logs!");
            return;
        }
        
        console.log("📋 Workflow Log Analysis");
        console.log("=".repeat(50));
        
        // Parse all log entries
        const logs = lines
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return null;
                }
            })
            .filter(entry => entry !== null);
        
        // Group by task
        const tasks = {};
        logs.forEach(log => {
            if (log.taskId) {
                if (!tasks[log.taskId]) {
                    tasks[log.taskId] = [];
                }
                tasks[log.taskId].push(log);
            }
        });
        
        // Display recent tasks
        const taskIds = Object.keys(tasks).slice(-5); // Last 5 tasks
        
        console.log(`📊 Recent Tasks (${taskIds.length}):`);
        console.log("");
        
        taskIds.forEach(taskId => {
            const taskLogs = tasks[taskId];
            const taskStart = taskLogs.find(log => log.type === "task-start");
            const taskEnd = taskLogs.find(log => log.type === "task-end");
            const toolCalls = taskLogs.filter(log => log.type === "tool-call");
            
            if (taskStart) {
                console.log(`🎯 Task ${taskId} (${taskStart.taskType})`);
                console.log(`   Started: ${new Date(taskStart.timestamp).toLocaleString()}`);
                
                if (taskEnd) {
                    const status = taskEnd.success ? "✅ Completed" : "❌ Failed";
                    console.log(`   Status: ${status}`);
                    console.log(`   Ended: ${new Date(taskEnd.timestamp).toLocaleString()}`);
                } else {
                    console.log(`   Status: 🔄 In Progress`);
                }
                
                console.log(`   Tool Calls: ${toolCalls.length}`);
                const successfulCalls = toolCalls.filter(call => call.success).length;
                console.log(`   Success Rate: ${successfulCalls}/${toolCalls.length}`);
                console.log("");
            }
        });
        
        // Overall statistics
        const allToolCalls = logs.filter(log => log.type === "tool-call");
        const allTasks = logs.filter(log => log.type === "task-start");
        const completedTasks = logs.filter(log => log.type === "task-end" && log.success);
        
        console.log("📈 Overall Statistics:");
        console.log(`   Total Tasks: ${allTasks.length}`);
        console.log(`   Completed Tasks: ${completedTasks.length}`);
        console.log(`   Total Tool Calls: ${allToolCalls.length}`);
        console.log(`   Successful Tool Calls: ${allToolCalls.filter(call => call.success).length}`);
        
        const avgDuration = allToolCalls.length > 0 
            ? Math.round(allToolCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / allToolCalls.length)
            : 0;
        console.log(`   Average Tool Call Duration: ${avgDuration}ms`);
        console.log("=".repeat(50));
        
    } catch (error) {
        if (error.code === "ENOENT") {
            console.log("📝 No workflow log file found.");
            console.log("Run some tasks to generate logs!");
        } else {
            console.error("❌ Error reading workflow log:", error.message);
        }
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case "view":
        case undefined:
            await viewWorkflowLog();
            break;
        case "help":
            console.log("Workflow Log Viewer");
            console.log("Usage:");
            console.log("  node view-workflow-log.js view    # View recent logs");
            console.log("  node view-workflow-log.js help    # Show this help");
            break;
        default:
            console.log("Unknown command. Use \"help\" for usage information.");
            break;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
