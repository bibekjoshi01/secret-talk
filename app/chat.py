import json
import base64
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Query

from .utils import generate_random_name

router = APIRouter()

# In-memory storage for active chat rooms
chat_rooms = {}


async def broadcast_message(chat_id: str, message: dict):
    dead_sockets = []
    for client in chat_rooms.get(chat_id, []):
        try:
            await client["socket"].send_text(json.dumps(message))
        except:
            dead_sockets.append(client)

    # Clean up dead sockets
    for dead in dead_sockets:
        chat_rooms[chat_id].remove(dead)


async def broadcast_typing(chat_id, message, exclude=None):
    for user in chat_rooms[chat_id]:
        if user["socket"] != exclude: 
            await user["socket"].send_text(json.dumps(message))


async def send_user_list(chat_id):
    members = [user["username"] for user in chat_rooms[chat_id]]
    msg = {"type": "user_list", "members": len(members)}
    await broadcast_message(chat_id, msg)


@router.websocket("/ws/chat/{chat_id}")
async def chat(websocket: WebSocket, chat_id: str, name: str = Query(default=None)):
    await websocket.accept()

    # Initialize room if not present
    if chat_id not in chat_rooms:
        chat_rooms[chat_id] = []

    # Generate unique username
    existing_names = {user["username"] for user in chat_rooms[chat_id]}
    if name:
        if name in existing_names:
            suffix = 1
            new_name = f"{name}_{suffix}"
            while new_name in existing_names:
                suffix += 1
                new_name = f"{name}_{suffix}"
            username = new_name
        else:
            username = name
    else:
        while True:
            username = generate_random_name()
            if username not in existing_names:
                break

    # Add user to room
    chat_rooms[chat_id].append({"socket": websocket, "username": username})

    await websocket.send_text(json.dumps({"type": "init", "username": username}))

    # Notify others about new user
    join_message = {
        "sender": "System",
        "message": f"{username} joined the chat.",
        "type": "system",
        "timestamp": datetime.now().strftime("%H:%M"),
    }

    await broadcast_message(chat_id, join_message)
    await send_user_list(chat_id)

    try:
        while True:
            data = await websocket.receive_text()
            data = json.loads(data)
            message_data = None 

            if data["type"] == "audio":
                audio_bytes = base64.b64decode(data["data"])
                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
                message_data = {
                    "sender": username,
                    "message": audio_base64,
                    "type": "audio",
                    "timestamp": datetime.now().strftime("%H:%M"),
                }
            elif data["type"] == "text":
                message_data = {
                    "sender": username,
                    "message": data["data"],
                    "type": "chat",
                    "timestamp": datetime.now().strftime("%H:%M"),
                }
            elif data["type"] == "image":
                image_bytes = base64.b64decode(data["data"])
                image_data = base64.b64encode(image_bytes).decode("utf-8")
                message_data = {
                    "sender": username,
                    "message": image_data,
                    "type": "image",
                    "timestamp": datetime.now().strftime("%H:%M"),
                }
            
            if data["type"] == "typing":
                typing_data = {
                    "type": "typing",
                    "username": username,
                }
                await broadcast_typing(chat_id, typing_data, exclude=websocket)

            elif data["type"] == "stop_typing":
                stop_typing_data = {
                    "type": "stop_typing",
                    "username": username,
                }
                await broadcast_typing(chat_id, stop_typing_data, exclude=websocket)

            await broadcast_message(chat_id, message_data)

    except WebSocketDisconnect:
        # Remove user on disconnect
        chat_rooms[chat_id] = [
            user for user in chat_rooms[chat_id] if user["socket"] != websocket
        ]

        # Delete room if empty
        if not chat_rooms[chat_id]:
            del chat_rooms[chat_id]
        else:
            stop_typing_data = {
                "type": "stop_typing",
                "username": username,
            }
            await broadcast_typing(chat_id, stop_typing_data, exclude=websocket)

            leave_message = {
                "sender": "System",
                "message": f"{username} left the chat.",
                "type": "system",
                "timestamp": datetime.now().strftime("%H:%M"),
            }
            await broadcast_message(chat_id, leave_message)
            await send_user_list(chat_id)
