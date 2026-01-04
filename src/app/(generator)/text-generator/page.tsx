'use client';

import GeneratorInput from '@/components/generator/generator-input';
import { RenderMessage } from '@/components/generator/render-message';
import { GradientBlob } from '@/components/gradient-blob';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts: { type: 'text'; text: string }[];
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3002');

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Socket Connected');
      socket.emit('request_history');
    });

    socket.on('qr', (qr: string | null) => {
      setQrCode(qr);
    });

    socket.on('status', (newStatus: string) => {
      setStatus(newStatus);
    });

    socket.on('history_response', (history: any[]) => {
      const formatted: Message[] = history.map((msg, i) => ({
        id: `hist-${i}`,
        role: msg.is_from_me ? 'assistant' : 'user', // is_from_me=true means AI (Assistant)
        content: msg.content,
        parts: [{ type: 'text', text: msg.content }]
      }));
      setMessages(formatted);
    });

    socket.on('ai_response', (text: string) => {
      const aiMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: text,
        parts: [{ type: 'text', text: text }]
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
    });

    socket.on('ai_error', (err: string) => {
      console.error('AI Error:', err);
      setIsThinking(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      parts: [{ type: 'text', text: input }]
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    // Send to worker
    socketRef.current.emit('ui_message', input);
    setInput('');
  };

  // Mimic the useChat structure for RenderMessage
  const chatHandlerMock = {
    messages,
    input,
    handleInputChange: (e: any) => setInput(e.target.value),
    handleSubmit
  };

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

      {/* Main Chat Interface */}
      <div className="flex-1 overflow-y-auto">
        <RenderMessage useChat={chatHandlerMock as any} isThinking={isThinking} />
      </div>

      <div className="px-5 md:px-12 pb-10">
        <form onSubmit={handleSubmit}>
          <GeneratorInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== 'Connected'}
          />
        </form>

        <GradientBlob />
      </div>
    </div>
  );
}
