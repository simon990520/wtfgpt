import { createClient } from '@supabase/supabase-js';
import { config, logger } from '../config/config.mjs';

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

export const databaseService = {
    /**
     * Proactively sync or update a contact in Supabase
     */
    async syncContact(whatsappId, name = null) {
        try {
            const { error } = await supabase
                .from('contacts')
                .upsert({
                    whatsapp_id: whatsappId,
                    name: name
                }, { onConflict: 'whatsapp_id' });

            if (error) {
                console.error('❌ [DB Service] Error syncing contact:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error(`❌ [DB Service] Unexpected contact sync error: ${err.message}`);
            return false;
        }
    },

    /**
     * Get contact details
     */
    async getContact(whatsappId) {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('whatsapp_id', whatsappId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('❌ [DB Service] Error fetching contact:', error);
        }
        return data;
    },

    /**
     * Save a message and optionally return the saved data
     */
    async saveMessage({ whatsappMessageId, whatsappId, content, isFromMe, timestamp, isGroup = false, groupName = null, senderName = null }) {
        console.log(`💾 [DB Service] Saving Relational Message from ${whatsappId}...`);
        try {
            // 1. Upsert CHAT (Conversation Context)
            // For DMs, the Chat ID is the same as the User ID (essentially)
            // For Groups, it's the Group JID.
            const chatName = isGroup ? groupName : senderName;

            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .upsert({
                    whatsapp_id: whatsappId,
                    name: chatName,
                    is_group: isGroup,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'whatsapp_id' })
                .select('id')
                .single();

            if (chatError) throw new Error(`Chat Upsert Fail: ${chatError.message}`);
            const chatId = chatData.id;

            // 2. Upsert SENDER (Contact)
            // If it's a group, 'whatsappId' is the group, so we need the ACTUAL sender. 
            // NOTE: The worker needs to pass the specific 'participant' ID for groups!
            // For now, assuming DMs or handle logic in Controller to pass correct 'senderId'.
            // Let's assume 'whatsappId' passed HERE is the CONTEXT (Chat), 
            // we need a separate 'senderWhatsappId'.
            // REFACTOR: We need 'sender' argument.

            // ... For this iteration, let's assume DM where Sender = Chat
            // We will refine this in the Controller to pass explicit 'senderId'.

            // 3. Insert MESSAGE V2
            const { data, error } = await supabase
                .from('messages_v2')
                .upsert({
                    whatsapp_message_id: whatsappMessageId,
                    chat_id: chatId,
                    // sender_id: ... needs lookup
                    content: content,
                    is_from_me: isFromMe,
                    timestamp: timestamp
                }, { onConflict: 'whatsapp_message_id' })
                .select()
                .single();

            if (error) throw new Error(`Message V2 Fail: ${error.message}`);

            console.log(`✅ [DB Service] Relational Save Success (ID: ${data.id})`);
            return data;
        } catch (err) {
            console.error(`❌ [DB Service] Relational Error: ${err.message}`);
            // Fallback to V1 flat table for safety if V2 fails? 
            // Or just return null. Let's return null.
            return null;
        }
    },

    /**
     * Save embedding for a message
     */
    async saveEmbedding(messageId, embedding) {
        if (!embedding) return false;

        // Try simple upsert without specifying conflict column (defaults to PK)
        const { error } = await supabase
            .from('message_metadata')
            .upsert({
                message_id: messageId,
                embedding: embedding
            });

        if (error) {
            logger.error(`❌ [DB Error] Metadata fail: ${error.message}`);
            return false;
        }
        return true;
    },

    /**
     * Get recent message history
     */
    async getRecentHistory(whatsappId, limit = 10) {
        const { data, error } = await supabase
            .from('messages')
            .select('content, is_from_me')
            .eq('whatsapp_id', whatsappId)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error(`❌ [DB Error] Recent history: ${error.message}`);
            return [];
        }
        return data.reverse();
    },

    /**
     * Get recent messages from ALL users (God Mode context)
     */
    async getGlobalRecentMessages(limit = 15) {
        // Fetch specific columns to save context window
        const { data, error } = await supabase
            .from('messages')
            .select('whatsapp_id, content, is_from_me, timestamp')
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error(`❌ [DB Error] Global history: ${error.message}`);
            return [];
        }

        // Reverse to show chronological order
        return data.reverse();
    },

    /**
     * Semantic Search (RAG)
     */
    async matchMessages(embedding, whatsappId, matchThreshold = 0.7, matchCount = 5) {
        logger.info(`🔍 [DB Service] Searching RAG for ${whatsappId}...`);

        try {
            const { data: matches, error } = await supabase.rpc('match_messages', {
                query_embedding: embedding,
                match_threshold: matchThreshold,
                match_count: matchCount,
                p_whatsapp_id: whatsappId
            });

            if (error) {
                logger.error(`❌ [DB Error] RAG search failed: ${error.message}`);
                return "";
            }

            if (!matches || matches.length === 0) {
                logger.info(`⚪ [DB Service] No semantic matches found.`);
                return "";
            }

            logger.info(`✨ [DB Service] Found ${matches.length} matches.`);
            return matches.map(m => m.content).join('\n---\n');

        } catch (err) {
            logger.error(`❌ [DB Service] Unexpected RAG error: ${err.message}`);
            return "";
        }
    }
};
