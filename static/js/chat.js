let assignedName = null;
const { chatId, wsBaseUrl, username } = window.chatConfig;

const wsUrl = `${wsBaseUrl}${chatId}${
  username ? `?name=${encodeURIComponent(username)}` : ""
}`;

const ws = new WebSocket(wsUrl);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const chatContainer = document.getElementById("chat-container");

  if (data.type === "init") {
    assignedName = data.username;
    document.getElementById("username").textContent = assignedName;
    return;
  }

  if (data.type === "typing") {
    const typingIndicator = document.getElementById("typing-indicator");
    typingIndicator.textContent = `${escapeHTML(data.username)} is typing...`;
    typingIndicator.style.display = "block";
    return;
  }

  if (data.type === "stop_typing") {
    const typingIndicator = document.getElementById("typing-indicator");
    typingIndicator.style.display = "none";
    return;
  }

  if (data.type === "user_list") {
    const activeUsers = document.getElementById("active-users");
    activeUsers.textContent = data.members;
    return;
  }

  const li = document.createElement("li");

  if (data.type === "system") {
    li.classList.add("system");
    li.innerHTML = `
    <div class="message-body">${data.message} ${data?.timestamp}</div>`;
  }

  if (data.type === "chat") {
    const isSelf = data.sender === assignedName;
    li.classList.add(isSelf ? "self" : "other");
    const safeSender = escapeHTML(isSelf ? "You" : data.sender);
    const safeMessage = escapeHTML(data.message);

    if (isOnlyEmoji(safeMessage)) {
      // Show big emoji only, no sender or time
      li.classList.add(isSelf ? "self-emoji" : "other-emoji");
      li.classList.add("emoji-only")
      li.innerHTML = `<div class="emoji-only">${safeMessage}</div>`;
    } else {
      li.classList.add(isSelf ? "self" : "other");
      li.innerHTML = `
      <div class="message-header">
        <strong>${safeSender}</strong>
        <div class="message-body">${JSON.stringify(safeMessage)}</div>
      </div>
      <span class="timestamp">${data.timestamp}</span>`;
    }
  }

  if (data.type === "audio") {
    const isSelf = data.sender === assignedName;
    li.classList.add(isSelf ? "self" : "other");

    const safeSender = escapeHTML(isSelf ? "You" : data.sender);

    li.innerHTML = `
    <div class="message-header">
      <strong>${safeSender}</strong>
    </div>
    <audio controls style="margin-top:5px; border-radius: 20px" ${`src="data:audio/webm;base64,${data.message}"`}></audio>
    <span class="timestamp">${data.timestamp}</span>
  `;

    messages.appendChild(li);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  if (data.type === "image") {
    const isSelf = data.sender === assignedName;
    li.classList.add(isSelf ? "self" : "other");

    const safeSender = escapeHTML(isSelf ? "You" : data.sender);
    li.innerHTML = `
      <div class="message-header">
        <strong>${safeSender}</strong>
      </div>
      <div style="position: relative; display: inline-block;">
        <img 
          alt="image" 
          style="margin-top:5px; border-radius: 12px; max-width: 250px" 
          src="data:image/png;base64,${data.message}" 
        />
        <a 
          href="data:image/png;base64,${data.message}" 
          download="image.png" 
          style="
            position: absolute;
            top: 50%;
            left: 50%;
            height: 48px;
            width: 48px;
            transform: translate(-50%, -50%);
            color: white;
            text-decoration: none;
            font-size: 1.2em;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
          "
          title="Download Image"
        >
          <i class="fa fa-download"></i>
        </a>
      </div>
      <span class="timestamp">${data.timestamp}</span>
    `;

    messages.appendChild(li);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  document.getElementById("messages").appendChild(li);
  li.scrollIntoView({ behavior: "smooth" });
};

document.getElementById("msg").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

function escapeHTML(str) {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Audio Processing
let mediaRecorder;
let audioChunks = [];
let recording = false;
let recordingStartTime;
let recordingTimer;
let recordingStream;

function startRecording() {
  const msgInput = document.getElementById("msg");
  const recordingIndicator = document.getElementById("recording-indicator");
  const recordingTime = document.getElementById("recording-time");
  const recordBtn = document.getElementById("record-btn");
  const attachment = document.getElementById("attachment");

  if (!recording) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      recordingStream = stream;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      audioChunks = [];
      mediaRecorder.addEventListener("dataavailable", (e) =>
        audioChunks.push(e.data)
      );
      recording = true;
      msgInput.style.display = "none";

      // Start showing indicator
      recordingIndicator.style.display = "inline-flex";
      recordingStartTime = Date.now();
      recordingTime.textContent = "0";
      recordBtn.style.display = "none";
      attachment.style.display = "none";

      // Update elapsed seconds every second
      recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        recordingTime.textContent = elapsed;
      }, 1000);
    });
  }
}

function cancelRecording() {
  const msgInput = document.getElementById("msg");
  const recordingIndicator = document.getElementById("recording-indicator");
  const attachment = document.getElementById("attachment");
  const recordBtn = document.getElementById("record-btn");

  if (mediaRecorder && recording) {
    mediaRecorder.addEventListener("stop", () => {
      // Stop the microphone stream
      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
      }
    });

    mediaRecorder.stop();
    recording = false;
    clearInterval(recordingTimer);

    // UI resets
    recordingIndicator.style.display = "none";
    msgInput.style.display = "inline-block";
    attachment.style.display = "inline-flex";
    recordBtn.style.display = "inline-flex";
  }
}

function sendAudio(blob) {
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64Audio = reader.result.split(",")[1];
    ws.send(
      JSON.stringify({
        type: "audio",
        data: base64Audio,
      })
    );
  };
  reader.readAsDataURL(blob);
}

function send() {
  const input = document.getElementById("msg");

  if (recording) {
    // Finish recording and send audio
    mediaRecorder.addEventListener("stop", () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      sendAudio(audioBlob);
      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
      }

      // Reset UI states after sending audio
      const recordingIndicator = document.getElementById("recording-indicator");
      const recordBtn = document.getElementById("record-btn");
      const attachment = document.getElementById("attachment");

      recordingIndicator.style.display = "none";
      input.style.display = "inline-block";
      attachment.style.display = "inline-flex";
      recordBtn.style.display = "inline-flex";

      recording = false;
      clearInterval(recordingTimer);
    });

    mediaRecorder.stop();
  } else {
    // Normal text message sending
    let message = input.value.trim();
    if (message !== "") {
      message = escapeHTML(message);
      ws.send(
        JSON.stringify({
          type: "stop_typing",
        })
      );
      ws.send(
        JSON.stringify({
          type: "text",
          data: message,
        })
      );
      input.value = "";
    }
  }
}

function isOnlyEmoji(str) {
  // Unicode emoji regex that roughly matches emoji characters only
  // This regex matches one or more emoji characters and nothing else (no spaces, letters, numbers)
  const emojiRegex =
    /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}|\p{Emoji_Component})+$/u;
  return emojiRegex.test(str);
}
