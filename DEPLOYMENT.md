# Deployment Guide: Vercel + Supabase

This guide covers deploying the frontend to Vercel and using Supabase as the backend.

## 🚀 Vercel Frontend Deployment

### Prerequisites
- Vercel account (free tier available)
- GitHub repository
- Node.js 18+ locally

### Setup Steps

#### 1. Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

#### 2. Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Environment Variables**:
   Add these in Vercel Dashboard → Project Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

#### 3. Deploy via CLI (Alternative)
```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Redeploy with environment variables
vercel --prod
```

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown

## 🗄️ Supabase Backend Setup

### Prerequisites
- Supabase account (free tier available)

### Setup Steps

#### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and anon key

#### 2. Database Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push database migrations
supabase db push
```

#### 3. Environment Variables
Update your Vercel environment variables with:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

#### 4. Authentication Setup
1. Go to Supabase Dashboard → Authentication → Settings
2. Configure allowed redirect URLs:
   - `https://your-vercel-app.vercel.app/**`
   - `https://your-custom-domain.com/**` (if using custom domain)

#### 5. Storage Setup
1. Go to Supabase Dashboard → Storage
2. Ensure `tweet-images` bucket exists
3. Verify RLS policies are active

## 🔒 Security Configuration

### Vercel Headers
The `vercel.json` includes security headers:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

### Supabase Security
- Row Level Security (RLS) enabled on all tables
- Authentication required for sensitive operations
- File uploads restricted to user folders

## 🔄 Automatic Deployments

### GitHub Integration
- Vercel automatically deploys on every push to main branch
- Preview deployments for pull requests
- Environment variables are inherited

### Supabase Database Updates
```bash
# Make database changes
supabase db diff --file new_migration

# Test locally
supabase start
supabase db reset

# Deploy to production
supabase db push
```

## 📊 Performance Optimization

### Vercel Features Used
- Automatic static optimization
- Edge caching for assets
- Gzip compression
- HTTP/2 and HTTP/3 support

### Build Optimization
- Code splitting by vendor and feature
- Tree shaking for unused code
- Terser minification
- Asset optimization

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

#### Environment Variables
- Ensure all VITE_ prefixed variables are set in Vercel
- Check Supabase project settings for correct URLs

#### Routing Issues
- `vercel.json` handles SPA routing
- All routes fallback to `index.html`

#### CORS Issues
- Configure allowed origins in Supabase Dashboard
- Add your Vercel domain to allowed origins

### Support
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)

## 📈 Monitoring

### Vercel Analytics
- Enable in Project Settings → Analytics
- Monitor Core Web Vitals and performance

### Supabase Monitoring
- Database usage in Supabase Dashboard
- API requests and performance metrics

---

## Quick Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Supabase project created and configured
- [ ] Database migrations applied
- [ ] Vercel project connected to GitHub
- [ ] Environment variables configured in Vercel
- [ ] Custom domain configured (optional)
- [ ] Authentication redirect URLs updated
- [ ] Security headers verified
- [ ] Performance monitoring enabled 