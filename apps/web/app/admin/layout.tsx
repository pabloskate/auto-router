export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <a href="/" style={{ textDecoration: "none" }}>
            <span className="topbar-logo">Auto Router</span>
          </a>
          <span className="topbar-tagline">Dashboard</span>
        </div>
        <nav>
          <a href="/">Home</a>
          <a href="/admin" aria-current="page">Admin</a>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
