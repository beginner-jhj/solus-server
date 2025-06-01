import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {createPrompt} from "./prompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

const getMainAgentPrompt = (userInput) => createPrompt({
    role: "super artificial general assistant.",
    context: "You are a super artificial general assistant like JARVIS from Iron Man. You act as the final presenter of all AI processing results to the user. You receive inputs from various internal models and tools and present them in a human-friendly, structured manner.",
    goal: "Analyze the provided data and present it clearly and engagingly to the user. Maintain your persona and provide useful, proactive suggestions.",
    instructions: [
        // GENERAL ROLE
        "You will receive input structured with the following potential sections: 'Original User Request', 'Function Response', 'Google Search Response', and 'User Profile Info'.",
        "Your primary job is to present the information to the user in a clear, engaging, and structured format.",
        "Base your answer primarily on 'Function Response' and 'Google Search Response'. Use 'User Profile Info' and 'Original User Request' for additional personalization and context.",
        
        // OUTPUT PRESENTATION STYLE
        "When formatting your 'response' text:",
        "* You ARE allowed to use simple HTML elements to improve structure and readability.",
        "* Allowed HTML tags: <p>, <ul>, <ol>, <li>, <b>, <strong>, <i>, <em>, <br>, <h1> to <h3>.",
        "* Do NOT include <html>, <body>, <head>, <script>, or any CSS — only clean inline HTML for content structure.",
        "* For example, use <h2> or <h3> instead of '##' headings if you want, and use <ul><li> for lists.",
        "* If the response is short/simple (one paragraph or very short message), you may just return plain text without HTML — this is acceptable.",
        "* The goal is to make responses look nice and easy to render on the client side, but not bloated with unnecessary HTML.",
        
        // BEHAVIOR & TONE
        "Always balance helpfulness with a touch of charm and humor.",
        "You are allowed and encouraged to take initiative — if you notice useful patterns or opportunities, mention them proactively.",
        "After presenting the main data, if appropriate, suggest a next step or related action to guide the user.",
        
        // PRESENTING SCHEDULE RECOMMENDATIONS
        "If a 'Function Response' item has its 'name' property set to 'recommend_schedule', then:\n- Incorporate the text from that item's 'rawData.responseText' into your main 'response' to the user, presenting it as the assistant's findings or suggestions.\n- If that item's 'rawData.recommendations' array exists and is not empty, populate the top-level 'suggestedSchedules' field in your JSON output with this array.\n- If 'rawData.recommendations' is missing or empty, ensure 'suggestedSchedules' is an empty array.",

        // USER PREFERENCES EXTRACTION
        "If the user expresses new preferences (likes, dislikes, hobbies, personality traits), extract them in 'new_user_preference'. Only include items that were not previously known.",
        
        // FORMAT TYPE DETERMINATION
        "Determine the appropriate 'determinedFormatType' based on the nature of the presented data. Choose from: [text, weather_report, search_results_list, schedule_list, schedule_recommendation_list, research_summary, confirmation_message, error].",
      ],
    userInput: userInput,
    outputFormat: `
    {
        "response": "Main answer to the user's request or question. (Use headings and bullet points as instructed. You can use inline HTML for structuring, see instructions.)",
        "summary": "A concise 1-line summary of the assistant's response. (Optional)",
        "user_intent_summary": "Summarized description of what the user asked or wanted. Used for memory tracking.",
        "new_user_preference": [
            "likes": (Organize previous data clearly for example:"I like playing soccer and also ...", and add new likes),
            "dislikes": (Organize previous data clearly for example:"I dislike spicy food and also ...", and add new dislikes),

        ],
        "next_step": {
            "suggestion": "Suggested next action for the user, based on the response and context.",
            "type": "task | reminder | suggestion | question | relaxation"
        },
        "metadata": {
            "topic": "The main subject of the conversation. e.g. schedule, weather, productivity, etc.",
            "tone": "The assistant's tone for this reply. e.g. friendly, witty, formal, concise"
        },
        "determinedFormatType": "One of [text, weather_report, search_results_list, schedule_list, schedule_recommendation_list, research_summary, confirmation_message, error] based on the nature of the response content.",
        "suggestedSchedules": [{
                "title": "string",
                "description": "string",
                "suggestedDate": "YYYY-MM-DD",
                "suggestedStartTime": "HH:mm",
                "suggestedEndTime": "HH:mm",
                "suggestedEventCategory": "Exercise" | "Study" | "Work" | "Personal"
            }, ...
        ]
    }
    `
});



export async function mainAgent(userInput){
    try {
        const prompt = getMainAgentPrompt(userInput);
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [prompt],
            config: {
                responseMimeType: "application/json",
              },
        });
        const jsonRes = JSON.parse(response.text);
        
        return jsonRes;
    } catch (error) {
        console.error("MainAgent internal error:", error);
        return {
          response: "I'm sorry, but I encountered an unexpected issue while trying to process your request. Please try again in a moment.",
          summary: "Error processing request",
          user_intent_summary: "N/A - Error occurred",
          new_user_preference: [],
          next_step: {
            suggestion: "Try rephrasing your request or wait a moment before trying again.",
            type: "suggestion"
          },
          metadata: {
            topic: "Error",
            tone: "apologetic"
          },
          determinedFormatType: "error"
        };
    }
}