#!/bin/bash

# Track Edits Task 3: Change Detection Validation Executor
# Executes comprehensive validation of the Million Monkeys Typing approach

set -e

echo "🚀 Track Edits Task 3: Change Detection Validation"
echo "================================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse command line arguments
TEST_TYPE="${1:-full}"
AUTOMATED="${2:-false}"

echo "📋 Configuration:"
echo "  Test Type: $TEST_TYPE"
echo "  Automated: $AUTOMATED"
echo "  Script Directory: $SCRIPT_DIR"
echo ""

# Set environment variables
export DEBUG="${DEBUG:-false}"
export AUTOMATED="$AUTOMATED"

echo "🔧 Starting validation runner..."
echo ""

# Execute the validation
if [ "$AUTOMATED" = "true" ]; then
    echo "🤖 Running in automated mode..."
    node run-change-detection-validation.js "$TEST_TYPE"
else
    echo "👤 Running in interactive mode..."
    node run-change-detection-validation.js "$TEST_TYPE"
fi

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Task 3 validation setup completed successfully"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open Obsidian with Track Edits plugin enabled"
    echo "2. Open a markdown file to edit"
    echo "3. Open Developer Tools (Cmd/Ctrl + Shift + I)" 
    echo "4. Run the generated injection script in the console"
    echo ""
    echo "📊 Results will be saved in the generated output directory"
    echo "📄 Check CHANGE-DETECTION-VALIDATION.md for detailed instructions"
else
    echo "❌ Task 3 validation setup failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
fi