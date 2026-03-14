# FlowState Vercel Deployment Guide

## ✅ Completed Tasks

- [x] Updated `.env` files with backend URL: `https://flowstate-wzwk.onrender.com`
- [x] Created `.env.production` files for both portals
- [x] Pushed all changes to GitHub `main` branch
- [x] Verified backend is running and accessible

## 🔧 Manual Steps Required (GitHub & Vercel)

### Step 1: Change Default Branch on GitHub

1. Go to: https://github.com/aravindh-bloop/FLOWSTATE/settings/branches
2. Under "Default branch", click the dropdown
3. Select `main` from the list
4. Click "Update"

**Why?** The `deployment-sync` branch is currently the default, preventing its deletion.

### Step 2: Delete Old Branch (After Step 1)

Run this command:
```powershell
git push origin --delete deployment-sync
```

### Step 3: Set Vercel Environment Variables

For **each project** (Landing & Coach Portal):

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project (Landing Portal)
3. Go to **Settings** → **Environment Variables**
4. Click **Add Environment Variable**
5. Fill in:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://flowstate-wzwk.onrender.com`
   - **Environments**: Production, Preview, Development (all selected)
6. Click **Save**
7. **Repeat for Coach Portal project**

### Step 4: Redeploy Both Projects

Option A - Force Redeploy in Vercel:
1. Go to **Deployments**
2. Click the three dots on the latest deployment
3. Select **Redeploy** (uncheck "Use existing Build Cache")

Option B - Redeploy via Git:
```powershell
git push origin main  # Push any new commits
# This will automatically trigger Vercel redeploy if connected
```

## 🌐 API Endpoints (Fixed)

Both frontend portals now point to:
- **Backend URL**: `https://flowstate-wzwk.onrender.com`
- **Landing Portal**: Makes POST requests to `/api/registrations`
- **Coach Portal**: Uses authentication endpoints at `/api/auth/*`

## ✅ Backend Verification

Backend status: **RUNNING** ✅
- URL: https://flowstate-wzwk.onrender.com
- Status endpoint responds with: `{"status":"FlowState API Running"}`

## 🚀 Expected Results After Deployment

- Landing page registration form will submit to your Render backend
- Coach portal login/authentication will work correctly
- No more "FUNCTION_INVOCATION_FAILED" 500 errors

## 📝 Files Modified

```
apps/landing/.env
apps/landing/.env.production
apps/coach/.env
apps/coach/.env.production
```

All committed to GitHub: `commit 69dc44d`
