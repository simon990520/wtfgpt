import express from 'express';
import http from 'http';
import { config, logger } from './config/config.mjs';
import { socketService } from './services/socket.service.mjs';
import { whatsappService } from './services/whatsapp.service.mjs';
import { chatController } from './controllers/chat.controller.mjs';

const app = express();
const server = http.createServer(app);

// 1. Initialize Socket.io
const io = socketService.init(server);

// 2. Wire up UI Events
// 2. Wire up UI Events
io.on('connection', (socket) => {
    console.log(`🌐 New Frontend Client Connected (${socket.id})`);

    // IMMEDIATELY Send current status to the new client
    // Note: status is public in our service
    const currentStatus = whatsappService.status;
    socket.emit('status', currentStatus);
    console.log(`📡 Sent initial status to ${socket.id}: ${currentStatus}`);

    // Listen for messages from this client
    socket.on('ui_message', (text) => {
        console.log(`📨 UI Message from ${socket.id}: ${text}`);
        chatController.handleIncomingMessage({
            sock: whatsappService.getSocket(),
            whatsappId: 'web-user-admin',
            content: text,
            isGroup: false,
            isFromMe: false,
            socket
        });
    });

    socket.on('request_history', () => {
        chatController.handleHistoryRequest(socket);
    });
});

// 3. Initialize WhatsApp & Wire up WA Events
// 3. Initialize WhatsApp & Wire up WA Events
whatsappService.onMessage(async (m) => {
    const sock = whatsappService.getSocket();
    if (!sock) return;

    for (const msg of m.messages) {
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

        const content = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "[Media/Other]";

        chatController.handleIncomingMessage({
            sock,
            whatsappId: msg.key.remoteJid,
            content,
            isGroup: msg.key.remoteJid.endsWith('@g.us'),
            isFromMe: msg.key.fromMe
        });
    }
});

whatsappService.connect().then(() => {
    console.log("✅ WhatsApp Service Initialized");
}).catch(err => {
    console.error(`❌ Failed to connect WhatsApp: ${err.message}`);
});

// 4. Start Server
server.listen(config.PORT, () => {
    console.log(`🚀 Worker MVC running on port ${config.PORT}`);
});
