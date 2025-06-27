import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';

type AuthMode = 'welcome' | 'login' | 'signup' | 'forgot-password' | 'verify-email';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();

  // Generate WhatsApp-style verification code
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Send verification email with WhatsApp-style code
  const sendVerificationEmail = async (email: string, code: string) => {
    // This would integrate with your email service (SendGrid, etc.)
    // For now, we'll show the code in the success message for testing
    console.log(`Verification code for ${email}: ${code}`);
    
    // Store code temporarily (in production, store in backend)
    localStorage.setItem('verification_code', code);
    localStorage.setItem('verification_email', email);
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        // Username validation - must be more than 5 characters
        if (username.length <= 5) {
          setError('Username must be more than 5 characters');
          setLoading(false);
          return;
        }
        
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        // Generate and send verification code
        const code = generateVerificationCode();
        await sendVerificationEmail(email, code);
        
        // Store signup data temporarily
        localStorage.setItem('signup_data', JSON.stringify({
          email,
          password,
          username,
          displayName
        }));
        
        setMode('verify-email');
        setSuccess(`We've sent a WhatsApp-style verification code to ${email}. Please check your email and enter the 6-digit code below.`);
      } else if (mode === 'verify-email') {
        const storedCode = localStorage.getItem('verification_code');
        const storedEmail = localStorage.getItem('verification_email');
        const signupDataStr = localStorage.getItem('signup_data');
        
        if (!storedCode || !signupDataStr) {
          setError('Verification session expired. Please try signing up again.');
          setLoading(false);
          return;
        }
        
        if (verificationCode !== storedCode) {
          setError('Invalid verification code. Please try again.');
          setLoading(false);
          return;
        }
        
        const signupData = JSON.parse(signupDataStr);
        
        // Proceed with signup after verification
        await signUp(signupData.email, signupData.password, { 
          username: signupData.username, 
          displayName: signupData.displayName,
          country: 'US' // Default country, no longer user-selectable
        });
        
        // Clean up temporary data
        localStorage.removeItem('verification_code');
        localStorage.removeItem('verification_email');
        localStorage.removeItem('signup_data');
        
        setSuccess('Account created successfully! You can now sign in.');
        setTimeout(() => setMode('login'), 2000);
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
    setVerificationCode('');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const resendVerificationCode = async () => {
    const storedEmail = localStorage.getItem('verification_email');
    if (!storedEmail) {
      setError('No email found. Please try signing up again.');
      return;
    }
    
    const code = generateVerificationCode();
    await sendVerificationEmail(storedEmail, code);
    setSuccess('New verification code sent to your email!');
    setError('');
  };

  // Welcome Screen
  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto mb-8">
              <img 
                src="https://i.ibb.co/3YPVCWX2/Website-Logo.jpg" 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">Welcome!</h1>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={() => setMode('login')}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-full text-lg"
            >
              Login
            </Button>
            
            <Button
              onClick={() => setMode('signup')}
              variant="outline"
              className="w-full border-2 border-gray-300 text-black font-bold py-4 rounded-full text-lg hover:bg-gray-50"
            >
              Sign Up
            </Button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => switchMode('forgot-password')}
              className="text-black hover:text-gray-600 font-medium"
            >
              Forgot Password?
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Auth Forms (Login/Signup/Forgot Password/Verify Email)
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Button
          variant="ghost"
          onClick={() => {
            if (mode === 'forgot-password') {
              setMode('login');
            } else if (mode === 'verify-email') {
              setMode('signup');
            } else {
              setMode('welcome');
            }
          }}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="w-10 h-10">
          <img 
            src="https://i.ibb.co/3YPVCWX2/Website-Logo.jpg" 
            alt="Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="w-9"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black mb-2">
              {mode === 'login' && 'Sign in to X'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot-password' && 'Reset your password'}
              {mode === 'verify-email' && 'Verify your email'}
            </h1>
            {mode === 'verify-email' && (
              <div className="flex items-center justify-center mt-4 mb-2">
                <div className="bg-green-100 p-3 rounded-full">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                </div>
              </div>
            )}
          </div>

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
            {/* Email Verification Code (Verify Email mode only) */}
            {mode === 'verify-email' && (
              <div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Enter the 6-digit code sent to your email
                </p>
                <div className="text-center mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resendVerificationCode}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Resend code
                  </Button>
                </div>
              </div>
            )}

            {/* Email */}
            {mode !== 'verify-email' && (
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Email address"
                    required
                  />
                </div>
              </div>
            )}

            {/* Username (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={`w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 transition-all ${
                      username.length > 0 && username.length <= 5 
                        ? 'focus:ring-red-500 bg-red-50' 
                        : 'focus:ring-blue-500'
                    }`}
                    placeholder="Username"
                    required
                  />
                </div>
                <p className={`mt-2 text-xs ${
                  username.length > 0 && username.length <= 5 
                    ? 'text-red-500' 
                    : 'text-gray-500'
                }`}>
                  Must be more than 5 characters. Only lowercase letters, numbers, and underscores.
                </p>
              </div>
            )}

            {/* Display Name (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Display name"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {mode !== 'forgot-password' && mode !== 'verify-email' && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {mode === 'signup' && (
                  <p className="mt-2 text-xs text-gray-500">
                    Must be at least 6 characters
                  </p>
                )}
              </div>
            )}

            {/* Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Confirm password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || (mode === 'signup' && username.length <= 5)}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (
                mode === 'login' ? 'Sign in' :
                mode === 'signup' ? 'Continue' :
                mode === 'verify-email' ? 'Verify & Create Account' :
                'Send reset email'
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            {mode === 'login' && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => switchMode('forgot-password')}
                  className="text-black hover:text-gray-600 font-medium mb-4"
                >
                  Forgot your password?
                </Button>
                <div className="text-gray-600">
                  Don't have an account?{' '}
                  <Button
                    variant="ghost"
                    onClick={() => switchMode('signup')}
                    className="text-black hover:text-gray-600 p-0 h-auto font-medium underline"
                  >
                    Sign up
                  </Button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div className="text-gray-600">
                Already have an account?{' '}
                <Button
                  variant="ghost"
                  onClick={() => switchMode('login')}
                  className="text-black hover:text-gray-600 p-0 h-auto font-medium underline"
                >
                  Sign in
                </Button>
              </div>
            )}

            {mode === 'verify-email' && (
              <div className="text-gray-600">
                Wrong email?{' '}
                <Button
                  variant="ghost"
                  onClick={() => switchMode('signup')}
                  className="text-black hover:text-gray-600 p-0 h-auto font-medium underline"
                >
                  Go back
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};