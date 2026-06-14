// src/utils/Argon2Service.ts

export class Argon2Service {
    private isInitialized: boolean = false;
    private Module: any = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            const { default: initArgon2Module } = await import(
                /* webpackIgnore: true */ "/argon2.mjs"
            );
            this.Module = await initArgon2Module({
                locateFile: (path: string) => `/${path}`,
            });
            this.isInitialized = true;
            console.log("Argon2Service: WebAssembly module loaded.");
        } catch (error) {
            console.error("Argon2Service: Initialization failed:", error);
            throw error;
        }
    }

    public async ensureReady(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) {
            await this.initPromise;
        } else {
            throw new Error(
                "Argon2Service: Service was not properly constructed.",
            );
        }
    }

    public async generateArgon2id(
        password: string,
        salt: string,
    ): Promise<string | null> {
        await this.ensureReady();
        if (!password || !salt) return null;

        const Module = this.Module;
        const pwdByteLen = Module.lengthBytesUTF8(password);
        const saltByteLen = Module.lengthBytesUTF8(salt);

        if (saltByteLen < 8) {
            console.error("Argon2Service: Salt must be >= 8 bytes.");
            return null;
        }

        const t_cost = 2;
        const m_cost = 1024;
        const parallelism = 1;
        const hashlen = 32;
        const encodedlen = 128;
        const type = 3; // Argon2id

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
                return Module.UTF8ToString(encodedResultBuffer) as string;
            }
            return null;
        } catch (error) {
            console.error("Argon2Service: Bridge Exception:", error);
            return null;
        } finally {
            Module._free(pwdBuffer);
            Module._free(saltBuffer);
            Module._free(hashResultBuffer);
            Module._free(encodedResultBuffer);
        }
    }
}

export const argon2Service = new Argon2Service();
