import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { AuthContext } from "../context/AuthContext";

const NavItem: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
      }`}
    >
      {label}
    </Link>
  );
};

const Navbar: React.FC = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link to={user ? "/dashboard" : "/"} className="font-semibold tracking-tight">
            Brainstorm
          </Link>
          {user && (
            <nav className="ml-2 hidden items-center gap-1 sm:flex">
              <NavItem to="/dashboard" label="Dashboard" />
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!user ? (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-muted">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Sign up
              </Link>
            </div>
          ) : (
            <button onClick={logout} className="btn btn-muted">
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
