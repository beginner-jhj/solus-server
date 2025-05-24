import { google } from 'googleapis';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const customsearch = google.customsearch('v1');

export async function webSearch(query, maxResults=5){
    const res = await customsearch.cse.list({
        auth:GOOGLE_SEARCH_API_KEY,
        cx:GOOGLE_SEARCH_ENGINE_ID,
        q:query,
        num:maxResults,
    })
    const processedItems = res.data.items && res.data.items.length > 0
    ? res.data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
    }))
    : [];
    return processedItems;
}
