import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import qrcode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { pipeline } from '@huggingface/transformers';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.WORKER_PORT || 3002;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !DEEPSEEK_API_KEY) {
    console.error("CRITICAL ERROR: SUPABASE or DEEPSEEK credentials missing in .env");
    process.exit(1);
}

// Supabase Setup
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DeepSeek Setup
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: DEEPSEEK_API_KEY,
});

// Global variable for embedding pipeline
let embedder = null;

async function getEmbedder() {
    if (!embedder) {
        logger.info('Initializing local embedding model (Xenova/all-MiniLM-L6-v2)...');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        logger.info('Embedding model loaded successfully');
    }
    return embedder;
}

async function generateEmbedding(text) {
    try {
        const pipe = await getEmbedder();
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    } catch (err) {
        logger.error({ err }, 'Error generating embedding');
        return null;
    }
}

// Logger
const logger = pino({ level: 'info' });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    logger.info(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            logger.info('QR received, sending to frontend');
            const qrImageUrl = await qrcode.toDataURL(qr);
            io.emit('qr', qrImageUrl);
        }

        if (connection === 'close') {
            const lastDisconnectError = lastDisconnect?.error;
            const statusCode = (lastDisconnectError instanceof Boom) ?
                lastDisconnectError.output.statusCode : 0;

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            logger.info({ statusCode, error: lastDisconnectError }, `Connection closed. Reconnecting: ${shouldReconnect}`);

            io.emit('status', 'Disconnected');

            if (shouldReconnect) {
                logger.info('Waiting 5 seconds before reconnecting...');
                setTimeout(() => {
                    connectToWhatsApp().catch(err => logger.error("Error in WhatsApp reconnection: " + err));
                }, 5000);
            }
        } else if (connection === 'open') {
            logger.info('Opened connection');
            io.emit('status', 'Connected');
            io.emit('qr', null); // Clear QR code on frontend
        } else if (connection === 'connecting') {
            io.emit('status', 'Connecting');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Listen for incoming messages (Private & Groups)
    sock.ev.on('messages.upsert', async (m) => {
        for (const msg of m.messages) {
            try {
                if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

                const whatsappId = msg.key.remoteJid;
                const isGroup = whatsappId.endsWith('@g.us');
                const isFromMe = msg.key.fromMe;
                const whatsappMessageId = msg.key.id;

                const content = msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption ||
                    msg.message.buttonsResponseMessage?.selectedDisplayText ||
                    msg.message.listResponseMessage?.title ||
                    "[Media/Other]";

                logger.info(`📥 [MSG] From: ${whatsappId} | Me: ${isFromMe} | Group: ${isGroup}`);
                logger.info(`📝 [Content]: ${content.substring(0, 50)}`);

                // 1. Save Message to Supabase
                const timestamp = new Date(msg.messageTimestamp * 1000).toISOString();
                const { data: savedMsg, error: msgError } = await supabase
                    .from('messages')
                    .upsert({
                        whatsapp_message_id: whatsappMessageId,
                        whatsapp_id: whatsappId,
                        content: content,
                        is_from_me: isFromMe,
                        timestamp: timestamp
                    }, { onConflict: 'whatsapp_message_id' })
                    .select()
                    .single();

                if (msgError) {
                    logger.error(`❌ [DB Error] Saving message: ${msgError.message}`);
                    continue;
                }
                logger.info(`✅ [DB] Message saved (ID: ${savedMsg.id})`);

                // 2. Generate and Save Vector Embedding
                logger.info(`🧠 [AI] Generating embedding...`);
                const embedding = await generateEmbedding(content);
                if (embedding) {
                    const { error: metaError } = await supabase
                        .from('message_metadata')
                        .upsert({
                            message_id: savedMsg.id,
                            embedding: embedding
                        }, { onConflict: 'message_id' });

                    if (metaError) {
                        logger.error(`❌ [DB Error] Saving embedding: ${metaError.message}`);
                    } else {
                        logger.info(`✅ [DB] Embedding saved`);
                    }
                }

                // 3. AI Response Logic (Only for incoming private messages)
                if (!isFromMe && !isGroup) {
                    logger.info(`🤖 [AI] Starting response flow for WA: ${whatsappId}...`);
                    // We pass null for socket because this is a WhatsApp-originated message
                    await handleAIResponse(sock, whatsappId, content, embedding, null);
                } else if (isGroup) {
                    logger.info(`👥 [SKIP] Group message ignored for AI response`);
                }

            } catch (err) {
                logger.error(`💥 [CRITICAL] Error in message processing loop: ${err.message}`);
            }
        }
    });

    async function handleAIResponse(sock, whatsappId, incomingText, currentEmbedding, socket = null) {
        try {
            // A. Get Recent Context
            logger.info(`📚 [RAG] Fetching recent context for ${whatsappId}...`);
            const { data: recentMessagesContent, error: recentError } = await supabase
                .from('messages')
                .select('content, is_from_me')
                .eq('whatsapp_id', whatsappId)
                .order('timestamp', { ascending: false })
                .limit(10);

            if (recentError) logger.error(`❌ [DB Error] Recent messages: ${recentError.message}`);

            let formattedRecent = "";
            if (recentMessagesContent) {
                formattedRecent = recentMessagesContent
                    .reverse()
                    .map(m => `${m.is_from_me ? 'Bot' : 'Usuario'}: ${m.content}`)
                    .join('\n');
            }

            // B. Get Semantic Context (RAG)
            let semanticContext = "";
            if (currentEmbedding) {
                logger.info(`🔍 [RAG] Searching semantic memory...`);
                const { data: matches, error: ragError } = await supabase.rpc('match_messages', {
                    query_embedding: currentEmbedding,
                    match_threshold: 0.7,
                    match_count: 5,
                    p_whatsapp_id: whatsappId
                });

                if (ragError) {
                    logger.error(`❌ [DB Error] RAG similarity search: ${ragError.message}`);
                } else if (matches && matches.length > 0) {
                    logger.info(`✨ [RAG] Found ${matches.length} similar messages`);
                    semanticContext = matches.map(m => m.content).join('\n---\n');
                } else {
                    logger.info(`⚪ [RAG] No similar messages found`);
                }
            }

            // C. Call DeepSeek
            logger.info(`☁️ [DeepSeek] Calling API...`);
            const systemPrompt = `Eres WTF-AI, un asistente de WhatsApp y Web inteligente y directo.
            
            CONTEXTO RECIENTE DE LA CONVERSACIÓN:
            ${formattedRecent}
            
            INFORMACIÓN RELEVANTE RECUPERADA (RAG):
            ${semanticContext}
            
            INSTRUCCIONES:
            - Responde de forma natural, amigable pero profesional.
            - Mantén tus respuestas breves y directas.
            - Si el usuario te pide una ACCIÓN (ej: agendar cita, enviar catálogo), menciona que estás procesando la solicitud.
            - Usa el contexto reciente y la información relevante para ser ultra preciso.
            - Si no sabes algo, no inventes, simplemente ofrece ayuda para escalar el tema.`;

            const completion = await deepseek.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: incomingText }
                ],
                model: "deepseek-chat",
            });

            const aiResponse = completion.choices[0].message.content;
            logger.info(`💬 [AI Response]: ${aiResponse.substring(0, 50)}...`);

            // D. Send Response back
            if (socket) {
                logger.info(`📤 [UI] Sending response to frontend...`);
                socket.emit('ai_response', aiResponse);
            }

            // ONLY send to WhatsApp if the ID is a valid WhatsApp JID and NOT a web-user
            const isWhatsAppUser = whatsappId && whatsappId.includes('@');
            if (sock && isWhatsAppUser && !whatsappId.includes('web-user')) {
                logger.info(`📤 [WA] Sending message to ${whatsappId}...`);
                await sock.sendMessage(whatsappId, { text: aiResponse });
            }

            logger.info(`🚀 [SUCCESS] Response sent successfully`);

            // E. Save AI Response to Supabase for context
            await supabase.from('messages').insert({
                whatsapp_id: whatsappId,
                content: aiResponse,
                is_from_me: true,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            logger.error(`❌ [AI Error] HandleAIResponse failed: ${err.message}`);
            if (socket) socket.emit('ai_error', err.message);
        }
    }

    // Listen for contact updates
    sock.ev.on('contacts.upsert', async (contacts) => {
        for (const contact of contacts) {
            const { error } = await supabase
                .from('contacts')
                .upsert({
                    whatsapp_id: contact.id,
                    name: contact.name || contact.notify || contact.verifiedName || null
                }, { onConflict: 'whatsapp_id' });

            if (error) {
                logger.error({ error, contactId: contact.id }, 'Error syncing contact');
            }
        }
    });

    io.on('connection', (socket) => {
        logger.info('Frontend client connected to WebSocket');
        if (sock && sock.user) socket.emit('status', 'Connected');
        else socket.emit('status', 'Disconnected');

        // Listen for messages from the Web UI
        socket.on('ui_message', async (text) => {
            const userId = "web-user-admin"; // Fixed ID for local testing
            logger.info(`🌐 [UI_MSG] Received: ${text.substring(0, 30)}`);

            try {
                // 1. Save to DB
                const { data: savedMsg } = await supabase.from('messages').insert({
                    whatsapp_id: userId,
                    content: text,
                    is_from_me: false,
                    timestamp: new Date().toISOString()
                }).select().single();

                // 2. Vectorize
                const embedding = await generateEmbedding(text);
                if (embedding && savedMsg) {
                    await supabase.from('message_metadata').insert({
                        message_id: savedMsg.id,
                        embedding: embedding
                    });
                }

                // 3. AI Process
                await handleAIResponse(sock, userId, text, embedding, socket);

            } catch (err) {
                logger.error(`💥 [UI Error]: ${err.message}`);
                socket.emit('ai_error', 'Error procesando tu mensaje');
            }
        });
    });

    return sock;
}

server.listen(PORT, () => {
    logger.info(`WhatsApp Worker Server running on port ${PORT}`);
    connectToWhatsApp().catch(err => logger.error("Error in WhatsApp connection: " + err));
});
