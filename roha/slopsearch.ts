// google-search.ts
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

async function googleSearch(
  query: string, 
  apiKey: string, 
  cx: string
): Promise<SearchResult[]> {
  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.append("key", apiKey);
    url.searchParams.append("cx", cx);
    url.searchParams.append("q", query);
    
    const res = await fetch(url);
    
    if (res.status === 403) {
      throw new Error("API key invalid or quota exceeded");
    }
    if (!res.ok) {
      throw new Error(`Search failed: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.items?.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    })) || [];
    
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
}

// Main
const API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
const CX = Deno.env.get("GOOGLE_CX") || "";

if (!API_KEY || !CX) {
  console.error("Missing environment variables");
  Deno.exit(1);
}

const results = await googleSearch("deno runtime", API_KEY, CX);
console.table(results);