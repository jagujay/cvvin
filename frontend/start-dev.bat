@echo off
echo Starting CVVIN development environment...

REM Check if backend dependencies are installed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    npm install
    cd ..
)

REM Check if frontend dependencies are installed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

REM Start backend server in background
echo Starting backend server...
cd backend
start "CVVIN Backend" cmd /k "npm run dev"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend development server
echo Starting frontend development server...
start "CVVIN Frontend" cmd /k "npm run dev"

echo Development servers started!
echo Frontend: http://localhost:8080
echo Backend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
