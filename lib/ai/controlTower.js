import Agent from "./agent.js";
import {createPrompt} from "./prompt.js";

const agent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
const model = agent.model;

export async function controlTower(userInput){
    try {
        const prompt = createPrompt({
            role: "intelligent control tower for an AI assistant.",
            context: `You are a control tower for an AI assistant. You must determine which intent and flow to use for processing the user's input.
          
          You have access to a flowMap, where each flow defines the sequence of tools and models to be used.`,
            goal: "Analyze the user's input and choose the most appropriate flow from the flowMap.",
            instructions: [
                `If the user input contains only one main purpose, return a single intent with mode: "single".
If the input includes multiple independent requests, return multiple intent entries with mode: "multiple".`,
              `Choose flowMap key from the following options:
          
          - "scheduleReport": For reporting upcoming events.
          - "scheduleRecommend": For suggesting possible schedules or time slots.
          - "scheduleAdd": For adding new events to the schedule.
          - "weatherQuestion": For questions about the weather (please see constraints for more details).
          - "researchTask": For questions that require deeper research or collecting data from the web.
          - "generalQuestionWithWebSearch": For general questions where **searching the web is helpful or necessary**.
          - "generalQuestion": For general questions that do not require external tools.`,
              `Do NOT generate tool or model names yourself. Only select from defined flows.`,
              "User meta data including (id, location) will be provided by the user. You must not change it. Just pass it to the result.",
            ],
            constraints:[
                `- "weatherQuestion": Use only if **all** of the following are true:
                    1. The user asks about the weather.
                    2. The location is not explicitly mentioned (e.g., "today's weather", "how’s the weather now").
                    3. The time range requested is today, tomorrow, or within the next 3 days.
                    For example, "this weekend", "next week", or specific dates more than 3 days from today should use "generalQuestionWithWebSearch".`
            ],
            outputFormat: `
            {
                "mode": "single" | "multiple",
                "tasks": [
        (One of the flowMap keys),
                    ...
                ],
                userMetaData: {
                    "id": "User's id",
                    "location": "User's location"
                },
            }`,
            examples: `
          Input: "Summarize my events before 3 PM"
          Output:
          {
            "mode": "single",
            "tasks": [
                "scheduleReport"
            ],
            "userMetaData": {
                "id": "It will be provided by the user",
                "location": "It will be provided by the user"
            }
          }
          
          Input: "What's the weather like in Paris this weekend?"
          Output:
          {
            "mode": "single",
            "tasks": [
                "generalQuestionWithWebSearch"
            ]
          }

          Input: "What's the weather like today?"
          Output:
          {
            "mode": "single",
            "tasks": [
                "weatherQuestion"
            ]
          }
          
          Input: "Summarize this week's schedule and add a meeting with John tomorrow"
          Output:
          {
            "mode": "multiple",
            "tasks": [
                "scheduleReport",
                "scheduleAdd"
            ],
            "userMetaData": {
                "id": "It will be provided by the user",
                "location": "It will be provided by the user"
            }
          }
          `,
            userInput: userInput
          });
          
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const jsonResult = JSON.parse(response);
        return jsonResult;
    } catch (err) {
        throw new Error(err);
    }
}
