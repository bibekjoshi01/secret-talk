let assignedName = null;
const { chatId, wsBaseUrl, username } = window.chatConfig;

const wsUrl = `${wsBaseUrl}${chatId}${
  username ? `?name=${encodeURIComponent(username)}` : ""
}`;

const ws = new WebSocket(wsUrl);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const li = document.createElement("li");

  if (data.type === "init") {
    assignedName = data.username;
    document.getElementById("username").textContent = assignedName;
    return;
  }

  if (data.type === "user_list") {
    const activeUsers = document.getElementById("active-users");
    activeUsers.textContent = data.members;
    return;
  }

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
    li.innerHTML = `
  <div class="message-header">
    <strong>${safeSender}</strong>
    <div class="message-body">${safeMessage}</div>
  </div>
  <span class="timestamp">${data.timestamp}</span>`;
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

function send() {
  const input = document.getElementById("msg");
  const message = input.value.trim();
  if (message !== "") {
    ws.send(message);
    input.value = "";
  }
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
