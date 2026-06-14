import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { argon2Service } from "../../utils/auth_service";

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                style={{
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                }}
            >
                {label}
            </label>
            {children}
        </div>
    );
}

type Props = { onLogin: () => void };

export function LoginPage({ onLogin }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hashedOutput, setHashedOutput] = useState("");
    const [isServiceReady, setIsServiceReady] = useState(false);

    useEffect(() => {
        argon2Service
            .ensureReady()
            .then(() => setIsServiceReady(true))
            .catch((err) => console.error("WASM failed to initialize:", err));
    }, []);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // onLogin();
        //
        if (!isServiceReady || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // 2. Call the service class wrapper function to reach the WASM layer
            const phcResultString = await argon2Service.generateArgon2id(
                password,
                "test-test-test-test",
            );

            if (phcResultString) {
                setHashedOutput(phcResultString);
                console.log(`Hashed output: ${phcResultString}`);
            } else {
                alert(
                    "Cryptographic hash execution failed. Inspect your console logs.",
                );
            }
        } catch (error) {
            console.error("Form handling wrapper crashed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="flex h-screen w-full items-center justify-center"
            style={{ background: "var(--sidebar)" }}
        >
            {/* Card */}
            <div
                className="w-full mx-4 rounded-2xl overflow-hidden"
                style={{
                    maxWidth: 400,
                    background: "var(--card)",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
                }}
            >
                {/* Top stripe */}
                <div
                    className="px-8 pt-8 pb-6 flex flex-col items-center"
                    style={{ borderBottom: "1px solid var(--border)" }}
                >
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: "var(--primary)" }}
                    >
                        <Lock size={22} color="white" />
                    </div>
                    <h1
                        style={{
                            fontSize: "1.2rem",
                            fontWeight: 700,
                            color: "var(--foreground)",
                            textAlign: "center",
                        }}
                    >
                        Welcome back
                    </h1>
                    <p
                        style={{
                            fontSize: "0.82rem",
                            color: "var(--muted-foreground)",
                            marginTop: "0.3rem",
                            textAlign: "center",
                        }}
                    >
                        Sign in to unlock your vault
                    </p>
                </div>

                {/* Form */}
                <form className="px-8 py-6 space-y-4" onSubmit={handleLogin}>
                    <Field label="Email">
                        <input
                            type="text"
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="w-full px-3 py-2.5 rounded-xl outline-none transition-colors"
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                background: "var(--input-background)",
                                border: "1px solid var(--border)",
                                fontSize: "0.88rem",
                                color: "var(--foreground)",
                            }}
                        />
                    </Field>

                    <Field label="Password">
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••••••"
                                autoComplete="current-password"
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2.5 pr-10 rounded-xl outline-none transition-colors"
                                style={{
                                    background: "var(--input-background)",
                                    border: "1px solid var(--border)",
                                    fontSize: "0.88rem",
                                    color: "var(--foreground)",
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                                {showPassword ? (
                                    <EyeOff
                                        size={15}
                                        style={{
                                            color: "var(--muted-foreground)",
                                        }}
                                    />
                                ) : (
                                    <Eye
                                        size={15}
                                        style={{
                                            color: "var(--muted-foreground)",
                                        }}
                                    />
                                )}
                            </button>
                        </div>
                    </Field>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-opacity hover:opacity-90 active:opacity-80 mt-2"
                        style={{ background: "var(--primary)", color: "white" }}
                    >
                        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                            Unlock Vault
                        </span>
                        <ArrowRight size={16} />
                    </button>
                </form>

                {/* Footer */}
                <div className="px-8 pb-6 text-center">
                    <p
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--muted-foreground)",
                        }}
                    >
                        Forgot your password?{" "}
                        <button
                            style={{ color: "var(--primary)", fontWeight: 500 }}
                        >
                            Get help
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
