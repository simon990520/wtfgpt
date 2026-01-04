import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import path from 'path';
import { logger } from '../config/config.mjs';
import { socketService } from './socket.service.mjs';

export class WhatsAppService {
    constructor() {
        this.sock = null;
        this.status = 'Disconnected';
        this.authFolder = path.join(process.cwd(), 'auth_info_baileys');
        this.messageHandler = null;
    }

    onMessage(handler) {
        this.messageHandler = handler;
    }

    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            logger
        });

        // Re-attach message listener if it exists
        if (this.messageHandler) {
            this.sock.ev.on('messages.upsert', this.messageHandler);
        }

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                logger.info('QR received, sending to frontend');
                try {
                    const qrImageUrl = await qrcode.toDataURL(qr);
                    socketService.emit('qr', qrImageUrl);
                } catch (err) {
                    logger.error('Error generating QR code: ' + err.message);
                }
            }

            if (connection === 'open') {
                this.status = 'Connected';
                logger.info('✅ WhatsApp Connection Opened');
                socketService.emit('status', 'Connected');
                socketService.emit('qr', null);
            } else if (connection === 'close') {
                this.status = 'Disconnected';
                socketService.emit('status', 'Disconnected');

                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

                logger.info(`Connection closed. Reconnecting: ${shouldReconnect}`);

                if (shouldReconnect) {
                    setTimeout(() => {
                        this.connect();
                    }, 5000);
                }
            } else if (connection === 'connecting') {
                this.status = 'Connecting';
                socketService.emit('status', 'Connecting');
            }
        });

        return this.sock;
    }

    getSocket() {
        return this.sock;
    }
}

export const whatsappService = new WhatsAppService();
