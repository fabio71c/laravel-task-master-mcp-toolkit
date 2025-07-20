# Workflow Logging System

This document explains the simple workflow logging system for Task Master AI MCP Toolkit.

## 🎯 Overview

The workflow logging system tracks tool calls and task completion with minimal overhead. It automatically displays a summary at the end of each task.

## 📋 Features

### **✅ Simple & Lightweight**
- **Minimal overhead** - Only logs essential information
- **Automatic display** - Shows summary at task completion
- **JSON format** - Easy to parse and analyze
- **File-based** - Stored in `.taskmaster/workflow.log`

### **✅ What Gets Logged**
- **Tool calls** - Name, success/failure, duration, errors
- **Task lifecycle** - Start, end, success/failure
- **Workflow steps** - Generate tests, run tests, update schemas
- **Performance metrics** - Duration tracking

### **✅ Automatic Summary**
- **Task status** - Success/failure with issues
- **Tool call list** - All tools called during task
- **Workflow steps** - Steps completed
- **Statistics** - Total calls, success rate, average duration

## 🛠️ Usage

### **Automatic Logging**

The logging happens automatically when you use the Laravel workflow integration:

```bash
# Complete a task (logging happens automatically)
node laravel-workflow-integration.mjs complete-task 15 controller app/Http/Controllers/TaskController.php
```

### **Manual Logging**

You can also use the logger directly in your scripts:

```javascript
import { logger } from "./simple-workflow-logger.mjs";

// Initialize logger
await logger.initialize();

// Log task start
await logger.logTaskStart(15, "controller");

// Log tool calls
await logger.logToolCall("php artisan test", true, 1500);
await logger.logToolCall("php artisan make:controller", false, 200, new Error("File exists"));

// Log workflow steps
await logger.logWorkflowStep("generate-tests", { taskId: 15, type: "controller" });

// Log task end (automatically shows summary)
await logger.logTaskEnd(15, true, { testResult: true, coverage: 85 });
```

## 📊 Log Format

### **Tool Call Log Entry**
```json
{
  "timestamp": "2025-07-19T23:45:12.123Z",
  "type": "tool-call",
  "toolName": "php artisan test",
  "success": true,
  "duration": 1500,
  "error": null
}
```

### **Task Start Log Entry**
```json
{
  "timestamp": "2025-07-19T23:45:10.000Z",
  "type": "task-start",
  "taskId": 15,
  "taskType": "controller"
}
```

### **Task End Log Entry**
```json
{
  "timestamp": "2025-07-19T23:45:15.000Z",
  "type": "task-end",
  "taskId": 15,
  "success": true,
  "summary": {
    "testResult": true,
    "coverage": 85,
    "filesChanged": 1
  }
}
```

## 📋 Task Summary Display

At the end of each task, you will see a summary like this:

```
📋 Task Workflow Summary
========================================
Task ID: 15
Task Type: controller
Status: ✅ Completed successfully

🛠️  Tool Calls:
   ✅ php artisan test (1500ms)
   ✅ php artisan route:list (200ms)
   ❌ php artisan make:controller (100ms) - File exists

🔄 Workflow Steps:
   📝 generate-tests
      taskId: 15
      type: controller
   📝 run-tests
   📝 check-coverage
   📝 update-schemas

📊 Summary:
   Total Tool Calls: 3
   Successful: 2
   Failed: 1
   Average Duration: 600ms
========================================
```

## 🔍 Viewing Logs

### **View Recent Logs**
```bash
node scripts/view-workflow-log.js
```

This shows:
- **Recent tasks** (last 5)
- **Task status** and timing
- **Tool call statistics**
- **Overall performance metrics**

## 🎯 Integration with Laravel Workflow

The logging is automatically integrated into the Laravel workflow:

### **1. Task Start**
```javascript
await logger.logTaskStart(taskId, taskType);
```

### **2. Tool Call Logging**
```javascript
// Wraps all Laravel commands
await logger.logToolCall(`${command} ${args.join(" ")}`, true, duration);
```

### **3. Workflow Steps**
```javascript
await logger.logWorkflowStep("generate-tests", { taskId, taskType, files });
await logger.logWorkflowStep("run-tests");
await logger.logWorkflowStep("check-coverage");
await logger.logWorkflowStep("update-schemas");
```

### **4. Task End**
```javascript
await logger.logTaskEnd(taskId, true, {
    testResult: testResult.success,
    coverage: coverageResult.coverage || 0,
    filesChanged: changedFiles.length
});
```

## 🎉 Benefits

### **✅ Debugging**
- **Track tool failures** - See which tools failed and why
- **Performance analysis** - Identify slow tools
- **Workflow issues** - See where tasks get stuck

### **✅ Monitoring**
- **Success rates** - Track tool call success rates
- **Task completion** - Monitor task completion rates
- **Performance trends** - Track average durations

### **✅ Development**
- **Workflow optimization** - Identify bottlenecks
- **Error patterns** - Find common failure points
- **Tool reliability** - Monitor tool stability
