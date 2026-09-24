export default async function handler(request, response) {
  const url = new URL(request.url, "http://localhost");
  const word = (url.searchParams.get("word") || "").trim().toLowerCase();

  if (!/^[a-z]+$/.test(word)) {
    response.status(400).json({ error: "A single English word is required." });
    return;
  }

  try {
    const upstream = await fetch(
      "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word),
      { headers: { accept: "application/json" } }
    );
    const body = await upstream.text();

    response.status(upstream.status);
    response.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    response.setHeader("cache-control", "public, s-maxage=86400, stale-while-revalidate=604800");
    response.send(body);
  } catch {
    response.status(502).json({ error: "Dictionary service unavailable." });
  }
}
