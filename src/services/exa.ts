
'use server';

interface SearchResult {
  title: string;
  url: string;
  id: string;
  score: number;
  publishedDate?: string;
  author?: string;
  text?: string;
}

export async function searchExa(
  query: string,
  numResults: number = 5
): Promise<SearchResult[]> {
  try {
    const searchResponse = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXA_API_KEY!,
      },
      body: JSON.stringify({
        query: query,
        numResults: numResults,
        useAutoprompt: true,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Exa search failed with status ${searchResponse.status}: ${errorText}`);
    }

    const searchData = await searchResponse.json();
    const resultIds = searchData.results.map((r: any) => r.id);

    if (resultIds.length === 0) {
      return [];
    }

    const contentsResponse = await fetch('https://api.exa.ai/contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXA_API_KEY!,
      },
      body: JSON.stringify({
        ids: resultIds,
        text: true, // Request text content
      }),
    });
    
    if (!contentsResponse.ok) {
      const errorText = await contentsResponse.text();
      throw new Error(`Exa getContents failed with status ${contentsResponse.status}: ${errorText}`);
    }

    const contentsData = await contentsResponse.json();

    return contentsData.results.map((result: any) => ({
      title: result.title || 'No Title',
      url: result.url,
      id: result.id,
      score: result.score,
      publishedDate: result.publishedDate,
      author: result.author,
      text: result.text,
    }));

  } catch (error) {
    console.error('Error interacting with Exa API:', error);
    // Returning an empty array to prevent the entire flow from failing
    return [];
  }
}
