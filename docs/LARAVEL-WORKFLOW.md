# Laravel Workflow Settings

This document explains the custom workflow settings for Laravel development with Task Master AI.

## 🎯 Overview

The Laravel workflow integration provides Laravel-specific automation including:
- **Laravel test generation** using PHPUnit
- **Laravel schema generation** for database and API documentation
- **Laravel-specific quality gates** and coverage requirements
- **Laravel artisan command integration**

## 📋 Configuration Files

### **laravel-workflow-config.json**

This is the main configuration file for Laravel workflow settings:

```json
{
  "laravelWorkflow": {
    "testGeneration": {
      "enabled": true,
      "frameworks": ["Laravel"],
      "testTypes": {
        "models": {
          "template": "tests/Unit/Models",
          "coverage": 80,
          "includeRelationships": true,
          "includeScopes": true,
          "includeValidation": true
        },
        "controllers": {
          "template": "tests/Feature/Controllers",
          "coverage": 70,
          "includeCRUD": true,
          "includeAuthorization": true,
          "includeValidation": true
        }
      },
      "qualityGates": {
        "minCoverage": 70,
        "requireTests": true,
        "failOnLowCoverage": true
      }
    }
  }
}
```

## 🔧 Test Generation Settings

### **Test Types**

| Type | Template Path | Coverage | Features |
|------|---------------|----------|----------|
| **Models** | `tests/Unit/Models` | 80% | Relationships, Scopes, Validation |
| **Controllers** | `tests/Feature/Controllers` | 70% | CRUD, Authorization, Validation |
| **Services** | `tests/Unit/Services` | 85% | Business Logic, Error Handling |
| **Middleware** | `tests/Unit/Middleware` | 75% | Request Handling, Redirects |
| **Jobs** | `tests/Unit/Jobs` | 80% | Processing, Failure Handling |
| **Commands** | `tests/Feature/Commands` | 70% | Execution, Output |

### **Quality Gates**

- **Minimum Coverage**: 70% (configurable)
- **Require Tests**: All new features must have tests
- **Fail on Low Coverage**: Prevents task completion if coverage is too low
- **Validate Test Quality**: Ensures tests are properly structured

## 🚀 Workflow Automation

### **Triggers**

| Trigger | Actions |
|---------|---------|
| **Task Completion** | Generate tests, update schemas, run tests, validate quality |
| **Migration Creation** | Update database schema, generate model tests |
| **Model Creation** | Generate model tests, update business logic schema |
| **Controller Creation** | Generate controller tests, update API schema |

### **Quality Assurance**

- **Run Tests Before Commit**: Ensures code quality
- **Check Coverage**: Monitors test coverage
- **Validate Schemas**: Ensures documentation is up-to-date
- **Prevent Low Quality Code**: Blocks commits with issues

## 🛠️ Laravel-Specific Settings

### **Artisan Commands**

```json
{
  "artisanCommands": {
    "testGeneration": "php artisan test",
    "migrationGeneration": "php artisan make:migration",
    "modelGeneration": "php artisan make:model",
    "controllerGeneration": "php artisan make:controller",
    "middlewareGeneration": "php artisan make:middleware",
    "jobGeneration": "php artisan make:job",
    "commandGeneration": "php artisan make:command"
  }
}
```

### **File Paths**

```json
{
  "filePaths": {
    "models": "app/Models",
    "controllers": "app/Http/Controllers",
    "services": "app/Services",
    "middleware": "app/Http/Middleware",
    "jobs": "app/Jobs",
    "commands": "app/Console/Commands",
    "tests": "tests",
    "migrations": "database/migrations",
    "routes": "routes"
  }
}
```

## 🎯 Usage Examples

### **Complete a Laravel Task**

```bash
# Complete a controller task
node laravel-workflow-integration.mjs complete-task 15 controller app/Http/Controllers/TaskController.php

# Complete a model task
node laravel-workflow-integration.mjs complete-task 16 model app/Models/Task.php
```

### **Generate Tests Only**

```bash
# Generate controller tests
node laravel-workflow-integration.mjs generate-tests 15 controller app/Http/Controllers/TaskController.php

# Generate model tests
node laravel-workflow-integration.mjs generate-tests 16 model app/Models/Task.php
```

### **Run Tests and Check Coverage**

```bash
# Run all tests
node laravel-workflow-integration.mjs run-tests

# Check coverage
node laravel-workflow-integration.mjs check-coverage
```

## 🎉 Benefits

### **✅ Laravel-Optimized**
- **PHPUnit integration** - Uses Laravel testing framework
- **Artisan commands** - Leverages Laravel CLI tools
- **Laravel conventions** - Follows Laravel best practices
- **Laravel file structure** - Respects Laravel directory organization

### **✅ Quality Assurance**
- **Automatic test generation** - Creates tests for all new features
- **Coverage monitoring** - Ensures adequate test coverage
- **Quality gates** - Prevents low-quality code from being committed
- **Schema validation** - Keeps documentation up-to-date

### **✅ Developer Experience**
- **Automated workflow** - Reduces manual testing work
- **Consistent patterns** - Ensures consistent test structure
- **Immediate feedback** - Tests run automatically on task completion
- **Clear documentation** - Automatic schema generation

## 🔗 Integration with Task Master AI

The Laravel workflow integrates seamlessly with Task Master AI:

1. **Task Completion** triggers Laravel workflow
2. **Test Generation** creates PHPUnit tests
3. **Quality Validation** ensures tests pass
4. **Schema Update** keeps documentation current
5. **Task Marked Done** only after all checks pass

This ensures that every Laravel feature has proper test coverage and documentation before being marked as complete.
