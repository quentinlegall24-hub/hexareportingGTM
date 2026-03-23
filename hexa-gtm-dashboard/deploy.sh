#!/bin/bash
# Hexa GTM Dashboard — One-click deploy script
# Usage: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🚀 Hexa GTM Dashboard — Deploy"
echo "================================"

# Step 1: Check prerequisites
command -v git >/dev/null 2>&1 || { echo "❌ git not found. Install it first."; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "❌ gh (GitHub CLI) not found. Install: brew install gh"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx not found. Install Node.js first."; exit 1; }

# Step 2: Init git repo and push to GitHub
echo ""
echo "📦 Creating GitHub repo..."
git init
git add .
git commit -m "Hexa GTM Dashboard — commercial reporting"

gh repo create hexa-gtm-dashboard --private --source=. --push
echo "✅ Repo created and pushed!"

# Step 3: Deploy with Vercel
echo ""
echo "🔗 Deploying to Vercel..."
echo "⚠️  When prompted, add these environment variables:"
echo "   NOTION_API_KEY = your Notion integration token"
echo "   NOTION_DATABASE_ID = 2bd9a15e3b884f0980b011fa145c2b2a"
echo ""
npx vercel --yes

echo ""
echo "✅ Done! Your dashboard is live."
echo "📊 Share the URL with your founders."
