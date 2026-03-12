#!/bin/bash

echo ""
echo "========================================"
echo "   STARTING KEVINJR AI ASSISTANT"
echo "========================================"
echo ""
echo "Initializing KevinJr..."
echo "Dashboard will open in your browser automatically"
echo ""

# Start KevinJr dashboard server in background
node dashboard/server/dashboard-server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Open browser to dashboard
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3001
elif command -v open &> /dev/null; then
    open http://localhost:3001
else
    echo "Please open your browser and go to: http://localhost:3001"
fi

echo ""
echo "KevinJr Dashboard is now running!"
echo "Access it at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop KevinJr"
echo ""

# Wait for user to stop the server
trap "echo 'Stopping KevinJr...'; kill $SERVER_PID; exit" INT
wait $SERVER_PID

