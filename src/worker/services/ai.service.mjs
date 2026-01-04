import OpenAI from 'openai';
import { pipeline } from '@huggingface/transformers';
import { config, logger } from '../config/config.mjs';

const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: config.DEEPSEEK_API_KEY,
});

let embedder = null;

export const aiService = {
    /**
     * Lazy load the embedding pipeline
     */
    async getEmbedder() {
        if (!embedder) {
            logger.info('Initializing local embedding model (Xenova/all-MiniLM-L6-v2)...');
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            logger.info('Embedding model loaded successfully');
        }
        return embedder;
    },

    /**
     * Generate 384-dim vector
     */
    async generateEmbedding(text) {
        try {
            const pipe = await this.getEmbedder();
            const output = await pipe(text, { pooling: 'mean', normalize: true });
            return Array.from(output.data);
        } catch (err) {
            logger.error(`❌ [AI Service] Embedding error: ${err.message}`);
            return null;
        }
    },

    /**
     * Generate response using DeepSeek
     */
    async generateResponse(systemPrompt, userText) {
        try {
            logger.info(`☁️ [DeepSeek] Calling API...`);
            const completion = await deepseek.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userText }
                ],
                model: "deepseek-chat",
            });
            return completion.choices[0].message.content;
        } catch (err) {
            logger.error(`❌ [AI Service] DeepSeek error: ${err.message}`);
            if (err.message.includes('401')) logger.error('🔑 Check your DEEPSEEK_API_KEY');
            if (err.message.includes('429')) logger.error('⏳ DeepSeek rate limit reached');
            return null;
        }
    },

    /**
     * Build the specialized System Prompt
     */
    buildSystemPrompt(contactName, history, semanticContext, globalContext = []) {
        const identityContext = contactName ? `Estás hablando con ${contactName}. Salúdalo por su nombre si es apropiado.` : "No conocemos el nombre del usuario todavía.";

        // Format global context if exists
        let globalSection = "";
        if (globalContext && globalContext.length > 0) {
            globalSection = `
        ACTIVIDAD RECIENTE EN WHATSAPP (MODO DIOS - Espejo DB):
        ${globalContext.map(m => `[${m.timestamp.slice(11, 16)}] ${m.is_from_me ? 'Bot' : m.whatsapp_id}: ${m.content}`).join('\n')}
            `;
        }

        return `Eres WTF-AI, un asistente de WhatsApp y Web inteligente, directo y profesional. 
        
        IDENTIDAD DEL USUARIO:
        ${identityContext}

        CONTEXTO PROPIO DEL USUARIO (Conversación actual):
        ${history.map(m => `${m.is_from_me ? 'Bot' : 'Usuario'}: ${m.content}`).join('\n')}
        ${globalSection}
        MEMORIA SEMÁNTICA (RAG - Búsqueda de temas similares):
        ${semanticContext}
        
        INSTRUCCIONES:
        - Responde de forma natural y amigable.
        - Sé breve y directo.
        - Si ves "MODO DIOS", significa que tienes acceso a ver lo que otros escriben. Úsalo si te piden resúmenes.
        - Usa el nombre del usuario si lo conoces para crear cercanía.
        - Si te piden una ACCIÓN (cita, catálogo), di que lo procesas.
        - Si no sabes algo, no inventes.`;
    }
};
