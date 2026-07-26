import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../ui";

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function AuthLayout({ children, topLink, headline, blurb, feats }: {
  children: ReactNode;
  topLink: { text: string; to: string; label: string };
  headline: string;
  blurb: string;
  feats: string[];
}) {
  return (
    <div className="shell">
      <aside className="panel" aria-hidden="true">
        <Link className="brand" to="/">
          <BrandMark />
          <span className="name"><b>THE INTERNS</b><span>LEDGER</span></span>
        </Link>
        <div className="p-mid">
          <h2>{headline}</h2>
          <p>{blurb}</p>
          <div className="p-feats">
            {feats.map((f) => <div className="p-feat" key={f}><Check />{f}</div>)}
          </div>
        </div>
        <div className="p-foot">© 2026 The Interns Ledger</div>
      </aside>
      <main className="side" id="main">
        <div className="side-top">
          {topLink.text}&nbsp;<Link className="btn btn-3 btn-sm" to={topLink.to}>{topLink.label}</Link>
        </div>
        {children}
      </main>
    </div>
  );
}
