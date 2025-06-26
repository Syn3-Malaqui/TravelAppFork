# Travel App

A modern travel social media application built with React, TypeScript, and Supabase.

## 🚀 Features

- Real-time posts and interactions
- User profiles and authentication
- Image uploads and sharing
- Hashtag system
- Follow/unfollow functionality
- Responsive design

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **UI Components**: Radix UI
- **State Management**: Zustand
- **Routing**: React Router
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 18+ installed on your system
- Git for version control
- A Supabase account
- A Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd TravelAppFork
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials:
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:5173/](http://localhost:5173/)

## 🔧 Build Commands

- **Development**: `npm run dev`
- **Build**: `npm run build` 
- **Preview**: `npm run preview`
- **Vercel Build**: `npm run vercel-build`

## 🚀 Deployment

This project is optimized for deployment on **Vercel** with **Supabase** as the backend.

### Quick Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project" and import your repository
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Configure Environment Variables**
   In Vercel Dashboard → Project Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Deploy**
   Vercel will automatically build and deploy your app!

### Detailed Deployment Guide

For comprehensive deployment instructions including Supabase setup, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔒 Security

- Environment variables properly configured
- Row Level Security (RLS) enabled on all database tables
- File uploads restricted to user folders
- Authentication handled by Supabase
- Security headers configured in `vercel.json`

## 📦 Project Structure

```
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and configurations
│   ├── store/            # State management
│   └── types/            # TypeScript type definitions
├── supabase/
│   └── migrations/       # Database migrations
├── public/               # Static assets
├── vercel.json          # Vercel configuration
└── package.json         # Dependencies and scripts
```

## 🐛 Troubleshooting

### Common Issues

- **Build failures**: Run `npm run build` locally to check for errors
- **Environment variables**: Ensure all `VITE_` prefixed variables are set
- **Routing issues**: `vercel.json` handles SPA routing automatically
- **Database errors**: Check Supabase project status and RLS policies

### Support

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)

---

Built with ❤️ using React, TypeScript, Supabase, and Vercel.
