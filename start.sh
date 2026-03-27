#!/bin/bash

# Market Frontend - Quick Start Script

echo "🚀 Démarrage du Market Frontend..."
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "✓ Node.js version: $NODE_VERSION"

if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Erreur: Node.js 20+ requis"
    echo "    Utilisez: nvm install 20 && nvm use 20"
    exit 1
fi

# Clean node_modules and reinstall if needed
if [ "$1" = "clean" ]; then
    echo "🧹 Nettoyage des dépendances..."
    rm -rf node_modules package-lock.json
    npm install
fi

# Start dev server
echo ""
echo "🎯 Démarrage du serveur de développement..."
echo "    App: http://localhost:4200"
echo "    API: http://localhost:8080"
echo ""
npm start
