const iterations = 210000;
const hex = (buffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
async function derive(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
export async function passwordCredential(password) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await derive(password, salt) };
}
export async function matchesPassword(password, credential) {
  return (
    !!credential &&
    (await derive(password, credential.salt)) === credential.hash
  );
}
export function temporaryPassword() {
  return `Shop-${hex(crypto.getRandomValues(new Uint8Array(8)))}`;
}
