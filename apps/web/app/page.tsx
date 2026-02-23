import "./landing.css";

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function CloudflareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M16.5 17.5H6.3a.4.4 0 01-.4-.3.4.4 0 01.2-.4l8.6-5.4a1.8 1.8 0 00.7-2.2 1.8 1.8 0 00-1.7-1.2H5.4a.2.2 0 01-.2-.2v-.6c0-.1.1-.2.2-.2h10.1a3.8 3.8 0 013.6 2.5 3.8 3.8 0 01-1.5 4.4l-1 .6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19.5 14.5a2.5 2.5 0 00-2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-nav-mark">AR</div>
          <span className="landing-nav-name">Auto Router</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="/admin">Dashboard</a>
          <a href="/admin" className="nav-cta">Get Started</a>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">OpenAI-Compatible LLM Router</div>

        <h1>
          Never pick a model again.<br />
          <span className="gradient-text">Just write prompts.</span>
        </h1>

        <p className="hero-sub">
          Auto Router reads every prompt and sends it to the right model from your catalog.
          Claude for code. GPT for chat. Gemini for reasoning. One endpoint, zero if-statements.
        </p>

        <div className="hero-actions">
          <a href="/admin" className="hero-btn-primary">
            Start Routing Free <ArrowRight />
          </a>
          <a href="#how-it-works" className="hero-btn-secondary">
            See How It Works
          </a>
        </div>

        <div className="hero-visual">
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="hero-card-label">Incoming request</span>
            </div>
            <div className="hero-card-body">
              "Refactor this Python function to use async/await"
            </div>
          </div>
          <div className="hero-arrow">
            <ArrowRight />
          </div>
          <div className="hero-card highlight">
            <div className="hero-card-header">
              <span className="hero-card-label">Routed to</span>
              <span className="hero-card-badge">Claude Sonnet 4</span>
            </div>
            <div className="hero-card-body small">
              Best model for code tasks
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Bar ───────────────────────────────────────────────── */}
      <div className="trust-bar">
        <div className="trust-item">
          <CloudflareIcon />
          Runs on Cloudflare Workers
        </div>
        <div className="trust-item">
          <TerminalIcon />
          OpenAI SDK Compatible
        </div>
        <div className="trust-item">
          <ShieldIcon />
          Self-Hosted &amp; Private
        </div>
        <div className="trust-item">
          <GitHubIcon />
          Open Source
        </div>
      </div>

      {/* ─── The Idea ────────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="section-label">The Idea</div>
        <h2 className="section-heading">You already know which model is best. Encode it.</h2>
        <p className="section-desc">
          You know Claude is better for code and GPT is faster for simple tasks.
          But implementing that logic at runtime &mdash; with fallbacks, thread continuity,
          and cost awareness &mdash; is a different problem entirely.
        </p>

        <div className="problem-grid">
          <div className="problem-card">
            <div className="problem-icon red">&#x2715;</div>
            <h3>Routing logic in app code</h3>
            <p>
              Model-selection ternaries scattered across your codebase. Every new model means another branch, another deploy.
            </p>
          </div>
          <div className="problem-card">
            <div className="problem-icon amber">&#x26A0;</div>
            <h3>No fallback on failure</h3>
            <p>
              A provider goes down and your users get 500s. You hardcoded one model &mdash; there&rsquo;s no plan B unless you build one.
            </p>
          </div>
          <div className="problem-card">
            <div className="problem-icon orange">&#x2191;</div>
            <h3>Context lost between turns</h3>
            <p>
              Even if you route well on the first message, continuations land on a different model. KV caches are wasted and conversations break.
            </p>
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────────── */}
      <section className="landing-section" id="how-it-works">
        <div className="section-label">How It Works</div>
        <h2 className="section-heading">One line in your code. All the smarts in ours.</h2>
        <p className="section-desc">
          Tell us which models you trust and when to use them. We handle the rest:
          reading prompts, picking models, failing over, and keeping conversations on track.
        </p>

        <div className="flow-container">
          <div className="flow-step">
            <div className="flow-marker">
              <div className="flow-number">01</div>
              <div className="flow-line" />
            </div>
            <div className="flow-content">
              <h3>Pick your models</h3>
              <p>
                Add the models you want to use. Claude for code, GPT for quick chat,
                Gemini for long context—whatever fits your needs.
              </p>
              <div className="flow-pills">
                <span className="flow-pill">Claude Sonnet 4</span>
                <span className="flow-pill">GPT-4.1 Mini</span>
                <span className="flow-pill">o3</span>
                <span className="flow-pill">Gemini 2.5</span>
              </div>
            </div>
          </div>

          <div className="flow-step">
            <div className="flow-marker">
              <div className="flow-number">02</div>
              <div className="flow-line" />
            </div>
            <div className="flow-content">
              <h3>Tell us the rules—in plain English</h3>
              <p>
                No JSON. No code. Just describe when to use each model.
                "Use Claude for anything with code." "Use the cheapest model for simple questions."
              </p>
              <div className="flow-quote">
                &ldquo;Prefer Claude for code. Use GPT-4.1-mini for chat. Pick thinking models for math.&rdquo;
              </div>
            </div>
          </div>

          <div className="flow-step">
            <div className="flow-marker">
              <div className="flow-number">03</div>
              <div className="flow-line" />
            </div>
            <div className="flow-content">
              <h3>Send prompts. Get answers.</h3>
              <p>
                Use <code className="code">model: &quot;auto&quot;</code> in your OpenAI SDK.
                We read each prompt, route it to the right model, and handle failures automatically.
              </p>
              <div className="flow-code simple">
                <span style={{ color: "var(--indigo)" }}>await</span> openai.chat.completions.create({"{"}{"\n"}
                {"  "}model: <span style={{ color: "var(--green)" }}>&quot;auto&quot;</span>,{"\n"}
                {"  "}messages{"\n"}
                {"}"})
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────── */}
      <section className="landing-section" id="features">
        <div className="section-label centered">What You Get</div>
        <h2 className="section-heading centered">Smart routing. Zero headaches.</h2>
        <p className="section-desc centered">
          Everything you need to stop worrying about model selection—
          so you can focus on building.
        </p>

        <div className="features-grid">
          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot cyan" />
              <h3>Right Model, Every Time</h3>
            </div>
            <p>
              Our classifier reads your prompts and routes them to the best model from your catalog. Code goes to Claude, summaries to GPT.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot indigo" />
              <h3>Plain English Rules</h3>
            </div>
            <p>
              Just tell us "Use Claude for code" or "Pick the cheapest model for simple questions." No JSON, no code, no redeploys.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot green" />
              <h3>Conversations Stay Coherent</h3>
            </div>
            <p>
              Once a model handles a thread, it stays pinned. Multi-turn chats don't switch models mid-conversation. Context is preserved.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot amber" />
              <h3>Profiles for Different Needs</h3>
            </div>
            <p>
              Create <code className="code">auto-cheap</code> for internal tools, <code className="code">auto-coding</code> for your IDE, and <code className="code">auto-fast</code> for customer support.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot cyan" />
              <h3>Automatic Failover</h3>
            </div>
            <p>
              If a provider is down or slow, we automatically try the next best model. Your users never see a 500.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot indigo" />
              <h3>See Every Decision</h3>
            </div>
            <p>
              Query any request ID to see exactly why a model was chosen, what the confidence was, and what the fallback chain looked like.
            </p>
          </div>
        </div>
      </section>

      {/* ─── The Config ──────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="section-label">Configuration</div>
        <h2 className="section-heading">Change models without changing code.</h2>
        <p className="section-desc">
          Add a new model, update your rules, or create a new profile—all from the dashboard.
          Your code never changes. It just keeps sending <code className="code">model: &quot;auto&quot;</code>.
        </p>

        <div className="compare">
          <div className="compare-pane">
            <div className="compare-header before">Without Auto Router</div>
            <div className="compare-body plain">
              <div className="compare-item">
                <span className="compare-x">&#x2718;</span>
                <span>Write if-statements for every model decision</span>
              </div>
              <div className="compare-item">
                <span className="compare-x">&#x2718;</span>
                <span>Handle failures and retries yourself</span>
              </div>
              <div className="compare-item">
                <span className="compare-x">&#x2718;</span>
                <span>Redeploy to add a new model</span>
              </div>
              <div className="compare-item">
                <span className="compare-x">&#x2718;</span>
                <span>Context lost when switching models mid-chat</span>
              </div>
            </div>
          </div>

          <div className="compare-pane">
            <div className="compare-header after">With Auto Router</div>
            <div className="compare-body plain">
              <div className="compare-item">
                <span className="compare-check">&#x2714;</span>
                <span>One line: <code>model: "auto"</code></span>
              </div>
              <div className="compare-item">
                <span className="compare-check">&#x2714;</span>
                <span>Automatic failover when models fail</span>
              </div>
              <div className="compare-item">
                <span className="compare-check">&#x2714;</span>
                <span>Update models in the dashboard instantly</span>
              </div>
              <div className="compare-item">
                <span className="compare-check">&#x2714;</span>
                <span>Conversations stay on one model</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Profiles ────────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="section-label">Routing Profiles</div>
        <h2 className="section-heading">One router, many strategies.</h2>
        <p className="section-desc">
          Create named profiles that act as virtual model names. Each profile can override
          the model catalog, routing instructions, and defaults &mdash; so different parts of your app
          get different routing behavior from the same endpoint.
        </p>

        <div className="profiles-row">
          <div className="profile-preview">
            <div className="profile-preview-id">auto-cheap</div>
            <p className="profile-preview-desc">
              Restrict the catalog to low-cost models. Great for internal tools, batch jobs, and simple chat.
            </p>
            <span className="profile-tag cyan">filtered catalog</span>
            <span className="profile-tag indigo">cost-first rules</span>
          </div>

          <div className="profile-preview">
            <div className="profile-preview-id">auto-coding</div>
            <p className="profile-preview-desc">
              Only high-thinking models. Custom instructions that prefer Claude for code and o3 for algorithms.
            </p>
            <span className="profile-tag cyan">thinking models only</span>
            <span className="profile-tag indigo">code-first rules</span>
          </div>

          <div className="profile-preview">
            <div className="profile-preview-id">auto-support</div>
            <p className="profile-preview-desc">
              Customer-facing tier. Fast models with guardrails. Blocklist anything experimental.
            </p>
            <span className="profile-tag cyan">fast defaults</span>
            <span className="profile-tag indigo">strict blocklist</span>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ──────────────────────────────────────────────── */}
      <section className="bottom-cta">
        <h2>Define your routing strategy in minutes.</h2>
        <p>
          Open source. Self-hosted on Cloudflare. Add your models, write your rules,
          and start routing.
        </p>
        <div className="bottom-cta-actions">
          <a href="/admin" className="hero-btn-primary">
            Open Dashboard <ArrowRight />
          </a>
          <a href="#how-it-works" className="hero-btn-secondary">
            Read the Docs
          </a>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-left">
          Auto Router &mdash; open-source LLM routing proxy
        </div>
        <div className="landing-footer-right">
          <a href="/admin">Dashboard</a>
          <a href="#how-it-works">Docs</a>
          <a href="#features">Features</a>
        </div>
      </footer>
    </div>
  );
}
