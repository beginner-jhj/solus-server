import Agent from "../ai/agent.js";
import { createPrompt } from "../ai/prompt.js";

const agent = new Agent({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
});

const model = agent.model;

export async function extractScheduleQueryInfo(input){
    try{
        const prompt = createPrompt({
            role: "AI that extracts schedule query information from natural language.",
            goal: "Extract precise date and optional time filters for querying events.",
            instructions: [
              "Return the year, month, and day if a specific date is mentioned.",
              "If a date range is mentioned (e.g., this week, next 3 days), return a 'period' array with start and end date in YYYY-MM-DD format.",
              "If a time condition is included (e.g., before 3 PM, between 2–4 PM), extract:",
              " - timeCondition: 'before' | 'after' | 'between' | null",
              " - timeReference: the reference time in HH:MM",
              " - timeReferenceEnd: the second time, if 'between' is used",
              "If no date is found, return null for year/month/day and provide only the period.",
              "Always include the originalInput for traceability.",
              `Use today's date as a reference ${new Date().toISOString().split('T')[0]}`,
            ],
            examples: `
          Input: "Show me all events before 3 PM today"
          Output:
          {
            "year": 2025,
            "month": 5,
            "day": 28,
            "period": ["2025-05-28", "2025-05-28"],
            "timeCondition": "before",
            "timeReference": "15:00",
            "timeReferenceEnd": null,
            "originalInput": "Show me all events before 3 PM today"
          }
          
          Input: "Give me a report for this week"
          Output:
          {
            "year": null,
            "month": null,
            "day": null,
            "period": ["2025-05-27", "2025-06-02"],
            "timeCondition": null,
            "timeReference": null,
            "timeReferenceEnd": null,
            "originalInput": "Give me a report for this week"
          }
          `,
            userInput: input
          });
          const result = await model.generateContent(prompt);
          const response = result.response.text();
          const jsonResult = JSON.parse(response);
          return jsonResult;
    }catch(err){
        throw new Error(err);
    }
}