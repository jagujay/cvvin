# Start Local HTTP Server for HR Analysis System

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Starting HR Interview Analysis Server     " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$port = 8000

Write-Host "Starting server on port $port..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will be available at:" -ForegroundColor Green
Write-Host "  http://localhost:$port" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    # Check if Python is available
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    
    if ($pythonCmd) {
        Write-Host "Using Python HTTP server..." -ForegroundColor Green
        python -m http.server $port
    }
    else {
        Write-Host "Python not found. Install Python from https://www.python.org/" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Use any other local server (Node.js, etc.)" -ForegroundColor Yellow
        pause
    }
}
catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
    pause
}

