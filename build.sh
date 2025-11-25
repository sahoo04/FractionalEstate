#!/bin/bash
# Build script for Vercel deployment
# Builds the frontend from the frontend subdirectory

cd frontend
npm ci
npm run build
