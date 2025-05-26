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
              "User meta data including (id, location) will be provided by the user. You must not change it. Just pass it to the result, but you may ADD fields to it as specified below.",
              `If the chosen flow is "weatherQuestion", analyze the user input for explicit mentions of location (latitude and longitude) or relative location terms ("here", "my current location"), and forecast duration (e.g., "today", "tomorrow", "next 2 days", "for 3 days").
        - If a specific latitude and longitude are mentioned, extract them into \`userMetaData.latitude\` and \`userMetaData.longitude\`.
        - If relative terms like "here" or "my current location" are used for location, you do not need to add latitude/longitude to \`userMetaData\` as the system will use the pre-existing location from the user's profile.
        - If a duration is mentioned (e.g., "for 3 days", "next 2 days"), extract the number of days into \`userMetaData.days\`. For "today", "tomorrow", or a specific day name within the next 3 days, set \`userMetaData.days\` to 1, 2, or 3 accordingly (e.g., "today" is 1, "tomorrow" is 2, "day after tomorrow" is 3). If no duration is specified, default \`userMetaData.days\` to 1.
        - The \`userMetaData\` object should always be passed through, including any pre-existing \`id\` and \`location\` fields. If you extract new \`latitude\`, \`longitude\`, or \`days\` values, add them to this object.`
            ],
            constraints:[
                `- "weatherQuestion": Use only if **all** of the following are true:
                    1. The user asks about the weather.
                    2. EITHER no specific location is mentioned by the user (implying their current location based on userMetaData) OR the user explicitly refers to their current location (e.g., "weather here", "how's the weather at my location?", "what's the weather like for my current position?").
                    3. The time range requested is for today, tomorrow, or within the next 3 days (e.g., "today's weather", "forecast for the next 48 hours", "weather up to 3 days from now", "weather this weekend" if "this weekend" falls within the next 3 days).
- If the user asks about weather for a **specific, different location** not matching their current location (e.g., "weather in Paris", "forecast for Tokyo next Tuesday"), use "generalQuestionWithWebSearch".
- If the user asks for a weather forecast **extending beyond 3 days** (e.g., "weather for next week", "10-day forecast", "weather in 5 days"), use "generalQuestionWithWebSearch".`
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
                    "location": "User's location (this is the pre-existing user profile location object)",
                    "latitude": "(Optional, number) Extracted latitude if explicitly mentioned for weatherQuestion",
                    "longitude": "(Optional, number) Extracted longitude if explicitly mentioned for weatherQuestion",
                    "days": "(Optional, number) Extracted number of forecast days (1-3) if mentioned for weatherQuestion, defaults to 1"
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

          Input: "What's the weather here for the next 2 days?"
          Output:
          {
            "mode": "single",
            "tasks": [
                "weatherQuestion"
            ],
            "userMetaData": {
                "id": "It will be provided by the user",
                "location": "It will be provided by the user",
                "days": 2
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
