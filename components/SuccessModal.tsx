'use client';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onContinue: () => void;
}

export default function SuccessModal({ isOpen, title, message, onContinue }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onContinue}
          className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-light"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
