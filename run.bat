@echo off
echo Starting Power Monitoring Dashboard...
echo.
echo Starting Django backend server...
start cmd /k "cd backend && python manage.py runserver"
echo.
echo Starting React frontend dev server...
start cmd /k "cd frontend && npm run dev"
echo.
echo Both servers are now running!
echo - Backend: http://localhost:8000/
echo - Frontend: http://localhost:5173/