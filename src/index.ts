import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

interface User {
    socket: WebSocket;
    room: string;
    username: string;
}

let allSockets: User[] = [];

wss.on("connection", (socket) => {
    // Remove user from allSockets on disconnect
    socket.on("close", () => {
        allSockets = allSockets.filter((user) => user.socket !== socket);
    });

    socket.on("message", (message) => {
        // Ensure message is a string
        let msgStr: string;
        if (typeof message === "string") {
            msgStr = message;
        } else if (message instanceof Buffer) {
            msgStr = message.toString();
        } else {
            console.warn("Unknown message type", typeof message);
            return;
        }

        let parsedMessage: any;
        try {
            parsedMessage = JSON.parse(msgStr);
        } catch (err) {
            console.error("Failed to parse message", err);
            return;
        }

        if (parsedMessage.type === "join") {
            const roomId = parsedMessage?.payload?.roomId;
            const username = parsedMessage?.payload?.username || "Unknown";
            if (!roomId || !username) {
                console.warn("No roomId or username provided in join message");
                return;
            }
            // Remove previous room join for this socket
            allSockets = allSockets.filter((user) => user.socket !== socket);
            allSockets.push({ socket, room: roomId, username });
        }

        if (parsedMessage.type === "chat") {
            // Find current user's room and username
            const user = allSockets.find((x) => x.socket === socket);
            const currentUserRoom = user?.room;
            const currentUsername = user?.username || parsedMessage.payload.username || "Unknown";
            if (!currentUserRoom) {
                console.warn("User not in any room, cannot send chat");
                return;
            }
            // Broadcast to all users in the same room
            for (const u of allSockets) {
                if (u.room === currentUserRoom) {
                    u.socket.send(JSON.stringify({ user: currentUsername, text: parsedMessage.payload.message }));
                }
            }
        }
    });
});