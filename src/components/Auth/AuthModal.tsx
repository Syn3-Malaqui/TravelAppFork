import React, { useState } from 'react';
import { X, Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/useStore';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export const AuthModal: React.FC = () => {
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
  const { showAuthModal, setShowAuthModal, isRTL } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
        setShowAuthModal(false);
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

  if (!showAuthModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200`}>
          <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            {mode !== 'login' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => switchMode('login')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' && 'Sign in to X'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot-password' && 'Reset your password'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAuthModal(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
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
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (
                mode === 'login' ? 'Sign in' :
                mode === 'signup' ? 'Create account' :
                'Send reset email'
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 space-y-4">
            {mode === 'login' && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => switchMode('forgot-password')}
                  className="w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  Forgot your password?
                </Button>
                <div className={`text-center text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Don't have an account?{' '}
                  <Button
                    variant="ghost"
                    onClick={() => switchMode('signup')}
                    className="text-blue-500 hover:text-blue-600 p-0 h-auto font-normal hover:bg-transparent"
                  >
                    Sign up
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
                  className="text-blue-500 hover:text-blue-600 p-0 h-auto font-normal hover:bg-transparent"
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
                  className="text-blue-500 hover:text-blue-600 p-0 h-auto font-normal hover:bg-transparent"
                >
                  Sign in
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};