# Quick Start Script for Proctoring System
# Automatically starts the best available local server

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Advanced Local Proctoring System - Starter   " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check what is available
$pythonAvailable = $false
$nodeAvailable = $false
$phpAvailable = $false

# Check Python
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python") {
        $pythonAvailable = $true
        Write-Host "Python found: $pythonVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "Python not found" -ForegroundColor Yellow
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v") {
        $nodeAvailable = $true
        Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "Node.js not found" -ForegroundColor Yellow
}

# Check PHP
try {
    $phpVersion = php --version 2>&1
    if ($phpVersion -match "PHP") {
        $phpAvailable = $true
        Write-Host "PHP found" -ForegroundColor Green
    }
} catch {
    Write-Host "PHP not found" -ForegroundColor Yellow
}

Write-Host ""

# Start the best available server
if ($pythonAvailable) {
    Write-Host "Starting Python HTTP server on port 8000..." -ForegroundColor Green
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Server Started! Open your browser to:       " -ForegroundColor Cyan
    Write-Host "  http://localhost:8000                       " -ForegroundColor Cyan
    Write-Host "                                              " -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to stop the server            " -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Try to open browser automatically
    Start-Process "http://localhost:8000"
    
    # Start server
    python -m http.server 8000
    
} elseif ($nodeAvailable) {
    Write-Host "Starting Node.js HTTP server on port 8000..." -ForegroundColor Green
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Server Started! Open your browser to:       " -ForegroundColor Cyan
    Write-Host "  http://localhost:8000                       " -ForegroundColor Cyan
    Write-Host "                                              " -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to stop the server            " -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Try to open browser automatically
    Start-Process "http://localhost:8000"
    
    # Start server
    npx http-server -p 8000 --yes
    
} elseif ($phpAvailable) {
    Write-Host "Starting PHP built-in server on port 8000..." -ForegroundColor Green
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Server Started! Open your browser to:       " -ForegroundColor Cyan
    Write-Host "  http://localhost:8000                       " -ForegroundColor Cyan
    Write-Host "                                              " -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to stop the server            " -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Try to open browser automatically
    Start-Process "http://localhost:8000"
    
    # Start server
    php -S localhost:8000
    
} else {
    Write-Host "ERROR: No suitable server found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install one of the following:" -ForegroundColor Yellow
    Write-Host "  - Python 3: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  - Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "  - PHP: https://www.php.net/downloads" -ForegroundColor Yellow
    Write-Host ""
    pause
}
