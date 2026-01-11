'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'EMAIL_VERIFICATION';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const codeString = code.join('');
    if (codeString.length !== 6) {
      toast.error('Please enter 6-digit code');
      return;
    }

    setLoading(true);

    if (type === 'EMAIL_VERIFICATION') {
      const response = await api.post('/api/auth/verify', { email, code: codeString });
      setLoading(false);

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success('Email verified successfully!');
        router.push('/login');
      }
    } else if (type === 'PASSWORD_RESET') {
      router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${codeString}`);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) {
      toast.error(`Please wait ${timeLeft} seconds before resending`);
      return;
    }

    setResending(true);
    const response = await api.post('/api/auth/resend-code', { email, type });
    setResending(false);

    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success('Code resent successfully!');
      setTimeLeft(60);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Verification</h2>
        <p className="text-gray-600 mb-6 text-center">
          Enter your 6 digits code that you received on your email.
        </p>

        <div className="flex justify-center space-x-2 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`code-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="text-orange-500 text-lg font-semibold">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || code.join('').length !== 6}
          className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-light disabled:opacity-50 mb-4"
        >
          {loading ? 'Verifying...' : type === 'EMAIL_VERIFICATION' ? 'VERIFY' : 'CONTINUE'}
        </button>

        <div className="text-center">
          <span className="text-gray-600">If you didn't receive a code! </span>
          <button
            onClick={handleResend}
            disabled={resending || timeLeft > 0}
            className="text-orange-500 hover:underline disabled:opacity-50"
          >
            Resend
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-600 hover:underline">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
