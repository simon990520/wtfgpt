'use client';

import GeneratorInput from '@/components/generator/generator-input';
import { RenderMessage } from '@/components/generator/render-message';
import { GradientBlob } from '@/components/gradient-blob';
import { useChat } from '@ai-sdk/react';
import { createIdGenerator } from 'ai';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export default function Page() {
  const [isThinking, setIsThinking] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Disconnected');

  const chatHandler = useChat({
    generateId: createIdGenerator({ prefix: 'msgc' }),
    sendExtraMessageFields: true,
    onResponse: () => setIsThinking(false),
  });

  useEffect(() => {
    const socket: Socket = io('http://localhost:3002');

    socket.on('qr', (qr: string | null) => {
      setQrCode(qr);
    });

    socket.on('status', (newStatus: string) => {
      setStatus(newStatus);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="contents">
      {status !== 'Connected' && (
        <div className="flex flex-col items-center justify-center p-10 bg-white/10 backdrop-blur-md rounded-2xl m-5 border border-white/20">
          <h2 className="text-xl font-bold mb-4 text-white">Conexión de WhatsApp</h2>
          <div className={`px-4 py-2 rounded-full text-sm font-medium mb-6 ${status === 'Connected' ? 'bg-green-500/20 text-green-400' :
            status === 'Connecting' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
            Estado: {status}
          </div>

          {qrCode ? (
            <div className="bg-white p-4 rounded-xl shadow-xl">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              <p className="text-gray-800 text-center mt-4 font-medium">Escanea este código con WhatsApp</p>
            </div>
          ) : status !== 'Connected' ? (
            <div className="text-white/70 animate-pulse">
              Esperando código QR...
            </div>
          ) : null}
        </div>
      )}

      {status === 'Connected' && (
        <RenderMessage useChat={chatHandler} isThinking={isThinking} />
      )}

      <div className="px-5 md:px-12">
        <form
          onSubmit={(e) => {
            setIsThinking(true);
            chatHandler.handleSubmit(e);
          }}
        >
          <GeneratorInput
            value={chatHandler.input}
            onChange={chatHandler.handleInputChange}
            disabled={status !== 'Connected'}
          />
        </form>

        <GradientBlob />
      </div>
    </div>
  );
}
