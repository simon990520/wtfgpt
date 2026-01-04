import { io } from "socket.io-client";

console.log("Initiating test client...");
const socket = io("http://localhost:3002");

socket.on("connect", () => {
    console.log("✅ Simulation Connected to Worker");
    console.log("📤 Sending Test Message: 'Hola, prueba de memoria'");
    socket.emit("ui_message", "Hola, prueba de memoria");
});

socket.on("status", (status) => {
    console.log("📡 Status Update:", status);
});

socket.on("ai_response", (msg) => {
    console.log("🤖 AI Response:", msg);
    console.log("✅ Test Passed: Response received");
    socket.disconnect();
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection Error:", err.message);
    process.exit(1);
});
