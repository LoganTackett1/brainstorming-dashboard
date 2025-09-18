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
    <div className="flex justify-center items-center h-screen">
    <form
        onSubmit={handleSubmit}
        className="p-6 bg-white rounded shadow-md w-96"
    >
        <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded mb-3"
        />
        <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded mb-3"
        />
        <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded"
        >
        Sign Up
        </button>
    </form>
    </div>
);
};

export default Signup;
