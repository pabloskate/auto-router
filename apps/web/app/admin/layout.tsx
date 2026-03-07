import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <Link href="/" style={{ textDecoration: "none" }}>
            <span className="topbar-logo">CustomRouter</span>
          </Link>
          <span className="topbar-tagline">Self-hostable router</span>
        </div>
        <nav>
          <Link href="/">Quickstart</Link>
          <Link href="/open-source">Open Source</Link>
          <Link href="/admin" aria-current="page">Admin</Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
