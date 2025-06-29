import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useAuth } from '../../hooks/useAuth';
import { useLanguageStore } from '../../store/useLanguageStore';

type AuthMode = 'welcome' | 'login' | 'signup' | 'forgot-password';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('welcome');
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
  const { language, isRTL } = useLanguageStore();

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
          setError(language === 'en' ? 'Username must be more than 5 characters' : 'اسم المستخدم يجب أن يكون أكثر من 5 أحرف');
          setLoading(false);
          return;
        }
        
        if (password !== confirmPassword) {
          setError(language === 'en' ? 'Passwords do not match' : 'كلمات المرور غير متطابقة');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError(language === 'en' ? 'Password must be at least 6 characters' : 'كلمة المرور يجب أن تكون على الأقل 6 أحرف');
          setLoading(false);
          return;
        }

        // Create account immediately without verification
        await signUp(email, password, { 
          username, 
          displayName,
          country: 'US' // Default country
        });
        
        setSuccess(language === 'en' ? 'Account created successfully! You can now use the app.' : 'تم إنشاء الحساب بنجاح! يمكنك الآن استخدام التطبيق.');
      } else if (mode === 'forgot-password') {
        await resetPassword(email);
        setSuccess(language === 'en' ? 'Password reset email sent! Please check your inbox.' : 'تم إرسال رابط إعادة تعيين كلمة المرور! يرجى فحص صندوق الوارد.');
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
      <div className={`min-h-screen bg-white flex flex-col items-center justify-center p-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className={`flex items-center justify-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} mb-8`}>
              <div className="w-20 h-20">
                <img 
                  src="https://i.ibb.co/3YPVCWX2/Website-Logo.jpg" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-4xl font-bold text-black">
                {language === 'en' ? 'Travel' : 'سافر'}
              </h2>
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">
              {language === 'en' ? 'Welcome!' : 'مرحباً!'}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={() => setMode('login')}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-full text-lg"
            >
              {language === 'en' ? 'Login' : 'تسجيل الدخول'}
            </Button>
            
            <Button
              onClick={() => setMode('signup')}
              variant="outline"
              className="w-full border-2 border-gray-300 text-black font-bold py-4 rounded-full text-lg hover:bg-gray-50"
            >
              {language === 'en' ? 'Sign Up' : 'إنشاء حساب'}
            </Button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => switchMode('forgot-password')}
              className="text-black hover:text-gray-600 font-medium"
            >
              {language === 'en' ? 'Forgot Password?' : 'نسيت كلمة المرور؟'}
            </Button>
          </div>
        </div>

        {/* Language Switcher - Bottom Right */}
        <div className="fixed bottom-6 right-6">
          <LanguageToggle 
            variant="outline" 
            size="default"
            showText={false}
            className="shadow-lg bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white"
          />
        </div>
      </div>
    );
  }

  // Auth Forms (Login/Signup/Forgot Password)
  return (
    <div className={`min-h-screen bg-white flex flex-col ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Button
          variant="ghost"
          onClick={() => {
            if (mode === 'forgot-password') {
              setMode('login');
            } else {
              setMode('welcome');
            }
          }}
          className="p-2"
        >
          <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
        </Button>
        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
          <div className="w-10 h-10">
            <img 
              src="https://i.ibb.co/3YPVCWX2/Website-Logo.jpg" 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-xl font-bold text-black">
            {language === 'en' ? 'Travel' : 'سافر'}
          </h2>
        </div>
        <div className="w-9"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black mb-2">
              {mode === 'login' && (language === 'en' ? 'Sign in to Travel' : 'تسجيل الدخول إلى Travel')}
              {mode === 'signup' && (language === 'en' ? 'Create your account' : 'إنشاء حسابك')}
              {mode === 'forgot-password' && (language === 'en' ? 'Reset your password' : 'إعادة تعيين كلمة المرور')}
            </h1>
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
            {mode !== 'forgot-password' || mode === 'forgot-password' ? (
              <div>
                <div className="relative">
                  <Mail className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                      isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'
                    }`}
                    placeholder={language === 'en' ? 'Email address' : 'عنوان البريد الإلكتروني'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  />
                </div>
              </div>
            ) : null}

            {/* Username (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <User className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={`w-full py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 transition-all ${
                      username.length > 0 && username.length <= 5 
                        ? 'focus:ring-red-500 bg-red-50' 
                        : 'focus:ring-blue-500'
                    } ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                    placeholder={language === 'en' ? 'Username' : 'اسم المستخدم'}
                    dir="ltr" // Username should always be LTR
                    required
                  />
                </div>
                <p className={`mt-2 text-xs ${
                  username.length > 0 && username.length <= 5 
                    ? 'text-red-500' 
                    : 'text-gray-500'
                } ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'en' 
                    ? 'Must be more than 5 characters. Only lowercase letters, numbers, and underscores.'
                    : 'يجب أن يكون أكثر من 5 أحرف. فقط الأحرف الصغيرة والأرقام والشرطات السفلية.'
                  }
                </p>
              </div>
            )}

            {/* Display Name (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <User className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                      isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'
                    }`}
                    placeholder={language === 'en' ? 'Display name' : 'الاسم المعروض'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {mode !== 'forgot-password' && (
              <div>
                <div className="relative">
                  <Lock className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                      isRTL ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'
                    }`}
                    placeholder={language === 'en' ? 'Password' : 'كلمة المرور'}
                    dir="ltr" // Password should always be LTR
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full ${isRTL ? 'left-2' : 'right-2'}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {mode === 'signup' && (
                  <p className={`mt-2 text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'en' ? 'Must be at least 6 characters' : 'يجب أن تكون على الأقل 6 أحرف'}
                  </p>
                )}
              </div>
            )}

            {/* Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <Lock className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full py-4 bg-gray-100 rounded-lg border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                      isRTL ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'
                    }`}
                    placeholder={language === 'en' ? 'Confirm password' : 'تأكيد كلمة المرور'}
                    dir="ltr" // Password should always be LTR
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full ${isRTL ? 'left-2' : 'right-2'}`}
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
              {loading ? (language === 'en' ? 'Please wait...' : 'يرجى الانتظار...') : (
                mode === 'login' ? (language === 'en' ? 'Sign in' : 'تسجيل الدخول') :
                mode === 'signup' ? (language === 'en' ? 'Create Account' : 'إنشاء حساب') :
                (language === 'en' ? 'Send reset email' : 'إرسال رابط إعادة التعيين')
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="text-center mt-8">
            {mode === 'login' && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => switchMode('forgot-password')}
                  className="text-black hover:text-gray-600 font-medium mb-4"
                >
                  {language === 'en' ? 'Forgot your password?' : 'نسيت كلمة المرور؟'}
                </Button>
                <div className="text-gray-600">
                  {language === 'en' ? "Don't have an account? " : 'لا تملك حساباً؟ '}
                  <Button
                    variant="ghost"
                    onClick={() => switchMode('signup')}
                    className="text-black hover:text-gray-600 p-0 h-auto font-medium underline"
                  >
                    {language === 'en' ? 'Sign up' : 'إنشاء حساب'}
                  </Button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div className="text-gray-600">
                {language === 'en' ? 'Already have an account? ' : 'تملك حساباً؟ '}
                <Button
                  variant="ghost"
                  onClick={() => switchMode('login')}
                  className="text-black hover:text-gray-600 p-0 h-auto font-medium underline"
                >
                  {language === 'en' ? 'Sign in' : 'تسجيل الدخول'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Language Switcher - Bottom Right */}
        <div className="fixed bottom-6 right-6">
          <LanguageToggle 
            variant="outline" 
            size="default"
            showText={false}
            className="shadow-lg bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white"
          />
        </div>
      </div>
    </div>
  );
};