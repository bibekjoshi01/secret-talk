function generateSecureCode(length = 12) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);

  return Array.from(array, (num) => charset[num % charset.length]).join("");
}

function generateCode() {
  const code = generateSecureCode(); // default 12 characters
  document.getElementById('chatCode').value = code;
}
