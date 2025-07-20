const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8932;

// For testing purposes - in production, use environment variables
const TEST_API_KEY = 'test-api-key-123';

// Security middleware
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:8931',
    methods: ['GET', 'POST']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Request validation middleware
const validateRequest = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || !isValidApiKey(apiKey)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

function isValidApiKey(apiKey) {
    return apiKey === TEST_API_KEY;
}

// Identify the type of coding task
function identifyTaskType(prompt) {
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('debug') || promptLower.includes('fix') || promptLower.includes('error')) {
        return 'debugging';
    }
    if (promptLower.includes('implement') || promptLower.includes('create') || promptLower.includes('build')) {
        return 'implementation';
    }
    if (promptLower.includes('optimize') || promptLower.includes('improve') || promptLower.includes('performance')) {
        return 'optimization';
    }
    if (promptLower.includes('refactor') || promptLower.includes('restructure')) {
        return 'refactoring';
    }
    if (promptLower.includes('test') || promptLower.includes('unit test') || promptLower.includes('testing')) {
        return 'testing';
    }
    return 'analysis'; // Default type
}

// Generate task-specific thinking steps
function generateThinkingSteps(taskType, prompt, context) {
    const steps = [];

    // Common initial steps for all tasks
    steps.push({
        thought: "Understanding the Request",
        reasoning: `Analyzing the ${taskType} task: "${prompt}"`,
        category: "analysis"
    });

    if (context) {
        steps.push({
            thought: "Context Analysis",
            reasoning: `Examining provided context: ${context}`,
            category: "context"
        });
    }

    // Task-specific steps
    switch (taskType) {
        case 'debugging':
            steps.push({
                thought: "Error Pattern Recognition",
                reasoning: "Identifying potential error patterns and their common causes",
                category: "analysis"
            }, {
                thought: "Code Path Analysis",
                reasoning: "Tracing the execution path to locate the source of the issue",
                category: "investigation"
            }, {
                thought: "Solution Strategy",
                reasoning: "Developing a systematic approach to fix the identified issues",
                category: "planning"
            });
            break;

        case 'implementation':
            steps.push({
                thought: "Requirements Analysis",
                reasoning: "Breaking down the implementation requirements into concrete tasks",
                category: "planning"
            }, {
                thought: "Architecture Planning",
                reasoning: "Designing the structure and component relationships",
                category: "design"
            }, {
                thought: "Implementation Strategy",
                reasoning: "Planning the implementation sequence and potential challenges",
                category: "planning"
            });
            break;

        case 'optimization':
            steps.push({
                thought: "Performance Analysis",
                reasoning: "Identifying current performance bottlenecks and inefficiencies",
                category: "analysis"
            }, {
                thought: "Optimization Opportunities",
                reasoning: "Evaluating potential optimization strategies and their trade-offs",
                category: "planning"
            }, {
                thought: "Implementation Impact",
                reasoning: "Assessing the impact of proposed optimizations on the existing system",
                category: "evaluation"
            });
            break;

        case 'refactoring':
            steps.push({
                thought: "Code Quality Assessment",
                reasoning: "Evaluating current code structure and identifying improvement areas",
                category: "analysis"
            }, {
                thought: "Refactoring Strategy",
                reasoning: "Planning the refactoring approach while maintaining functionality",
                category: "planning"
            }, {
                thought: "Risk Assessment",
                reasoning: "Identifying potential risks and mitigation strategies",
                category: "evaluation"
            });
            break;

        case 'testing':
            steps.push({
                thought: "Test Scope Definition",
                reasoning: "Defining the scope and objectives of the testing effort",
                category: "planning"
            }, {
                thought: "Test Strategy",
                reasoning: "Designing test cases and coverage requirements",
                category: "design"
            }, {
                thought: "Implementation Plan",
                reasoning: "Planning the test implementation and execution approach",
                category: "implementation"
            });
            break;

        default: // analysis
            steps.push({
                thought: "Code Analysis",
                reasoning: "Analyzing the current codebase structure and patterns",
                category: "analysis"
            }, {
                thought: "Impact Assessment",
                reasoning: "Evaluating the implications of potential changes",
                category: "evaluation"
            });
    }

    // Common final steps
    steps.push({
        thought: "Action Plan",
        reasoning: "Formulating concrete next steps based on the analysis",
        category: "conclusion"
    });

    return steps;
}

// Sequential thinking endpoint
app.post('/think', validateRequest, express.json(), async(req, res) => {
    try {
        const { prompt, context } = req.body;

        // Validate input
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Invalid prompt' });
        }

        // Identify the type of task
        const taskType = identifyTaskType(prompt);

        // Generate thinking steps
        const steps = generateThinkingSteps(taskType, prompt, context);

        // Generate conclusion based on task type and steps
        const conclusion = {
            taskType,
            summary: `Analysis complete for ${taskType} task: "${prompt}"`,
            nextSteps: "Ready to proceed with implementation based on the analyzed steps",
            recommendedApproach: `Follow the ${steps.length} step process outlined above, focusing on ${steps[steps.length - 2].category} and ${steps[steps.length - 1].category}`
        };

        res.json({
            response: {
                taskType,
                steps,
                conclusion
            }
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a test endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Sequential thinking MCP server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, () => {
    console.log(`Secure Sequential Thinking MCP server running on port ${port}`);
    console.log(`Test API Key: ${TEST_API_KEY}`);
});