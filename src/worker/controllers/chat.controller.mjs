import { logger } from '../config/config.mjs';
import { databaseService } from '../services/database.service.mjs';
import { aiService } from '../services/ai.service.mjs';
import { socketService } from '../services/socket.service.mjs';

export class ChatController {
    /**
     * Main entry point for any message (WA or UI)
     */
    async handleIncomingMessage({ sock, whatsappId, content, isGroup, isFromMe, socket = null }) {
        try {
            // A. Identity & Sync
            logger.info(`📥 [ChatController] ${socket ? '🌐 WEB' : '📱 WA'} Message from ${whatsappId}`);

            // Proactive sync contact - ensures we know who this is
            await databaseService.syncContact(whatsappId);
            const contact = await databaseService.getContact(whatsappId);
            const contactName = contact?.name || null;

            // B. Database Mirroring (Save Message - Relational V2)
            const savedMsg = await databaseService.saveMessage({
                whatsappMessageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                whatsappId, // This is the CHAT ID (Group JID or User JID)
                content,
                isFromMe,
                timestamp: new Date().toISOString(),
                isGroup,
                groupName: isGroup ? `Group ${whatsappId.split('@')[0]}` : null, // Fallback name for now
                senderName: contactName || whatsappId.split('@')[0]
            });

            if (!savedMsg) return;

            // C. Vectorization
            logger.info(`🧠 [AI] Digitizing thought...`);
            const embedding = await aiService.generateEmbedding(content);
            if (embedding) {
                await databaseService.saveEmbedding(savedMsg.id, embedding);
            }

            // D. Intelligence & Response Logic
            // Don't respond to self or groups (unless mentioned, but keeping it simple for now)
            if (isFromMe || isGroup) return;

            logger.info(`🤖 [AI] Processing cognitive response for ${contactName || whatsappId}...`);

            // 1. Fetch Context (RAG + History)
            const history = await databaseService.getRecentHistory(whatsappId);

            // GOD MODE: If web-admin, search ALL chats (pass null). Else search only user's chat.
            const searchId = whatsappId === 'web-user-admin' ? null : whatsappId;

            // Proactive Global Context Fetch (Mirror DB)
            let globalContext = [];
            if (whatsappId === 'web-user-admin') {
                logger.info(`🌍 [ChatController] Fetching Global Context (Mirror DB) for Admin...`);
                globalContext = await databaseService.getGlobalRecentMessages(20);
            }

            const semanticContext = embedding ?
                await databaseService.matchMessages(embedding, searchId) : "";

            // 2. Build Intelligent Prompt
            const systemPrompt = aiService.buildSystemPrompt(contactName, history, semanticContext, globalContext);

            // 3. Call DeepSeek
            const aiResponse = await aiService.generateResponse(systemPrompt, content);

            if (aiResponse) {
                // E. Delivery
                if (socket) {
                    logger.info(`📤 [UI] Delivering to Web...`);
                    socket.emit('ai_response', aiResponse);
                }

                if (sock && !whatsappId.includes('web-user')) {
                    logger.info(`📤 [WA] Delivering to WhatsApp...`);
                    await sock.sendMessage(whatsappId, { text: aiResponse });
                }

                // F. Log self-response for future context
                await databaseService.saveMessage({
                    whatsappId,
                    content: aiResponse,
                    isFromMe: true,
                    timestamp: new Date().toISOString()
                });

                logger.info(`🚀 [SUCCESS] Cycle completed`);
            }

        } catch (err) {
            logger.error(`💥 [ChatController] Error: ${err.message}`);
            if (socket) socket.emit('ai_error', 'Ocurrió un error procesando tu mensaje.');
        }
    }
    async handleHistoryRequest(socket) {
        logger.info(`📜 [ChatController] Fetching history for Web Admin...`);
        const history = await databaseService.getRecentHistory('web-user-admin', 50);
        socket.emit('history_response', history);
    }
}

export const chatController = new ChatController();
