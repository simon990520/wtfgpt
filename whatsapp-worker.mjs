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
import path from 'path';
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.WORKER_PORT || 3001;

// Logger
const logger = pino({ level: 'info' });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    logger.info(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
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
            const shouldReconnect = (lastDisconnectError instanceof Boom) ?
                lastDisconnectError.output.statusCode !== DisconnectReason.loggedOut : true;
            logger.info('Connection closed due to ' + lastDisconnectError + ', reconnecting ' + shouldReconnect);
            io.emit('status', 'Disconnected');
            if (shouldReconnect) {
                connectToWhatsApp();
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

    io.on('connection', (socket) => {
        logger.info('Frontend client connected to WebSocket');
        // Send current status immediately
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
