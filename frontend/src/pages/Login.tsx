import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";

const NAV_H = 56; // keep in sync with your navbar height

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // lock page scroll while on auth screen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.login(email, password);
      await login(res.token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="w-full grid place-items-center px-4 overflow-hidden"
      style={{ minHeight: `calc(100vh - ${NAV_H}px)` }} // account for sticky navbar
    >
      <form
        onSubmit={handleSubmit}
        className="card w-[min(92vw,420px)] p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--fg)" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
            Sign in to continue to your boards.
          </p>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{
              background: "color-mix(in srgb, var(--danger, #ef4444) 12%, transparent)",
              color: "var(--fg)",
            }}
          >
            {error}
          </div>
        )}

        <label className="label block mb-2 text-sm" style={{ color: "var(--fg-muted)" }}>
          Email
        </label>
        <input
          type="email"
          className="input mb-4"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label className="label block mb-2 text-sm" style={{ color: "var(--fg-muted)" }}>
          Password
        </label>
        <input
          type="password"
          className="input mb-5"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" className="btn btn-accent w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <div className="mt-4 text-sm text-center" style={{ color: "var(--fg-muted)" }}>
          Don’t have an account?{" "}
          <Link to="/signup" className="underline hover:opacity-80" style={{ color: "var(--fg)" }}>
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
