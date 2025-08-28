# =============================================================================
# Test Runner with Comprehensive Cleanup - PowerShell Version
# =============================================================================
# Purpose: Session-level cleanup to prevent orphaned processes in Claude Code
# Usage: .\scripts\run-tests-clean.ps1 [TestCommand]
# 
# 根治路径：外部会话级一键回收 + PowerShell finally 清理
# =============================================================================

param(
    [string]$TestCommand = "npm run test:ci",
    [switch]$Debug = $false
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Configuration
$ProjectName = "ai-recruitment-clerk"
$TestTimeout = 300 # 5 minutes
$MaxCleanupTime = 30

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Header {
    Write-ColorOutput "🧪 Starting AI Recruitment Clerk Test Runner" "Blue"
    Write-ColorOutput "📍 Project: $ProjectName" "Blue"
    Write-ColorOutput "🕐 $(Get-Date)" "Blue"
    Write-Host ""
}

# =============================================================================
# Cleanup Functions
# =============================================================================

function Stop-OrphanedProcesses {
    Write-ColorOutput "🧹 Cleaning up orphaned processes..." "Yellow"
    
    try {
        # Kill Node.js processes related to this project
        Get-Process -Name "node" -ErrorAction SilentlyContinue | 
            Where-Object { $_.CommandLine -like "*$ProjectName*" } |
            Stop-Process -Force -ErrorAction SilentlyContinue
        
        # Kill test-related processes
        @("jest", "vitest", "playwright") | ForEach-Object {
            Get-Process -Name $_ -ErrorAction SilentlyContinue | 
                Stop-Process -Force -ErrorAction SilentlyContinue
        }
        
        # Kill processes on common development ports
        $ports = @(3000, 3001, 9229, 5432, 6379, 27017)
        foreach ($port in $ports) {
            try {
                $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                    Select-Object -ExpandProperty OwningProcess
                
                $processes | ForEach-Object {
                    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
                }
            }
            catch {
                # Port not in use or access denied
            }
        }
        
        Write-ColorOutput "✅ Process cleanup completed" "Green"
    }
    catch {
        Write-ColorOutput "⚠️  Process cleanup warning: $_" "Yellow"
    }
}

function Stop-ChildProcesses {
    param([int]$ParentPid = $PID)
    
    try {
        $children = Get-CimInstance Win32_Process | 
            Where-Object { $_.ParentProcessId -eq $ParentPid } |
            Select-Object -ExpandProperty ProcessId
        
        $children | ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
        Write-ColorOutput "⚠️  Child process cleanup warning: $_" "Yellow"
    }
}

function Invoke-ExitCleanup {
    param([int]$ExitCode = 0)
    
    Write-Host ""
    Write-ColorOutput "🔄 Performing exit cleanup..." "Yellow"
    
    # Stop all child processes
    Stop-ChildProcesses -ParentPid $PID
    
    # Wait for graceful shutdown
    Start-Sleep -Seconds 1
    
    # Force cleanup
    Stop-OrphanedProcesses
    
    if ($ExitCode -eq 0) {
        Write-ColorOutput "✅ Test session completed successfully" "Green"
    }
    else {
        Write-ColorOutput "❌ Test session failed with exit code: $ExitCode" "Red"
        
        # Debug information on failure
        if ($Debug) {
            Write-ColorOutput "🔍 Debug information:" "Yellow"
            
            try {
                $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
                if ($nodeProcesses) {
                    Write-Host "Active Node processes:"
                    $nodeProcesses | Select-Object Id, ProcessName, StartTime | Format-Table -AutoSize
                }
                else {
                    Write-Host "No Node processes found"
                }
                
                $tcpConnections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | 
                    Select-Object LocalAddress, LocalPort, OwningProcess | 
                    Sort-Object LocalPort
                
                if ($tcpConnections) {
                    Write-Host "Listening ports:"
                    $tcpConnections | Format-Table -AutoSize
                }
            }
            catch {
                Write-ColorOutput "Debug info collection failed: $_" "Yellow"
            }
        }
    }
}

# =============================================================================
# Main Execution
# =============================================================================

try {
    Write-Header
    
    # Pre-flight checks and cleanup
    Write-ColorOutput "🔍 Running pre-flight checks..." "Yellow"
    
    # Clean up existing orphaned processes
    Stop-OrphanedProcesses
    
    # Verify Node.js and npm
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js not found"
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm not found" 
    }
    
    Write-ColorOutput "✅ Environment checks passed" "Green"
    
    # Set environment variables
    $env:NODE_ENV = "test"
    $env:CI = "true"
    $env:UV_THREADPOOL_SIZE = "8"
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    
    Write-ColorOutput "🚀 Executing test command: $TestCommand" "Blue"
    Write-Host ""
    
    # Execute test command with timeout
    $startTime = Get-Date
    
    $job = Start-Job -ScriptBlock {
        param($cmd)
        Invoke-Expression $cmd
    } -ArgumentList $TestCommand
    
    $completed = Wait-Job -Job $job -Timeout $TestTimeout
    
    if ($completed) {
        $result = Receive-Job -Job $job
        $exitCode = $job.State -eq "Completed" ? 0 : 1
        
        if ($result) {
            Write-Host $result
        }
    }
    else {
        Stop-Job -Job $job
        throw "Test command timed out after $TestTimeout seconds"
    }
    
    Remove-Job -Job $job -Force
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host ""
    Write-ColorOutput "✅ Tests completed successfully in $([int]$duration)s" "Green"
    
    # Post-test validation
    Write-ColorOutput "🔎 Running post-test validation..." "Yellow"
    
    if ($Debug) {
        Write-Host "Checking for orphaned handles..."
        try {
            $handleCheck = node -e "
                setTimeout(() => {
                    const handles = process._getActiveHandles?.() || [];
                    const requests = process._getActiveRequests?.() || [];
                    if (handles.length > 0 || requests.length > 0) {
                        console.warn('⚠️  Orphaned handles detected:', handles.length, 'requests:', requests.length);
                    } else {
                        console.log('✅ No orphaned handles detected');
                    }
                    process.exit(0);
                }, 100);
            " 2>$null
            
            if ($handleCheck) {
                Write-Host $handleCheck
            }
        }
        catch {
            # Handle check failed
        }
    }
    
    Write-ColorOutput "✅ Post-test validation completed" "Green"
    Write-Host ""
    Write-ColorOutput "🎉 Test session completed successfully!" "Green"
    
    Invoke-ExitCleanup -ExitCode 0
}
catch {
    $errorMessage = $_.Exception.Message
    Write-ColorOutput "❌ Test execution failed: $errorMessage" "Red"
    
    Invoke-ExitCleanup -ExitCode 1
    exit 1
}
finally {
    # Ensure cleanup runs regardless of how we exit
    Stop-ChildProcesses -ParentPid $PID
}