function generateSecureCode() {
  const segments = [];
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no 1/I or o/0 for clarity
  const segmentLength = 3;

  // Generate 3 segments like 'hjj', 'yui', etc.
  for (let i = 0; i < 3; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }

  // Add a random 3-digit suffix for uniqueness
  const suffix = Math.floor(100 + Math.random() * 900); // ensures 3-digit number

  return `${segments.join("-")}-${suffix}`;
}

function generateCode() {
  const code = generateSecureCode(); // default 12 characters
  document.getElementById("chatCode").value = code;
}

function proceedToChat() {
  const nickname = document.getElementById("nickname").value.trim();
  if (nickname) {
    const encodedName = encodeURIComponent(nickname);
    window.location.href = `/chat/${chatCode}?name=${encodedName}`;
  } else {
    window.location.href = `/chat/${chatCode}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const nicknameInput = document.getElementById("nickname");
  const continueBtn = document.getElementById("continueBtn");

  nicknameInput.addEventListener("input", () => {
    const hasText = nicknameInput.value.trim() !== "";
    continueBtn.textContent = hasText
      ? "Continue with name"
      : "Continue without name";
  });
});

function joinChat() {
  codeInput = document.getElementById("chatCode").value.trim();
  if (!codeInput) {
    alert("Please enter or generate a chat code.");
    return;
  }
  chatCode = codeInput;
  document.getElementById("nicknameModal").style.display = "flex";
}
