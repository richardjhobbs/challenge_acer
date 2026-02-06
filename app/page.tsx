import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="wrap">
      <div className="topbar">
        <div>
          <h1>Acer Challenge</h1>
          <div className="muted">
            Pick your numbers, reveal the tiles, reveal the target, then start the clock when you are ready.
          </div>
        </div>
        <div className="muted">Solo or online play coming soon.</div>
      </div>

      <section className="stage landing">
        <div>
          <h2 style={{ margin: 0 }}>Welcome to Acer Challenge</h2>
          <p className="muted">
            Test your arithmetic under pressure. Reveal the tiles, lock in a target, and race the timer with
            solver-backed scoring.
          </p>
        </div>

        <div className="ctaRow">
          <Link className="ctaButton" href="/solo">
            Play Solo
          </Link>
          <Link className="ctaButton btnGhost" href="/online">
            Online Challenge
          </Link>
        </div>
      </section>
    </div>
  );
}
