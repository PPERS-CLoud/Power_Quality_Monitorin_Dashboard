@echo off
REM Install backend dependencies
echo Installing backend dependencies...
cd backend
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt firebase-admin
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
npm install
cd ..

echo All dependencies installed successfully!