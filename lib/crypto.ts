import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXTAUTH_SECRET ?? 'maydo-secret-key-2024';

export function encrypt(text: string): string {
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch {
    return text;
  }
}

export function decrypt(cipherText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || cipherText;
  } catch {
    return cipherText;
  }
}
