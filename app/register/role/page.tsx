'use client';

import { useRouter } from 'next/navigation';

export default function RoleSelectionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              📍
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Event Map</h1>
          <h2 className="text-2xl font-semibold mt-8">Choose your account type</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center flex flex-col h-full">
            <h3 className="text-2xl font-bold mb-4">For User</h3>
            <p className="text-gray-600 mb-6 flex-grow">
              An account for viewing, searching, and saving favorite events
            </p>
            <button
              onClick={() => router.push('/register/user')}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-light font-semibold"
            >
              SIGN UP
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center flex flex-col h-full">
            <h3 className="text-2xl font-bold mb-4">For Hoster</h3>
            <p className="text-gray-600 mb-6 flex-grow">
              An account used to create and manage events
            </p>
            <button
              onClick={() => router.push('/register/hoster')}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-light font-semibold"
            >
              SIGN UP
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:underline"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
