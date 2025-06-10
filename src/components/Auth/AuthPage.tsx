import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/useStore';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();
  const { isRTL, toggleLayoutDirection } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
        // User will be redirected automatically by App.tsx
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        await signUp(email, password, { username, displayName });
        setSuccess('Account created successfully! Please check your email to verify your account.');
      } else if (mode === 'forgot-password') {
        await resetPassword(email);
        setSuccess('Password reset email sent! Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setDisplayName('');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className={`text-center mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">X</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Join X today'}
            {mode === 'forgot-password' && 'Reset password'}
          </h1>
          <p className="text-gray-600">
            {mode === 'login' && 'Sign in to your account to continue'}
            {mode === 'signup' && 'Create your account to get started'}
            {mode === 'forgot-password' && 'Enter your email to reset your password'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Mode Navigation */}
          {mode !== 'login' && (
            <div className={`flex items-center mb-6 ${isRTL ? 'justify-end' : 'justify-start'}`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => switchMode('login')}
                className={`flex items-center space-x-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to sign in</span>
              </Button>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className={`absolute top-3 h-5 w-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors`}
                  placeholder="Enter your email"
                  required
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            {/* Username (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className={`absolute top-3 h-5 w-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors`}
                    placeholder="Choose a username"
                    required
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Only lowercase letters, numbers, and underscores allowed
                </p>
              </div>
            )}

            {/* Display Name (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User className={`absolute top-3 h-5 w-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors`}
                    placeholder="Your display name"
                    required
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {mode !== 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute top-3 h-5 w-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full ${isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'} py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors`}
                    placeholder="Enter your password"
                    required
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} p-2 hover:bg-gray-100 rounded-full`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {mode === 'signup' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Must be at least 6 characters long
                  </p>
                )}
              </div>
            )}

            {/* Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className={`absolute top-3 h-5 w-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full ${isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'} py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors`}
                    placeholder="Confirm your password"
                    required
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} p-2 hover:bg-gray-100 rounded-full`}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Please wait...' : (
                mode === 'login' ? 'Sign in' :
                mode === 'signup' ? 'Create account' :
                'Send reset email'
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            {mode === 'login' && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => switchMode('forgot-password')}
                  className="w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 py-2"
                >
                  Forgot your password?
                </Button>
                <div className={`text-center text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Don't have an account?{' '}
                  <Button
                    variant="ghost"
                    onClick={() => switchMode('signup')}
                    className="text-blue-500 hover:text-blue-600 p-0 h-auto font-medium hover:bg-transparent underline"
                  >
                    Sign up for free
                  </Button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div className={`text-center text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                Already have an account?{' '}
                <Button
                  variant="ghost"
                  onClick={() => switchMode('login')}
                  className="text-blue-500 hover:text-blue-600 p-0 h-auto font-medium hover:bg-transparent underline"
                >
                  Sign in
                </Button>
              </div>
            )}

            {mode === 'forgot-password' && (
              <div className={`text-center text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                Remember your password?{' '}
                <Button
                  variant="ghost"
                  onClick={() => switchMode('login')}
                  className="text-blue-500 hover:text-blue-600 p-0 h-auto font-medium hover:bg-transparent underline"
                >
                  Sign in
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RTL/LTR Toggle */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={toggleLayoutDirection}
            className="bg-white/80 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-white hover:text-gray-900"
          >
            {isRTL ? 'Switch to LTR' : 'Switch to RTL'}
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};