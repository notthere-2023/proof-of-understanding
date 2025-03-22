import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Message {
  sender: string;
  content: string;
}

interface Props {
  messages: Message[];
  onClose: () => void;
}

function UnderstandingProofDialog({ messages, onClose }: Props) {
  const handleClarify = (message: Message) => {
    // Implementation of handleClarify
  };

  const handleConfirmUnderstanding = (message: Message) => {
    // Implementation of handleConfirmUnderstanding
  };

  const handleAskQuestion = (message: Message) => {
    // Implementation of handleAskQuestion
  };

  const handleParaphrase = (message: Message) => {
    // Implementation of handleParaphrase
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative max-h-[80vh] w-[80vw] overflow-y-auto rounded-lg bg-white p-6">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="mb-2 text-gray-600">
                消息 {index + 1}:
              </div>
              <div className="mb-4 whitespace-pre-wrap">{message.content}</div>
              
              <div className="flex justify-end space-x-2">
                <button
                  className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  onClick={() => handleClarify(message)}
                >
                  澄清
                </button>
                <button
                  className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                  onClick={() => handleConfirmUnderstanding(message)}
                >
                  确认理解
                </button>
                <button
                  className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
                  onClick={() => handleAskQuestion(message)}
                >
                  提问
                </button>
                <button
                  className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
                  onClick={() => handleParaphrase(message)}
                >
                  复述
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UnderstandingProofDialog; 