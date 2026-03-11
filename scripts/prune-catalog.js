const API_BASE = process.env.API_BASE;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!API_BASE) {
    console.error("Missing API_BASE environment variable.");
    process.exit(1);
}

if (!ADMIN_SECRET) {
    console.error("Missing ADMIN_SECRET environment variable.");
    process.exit(1);
}

// Target models to KEEP based on the user's request
const modelsToKeep = [
    "minimax/minimax-m2.5",
    "moonshotai/kimi-k2.5",
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-5.2",
    "z-ai/glm-5",
    "google/gemini-3.1-pro-preview"
];

async function pruneCatalog() {
    console.log("Fetching current catalog...");
    const res = await fetch(`${API_BASE}/catalog`, {
        headers: {
            authorization: `Bearer ${ADMIN_SECRET}`
        }
    });
    const data = await res.json();
    const catalog = data.catalog;

    if (!catalog || !Array.isArray(catalog)) {
        console.error("Failed to load catalog:", data);
        return;
    }

    console.log(`Loaded ${catalog.length} models from the catalog.`);

    let deletedCount = 0;
    for (const model of catalog) {
        // If the model ID isn't in our keep list, delete it.
        if (!modelsToKeep.includes(model.id)) {
            console.log(`Removing ${model.id}...`);
            const delRes = await fetch(`${API_BASE}/catalog/${encodeURIComponent(model.id)}`, {
                method: "DELETE",
                headers: {
                    authorization: `Bearer ${ADMIN_SECRET}`
                }
            });

            if (!delRes.ok) {
                console.error(`Failed to delete ${model.id}`);
            } else {
                deletedCount++;
            }
        }
    }

    console.log(`\nPruning complete. Removed ${deletedCount} models.`);
}

pruneCatalog().catch(console.error);
