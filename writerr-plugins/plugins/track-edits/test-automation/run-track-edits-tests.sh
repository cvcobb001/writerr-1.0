#!/bin/bash

# Track Edits Comprehensive Test Suite Runner
# Transforms manual testing cycle into automated comprehensive reports
# Addresses critical pain point of days-long manual testing cycles

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
OUTPUT_DIR=".agent-os/test-sessions/$TIMESTAMP"
OBSIDIAN_PID=""
TEST_TIMEOUT=300  # 5 minutes
OBSIDIAN_VAULT_PATH="."
PLUGIN_DIR="$(pwd)"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    if [[ ! -z "$OBSIDIAN_PID" ]]; then
        log_info "Terminating Obsidian process (PID: $OBSIDIAN_PID)"
        kill "$OBSIDIAN_PID" 2>/dev/null || true
        sleep 2
        kill -9 "$OBSIDIAN_PID" 2>/dev/null || true
    fi
    
    # Kill any remaining Obsidian processes
    pkill -f "obsidian" 2>/dev/null || true
    
    log_info "Cleanup completed"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check if Obsidian is available (try common paths)
    OBSIDIAN_PATH=""
    if command -v obsidian &> /dev/null; then
        OBSIDIAN_PATH="obsidian"
    elif [[ -f "/Applications/Obsidian.app/Contents/MacOS/Obsidian" ]]; then
        OBSIDIAN_PATH="/Applications/Obsidian.app/Contents/MacOS/Obsidian"
    elif command -v flatpak &> /dev/null && flatpak list | grep -q obsidian; then
        OBSIDIAN_PATH="flatpak run md.obsidian.Obsidian"
    else
        log_error "Obsidian not found. Please install Obsidian or add it to your PATH"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
    log_info "Obsidian path: $OBSIDIAN_PATH"
}

# Build the plugin
build_plugin() {
    log_info "Building Track Edits plugin..."
    
    cd "$PLUGIN_DIR"
    
    # Check if build script exists in parent directory
    if [[ -f "../../package.json" ]]; then
        cd ../..
        npm run build:track-edits
        cd "$PLUGIN_DIR"
    elif [[ -f "../../../package.json" ]]; then
        cd ../../..
        npm run build:track-edits  
        cd "$PLUGIN_DIR"
    else
        log_warning "No build script found, assuming plugin is already built"
    fi
    
    # Verify main.js exists (check in plugin root directory)
    if [[ ! -f "../main.js" ]]; then
        log_error "Plugin build failed - main.js not found at ../main.js"
        exit 1
    fi
    
    log_success "Plugin built successfully"
}

# Start Obsidian in test mode
start_obsidian_test_mode() {
    log_info "Starting Obsidian in test mode..."
    
    # Create test configuration
    local test_config_dir="$OUTPUT_DIR/obsidian-config"
    mkdir -p "$test_config_dir"
    
    # Create minimal Obsidian config for testing
    cat > "$test_config_dir/app.json" <<EOF
{
  "pluginEnabledStatus": {
    "track-edits": true
  },
  "enabledPlugins": [
    "track-edits"
  ]
}
EOF

    # Start Obsidian with test configuration
    log_info "Launching Obsidian with vault: $OBSIDIAN_VAULT_PATH"
    
    # Add test mode indicator to URL
    local obsidian_url="obsidian://open?vault=$(basename "$OBSIDIAN_VAULT_PATH")&test-mode=true"
    
    if [[ "$OBSIDIAN_PATH" == *"flatpak"* ]]; then
        $OBSIDIAN_PATH "$obsidian_url" &
    else
        "$OBSIDIAN_PATH" "$obsidian_url" &
    fi
    
    OBSIDIAN_PID=$!
    
    log_info "Obsidian started with PID: $OBSIDIAN_PID"
    log_info "Waiting for Obsidian to initialize..."
    sleep 10
    
    echo ""
    echo "🎯 MANUAL TESTING MODE ACTIVE"
    echo "👤 Obsidian is ready for your testing!"
    echo "📝 Go make some edits and observe the Track Edits behavior"
    echo "🔍 Automation is capturing everything in the background"
    echo ""
    echo "⌨️  When done testing, come back to this terminal and type 'done' then ENTER to finish..."
    echo "💡 Or use Ctrl+C to stop immediately"
    echo ""
    
    while true; do
        read -p "Type 'done' to finish testing: " input
        case $input in
            done|DONE|q|Q|exit|EXIT)
                echo "Finishing test session..."
                break
                ;;
            *)
                echo "Continue testing... (type 'done' when finished)"
                ;;
        esac
    done
    
    # Verify Obsidian is running
    if ! kill -0 "$OBSIDIAN_PID" 2>/dev/null; then
        log_error "Obsidian failed to start or crashed"
        exit 1
    fi
    
    log_success "Obsidian is running in test mode"
}

# Run the test suite
run_test_suite() {
    log_info "Starting Track Edits comprehensive test suite..."
    
    # Set test environment variables
    export NODE_ENV=test
    export TEST_OUTPUT_DIR="$OUTPUT_DIR"
    export TEST_TIMESTAMP="$TIMESTAMP"
    export OBSIDIAN_PID="$OBSIDIAN_PID"
    
    local exit_code=0
    
    # Run the main test runner
    if node test-runner.js --output="$OUTPUT_DIR" --timeout="$TEST_TIMEOUT"; then
        log_success "Test suite completed successfully"
    else
        exit_code=$?
        log_error "Test suite failed with exit code: $exit_code"
    fi
    
    return $exit_code
}

# Generate final report
generate_final_report() {
    log_info "Generating final test report..."
    
    local report_file="$OUTPUT_DIR/test-summary.md"
    
    cat > "$report_file" <<EOF
# Track Edits Test Suite Results

**Timestamp**: $TIMESTAMP  
**Duration**: $(($(date +%s) - $(date -j -f "%Y-%m-%d_%H-%M-%S" "$TIMESTAMP" +%s))) seconds  
**Output Directory**: $OUTPUT_DIR

## Test Configuration

- Plugin Directory: $PLUGIN_DIR
- Obsidian Vault: $OBSIDIAN_VAULT_PATH
- Test Timeout: ${TEST_TIMEOUT}s
- Obsidian PID: $OBSIDIAN_PID

## Files Generated

EOF
    
    # List generated files
    if [[ -d "$OUTPUT_DIR" ]]; then
        echo "### Generated Files:" >> "$report_file"
        find "$OUTPUT_DIR" -type f | while read -r file; do
            local size=$(ls -lh "$file" | awk '{print $5}')
            local rel_path=${file#$OUTPUT_DIR/}
            echo "- \`$rel_path\` ($size)" >> "$report_file"
        done
    fi
    
    echo "" >> "$report_file"
    echo "## Next Steps" >> "$report_file"
    echo "" >> "$report_file"
    echo "1. Review the HTML report: \`$OUTPUT_DIR/report.html\`" >> "$report_file"
    echo "2. Check test logs: \`$OUTPUT_DIR/test-logs.jsonl\`" >> "$report_file"
    echo "3. Examine visual states: \`$OUTPUT_DIR/visual-states.json\`" >> "$report_file"
    
    log_success "Final report generated: $report_file"
}

# Main execution
main() {
    echo "🚀 Starting Track Edits Comprehensive Test Suite"
    echo "📁 Output Directory: $OUTPUT_DIR"
    echo ""
    
    # Execute test phases
    check_prerequisites
    build_plugin
    start_obsidian_test_mode
    
    local test_exit_code=0
    run_test_suite || test_exit_code=$?
    
    generate_final_report
    
    echo ""
    echo "✅ Test Suite Complete"
    echo "📊 Report: $OUTPUT_DIR/report.html"
    echo "📝 Summary: $OUTPUT_DIR/test-summary.md"
    echo "🗂️  Logs: $OUTPUT_DIR/test-logs.jsonl"
    
    if [[ $test_exit_code -eq 0 ]]; then
        log_success "All tests passed!"
    else
        log_warning "Some tests failed. Check the reports for details."
    fi
    
    return $test_exit_code
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --vault)
            OBSIDIAN_VAULT_PATH="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            mkdir -p "$OUTPUT_DIR"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --timeout SECONDS      Test timeout (default: 300)"
            echo "  --vault PATH           Obsidian vault path (default: .)"
            echo "  --output-dir PATH      Output directory (default: .agent-os/test-sessions/TIMESTAMP)"
            echo "  --help                 Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"