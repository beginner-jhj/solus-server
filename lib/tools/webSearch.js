import "dotenv/config";
import { google } from 'googleapis';
import cheerio from "cheerio";

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const customsearch = google.customsearch('v1');

export async function webSearch(query, maxResults=5){
    try {
        let result = [];
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
        for(const item of processedItems){
            const page = await fetch(item.link);
            const html = await page.text();
            const $ = cheerio.load(html);
            const paragraphs = $("p").map((_, el) => $(el).text()).get();
            const text = paragraphs.join("\n").slice(0, 4000); 
            item.text = text;
            result.push(item);
        }
        return result;
    } catch (err) {
        throw new Error(err);
    }
}
