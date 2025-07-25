'use client';

import React, { useState, useEffect, useRef } from 'react';
import { verifyOTP, sendOTPInSignup } from '@/services/auth-service';

interface OTPComponentProps {
  phoneNumber: string;
  referenceId: string;
  onVerificationSuccess: () => void;
  onVerificationFailure: () => void;
  onResendOTP: (newReferenceId: string) => void;
  onOTPExpired?: () => void; // New optional prop to handle expiration
}

export default function OTPComponent({ 
  phoneNumber, 
  referenceId, 
  onVerificationSuccess, 
  onVerificationFailure,
  onResendOTP,
  onOTPExpired // Add this
}: OTPComponentProps) {
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [disabledResend, setDisabledResend] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isError, setIsError] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  
  // New states for button protection and OTP expiration
  const [isOtpExpired, setIsOtpExpired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Helper function to check if OTP is complete
  const isOtpComplete = otp.every(digit => digit !== '');

      useEffect(() => {
        if (timer > 0) {
          const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
          return () => clearInterval(interval);
        } else {
          // When timer expires, enable resend and mark OTP as expired
          setDisabledResend(false);
          setIsOtpExpired(true);
          
          // Clear the referenceId in parent component
          if (onOTPExpired) {
            onOTPExpired();
          }
        }
      }, [timer, onOTPExpired]);

  const handleChange = (value: string, idx: number) => {
    if (!/^\d?$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    
    if (value && idx < 4) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      const newOtp = [...otp];
      
      // If current field has a value, just clear it
      if (newOtp[idx] !== '') {
        newOtp[idx] = '';
        setOtp(newOtp);
        return;
      }
      
      // If current field is empty, shift all values from right to left
      if (newOtp[idx] === '') {
        // Find the last non-empty field from current position onwards
        let lastFilledIndex = -1;
        for (let i = idx; i < newOtp.length; i++) {
          if (newOtp[i] !== '') {
            lastFilledIndex = i;
          }
        }
        
        // If there are values to the right, shift them left
        if (lastFilledIndex > idx) {
          // Shift all values from idx to lastFilledIndex one position left
          for (let i = idx; i < lastFilledIndex; i++) {
            newOtp[i] = newOtp[i + 1];
          }
          newOtp[lastFilledIndex] = '';
          setOtp(newOtp);
        } else if (idx > 0) {
          // If no values to the right, move to previous field and clear it
          newOtp[idx - 1] = '';
          setOtp(newOtp);
          inputsRef.current[idx - 1]?.focus();
        }
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      
      const newOtp = [...otp];
      
      // Clear current field and shift remaining values left
      if (newOtp[idx] !== '') {
        // Find the last non-empty field from current position onwards
        let lastFilledIndex = -1;
        for (let i = idx; i < newOtp.length; i++) {
          if (newOtp[i] !== '') {
            lastFilledIndex = i;
          }
        }
        
        // Shift all values from idx+1 to lastFilledIndex one position left
        for (let i = idx; i < lastFilledIndex; i++) {
          newOtp[i] = newOtp[i + 1];
        }
        if (lastFilledIndex >= idx) {
          newOtp[lastFilledIndex] = '';
        }
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 5);
    
    if (digits.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && i < 5; i++) {
        newOtp[i] = digits[i];
      }
      // Clear remaining fields if pasted data is shorter
      for (let i = digits.length; i < 5; i++) {
        newOtp[i] = '';
      }
      setOtp(newOtp);
      
      // Focus on the next empty field or the last field
      const nextFocusIndex = Math.min(digits.length, 4);
      inputsRef.current[nextFocusIndex]?.focus();
    }
  };

    const handleVerify = async () => {
    // Prevent duplicate clicks
    if (isVerifying) return;
    
    const code = otp.join('');
    if (code.length !== 5) {
      setIsError(true);
      setModalMessage('Please enter all 5 digits.');
      setIsModalOpen(true);
      return;
    }

    // Check if OTP has expired or referenceId is empty
    if (isOtpExpired || !referenceId) {
      setIsError(true);
      setModalMessage('OTP has expired. Please request a new one.');
      setIsModalOpen(true);
      return;
    }

    setIsVerifying(true); // Disable button

    try {
      const response = await verifyOTP(code, referenceId);
      const { statusCode } = response;
      
      if (statusCode === '1000') {
        setIsVerified(true);
        setIsError(false);
        setModalMessage('OTP Verified Successfully!');
        setIsModalOpen(true);
        setTimeout(() => {
          setIsModalOpen(false);
          onVerificationSuccess();
        }, 2000);
      } else if (statusCode === '1001') {
        setIsError(true);
        setModalMessage('Invalid OTP. Please try again.');
        setIsModalOpen(true);
      } else if (statusCode === '1002' || statusCode === '1003') {
        // Handle expired OTP from server response
        setIsOtpExpired(true);
        setIsError(true);
        setModalMessage('OTP has expired. Please request a new one.');
        setIsModalOpen(true);
      } else {
        setIsError(true);
        setModalMessage('Something went wrong. Please try again.');
        setIsModalOpen(true);
      }
    } catch (error: any) {
      // Check if error indicates expired OTP
      if (error.message && error.message.toLowerCase().includes('expired')) {
        setIsOtpExpired(true);
        setIsError(true);
        setModalMessage('OTP has expired. Please request a new one.');
        setIsModalOpen(true);
      } else {
        setIsError(true);
        setModalMessage('Failed to verify OTP. Try again later.');
        setIsModalOpen(true);
      }
    } finally {
      setIsVerifying(false); // Re-enable button
    }
  };

  const handleResendOTP = async () => {
    // Prevent duplicate clicks
    if (disabledResend || isResending) return;
    
    setIsResending(true); // Disable button during API call
    
    try {
      const countryCode = phoneNumber.substring(0, phoneNumber.length - 10);
      const phone = phoneNumber.substring(countryCode.length);

      console.log('send otp', phone, countryCode);
      
      const res = await sendOTPInSignup(phone, countryCode);
      
      if (res.referenceId) {
        onResendOTP(res.referenceId);
        
        // Reset timer and states
        setTimer(60);
        setDisabledResend(true);
        setIsOtpExpired(false); // Reset expiration status
        setOtp(['', '', '', '', '']); // Clear current OTP inputs
        
        // Reset modal states properly before showing success message
        setIsVerified(false); // Reset verification status
        setIsError(false);
        setModalMessage('New OTP has been sent to your mobile number.');
        setIsModalOpen(true);
        
        // Focus on first input field
        inputsRef.current[0]?.focus();
      } else {
        throw new Error('Failed to get reference ID for new OTP');
      }
    } catch (error: any) {
      setIsError(true);
      setModalMessage(error.message || 'Failed to resend OTP');
      setIsModalOpen(true);
    } finally {
      setIsResending(false); // Re-enable button
    }
  };

  const timerText = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FB] px-4">
      <div className="bg-white rounded-[10px] shadow-xl flex flex-col items-center p-10 w-full max-w-md">
        <h1 className="text-[36px] sm:text-[40px] font-[700] text-center text-[#3E206D] font-inter mb-2">
          MyFarm
        </h1>
        <h2 className="text-lg sm:text-xl font-semibold text-center mb-1 text-[#001535]">
          Please Verify your OTP
        </h2>
        <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
          The OTP has been sent to your mobile number
          {isOtpExpired && (
            <span className="block text-red-500 mt-1 font-medium">
              OTP has expired. Please request a new one.
            </span>
          )}
        </p>

        <div className="flex justify-center space-x-2 sm:space-x-3 mb-4">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputsRef.current[idx] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(e.target.value, idx)}
              onKeyDown={e => handleKeyDown(e, idx)}
              onPaste={handlePaste}
              placeholder="×"
              className="w-10 sm:w-11 h-10 sm:h-11 text-center border border-gray-300 rounded-md text-xl sm:text-2xl focus:outline-none focus:border-[#3E206D] placeholder:text-[#DCDCDC]"
              disabled={isOtpExpired}
            />
          ))}
        </div>

        <div className="text-xs sm:text-sm text-gray-500 text-center mb-1">
          I didn't receive the OTP message
        </div>
        <button
          onClick={handleResendOTP}
          disabled={disabledResend || isResending}
          className={`text-xs sm:text-sm mb-6 ${
            disabledResend || isResending
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-[#3E206D] font-semibold hover:underline cursor-pointer'
          }`}
        >
          {isResending 
            ? 'Sending...' 
            : disabledResend 
              ? `Resend in ${timerText}` 
              : 'Resend OTP'
          }
        </button>

        <button
          onClick={handleVerify}
          disabled={isVerifying || isOtpExpired || !isOtpComplete}
          className={`font-semibold w-full max-w-[307px] h-[45px] rounded-[10px] mt-1 transition-colors ${
            isVerifying || isOtpExpired || !isOtpComplete
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-[#3E206D] text-white hover:bg-[#2D1A4F] cursor-pointer'
          }`}
        >
          {isVerifying ? 'Verifying...' : isOtpExpired ? 'OTP Expired' : !isOtpComplete ? 'Enter 5 digits' : 'Verify'}
        </button>

        <button
          onClick={onVerificationFailure}
          className="text-[#3E206D] font-semibold mt-4 hover:underline"
        >
          Back to Registration
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl text-center w-[90%] max-w-md shadow-xl">
            <img
              src={isError ? '/images/wrong.png' : '/images/correct.png'}
              alt={isError ? 'Error' : 'Success'}
              className="w-20 h-20 mx-auto mb-4"
            />
            <h2 className="text-xl font-bold mb-2">
              {isError ? 'Error' : 'OTP Verified'}
            </h2>
            <p className="text-gray-700 mb-4">{modalMessage}</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}