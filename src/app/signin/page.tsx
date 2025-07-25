
'use client';

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { GoogleLoginButton, FacebookLoginButton } from 'react-social-login-buttons';
import { getCartInfo, login } from '@/services/auth-service';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SuccessPopup from '@/components/toast-messages/success-message';
import ErrorPopup from '@/components/toast-messages/error-message';
import { Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import LoginImg from '../../../public/images/login.png'

const Page = () => {
  const router = useRouter();
  const [userType, setUserType] = useState('Retail');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const dispatch = useDispatch();
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load saved credentials from localStorage on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!valid) return;

    try {
      setIsLoading(true);
      const data = await login({ email, password, buyerType: userType });

      setShowSuccessPopup(true);
      console.log('token details', data.userData, data.token, data.cart);
      
      // Store token and credentials
      if (data.token) {
        dispatch(setCredentials({ token: data.token, user: data.userData, cart: data.userData.cart }));

        // Save credentials to localStorage if "Remember me" is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }

        if (data.userData.buyerType === 'Retail') {
          router.push('/'); // Redirect to home page
        } else if (data.userData.buyerType === 'Wholesale') {
          router.push('/wholesale/home'); // Redirect to wholesale page
        }

      }
    } catch (err: any) {
      setShowErrorPopup(true);

      const message = err.message;

      if (message === 'Wrong password.') {
        setPasswordError('Incorrect password. Please try again!');
        setEmailError('');
      } else if (message === 'User not found.' || message === 'Invalid buyer type.') {
        // Treat invalid buyer type as "User not found"
        setPasswordError('');
        setEmailError('');
      } else {
        // Generic error
        setEmailError('');
        setPasswordError('');
      }

    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <SuccessPopup
        isVisible={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title="Signed in!"
        description="Let's find something amazing today"
      />
      <ErrorPopup
        isVisible={showErrorPopup}
        onClose={() => setShowErrorPopup(false)}
        title="Oops!"
        description={
          passwordError
            ? 'Incorrect password. Please try again!'
            : emailError
              ? 'Incorrect email. Please try again!'
              : 'User not found. Please check your credentials!'
        }
      />

      {/* Left Panel (Login Form) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-6 md:p-16">
        <h1 className="text-2xl font-bold text-purple-800 mb-2 text-center">MyFarm</h1>
        <h2 className="text-lg font-semibold mb-6 text-center">Log in to your Account</h2>

        {/* Buyer Type Toggle */}
        <div className="flex mb-6 space-x-2">
          <button
            onClick={() => setUserType('Retail')}
            className={`flex-1 px-4 py-2 border rounded-md flex items-center justify-start space-x-2 text-sm sm:text-base cursor-pointer ${userType === 'Retail'
              ? 'bg-purple-100 text-purple-800 border-purple-500'
              : 'bg-white text-gray-800 border-gray-300'
              }`}
          >
            <span
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${userType === 'Retail' ? 'border-purple-800' : 'border-gray-400'
                }`}
            >
              {userType === 'Retail' && <span className="w-2 h-2 bg-purple-800 rounded-full" />}
            </span>
            <span>I’m Buying for Home</span>
          </button>

          <button
            onClick={() => setUserType('Wholesale')}
            className={`flex-1 px-4 py-2 border rounded-md flex items-center justify-start space-x-2 text-sm sm:text-base cursor-pointer ${userType === 'Wholesale'
              ? 'bg-purple-100 text-purple-800 border-purple-500'
              : 'bg-white text-gray-800 border-gray-300'
              }`}
          >
            <span
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${userType === 'Wholesale' ? 'border-purple-800' : 'border-gray-400'
                }`}
            >
              {userType === 'Wholesale' && <span className="w-2 h-2 bg-purple-800 rounded-full" />}
            </span>
            <span>I’m Buying for Business</span>
          </button>

        </div>

        {userType === 'Retail' && (
          <p className="mb-4 text-gray-600">Welcome! Select method to log in:</p>
        )}
        {/* Social Login Buttons */}
        <div className="mb-6">
          {userType === 'Retail' && (
            <div className="flex space-x-4">
              <button className="flex-1 py-2 border rounded-md flex items-center justify-center space-x-2 cursor-pointer ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-4"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Google</span>
              </button>
              <button className="flex-1 py-2 border rounded-md flex items-center justify-center space-x-2 cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-4 text-blue-600"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    fill="#1877F2"
                  />
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          )}
        </div>

        {userType === 'Retail' && (
          <div className="flex items-center mb-6">
            <div className="flex-grow h-px bg-gray-300" />
            <span className="mx-2 text-sm text-gray-400">or continue with email</span>
            <div className="flex-grow h-px bg-gray-300" />
          </div>
        )}

        {/* Email Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              name="email"
              placeholder="Email"
              className={`w-full px-10 py-2 border rounded-md ${emailError ? 'border-red-500' : 'border-gray-300'
                }`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <Mail className="w-5 h-5" />
            </span>
            {emailError && <p className="text-sm text-red-600 mt-1">{emailError}</p>}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              className={`w-full px-10 py-2 border rounded-md ${passwordError ? 'border-red-500' : 'border-gray-300'
                }`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-2.5 text-gray-400"
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-5 h-5" />
            </button>
            {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="accent-[#229e11] cursor-pointer"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link href="/forget-password" className="text-[#094EE8] hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-[#3E206D] text-white py-2 rounded-md mt-4 cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          Don’t have an account?{' '}
          <a href="../signup" className="text-[#094EE8] hover:underline">
            Create an account
          </a>
        </p>
      </div>

      {/* Right Panel (Image) - Hidden on small screens */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-[#3E206D] relative">
        <img
          src={LoginImg as any}
          alt="Farmer"
          className="w-full h-full absolute inset object-cover"
        />
      </div>
    </div>
  );
};

export default Page;