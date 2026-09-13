import React, { useState } from 'react';
import { loginUser } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { loginUser: contextLogin } = useAuth(); // Get login function from context

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { data } = await loginUser(formData);
      // Save token and user data consistently through context / localStorage
      localStorage.setItem('token', data.token);
      contextLogin(data.user); 
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-cream text-gray-800 overflow-hidden">
      
      {/* Left Split: Brand Graphic Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-peri-dark p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-peri-mid opacity-30 blur-2xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-peri-light opacity-20 blur-2xl"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-peri-dark flex items-center justify-center font-black text-base shadow-lg">
            DC
          </div>
          <span className="text-white font-black tracking-wider text-sm uppercase">DevCode</span>
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <span className="px-3 py-1 bg-white/10 text-peri-light rounded-lg text-xs font-bold uppercase tracking-widest border border-white/10">
            Secure Portal
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-white mt-4 tracking-tight leading-tight">
            Code together, seamlessly anywhere.
          </h1>
          <p className="text-sm text-peri-light/80 mt-4 leading-relaxed font-medium">
            Jump straight back into your development workflow, code rooms, and assignments.
          </p>
        </div>

        <div className="relative z-10 text-xs text-peri-light/60 font-medium">
          &copy; {new Date().getFullYear()} DevCode. All rights reserved.
        </div>
      </div>

      {/* Right Split: Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-cream overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          
          <div className="space-y-2">
            <div className="lg:hidden w-10 h-10 rounded-xl bg-peri-dark text-white flex items-center justify-center font-black text-sm mb-4">
              DC
            </div>
            <h2 className="text-3xl font-black text-peri-dark tracking-tight">Sign In</h2>
            <p className="text-xs text-gray-500 font-medium">Enter your credentials to access your developer workspace.</p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-peri-dark">Email Address</label>
              <input 
                type="email" 
                placeholder="name@company.com" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3.5 bg-white rounded-2xl border border-peri-mid focus:outline-none focus:ring-2 focus:ring-peri-dark text-gray-800 placeholder-gray-400 text-xs font-medium transition shadow-sm" 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-peri-dark">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••••••" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-3.5 pr-12 bg-white rounded-2xl border border-peri-mid focus:outline-none focus:ring-2 focus:ring-peri-dark text-gray-800 placeholder-gray-400 text-xs font-medium transition shadow-sm" 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-peri-dark focus:outline-none transition"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 mt-2 bg-peri-dark hover:bg-peri-mid active:scale-[0.99] text-white rounded-2xl font-bold text-xs transition duration-200 shadow-lg shadow-peri-dark/20 disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 font-medium">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-peri-dark font-bold hover:underline">
                Create one now
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}