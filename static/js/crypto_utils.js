// Secure Password Generation and Clipboard Management

const AMBIGUOUS = new Set("{}[]()/\\'\"`~,;:.<>I1lO0|");

export function generateSecurePassword(options = {}) {
  const length = Math.max(6, Math.min(28, options.length || 8));
  const uppercase = options.uppercase !== false;
  const lowercase = options.lowercase !== false;
  const numbers = options.numbers !== false;
  const symbols = options.symbols !== false;
  const excludeAmbiguous = options.excludeAmbiguous !== false;

  let uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let lowers = "abcdefghijklmnopqrstuvwxyz";
  let digits = "0123456789";
  let syms = "!@#$%^&*-_+=?";

  if (excludeAmbiguous) {
    uppers = uppers.split('').filter(c => !AMBIGUOUS.has(c)).join('');
    lowers = lowers.split('').filter(c => !AMBIGUOUS.has(c)).join('');
    digits = digits.split('').filter(c => !AMBIGUOUS.has(c)).join('');
    syms = syms.split('').filter(c => !AMBIGUOUS.has(c)).join('');
  }

  const pool = [];
  const guaranteed = [];

  if (uppercase && uppers) {
    pool.push(...uppers);
    guaranteed.push(getRandomChar(uppers));
  }
  if (lowercase && lowers) {
    pool.push(...lowers);
    guaranteed.push(getRandomChar(lowers));
  }
  if (numbers && digits) {
    pool.push(...digits);
    guaranteed.push(getRandomChar(digits));
  }
  if (symbols && syms) {
    pool.push(...syms);
    guaranteed.push(getRandomChar(syms));
  }

  if (pool.length === 0) {
    throw new Error("At least one character set must be enabled.");
  }

  const result = [...guaranteed];
  const remaining = length - guaranteed.length;
  for (let i = 0; i < remaining; i++) {
    result.push(getRandomChar(pool));
  }

  // Cryptographically secure shuffle using Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.slice(0, length).join('');
}

function getRandomInt(max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

function getRandomChar(strOrArr) {
  const idx = getRandomInt(strOrArr.length);
  return strOrArr[idx];
}

// Clipboard with 30s auto-clear for passwords
let clipboardClearTimeout = null;

export async function copyToClipboard(text, isSensitive = false) {
  try {
    await navigator.clipboard.writeText(text);
    if (isSensitive) {
      if (clipboardClearTimeout) clearTimeout(clipboardClearTimeout);
      clipboardClearTimeout = setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText("");
          }
        } catch (_) {}
      }, 30000); // 30 seconds auto-clear
    }
    return true;
  } catch (err) {
    // Fallback for older contexts
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}
