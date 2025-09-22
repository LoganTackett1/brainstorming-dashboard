import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { AuthContext } from "../context/AuthContext";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.signup(email, password);
      login(res.token); // backend returns token
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-96 rounded bg-white p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-bold">Sign Up</h2>
        {error && <p className="mb-2 text-red-600">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border p-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded border p-2"
        />
        <button type="submit" className="w-full rounded bg-blue-600 py-2 text-white">
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default Signup;
