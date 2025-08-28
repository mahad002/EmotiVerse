
'use server';

// import Exa from '@exahq/exa-node';

// const exa = new Exa(process.env.EXA_API_KEY);

interface SearchResult {
  title: string;
  url: string;
  id: string;
  score: number;
  publishedDate?: string;
  author?: string;
  text?: string;
}

interface HighlightResult extends SearchResult {
  highlights: string[];
}

export async function searchExa(
  query: string,
  numResults: number = 5
): Promise<SearchResult[]> {
  try {
    // const searchResponse = await exa.search(query, {
    //   numResults,
    //   useAutoprompt: true,
    // });
    
    // const contentsResponse = await exa.getContents(searchResponse.results.map(r => r.id));

    // return contentsResponse.results.map(result => ({
    //   title: result.title || 'No Title',
    //   url: result.url,
    //   id: result.id,
    //   score: result.score,
    //   publishedDate: result.publishedDate,
    //   author: result.author,
    //   text: result.text,
    // }));
    console.log('Exa search is temporarily disabled.');
    return [];

  } catch (error) {
    console.error('Error searching with Exa:', error);
    throw new Error('Failed to perform search with Exa.');
  }
}
