import React from 'react';

export function HeroSection() {
  return (
    <section className="text-center max-w-4xl mx-auto py-10 px-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tertiary-container text-tertiary-on-container font-label text-xs font-bold uppercase tracking-wider mb-4 border border-outline-variant">
        <span>V1 Foundational Scaffolding</span>
        <span className="w-1 h-1 rounded-full bg-tertiary" />
        <span>Strict Multi-Tenant Isolation</span>
      </div>

      <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-primary leading-tight mb-4">
        Private Martial Arts School Management & Rank Progression
      </h1>

      <p className="font-body text-base sm:text-lg text-surface-on-variant leading-relaxed max-w-2xl mx-auto mb-8 font-medium">
        A self-contained operating system for Brazilian Jiu-Jitsu, Judo, Karate, and Taekwondo dojos.
        Zero ads, zero feature paywalls, and strictly isolated school tenant boundaries.
      </p>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
        <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-soft-2">
          <div className="w-8 h-8 rounded bg-primary-container text-primary-on-container flex items-center justify-center mb-2 font-display text-lg font-extrabold">
            1
          </div>
          <h2 className="font-title text-sm font-semibold text-primary mb-1">
            Row-Level Tenant Isolation
          </h2>
          <p className="font-body text-xs text-surface-on-variant">
            Cross-tenant queries are blocked. Rosters, attendance, techniques, and ledgers remain strictly private.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-soft-2">
          <div className="w-8 h-8 rounded bg-primary-container text-primary-on-container flex items-center justify-center mb-2 font-display text-lg font-extrabold">
            2
          </div>
          <h2 className="font-title text-sm font-semibold text-primary mb-1">
            Dynamic Grading Readiness
          </h2>
          <p className="font-body text-xs text-surface-on-variant">
            Hours logged + coach technique checklists evaluate promotion readiness without manual spreadsheet errors.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-soft-2">
          <div className="w-8 h-8 rounded bg-primary-container text-primary-on-container flex items-center justify-center mb-2 font-display text-lg font-extrabold">
            3
          </div>
          <h2 className="font-title text-sm font-semibold text-primary mb-1">
            Zero-Monetization Ledger
          </h2>
          <p className="font-body text-xs text-surface-on-variant">
            Built for administrative autonomy. Records off-platform settlements (cash/card/transfer) with 0% platform cuts.
          </p>
        </div>
      </div>
    </section>
  );
}
