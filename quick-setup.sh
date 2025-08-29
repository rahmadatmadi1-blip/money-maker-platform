#!/bin/bash
# Quick Setup Commands for Money Maker Platform

# 1. Install Vercel CLI (if needed)
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy Frontend (run from client directory)
cd client
vercel --prod

# 4. For backend, use web interface:
# - Go to https://dashboard.render.com
# - Create new Web Service
# - Use environment variables from render-env.txt

echo "✅ Setup commands ready!"
echo "📖 Follow MANUAL_DEPLOYMENT_GUIDE.md for detailed steps"
