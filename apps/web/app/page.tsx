const endpoints = [
  "POST /api/v1/chat/completions",
  "POST /api/v1/responses",
  "GET /api/v1/router/explanations/:request_id (admin)",
  "GET|PUT /api/v1/router/config (admin)",
  "GET /api/v1/router/scorecard/current",
  "GET /api/v1/router/runs (admin)",
  "POST /api/v1/router/recompute (admin)"
];

export default function HomePage() {
  return (
    <section className="panel stack">
      <h2>OpenAI-Compatible Auto Router</h2>
      <p>
        Route only when <code>model=auto</code> or <code>model=router/auto</code>. Explicit model
        requests pass through unchanged. Thread stickiness keeps agentic workflows on one model for 1 hour.
      </p>

      <h3>Endpoints</h3>
      <ul className="endpoint-list">
        {endpoints.map((endpoint) => (
          <li key={endpoint}>
            <code>{endpoint}</code>
          </li>
        ))}
      </ul>

      <h3>First-Call-Only Routing</h3>
      <p>
        New conversation calls are routed from scorecards. Continuation requests reuse pinned models unless the
        pin fails or violates hard constraints.
      </p>
    </section>
  );
}
