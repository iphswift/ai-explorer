#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# !!! IMPORTANT !!!
# SET THESE VARIABLES BEFORE RUNNING THE SCRIPT.
# These values should match what you used in the one-time setup.
GCLOUD_PROJECT_ID="gen-lang-client-0864353710"
BUCKET_NAME="explorer-fe-swift-25"
GCLOUD_REGION="us-central1"
SERVICE_NAME="knowledge-graph-backend"
SECRET_NAME="GEMINI_API_KEY"
# --- End Configuration ---


# --- Pre-flight Check ---
if [ "$GCLOUD_PROJECT_ID" == "your-gcp-project-id" ] || [ "$BUCKET_NAME" == "your-globally-unique-bucket-name" ]; then
  echo "❌ ERROR: Please edit the GCLOUD_PROJECT_ID and BUCKET_NAME variables at the top of the deploy.sh script before running."
  exit 1
fi

echo "--- Simple Deployment Script ---"
echo "Project: $GCLOUD_PROJECT_ID"
echo "Region: $GCLOUD_REGION"
echo

# --- Setup ---
echo "✅ 1. Configuring gcloud CLI for this deployment..."
gcloud config set project "$GCLOUD_PROJECT_ID"
gcloud config set run/region "$GCLOUD_REGION"

# --- Backend Deployment (Cloud Run) ---
echo "🚀 2. Deploying backend service to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --allow-unauthenticated \
  --set-secrets="GOOGLE_API_KEY=$SECRET_NAME:latest"

# Get the URL of the deployed Cloud Run service
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo "❌ ERROR: Could not retrieve the Cloud Run service URL. Aborting."
    exit 1
fi

echo "✅ Backend deployed successfully. Service URL: $SERVICE_URL"
echo

# --- Frontend Deployment (Cloud Storage) ---
echo "🚀 3. Deploying frontend to Cloud Storage..."

# Create a temporary backup of the original index.html
cp index.html index.html.bak

# Create a temporary backup of the original apiService.js
cp public/apiService.js public/apiService.js.bak

# Replace the localhost API URL with the deployed Cloud Run service URL
sed "s|http://localhost:3000|$SERVICE_URL|g" index.html > index.tmp.html && mv index.tmp.html index.html
echo "✅ API URL in index.html updated for deployment."

# Replace the localhost API URL with the deployed Cloud Run service URL
sed "s|http://localhost:3000|$SERVICE_URL|g" public/apiService.js > public/apiService.tmp.js && mv public/apiService.tmp.js public/apiService.js
echo "✅ API URL in apiService.js updated for deployment."

# Upload the modified index.html file
echo "✅ Uploading frontend files..."
gcloud storage cp ./index.html "gs://$BUCKET_NAME"
gcloud storage cp -r ./public "gs://$BUCKET_NAME"


# Restore the original apiService.js from backup
mv public/apiService.js.bak public/apiService.js
echo "✅ Local apiService.js restored."
echo

# Restore the original index.html from backup
mv index.html.bak index.html
echo "✅ Local index.html restored."
echo

# --- Finish ---
FRONTEND_URL="https://storage.googleapis.com/$BUCKET_NAME/index.html"
echo "🎉 --- Deployment Complete! --- 🎉"
echo
echo "Your application is now live at:"
echo "$FRONTEND_URL"
echo