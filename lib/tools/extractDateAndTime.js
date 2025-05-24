import Agent from "../ai/agent.js";
import {createPrompt} from "../ai/prompt.js";

const agent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

const model = agent.model;

export async function extractDateAndTime(input){
    const prompt = createPrompt({
        role:"AI that extracts precise date and time information from natural language.",
        context:"User is a busy person who is looking for a way to manage their time effectively.",
        instructions:[
            `Extract the following information from the user input:
            - date: exact date (YYYY-MM-DD) if a specific day is mentioned
            - time: in HH:MM 24-hour format if clearly stated
            - inferredTime: true or false
            - inferredTimeValue: your best guess if inferredTime is true (e.g., '12:00' for lunch)
            - period:`,
            `Use today’s date as reference: ${new Date().toISOString().split("T")[0]}`,
        ],
        goal:"Extract precise date and time information from natural language.",
        outputFormat:`{
            "date": "YYYY-MM-DD",
            "time": "HH:MM",
            "inferredTime": true | false,
            "inferredTimeValue": "HH:MM",
            "period": {
                "startDate": "YYYY-MM-DD",
                "endDate": "YYYY-MM-DD"
            }
        }`,
        examples:`
        Input: "Give me a report this week"
        Output:
        {
            "date": null,
            "time": null,
            "inferredTime": false,
            "inferredTimeValue": null,
            "period": {
                "startDate": "2025-04-28",
                "endDate": "2025-05-04"
            }
        }
        `,
        userInput:input,
    })
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonResult = JSON.parse(response);
    return jsonResult;
}
