/**
 * ESLint configuration file for the Node.js server application
 * Defines linting rules and settings to maintain code quality and consistency
 * 
 * @version eslint 8.52.0
 */

module.exports = {
    // Environment settings
    env: {
        node: true,
        es6: true
    },
    
    // Parser options
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    
    // Extend ESLint recommended rules as the base
    extends: 'eslint:recommended',
    
    // Custom rule configurations
    rules: {
        // Warn about console statements (helpful for development but should be removed/replaced in production)
        'no-console': 'warn',
        
        // Warn about unused variables - helps identify dead code
        'no-unused-vars': 'warn',
        
        // Warn about undefined variables - helps catch typos and missing imports
        'no-undef': 'warn',
        
        // Style rules for consistency
        'semi': ['error', 'always'],           // Always require semicolons
        'quotes': ['error', 'single'],         // Use single quotes for strings
        'indent': ['error', 4],                // Use 4 spaces for indentation
        'object-curly-spacing': ['error', 'always'],  // Require spaces inside object literals
        'array-bracket-spacing': ['error', 'never']   // No spaces inside array literals
    }
};