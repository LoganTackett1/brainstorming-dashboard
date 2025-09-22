import React from "react";
import { Link } from "react-router-dom";

const Feature: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="card p-5">
    <h3 className="mb-1 font-semibold">{title}</h3>
    <p className="text-sm text-[var(--fg-muted)]">{desc}</p>
  </div>
);

const Landing: React.FC = () => {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-6 sm:pt-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Think together. Build faster.
          </h1>
          <p className="mb-8 text-lg text-[var(--fg-muted)]">
            A clean, collaborative board for ideas, tasks, and notes—styled like your favorite docs
            app.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/signup" className="btn btn-primary">
              Get started — it’s free
            </Link>
            <Link to="/login" className="btn btn-muted">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof / Features */}
      <section className="grid gap-6 md:grid-cols-3">
        <Feature
          title="Zero learning curve"
          desc="Familiar, Notion‑like UI. Drag cards, type, hit save—done."
        />
        <Feature
          title="Invite & share"
          desc="Private boards, share links with read or edit access."
        />
        <Feature
          title="Screenshots as thumbnails"
          desc="Upload a board thumbnail to make your dashboard pop."
        />
      </section>

      {/* Mini CTA */}
      <section className="text-center">
        <div className="card p-8">
          <h2 className="mb-2 text-2xl font-bold">Ready to brainstorm smarter?</h2>
          <p className="mb-6 text-[var(--fg-muted)]">
            Create your first board in seconds and invite a teammate.
          </p>
          <Link to="/signup" className="btn btn-primary">
            Create a free account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
