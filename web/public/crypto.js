// index.html / app.js
initArgon2Module().then((Module) => {
    // 1. Define configuration parameters
    const pwd = "super-secret-password-and-this-test";
    const salt = "random-salt-strings-random-salt-strings"; // Must be at least 8 bytes

    const encodedHash = generateArgon2id(Module, pwd, salt);

    if (encodedHash) {
        console.log("Success! Argon2 Encoded String Hash:", encodedHash);
    } else {
        console.error("Argon2 hashing failed.");
    }
});

function generateArgon2id(Module, password, salt) {
    if (!password || !salt) return null;

    // These functions are now safely exported and alive!
    const pwdByteLen = Module.lengthBytesUTF8(password);
    const saltByteLen = Module.lengthBytesUTF8(salt);

    const t_cost = 2;
    const m_cost = 1024;
    const parallelism = 1;
    const hashlen = 32;
    const encodedlen = 128;
    const type = 3;

    const pwdBuffer = Module._malloc(pwdByteLen + 1);
    const saltBuffer = Module._malloc(saltByteLen + 1);
    const hashResultBuffer = Module._malloc(hashlen);
    const encodedResultBuffer = Module._malloc(encodedlen);

    try {
        Module.stringToUTF8(password, pwdBuffer, pwdByteLen + 1);
        Module.stringToUTF8(salt, saltBuffer, saltByteLen + 1);

        const errorCode = Module.ccall(
            "web_argon2_hash",
            "number",
            [
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
            ],
            [
                t_cost,
                m_cost,
                parallelism,
                pwdBuffer,
                pwdByteLen,
                saltBuffer,
                saltByteLen,
                hashResultBuffer,
                hashlen,
                encodedResultBuffer,
                encodedlen,
                type,
            ],
        );

        if (errorCode === 0) {
            return Module.UTF8ToString(encodedResultBuffer);
        } else {
            console.error("Argon2 Core Error:", errorCode);
            return null;
        }
    } catch (error) {
        console.error("WASM Bridge Crash:", error);
        return null;
    } finally {
        Module._free(pwdBuffer);
        Module._free(saltBuffer);
        Module._free(hashResultBuffer);
        Module._free(encodedResultBuffer);
    }
}
