import React, { useState, useEffect } from 'react';
import { Sparkles, Github, Star, Circle, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../Common/ThemeToggle';
import { Theme } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface LoginPageProps {
  theme: Theme;
  toggleTheme: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ theme, toggleTheme }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for a confirmation link!');
          setEmail('');
          setPassword('');
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderSlideOne = () => (
    <svg viewBox="0 0 400 240" className="w-full h-auto drop-shadow-sm">
        {/* Central Spark Idea */}
        <circle cx="200" cy="120" r="40" fill={theme === 'light' ? '#FCD34D' : '#F59E0B'} fillOpacity="0.2" className="animate-pulse" />
        <circle cx="200" cy="120" r="25" fill={theme === 'light' ? '#F59E0B' : '#D97706'} className="transition-all duration-1000 ease-in-out" />
        <path d="M200 80 L200 60 M200 160 L200 180 M160 120 L140 120 M240 120 L260 120 M170 90 L155 75 M230 90 L245 75 M170 150 L155 165 M230 150 L245 165"
              stroke={theme === 'light' ? '#F59E0B' : '#FCD34D'} strokeWidth="3" strokeLinecap="round" className="animate-ping" style={{animationDuration: '3s'}} />

        <text x="200" y="125" fontFamily='"Architects Daughter", cursive' fontSize="20" textAnchor="middle" fill="white" className="font-bold">Idea</text>

        {/* Floating particles */}
        <circle cx="100" cy="80" r="5" fill="#60A5FA" fillOpacity="0.6" className="animate-bounce" style={{animationDelay: '0.1s'}} />
        <circle cx="300" cy="180" r="8" fill="#F472B6" fillOpacity="0.6" className="animate-bounce" style={{animationDelay: '0.5s'}} />
        <rect x="50" y="160" width="10" height="10" transform="rotate(15)" fill="#34D399" fillOpacity="0.6" className="animate-bounce" style={{animationDelay: '0.9s'}} />
    </svg>
  );

  const renderSlideTwo = () => (
    <svg viewBox="0 0 400 240" className="w-full h-auto drop-shadow-sm">
        {/* Flow Chart / Connection */}
        <g className="transition-all duration-700 transform translate-y-0">
            {/* Left Node */}
            <rect x="60" y="90" width="80" height="60" rx="12" fill={theme === 'light' ? '#93C5FD' : '#3B82F6'} fillOpacity="0.8" />
            <text x="100" y="125" fontFamily='"Architects Daughter", cursive' fontSize="14" textAnchor="middle" fill="white">Draft</text>

            {/* Middle Node */}
            <rect x="260" y="90" width="80" height="60" rx="12" fill={theme === 'light' ? '#F87171' : '#EF4444'} fillOpacity="0.8" />
            <text x="300" y="125" fontFamily='"Architects Daughter", cursive' fontSize="14" textAnchor="middle" fill="white">Review</text>

            {/* Arrow connecting */}
            <path d="M145 120 L255 120" stroke={theme === 'light' ? '#9CA3AF' : '#6B7280'} strokeWidth="2" strokeDasharray="6,4" />
            <path d="M250 115 L260 120 L250 125" fill={theme === 'light' ? '#9CA3AF' : '#6B7280'} />

            {/* Chat bubbles indicating collab */}
            <path d="M180 80 Q 200 80 200 100 Q 200 110 190 115 L 180 125 L 185 115 Q 160 115 160 100 Q 160 80 180 80" fill={theme === 'light' ? '#E5E7EB' : '#374151'} />
            <text x="180" y="105" fontFamily='sans-serif' fontSize="20" textAnchor="middle">&#128172;</text>

            {/* Avatar Circles */}
            <circle cx="190" cy="150" r="15" fill="#FCD34D" stroke="white" strokeWidth="2" />
            <circle cx="210" cy="150" r="15" fill="#A78BFA" stroke="white" strokeWidth="2" />
        </g>
    </svg>
  );

  const renderSlideThree = () => (
    <svg viewBox="0 0 400 240" className="w-full h-auto drop-shadow-sm">
        {/* Alive Board - Busy and Colorful */}
        <rect x="40" y="40" width="60" height="60" rx="4" fill="#FCD34D" transform="rotate(-5 70 70)" opacity="0.9" />
        <rect x="150" y="30" width="100" height="40" rx="20" fill="#A78BFA" opacity="0.9" />
        <rect x="280" y="60" width="70" height="70" rx="8" fill="#F87171" transform="rotate(10 315 95)" opacity="0.9" />

        <circle cx="90" cy="160" r="30" fill="#60A5FA" opacity="0.8" />
        <polygon points="200,120 220,160 180,160" fill="#34D399" opacity="0.8" transform="translate(20, 20)" />

        {/* Connections */}
        <path d="M100 80 Q 130 100 150 70" stroke={theme === 'light' ? '#D1D5DB' : '#4B5563'} strokeWidth="2" fill="none" strokeDasharray="4,4" />
        <path d="M250 60 Q 270 80 280 100" stroke={theme === 'light' ? '#D1D5DB' : '#4B5563'} strokeWidth="2" fill="none" strokeDasharray="4,4" />
        <path d="M120 160 Q 160 180 200 160" stroke={theme === 'light' ? '#D1D5DB' : '#4B5563'} strokeWidth="2" fill="none" />

        {/* Small stars/sparkles */}
        <path d="M350 40 L355 50 L365 50 L358 58 L360 68 L350 62 L340 68 L342 58 L335 50 L345 50 Z" fill="#FBBF24" className="animate-spin-slow" style={{transformOrigin: '350px 55px'}} />
        <circle cx="50" cy="200" r="5" fill="#F472B6" className="animate-ping" style={{animationDuration: '2s'}} />

        <text x="200" y="220" fontFamily='"Architects Daughter", cursive' fontSize="16" textAnchor="middle" fill={theme === 'light' ? '#4B5563' : '#D1D5DB'}>So many ideas!</text>
    </svg>
  );

  return (
    <div className="min-h-screen w-full bg-cream-100 dark:bg-ink-900 flex items-center justify-center p-4 lg:p-8 transition-colors duration-500 overflow-hidden relative">

      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 text-orange-300 dark:text-orange-900 opacity-50 transform -rotate-12 animate-float">
        <Sparkles size={64} />
      </div>
      <div className="absolute bottom-20 right-20 text-yellow-300 dark:text-yellow-900 opacity-50 transform rotate-12 animate-float" style={{animationDelay: '1s'}}>
        <Sparkles size={80} />
      </div>
      <div className="absolute top-1/3 right-10 text-pink-300 dark:text-pink-900 opacity-30 transform rotate-45 animate-pulse">
        <Star size={48} />
      </div>
      <div className="absolute bottom-1/4 left-20 text-blue-300 dark:text-blue-900 opacity-30 transform -rotate-12">
        <Circle size={32} />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">

        {/* Left Side: Branding & Illustration Carousel */}
        <div className="flex flex-col items-start space-y-8 animate-fade-in-up">
          <div className="flex items-center space-x-3">
             <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-hard dark:shadow-none text-white transform hover:rotate-6 transition-transform cursor-default">
                <Sparkles size={24} fill="currentColor" />
             </div>
             <h1 className="text-4xl font-bold font-hand text-ink-800 dark:text-cream-50 tracking-wide">
               Lumina Board
             </h1>
          </div>

          <div className="relative group w-full max-w-lg">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl p-8 shadow-hard-md dark:shadow-hard-dark min-h-[300px] flex flex-col justify-between">

               {/* Animated Slide Content */}
               <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                   <div className={`transition-opacity duration-500 absolute inset-0 flex items-center justify-center ${currentSlide === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      {renderSlideOne()}
                   </div>
                   <div className={`transition-opacity duration-500 absolute inset-0 flex items-center justify-center ${currentSlide === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      {renderSlideTwo()}
                   </div>
                   <div className={`transition-opacity duration-500 absolute inset-0 flex items-center justify-center ${currentSlide === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      {renderSlideThree()}
                   </div>
               </div>

               {/* Caption Text - Changes with Slide */}
               <div className="mt-6 text-center h-16">
                  <div className={`transition-all duration-500 ${currentSlide === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 hidden'}`}>
                    <h3 className="font-hand text-2xl font-bold text-ink-800 dark:text-cream-100 mb-1">Start with a Spark</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Capture your initial thoughts instantly.</p>
                  </div>
                  <div className={`transition-all duration-500 ${currentSlide === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 hidden'}`}>
                    <h3 className="font-hand text-2xl font-bold text-ink-800 dark:text-cream-100 mb-1">Flow Together</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Collaborate in real-time with your team.</p>
                  </div>
                  <div className={`transition-all duration-500 ${currentSlide === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 hidden'}`}>
                    <h3 className="font-hand text-2xl font-bold text-ink-800 dark:text-cream-100 mb-1">Light Up Ideas</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Turn chaos into beautiful, organized plans.</p>
                  </div>
               </div>

               {/* Slide Indicators */}
               <div className="mt-4 flex justify-center space-x-2">
                 {[0, 1, 2].map((idx) => (
                   <button
                     key={idx}
                     onClick={() => setCurrentSlide(idx)}
                     className={`h-2 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-6 bg-orange-500' : 'w-2 bg-gray-300 dark:bg-zinc-600 hover:bg-orange-300'}`}
                   />
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="flex flex-col items-center">
            <div className="w-full max-w-md bg-cream-50 dark:bg-zinc-800 rounded-3xl p-8 lg:p-10 shadow-hard dark:shadow-hard-dark border border-cream-200 dark:border-zinc-700">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-ink-900 dark:text-white">
                    {showEmailForm ? (isSignUp ? 'Create Account' : 'Welcome Back') : 'Hi there!'}
                  </h2>
                  <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {message && (
                  <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 text-sm">
                    {message}
                  </div>
                )}

                {!showEmailForm ? (
                  <>
                    <p className="text-sm text-ink-400 mb-6 font-medium">Choose provider to sign-in.</p>

                    <div className="grid grid-cols-1 gap-4 mb-6">
                       <button
                         onClick={handleGoogleSignIn}
                         disabled={loading}
                         className="flex items-center justify-center py-3 px-4 border-2 border-gray-200 dark:border-zinc-600 rounded-xl hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-zinc-700 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          {loading ? (
                            <Loader2 size={20} className="mr-2 animate-spin" />
                          ) : (
                            <div className="w-6 h-6 mr-2 bg-gradient-to-tr from-blue-500 to-green-500 rounded-full group-hover:scale-110 transition-transform"></div>
                          )}
                          <span className="font-semibold text-ink-800 dark:text-gray-200">Continue with Google</span>
                       </button>
                    </div>

                    <div className="relative flex py-5 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-zinc-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-widest font-hand">or</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-zinc-700"></div>
                    </div>

                    <button
                      onClick={() => setShowEmailForm(true)}
                      className="w-full py-3 px-4 border-2 border-gray-200 dark:border-zinc-600 rounded-xl hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
                    >
                      <Mail size={20} className="mr-2 text-orange-500" />
                      <span className="font-semibold text-ink-800 dark:text-gray-200">Continue with Email</span>
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">Email</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-ink-800 dark:text-gray-200 focus:border-orange-500 dark:focus:border-orange-400 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink-700 dark:text-gray-300 mb-1">Password</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Enter your password"
                          minLength={6}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-ink-800 dark:text-gray-200 focus:border-orange-500 dark:focus:border-orange-400 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        isSignUp ? 'Create Account' : 'Sign In'
                      )}
                    </button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => setShowEmailForm(false)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Back to providers
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          setError(null);
                          setMessage(null);
                        }}
                        className="text-orange-500 hover:text-orange-600 font-medium"
                      >
                        {isSignUp ? 'Already have an account?' : 'Create an account'}
                      </button>
                    </div>
                  </form>
                )}
            </div>

            <p className="mt-8 text-xs text-gray-400 text-center max-w-xs leading-relaxed">
              By continuing you are agreeing to our
              <br />
              <span className="underline cursor-pointer hover:text-orange-500">Terms of Use</span> and <span className="underline cursor-pointer hover:text-orange-500">Privacy Policy</span>
            </p>
        </div>
      </div>
    </div>
  );
};
