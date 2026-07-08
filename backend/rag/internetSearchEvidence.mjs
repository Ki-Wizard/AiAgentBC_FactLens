const DEFAULT_ALLOWED_DOMAINS = Object.freeze([]);

const DEFAULT_TIMEOUT_MS = 4500;
const DEFAULT_LIMIT = 3;

function envList(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;
  if (rawValue.trim() === "*" || rawValue.trim().toLowerCase() === "all") {
    return [];
  }
  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function buildQuery(claim, allowedDomains) {
  const claimQuery = normalizeText(claim.normalizedQuery || claim.text);
  const primaryDomain = allowedDomains[0];
  return primaryDomain ? `site:${primaryDomain} ${claimQuery}` : claimQuery;
}

function isAllowedUrl(url, allowedDomains) {
  if (!allowedDomains.length) return true;

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return allowedDomains.some((domain) => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });
  } catch {
    return false;
  }
}

async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`search provider returned ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchBrave(query, options) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(options.limit));
  url.searchParams.set("safesearch", "strict");

  const data = await fetchJson(url, {
    timeoutMs: options.timeoutMs,
    headers: {
      accept: "application/json",
      "x-subscription-token": apiKey,
    },
  });

  return {
    provider: "brave",
    rawResults: data.web?.results ?? [],
  };
}

async function searchSerpApi(query, options) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(options.limit));

  const data = await fetchJson(url, { timeoutMs: options.timeoutMs });

  return {
    provider: "serpapi",
    rawResults: data.organic_results ?? [],
  };
}

async function searchGoogleCse(query, options) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !searchEngineId) return null;

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", searchEngineId);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(options.limit, 10)));

  const data = await fetchJson(url, { timeoutMs: options.timeoutMs });

  return {
    provider: "google_cse",
    rawResults: data.items ?? [],
  };
}

function stripHtml(value) {
  return normalizeText(String(value ?? "").replace(/<[^>]+>/g, " "));
}

async function searchWikipedia(query, options) {
  const url = new URL("https://ko.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srlimit", String(options.limit));

  const data = await fetchJson(url, { timeoutMs: options.timeoutMs });

  return {
    provider: "wikipedia",
    rawResults: data.query?.search ?? [],
  };
}

function normalizeResult(provider, rawResult) {
  if (provider === "brave") {
    return {
      title: rawResult.title,
      url: rawResult.url,
      snippet: rawResult.description,
    };
  }

  if (provider === "serpapi") {
    return {
      title: rawResult.title,
      url: rawResult.link,
      snippet: rawResult.snippet,
    };
  }

  if (provider === "wikipedia") {
    const title = stripHtml(rawResult.title);
    return {
      title,
      url: `https://ko.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
      snippet: stripHtml(rawResult.snippet),
    };
  }

  return {
    title: rawResult.title,
    url: rawResult.link,
    snippet: rawResult.snippet,
  };
}

function toEvidence(result, index, context) {
  return {
    id: `internet-${context.provider}-${String(index + 1).padStart(3, "0")}`,
    title: result.title || result.url,
    sourceType: "internet_search",
    url: result.url,
    service: "Internet evidence",
    category: context.claim.category ?? "other",
    keywords: [],
    summaryKo: `${context.provider} 검색으로 찾은 공식 출처 후보입니다.`,
    evidenceText: result.snippet || result.title || result.url,
    searchProvider: context.provider,
    searchQuery: context.query,
    retrievedAt: context.retrievedAt,
  };
}

async function runConfiguredProvider(query, options) {
  const provider = process.env.FACTLENS_SEARCH_PROVIDER || "auto";

  if (provider === "brave") return searchBrave(query, options);
  if (provider === "serpapi") return searchSerpApi(query, options);
  if (provider === "google_cse") return searchGoogleCse(query, options);
  if (provider === "wikipedia") return searchWikipedia(query, options);

  return (
    (await searchBrave(query, options)) ??
    (await searchSerpApi(query, options)) ??
    (await searchGoogleCse(query, options)) ??
    (await searchWikipedia(query, options))
  );
}

export async function searchInternetEvidence(claim, options = {}) {
  const allowedDomains = options.allowedDomains ?? envList(
    "FACTLENS_ALLOWED_SOURCE_DOMAINS",
    DEFAULT_ALLOWED_DOMAINS,
  );
  const limit = Number(options.limit ?? process.env.FACTLENS_SEARCH_RESULT_LIMIT ?? DEFAULT_LIMIT);
  const timeoutMs = Number(process.env.FACTLENS_SEARCH_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const query = buildQuery(claim, allowedDomains);

  try {
    const providerResult = await runConfiguredProvider(query, {
      limit,
      timeoutMs,
    });

    if (!providerResult) {
      return {
        provider: "none",
        query,
        results: [],
        disabledReason:
          "No search API key configured. Set BRAVE_SEARCH_API_KEY, SERPAPI_API_KEY, or GOOGLE_SEARCH_API_KEY with GOOGLE_SEARCH_ENGINE_ID.",
      };
    }

    const retrievedAt = new Date().toISOString();
    const results = providerResult.rawResults
      .map((rawResult) => normalizeResult(providerResult.provider, rawResult))
      .filter((result) => result.url && isAllowedUrl(result.url, allowedDomains))
      .slice(0, limit)
      .map((result, index) =>
        toEvidence(result, index, {
          provider: providerResult.provider,
          query,
          claim,
          retrievedAt,
        }),
      );

    return {
      provider: providerResult.provider,
      query,
      results,
      disabledReason: null,
    };
  } catch (error) {
    return {
      provider: process.env.FACTLENS_SEARCH_PROVIDER || "auto",
      query,
      results: [],
      disabledReason: error.message,
    };
  }
}
