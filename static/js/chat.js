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
    return; // no need to render anything
  }

  if (data.type === "user_list") {
    const activeUsers = document.getElementById("active-users");
    activeUsers.textContent = data.members;
    return;
  }

  if (data.type === "system") {
    li.classList.add("system");
    li.textContent = data.message;
  }

  if (data.type === "chat") {
    const isSelf = data.sender === assignedName;
    li.classList.add(isSelf ? "self" : "other");
    li.innerHTML = `<strong>${isSelf ? "You" : data.sender}:</strong> ${
      data.message
    }`;
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
