import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./index.css";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import Share from "./pages/Share";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const fullBleed = pathname.startsWith("/boards") || pathname.startsWith("/share");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main
        className={
          fullBleed
            ? // Full-bleed for board/share
              "w-full flex-1 px-0 py-0"
            : // Default app pages stay in a centered container
              "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
        }
      >
        {children}
      </main>
      <footer className="px-4 py-6 text-sm text-[var(--fg-muted)]" />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/boards/:id"
              element={
                <ProtectedRoute>
                  <Board />
                </ProtectedRoute>
              }
            />

            <Route path="/share/:token" element={<Share />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
