import Agent from "./agent.js";
import {createPrompt} from "./prompt.js";

const agent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

const prompt = createPrompt({
        role:"really helpful scheduling assistant.",
        context:"User is a busy person who is looking for a way to manage their time effectively.",
        instructions:[
            "First, classify the intent as one of [report, recommend, chat] based on the **user input**.",
            "Then generate an appropriate response for that intent.",
            `If intent is 'recommend', you must include specific suggestions with:
            - title
            - description
            - suggestedDate
            - suggestedStartTime
            - suggestedEndTime
            - suggestedEventCategory`,
            "The date and time can be inferred from selected days.",
            "If there is a day with no events, suggest 3 events for that day(morning, afternoon, and evening).",
            "If there is a day with few(less than 3) events, suggest more events for that day(morning, afternoon, and evening).",
            `If the day which you are suggesting events is today(${new Date().toISOString().split("T")[0]}), please suggest events that are adequate for current time ${new Date().getHours()}:${new Date().getMinutes()}.`,
        ],
        goal:"Improve the user's time management skills by providing personalized recommendations based on their schedule.",
        outputFormat:`{
            "intent": "report" | "recommend" | "chat",
            "response": "string (your actual answer to the user)",
            "recommendations": [
              {
                "title": "string",
                "description": "string",
                "suggestedDate": "YYYY-MM-DD",
                "suggestedStartTime": "HH:mm",
                "suggestedEndTime": "HH:mm",
                "suggestedEventCategory": "Exercise" | "Study" | "Work" | "Personal"
              }
            ] // Only if intent is "recommend" 
          }`
    })
    
const model = agent.model;

const chat = model.startChat({
    history: [
        {
            role: "user",
            parts: [
                {
                    text: prompt
                }
            ]
        }
    ]
});

function formatUserInput({message,schedules,selectedDays}){
    return `
        User Input:
        ${message}

        Selected Days:
        ${JSON.stringify(selectedDays)}

        User Schedule:
        ${JSON.stringify(schedules)}
    `
}

export async function sendMessageToScheduleAssistant({message,schedules,selectedDays}){
    try {
        const result = await chat.sendMessage(formatUserInput({message,schedules,selectedDays}));
        const jsonRes = result.response.text();
        const parsedRes = JSON.parse(jsonRes);
        return parsedRes;
    } catch (err) {
        throw new Error(err);
    }
}
