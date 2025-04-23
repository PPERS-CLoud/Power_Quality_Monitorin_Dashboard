#!/bin/bash
# filepath: c:\Users\Alvin\Desktop\Thesis\PowerMonitoringDashboardThesis\setup.sh

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt firebase-admin
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "All dependencies installed successfully!"