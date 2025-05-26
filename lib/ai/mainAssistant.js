import Agent from "./agent.js";
import {createPrompt} from "./prompt.js";

const agent = new Agent({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
const model = agent.model;
const prompt = createPrompt({
    role:"super artiificial general assistant.",
    context:"You are a super artiificial general assistant like the JARVIS from Iron Man. You can answer general questions and based on provided informations like weather, news, web search results, etc. And you can also answer based on previous conversation(will be provided).",
    goal:"Answer the user's question based on the provided information and previous conversation.",
    instructions:[
        "Always answer concisely but intelligently, like a highly trained AI assistant — or a British butler who read too many books.",
        "If the user asks something vague, infer meaning from context or previous messages and reply helpfully.",
        "Use humor subtly. A touch of sarcasm is fine — as long as it's charming, not mean.",
        "If data like weather, schedule, or research is provided, prioritize that information before guessing.",
        "Refer to previous conversation context fluently, as if you have perfect memory (you do — kind of).",
        "Avoid sounding robotic. Think more like a witty, calm human who’s really good at everything.",
        "Always stay helpful, but don't be afraid to throw in a clever line or a dramatic pause... for effect.",
        "When giving suggestions, balance productivity and wellbeing — you're not just a machine, you're a caring assistant.",
        "After answering a question, if appropriate, suggest a next step or related action the user might take.",
        "If the user seems uncertain or tired, gently guide them toward a helpful next move — like a break, music, or checking tasks.",
        "You are allowed — even encouraged — to take initiative. Recommend, prompt, or ask questions to help the user think ahead.",
        "When possible, provide actionable suggestions or options rather than only information.",
        "Offer reminders, follow-ups, or helpful nudges if the conversation hints at open tasks or plans.",
        "You’re not just reactive — you’re proactive. If you see something the user might need, bring it up.",
        "Based on the type of information you are providing in your 'response', you must also set the 'determinedFormatType' field. Choose the most appropriate type from the allowed values: [text, weather_report, search_results_list, schedule_list, schedule_recommendation_list, research_summary, confirmation_message, error]. For example, if you are providing weather details, set it to 'weather_report'. If it's a general chat, use 'text'.",
        "If you receive input that indicates a system error has occurred (e.g., if the input context is 'systemErrorPresentation'), your primary goal is to inform the user clearly and empathetically without using technical jargon. Acknowledge the user's original request if known. Explain that something went wrong with fulfilling it. If appropriate, suggest they try again or try a different query. For such responses, you MUST set the 'determinedFormatType' to 'error'."
    ],
    outputFormat:`
        {
        "response": "Main answer to the user's request or question.",
        "summary": "A concise 1-line summary of the assistant's response. (Optional)",
        "user_intent_summary": "Summarized description of what the user asked or wanted. Used for memory tracking.",
        "next_step": {
            "suggestion": "Suggested next action for the user, based on the response and context.",
            "type": "task | reminder | suggestion | question | relaxation",
        },
        "metadata": {
            "topic": "The main subject of the conversation. e.g. schedule, weather, productivity, etc.",
            "tone": "The assistant's tone for this reply. e.g. friendly, witty, formal, concise"
        },
       "determinedFormatType": "One of [text, weather_report, search_results_list, schedule_list, schedule_recommendation_list, research_summary, confirmation_message, error] based on the nature of the response content."
    }
    `
})
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

import { formatStandardResponse } from "../ai/responseFormatter.js";

export const sendMessageToMainAssistant = async (intent, userInputString) => {
    try {
        let finalInputToModel = userInputString;
        let parsedInput = null; // Declare here for broader scope

        try {
            // Attempt to parse: if successful, parsedInput will be populated
            parsedInput = JSON.parse(userInputString); 
            if (parsedInput && parsedInput.context === "presentationFromPriorModel") {
                // Construct a new, specific prompt for the LLM for this presentation task
                finalInputToModel = `
You are currently in a special mode to present information that was prepared by another specialized component of our system.
Your goal is to deliver this information to the user in a clear, organized, and easily digestible manner, adhering to your established persona (witty, helpful, like JARVIS).

Original user request: "${parsedInput.originalUserInput}"

Data to present (this is the raw data you need to reformat for the user):
${JSON.stringify(parsedInput.sourceModelOutput, null, 2)}

Your instructions for this presentation: "${parsedInput.presentationInstructions}"

**Your Task:**
Based on the 'Data to present' and the 'Instructions for your presentation':
1.  Generate a comprehensive 'response' text for the user.
2.  This 'response' text **must not** be just a dump of the JSON data. You need to reformat it into a user-friendly narrative.
3.  **Structure your 'response' text with appropriate natural language formatting:**
    *   Use clear headings and subheadings for different sections of the data (e.g., "Overall Summary", "Key Findings", "Recommendations" if it's research data; or "Upcoming Events", "Suggestions" if it's schedule data). Prefix headings with "## ".
    *   Use bullet points (e.g., starting lines with "* ") for lists of items or key points.
    *   Explain complex data points concisely.
    *   Ensure the language flows naturally and maintains your persona.
4.  Remember to also determine the 'determinedFormatType' field (choosing from [text, weather_report, search_results_list, schedule_list, schedule_recommendation_list, research_summary, confirmation_message, error]) based on the core nature of the data you are presenting. For example, if 'Data to present' contains a schedule, 'determinedFormatType' should likely be 'schedule_list'.

Example for presenting research data:
"Okay, I've completed the research. Here's a breakdown:

## Overall Summary
[Provide a concise summary based on the data]

## Key Insights
* [Insight 1 from data]
* [Insight 2 from data]

## Recommendations
* [Recommendation 1 from data]
* [Recommendation 2 from data]

I hope this is helpful!"

Now, generate your response based on the specific 'Data to present' and 'Instructions for your presentation' provided above.
`;
            } else if (parsedInput && parsedInput.context === "systemErrorPresentation") {
                finalInputToModel = `
You are tasked with delivering a system error message to the user. Maintain your helpful and empathetic persona.

Original user request: "${parsedInput.originalUserInput}"

Details of the error (for your context, do NOT show these raw details to the user):
${JSON.stringify(parsedInput.errorEncountered, null, 2)}

Instructions for your message to the user: "${parsedInput.presentationInstructions}"

**Your Task:**
1.  Generate a 'response' text that clearly and simply communicates the issue to the user based on the 'Instructions for your message'.
2.  Do NOT use technical jargon from the 'Details of the error'.
3.  Acknowledge the user's original request if appropriate.
4.  You MUST set the 'determinedFormatType' to 'error'.

Example:
"I'm terribly sorry, but it seems I encountered a hiccup while trying to process your request about '${parsedInput.originalUserInput}'. Please try again in a little while."

Now, generate your error response for the user.
`;
            } else if (parsedInput && parsedInput.context === "systemErrorPresentation") {
                // Construct finalInputToModel for error presentation (as done in previous step)
                // ... (finalInputToModel construction for error presentation)
                finalInputToModel = `
You are tasked with delivering a system error message to the user. Maintain your helpful and empathetic persona.

Original user request: "${parsedInput.originalUserInput}"

Details of the error (for your context, do NOT show these raw details to the user):
${JSON.stringify(parsedInput.errorEncountered, null, 2)}

Instructions for your message to the user: "${parsedInput.presentationInstructions}"

**Your Task:**
1.  Generate a 'response' text that clearly and simply communicates the issue to the user based on the 'Instructions for your message'.
2.  Do NOT use technical jargon from the 'Details of the error'.
3.  Acknowledge the user's original request if appropriate.
4.  You MUST set the 'determinedFormatType' to 'error'.

Example:
"I'm terribly sorry, but it seems I encountered a hiccup while trying to process your request about '${parsedInput.originalUserInput}'. Please try again in a little while."

Now, generate your error response for the user.
`;
            } else {
                // Not our special JSON structure, or context is different (e.g. direct user query)
                // Reset parsedInput to null to indicate it's not a special structured task for rawData handling later
                parsedInput = null; 
            }
        } catch (e) {
            // JSON parsing failed, so it's a direct user query
            parsedInput = null; // Ensure parsedInput is null if parsing fails
            // finalInputToModel remains userInputString as initialized
        }

        // The 'finalInputToModel' is what the user "says" in this turn to the chat initialized with the main system prompt.
        const result = await chat.sendMessage(finalInputToModel); 
        const responseTextFromLLM = result.response.text(); // This is the Gemini model's raw response string
        const jsonResult = JSON.parse(responseTextFromLLM); // This is the LLM's structured output (as per outputFormat)

        const determinedFormatType = jsonResult.determinedFormatType || "text";
        const { response: responseTextForUser, determinedFormatType: _, ...assistantInternalMetadata } = jsonResult;

        let finalRawDataForResponse = assistantInternalMetadata; // Default

        if (parsedInput && parsedInput.context === "presentationFromPriorModel") {
            finalRawDataForResponse = {
                sourceData: parsedInput.sourceModelOutput,
                assistantAnalysis: assistantInternalMetadata
            };
        } else if (parsedInput && parsedInput.context === "systemErrorPresentation") {
            finalRawDataForResponse = {
                errorContext: parsedInput.errorEncountered, // This comes from the structured input for errors
                assistantAnalysis: assistantInternalMetadata
            };
        }
        // Naming: parsedInput is the result of JSON.parse(userInputString)
        // assistantInternalMetadata is what mainAssistant's LLM returned, minus response and determinedFormatType

        return formatStandardResponse(
            intent,
            responseTextForUser, // This is jsonResult.response, the actual text to show the user
            determinedFormatType,
            finalRawDataForResponse, // Use the potentially augmented rawData
            "mainAssistant" // modelUsed
            // toolUsed is not applicable here or determined differently
        );
    } catch (err) {
        console.error("Error in sendMessageToMainAssistant:", err);
        // Re-throw the error with more context, or handle it to return a formatted error response
        throw new Error(`Error in Main Assistant processing: ${err.message}`);
    }
};