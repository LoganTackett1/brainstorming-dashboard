import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";

const NAV_H = 56; // keep in sync with navbar height

const Signup: React.FC = () => {
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
      const res = await api.signup(email, password);
      await login(res.token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="grid w-full place-items-center overflow-hidden px-4"
      style={{ minHeight: `calc(100vh - ${NAV_H}px)` }}
    >
      <form
        onSubmit={handleSubmit}
        className="card w-[min(92vw,420px)] p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--fg)" }}>
            Create your account
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
            Start organizing ideas with shared boards.
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

        <label className="label mb-2 block text-sm" style={{ color: "var(--fg-muted)" }}>
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

        <label className="label mb-2 block text-sm" style={{ color: "var(--fg-muted)" }}>
          Password
        </label>
        <input
          type="password"
          className="input mb-5"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <button type="submit" className="btn btn-accent w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <div className="mt-4 text-center text-sm" style={{ color: "var(--fg-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" className="underline hover:opacity-80" style={{ color: "var(--fg)" }}>
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Signup;
