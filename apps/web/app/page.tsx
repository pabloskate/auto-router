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
          Your models. Your rules.<br />
          <span className="gradient-text">Routed automatically.</span>
        </h1>

        <p className="hero-sub">
          Define your model catalog and routing conditions once.
          Auto Router follows your strategy for every request &mdash; with fallbacks,
          thread pinning, and guardrails built in.
        </p>

        <div className="hero-actions">
          <a href="/admin" className="hero-btn-primary">
            Configure Your Router <ArrowRight />
          </a>
          <a href="#how-it-works" className="hero-btn-secondary">
            <GitHubIcon /> View Source
          </a>
        </div>

        <div className="hero-code">
          <div className="hero-code-window">
            <div className="hero-code-bar">
              <div className="hero-code-dot" />
              <div className="hero-code-dot" />
              <div className="hero-code-dot" />
              <span>your catalog</span>
            </div>
            <div className="hero-code-body">
              <span className="punc">{"["}</span>{"\n"}
              {"  "}<span className="punc">{"{"}</span>{"\n"}
              {"    "}<span className="prop">id</span><span className="punc">:</span>{" "}<span className="str">&quot;anthropic/claude-sonnet-4&quot;</span><span className="punc">,</span>{"\n"}
              {"    "}<span className="prop">thinking</span><span className="punc">:</span>{" "}<span className="str">&quot;high&quot;</span><span className="punc">,</span>{"\n"}
              <span className="line-highlight">{"    "}<span className="prop">whenToUse</span><span className="punc">:</span>{" "}<span className="str">&quot;Complex coding, architecture, debugging&quot;</span></span>
              {"  "}<span className="punc">{"}"}</span><span className="punc">,</span>{"\n"}
              {"  "}<span className="punc">{"{"}</span>{"\n"}
              {"    "}<span className="prop">id</span><span className="punc">:</span>{" "}<span className="str">&quot;openai/gpt-4.1-mini&quot;</span><span className="punc">,</span>{"\n"}
              {"    "}<span className="prop">thinking</span><span className="punc">:</span>{" "}<span className="str">&quot;none&quot;</span><span className="punc">,</span>{"\n"}
              <span className="line-highlight">{"    "}<span className="prop">whenToUse</span><span className="punc">:</span>{" "}<span className="str">&quot;Simple Q&amp;A, summaries, quick tasks&quot;</span></span>
              {"  "}<span className="punc">{"}"}</span><span className="punc">,</span>{"\n"}
              {"  "}<span className="cmt">// ...your other models</span>{"\n"}
              <span className="punc">{"]"}</span>
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
        <h2 className="section-heading">Configure once. Route every request.</h2>
        <p className="section-desc">
          You define your model catalog with guidance on when to use each model.
          The router&rsquo;s LLM classifier reads every incoming prompt and matches it to the
          right model from <em>your</em> list.
        </p>

        <div className="flow-container">
          <div className="flow-step">
            <div className="flow-marker">
              <div className="flow-number">01</div>
              <div className="flow-line" />
            </div>
            <div className="flow-content">
              <h3>Define your model catalog</h3>
              <p>
                List the models you want available. For each one, describe when it should be used,
                its strengths, and its capabilities. This is your routing &ldquo;constitution.&rdquo;
              </p>
              <div className="flow-code">
                <span style={{ color: "var(--cyan)" }}>anthropic/claude-sonnet-4</span>{"\n"}
                {"  "}thinking: high &middot; vision: yes{"\n"}
                {"  "}use: <span style={{ color: "var(--green)" }}>&quot;Complex code, debugging, architecture&quot;</span>{"\n\n"}
                <span style={{ color: "var(--cyan)" }}>openai/gpt-4.1-mini</span>{"\n"}
                {"  "}thinking: none &middot; vision: no{"\n"}
                {"  "}use: <span style={{ color: "var(--green)" }}>&quot;Simple Q&amp;A, summaries, translations&quot;</span>
              </div>
            </div>
          </div>

          <div className="flow-step">
            <div className="flow-marker">
              <div className="flow-number">02</div>
              <div className="flow-line" />
            </div>
            <div className="flow-content">
              <h3>Write your routing instructions</h3>
              <p>
                Give the classifier plain-language rules. &ldquo;Prefer Claude for code.&rdquo;
                &ldquo;Use the cheapest model for simple questions.&rdquo;
                &ldquo;Never use models without thinking for math.&rdquo; The classifier follows your instructions.
              </p>
              <div className="flow-code">
                <span style={{ color: "var(--text-muted)" }}># Routing Instructions</span>{"\n"}
                <span style={{ color: "var(--text-primary)" }}>- Use Claude for any coding or architecture task</span>{"\n"}
                <span style={{ color: "var(--text-primary)" }}>- Use GPT-4.1-mini for simple questions and chat</span>{"\n"}
                <span style={{ color: "var(--text-primary)" }}>- Always prefer thinking models for math/logic</span>{"\n"}
                <span style={{ color: "var(--text-primary)" }}>- If the user sends an image, pick a vision model</span>
              </div>
            </div>
          </div>

          <div className="flow-step">
            <div className="flow-marker">
              <div className="flow-number">03</div>
              <div className="flow-line" />
            </div>
            <div className="flow-content">
              <h3>Deploy and every request follows your rules</h3>
              <p>
                Point your OpenAI SDK at the router, set <code className="code">model: &quot;auto&quot;</code>.
                The classifier reads each prompt, picks the model from your catalog
                that best fits your instructions, and proxies the request. Thread
                pinning, fallbacks, and guardrails happen automatically.
              </p>
              <div className="flow-code">
                <span style={{ color: "var(--text-muted)" }}>{"// your app code — nothing changes"}</span>{"\n"}
                <span style={{ color: "var(--indigo)" }}>const</span> res = <span style={{ color: "var(--indigo)" }}>await</span> client.chat.completions.<span style={{ color: "#67e8f9" }}>create</span>({"{"}{"\n"}
                {"  "}model: <span style={{ color: "var(--green)" }}>&quot;auto&quot;</span>,{"\n"}
                {"  "}messages,{"\n"}
                {"}"});{"\n\n"}
                <span style={{ color: "var(--text-muted)" }}>{"// response headers tell you what happened"}</span>{"\n"}
                <span style={{ color: "var(--cyan)" }}>x-router-model-selected</span>: anthropic/claude-sonnet-4{"\n"}
                <span style={{ color: "var(--cyan)" }}>x-router-request-id</span>: router_a1b2c3d4
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────── */}
      <section className="landing-section" id="features">
        <div className="section-label centered">Features</div>
        <h2 className="section-heading centered">You set the strategy. The router handles the rest.</h2>
        <p className="section-desc centered">
          Model selection, fallbacks, thread management, and circuit breaking &mdash;
          all driven by the catalog and rules you define.
        </p>

        <div className="features-grid">
          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot cyan" />
              <h3>Custom Model Catalog</h3>
            </div>
            <p>
              Define exactly which models are available, with metadata like thinking level, vision support, and natural-language guidance on when to use each one.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot indigo" />
              <h3>Natural-Language Rules</h3>
            </div>
            <p>
              Write routing instructions in plain English. The LLM classifier reads your rules alongside the prompt and picks the model that fits.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot green" />
              <h3>Thread Stickiness</h3>
            </div>
            <p>
              Once a model is selected for a conversation, it stays pinned. Agent tool-call loops never switch mid-chain. Caches are preserved.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot amber" />
              <h3>Routing Profiles</h3>
            </div>
            <p>
              Create named strategies like <code className="code">auto-cheap</code> or <code className="code">auto-coding</code> that override the catalog, default model, and instructions.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot cyan" />
              <h3>Circuit Breakers</h3>
            </div>
            <p>
              Three triggers &mdash; error rate, fallback rate, latency spike &mdash; automatically disable degraded models and recover after cooldown.
            </p>
          </div>

          <div className="feature-cell">
            <div className="feature-icon-row">
              <div className="feature-dot indigo" />
              <h3>Full Observability</h3>
            </div>
            <p>
              Every routing decision is stored with the classifier&rsquo;s confidence, signals, and fallback chain. Query any request by ID to see exactly why.
            </p>
          </div>
        </div>
      </section>

      {/* ─── The Config ──────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="section-label">Your Configuration</div>
        <h2 className="section-heading">Everything lives in the dashboard. Not in your code.</h2>
        <p className="section-desc">
          Change models, update routing rules, add profiles &mdash; all from the admin UI.
          No deploys required. Your app just sends <code className="code">model: &quot;auto&quot;</code> and
          the router reads your latest config.
        </p>

        <div className="compare">
          <div className="compare-pane">
            <div className="compare-header before">&#x2718; Without Auto Router</div>
            <div className="compare-body">
              <span className="del">{"const model = task === 'code'"}</span>{"\n"}
              <span className="del">{"  ? 'anthropic/claude-sonnet-4'"}</span>{"\n"}
              <span className="del">{"  : task === 'math'"}</span>{"\n"}
              <span className="del">{"  ? 'openai/o3'"}</span>{"\n"}
              <span className="del">{"  : task === 'vision'"}</span>{"\n"}
              <span className="del">{"  ? 'openai/gpt-4o'"}</span>{"\n"}
              <span className="del">{"  : 'openai/gpt-4.1-mini';"}</span>{"\n"}
              {"\n"}
              <span className="del">{"try {"}</span>{"\n"}
              <span className="del">{"  result = await call(model, prompt);"}</span>{"\n"}
              <span className="del">{"} catch {"}</span>{"\n"}
              <span className="del">{"  result = await call(FALLBACK, prompt);"}</span>{"\n"}
              <span className="del">{"}"}</span>{"\n"}
              {"\n"}
              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{"// new model? edit code. redeploy."}</span>
            </div>
          </div>

          <div className="compare-pane">
            <div className="compare-header after">&#x2714; With Auto Router</div>
            <div className="compare-body">
              <span className="add">{"const res = await client.chat.completions.create({"}</span>{"\n"}
              <span className="add">{"  model: \"auto\","}</span>{"\n"}
              <span className="add">{"  messages: [{ role: \"user\", content: prompt }],"}</span>{"\n"}
              <span className="add">{"});"}</span>{"\n"}
              {"\n"}
              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{"// model catalog + routing rules live in"}</span>{"\n"}
              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{"// the dashboard. update anytime."}</span>{"\n"}
              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{"// no code changes. no redeploys."}</span>
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
