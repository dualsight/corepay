const crypto = require('crypto');

const ALGORITHM = 'aes-256-ctr'
const IV_LENGTH = 16
const NONCE_LENGTH = 5

function encrypt(key, text) {
  let nonce = crypto.randomBytes(NONCE_LENGTH);
  let iv = Buffer.alloc(IV_LENGTH)
  nonce.copy(iv)

  let cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text.toString());
  message = Buffer.concat([nonce, encrypted, cipher.final()]);
  return message.toString('base64')
}

function decrypt(key, text) {
  let message = Buffer.from(text, 'base64')
  let iv = Buffer.alloc(IV_LENGTH)
  message.copy(iv, 0, 0, NONCE_LENGTH)
  let encryptedText = message.slice(NONCE_LENGTH)
  let decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  try{
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }catch(Err){
    return undefined;
  }
}

module.exports = {
  encrypt,
  decrypt
}
