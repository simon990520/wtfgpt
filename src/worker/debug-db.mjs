import { databaseService } from './services/database.service.mjs';

async function test() {
    console.log("🧪 Testing Database Save...");

    // 1. Try to sync contact first (as the controller does)
    console.log("Syncing contact...");
    await databaseService.syncContact('web-user-admin');

    // 2. Try to save message
    console.log("Saving message...");
    const result = await databaseService.saveMessage({
        whatsappMessageId: 'test-' + Date.now(),
        whatsappId: 'web-user-admin',
        content: 'Test content',
        isFromMe: false,
        timestamp: new Date().toISOString()
    });

    if (result) {
        console.log("✅ Save Successful:", result);
    } else {
        console.log("❌ Save Failed (Check logs above)");
    }

    process.exit(0);
}

test();
