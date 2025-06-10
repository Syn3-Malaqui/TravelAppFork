import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Globe, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';

type AuthMode = 'welcome' | 'country' | 'login' | 'signup' | 'forgot-password';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
];

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        await signUp(email, password, { 
          username, 
          displayName,
          country: selectedCountry 
        });
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

  // Welcome Screen
  if (mode === 'welcome') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-white font-bold text-xl">X</span>
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
              onClick={() => setMode('country')}
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

  // Country Selection Screen (only for signup)
  if (mode === 'country') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <Button
            variant="ghost"
            onClick={() => setMode('welcome')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">X</span>
          </div>
          <div className="w-9"></div> {/* Spacer for centering */}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-black mb-8 text-center">Choose your country.</h1>

            {/* Search Input */}
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search countries"
                className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Selected Country Display */}
            {selectedCountryData && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{selectedCountryData.flag}</span>
                  <span className="font-medium text-blue-900">{selectedCountryData.name}</span>
                  <Check className="h-5 w-5 text-blue-600 ml-auto" />
                </div>
              </div>
            )}

            {/* Country List */}
            <div className="bg-gray-50 rounded-lg max-h-64 overflow-y-auto mb-8">
              {filteredCountries.slice(0, 10).map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-100 transition-colors ${
                    selectedCountry === country.code ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <span className="font-medium text-gray-900">{country.name}</span>
                  {selectedCountry === country.code && (
                    <Check className="h-5 w-5 text-blue-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>

            {/* Show All Countries Toggle */}
            <div className="flex items-center space-x-3 mb-8">
              <input
                type="checkbox"
                id="showAll"
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="showAll" className="text-gray-700 font-medium">
                Show All Countries
              </label>
            </div>

            {/* Proceed Button */}
            <Button
              onClick={() => switchMode('signup')}
              disabled={!selectedCountry}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Auth Forms (Login/Signup/Forgot Password)
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Button
          variant="ghost"
          onClick={() => {
            if (mode === 'forgot-password') {
              setMode('login');
            } else if (mode === 'signup') {
              setMode('country');
            } else {
              setMode('welcome');
            }
          }}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">X</span>
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
            </h1>
            {mode === 'signup' && selectedCountryData && (
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <span>{selectedCountryData.flag}</span>
                <span className="text-sm">{selectedCountryData.name}</span>
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
            {/* Email */}
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

            {/* Username (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Username"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Only lowercase letters, numbers, and underscores
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
            {mode !== 'forgot-password' && (
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
              disabled={loading}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (
                mode === 'login' ? 'Sign in' :
                mode === 'signup' ? 'Create account' :
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
                    onClick={() => switchMode('country')}
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
          </div>
        </div>
      </div>
    </div>
  );
};