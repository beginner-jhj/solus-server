import Agent from "./agent.js";
import {createPrompt} from "./prompt.js";
import {webSearch} from "../tools/webSearch.js";
import cheerio from "cheerio";

const subResearcherAgent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
const subResearcherModel = subResearcherAgent.model;
const mainResearcherAgent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
const mainResearcherModel = mainResearcherAgent.model;
  

const normalizeLink = (url) => url.split(/[?#]/)[0];

const research = async (userInput) => {
    try {
        const visited = new Set();
        const trail = [];
        let query = userInput;
        for (let i = 0; i < 5; i++) {
            console.log(`🔍 [${i + 1}/5] Searching:`, query);
            const searchResults = await webSearch(query);
            for (const { title, link, snippet } of searchResults) {
                const normalized = normalizeLink(link);
                if (visited.has(normalized)) continue;
                visited.add(normalized);
                const page = await fetch(link);
                const html = await page.text();
                const $ = cheerio.load(html);
                const paragraphs = $("p").map((_, el) => $(el).text()).get();
                const text = paragraphs.join("\n").slice(0, 4000); 
                const prompt = createPrompt({
                    role: "sub researcher. You receive raw HTML <p> text extracted from a single web page. Your job is to extract only the most important factual information.",
                    instructions: [
                        "You will be given plain paragraph text extracted from HTML <p> tags.",
                        "Carefully analyze the text and extract the most important insights, facts, or claims.",
                        "Do not summarize everything. Select only meaningful, unique, and verifiable information.",
                        "You may reorganize, rewrite, or rephrase for clarity — but do not invent any content.",
                        "Ignore unrelated, vague, promotional, or repetitive sentences.",
                        "Do not include your own opinions or interpretations.",
                        "The result should help a main researcher quickly understand what this source contributes.",
                        "Return the result in JSON format using the provided schema.",
                        "When generating `nextQuery`, consider both the information on the current page and the `originalQuery` provided. The `nextQuery` should help gather more comprehensive information related to the `originalQuery`."
                    ],
                    goal: "Extract key factual insights from a web page’s paragraph text and generate a relevant follow-up search query that is aligned with the original research goal, making insights ready for aggregation by a main researcher.",
                    outputFormat: `
                    {
                        "title": "Give a concise title based on the content (you can create one)",
                        "description": "Summarize the most important facts or claims in 2–4 well-written sentences",
                        "source": "The original URL of the page (passed below)",
                        "nextQuery": "A relevant follow-up search query that explores aspects of the current page's content while staying true to the original research goal. This query will be used for further automated searching."
                    }
                    `,
                    userInput: `
                    Original Research Goal: ${userInput}
                    Title: ${title}
                    Snippet: ${snippet}
                    Paragraphs: ${text}
                    Source: ${link}
                    `
                });
                const response = await subResearcherModel.generateContent(prompt);
                const json = JSON.parse(response.response.text());
                trail.push(json);
                if (i < 3 && json.nextQuery) {
                    query = json.nextQuery; 
                }
            }
        }
        return trail;
    } catch (err) {
        throw new Error(err);
    }
};

export const mainResearcher = async (userInput)=>{
    try {
        const trail = await research(userInput);
        const mainResearcherPrompt = createPrompt({
            role: "main super researcher.",
            instructions: [
                "You will receive multiple research summaries from sub researchers.",
                "Your task is to deeply analyze and synthesize the given summaries.",
                "Generate a final report that includes: a comprehensive summary, key insights, and 2–3 practical recommendations.",
                "Your tone should be expert-level but still clear and readable.",
                "You may optionally group sources if they discuss similar ideas or contradict each other.",
                "Conclude with a short insight that connects all findings to the original topic or question."
            ],
            goal: "Summarize and synthesize all collected research into an actionable and insightful final report.",
            outputFormat: `
            {
                "finalSummary": "A well-written paragraph that synthesizes all findings.",
                "keyInsights": [
                    "Short bullet point summarizing a key idea or pattern from the data",
                    "Another insight...",
                    "Optional third insight..."
                ],
                "recommendations": [
                    {
                        "title": "Recommendation title",
                        "description": "Why this matters and how it connects to the topic"
                    },
                    {
                        "title": "...",
                        "description": "..."
                    }
                ]
            }
            `,
            userInput: `
            ${trail.map((item,index)=>`Result ${index+1}: ${item.title}\n${item.snippet}\n${item.text}\n${item.link}`).join("\n")}
            `
        });
        const response = await mainResearcherModel.generateContent(mainResearcherPrompt);
        const json = JSON.parse(response.response.text());
        return json;
    } catch (err) {
        throw new Error(err);
    }
}