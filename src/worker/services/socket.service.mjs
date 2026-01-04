import { Server } from 'socket.io';
import { logger } from '../config/config.mjs';

let io = null;

export const socketService = {
    /**
     * Initialize the socket server
     */
    init(server) {
        io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            logger.info('Frontend client connected to WebSocket');
            // We'll let the main controller handle specific events
        });

        return io;
    },

    /**
     * Get the IO instance
     */
    getIO() {
        if (!io) throw new Error("SocketService not initialized");
        return io;
    },

    /**
     * Emit to all clients
     */
    emit(event, data) {
        if (io) io.emit(event, data);
    }
};
