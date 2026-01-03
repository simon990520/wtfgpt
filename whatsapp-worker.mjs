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

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_KEY is missing in .env");
    process.exit(1);
}

// Supabase Setup
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

            const whatsappId = msg.key.remoteJid; // 123@s.whatsapp.net or 123@g.us
            const isGroup = whatsappId.endsWith('@g.us');

            // Extract content reliably
            const content = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                msg.message.videoMessage?.caption ||
                msg.message.buttonsResponseMessage?.selectedDisplayText ||
                msg.message.listResponseMessage?.title ||
                "[Media/Other]";

            const isFromMe = msg.key.fromMe;
            const timestamp = new Date(msg.messageTimestamp * 1000).toISOString();
            const whatsappMessageId = msg.key.id;

            logger.info({
                whatsappId,
                isGroup,
                isFromMe,
                contentSnippet: content.substring(0, 50)
            }, `Syncing message to Supabase`);

            // Save to Supabase
            const { error } = await supabase
                .from('messages')
                .upsert({
                    whatsapp_message_id: whatsappMessageId,
                    whatsapp_id: whatsappId,
                    content: content,
                    is_from_me: isFromMe,
                    timestamp: timestamp
                }, { onConflict: 'whatsapp_message_id' });

            if (error) {
                logger.error({ error, whatsappMessageId }, 'Error saving message to Supabase');
            }
        }
    });

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
        if (sock && sock.user) {
            socket.emit('status', 'Connected');
        } else {
            socket.emit('status', 'Disconnected');
        }
    });

    return sock;
}

server.listen(PORT, () => {
    logger.info(`WhatsApp Worker Server running on port ${PORT}`);
    connectToWhatsApp().catch(err => logger.error("Error in WhatsApp connection: " + err));
});
