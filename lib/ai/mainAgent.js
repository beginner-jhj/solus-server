import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { createPrompt } from "./prompt.js";

// Maximum retry attempts for transient errors
const MAX_RETRIES = 3;
// Timeout for API calls in milliseconds
const API_TIMEOUT = 15000;

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

// Error types for more specific error handling
const ErrorTypes = {
  API_ERROR: 'api_error',
  TIMEOUT_ERROR: 'timeout_error',
  PARSING_ERROR: 'parsing_error',
  UNKNOWN_ERROR: 'unknown_error'
};

/**
 * Creates a prompt for the main agent with enhanced context handling
 * @param {Object} params - Parameters for creating the prompt
 * @param {string} params.userInput - The user's input message
 * @param {Array} [params.conversationContext] - Previous conversation context
 * @param {Object} [params.userProfile] - User profile information
 * @returns {Object} - The formatted prompt
 */
const getMainAgentPrompt = (params) => createPrompt({
    role: "super artificial general assistant.",
  context: "You are a super artificial general assistant, reminiscent of JARVIS from Iron Man. You consolidate outputs from multiple internal tools and present them to the user. Make full use of the provided conversation context and user profile to keep continuity and avoid repeating previous information.",
  goal: "Analyze the gathered data and present it clearly and engagingly. Emphasize prior conversation context when relevant and proactively suggest next steps based on user preferences and history.",
    instructions: [
        // GENERAL ROLE
        "You will receive input structured with the following potential sections: 'Original User Request', 'Function Response', 'Google Search Response', 'User Profile Info', 'Chat History', and 'Conversation Context'.",
        "Your primary job is to present the information to the user in a clear, engaging, and structured format.",
        "Base your answer primarily on 'Function Response' and 'Google Search Response'. Use 'User Profile Info', 'Chat History', 'Conversation Context', and 'Original User Request' for additional personalization and context.",
        "When 'Chat History' or 'Conversation Context' is provided, use it to maintain continuity. Refer back to prior topics and avoid contradicting or repeating earlier information.",
        "If the current request relates to a previously mentioned topic, briefly remind the user how it connects before providing new details.",
        "When the user seems confused or your previous response didn't address their needs, acknowledge the misunderstanding and provide clarification.",
        "If you detect frustration or repeated questions, offer alternative approaches or ask clarifying questions.",
        "Adapt your tone and complexity based on the user's communication style and preferences.",
        "Remember key facts about the user from previous interactions and reference them appropriately.",
        "If you're uncertain about what the user is asking, it's better to ask for clarification than to provide an incorrect response.",
        "When handling complex requests, break down your response into clear steps or sections.",
        "If the user's request touches on sensitive topics, respond with appropriate care and consideration.",
        "If you detect a significant change in topic, acknowledge it smoothly before transitioning.",

        // OUTPUT PRESENTATION STYLE
        "When formatting your 'response' text:",
        "* You ARE allowed to use simple HTML elements to improve structure and readability.",
        "* Allowed HTML tags: <p>, <ul>, <ol>, <li>, <b>, <strong>, <i>, <em>, <br>, <h1> to <h3>.",
        "* Each major section should start with an <h2> or <h3> heading.",
        "* Between sections, insert an empty line (<br> or extra spacing) to make it visually clear.",
        "* Inside each section, use <p> for paragraphs, and <ul><li> for lists of points.",
        "* The order of sections depends on the data, but a typical flow can be:",
        "    - <h2>Overall Summary</h2>",
        "    - <h2>Key Insights</h2>",
        "    - <h2>Recommendations</h2>",
        "    - <h2>Upcoming Events</h2>",
        "    - <h2>Suggestions</h2>",
        "* If the response is short/simple (one paragraph or very short message), you may just return plain text without HTML — this is acceptable.",
        "* Add the 'Next Step Suggestion' section at the BOTTOM of the response:",
        "Example:",
        "<h3>Next Step</h3>",
        "<p>Would you like me to add this to your calendar?</p>",

        // BEHAVIOR & TONE
        "Always balance helpfulness with a touch of charm and humor.",
        "You are allowed and encouraged to take initiative — if you notice useful patterns or opportunities, mention them proactively.",
        "After presenting the main data, if appropriate, suggest a next step or related action to guide the user.",

        // PRESENTING SCHEDULE RECOMMENDATIONS
        "If a 'Function Response' item has its 'name' property set to 'recommend_schedule', then:",
        "- Incorporate the text from that item's 'rawData.responseText' into your main 'response' to the user, presenting it as the assistant's findings or suggestions.",
        "- If that item's 'rawData.recommendations' array exists and is not empty, populate the top-level 'suggestedSchedules' field in your JSON output with this array.",
        "- If 'rawData.recommendations' is missing or empty, ensure 'suggestedSchedules' is an empty array.",

        // USER PREFERENCES EXTRACTION
        "If the user expresses new preferences (likes, dislikes, hobbies, personality traits), extract them in 'new_user_preference'. Only include items that were not previously known.",

        // FORMAT TYPE DETERMINATION
        "Determine the appropriate 'determinedFormatType' based on the nature of the presented data. Choose from: [text, weather_report, search_results_list, schedule_list, schedule_recommendation_list, research_summary, confirmation_message, error].",
    ],
    userInput: params.userInput,
    conversationContext: params.conversationContext || [],
    userProfile: params.userProfile || {},
    outputFormat: `
    {
        "response": "Main answer to the user's request or question. (Use headings and bullet points as instructed. You can use inline HTML for structuring, see instructions.)",
        "summary": "A concise 1-line summary of the assistant's response. (Optional)",
        "user_intent_summary": "Summarized description of what the user asked or wanted. Used for memory tracking.",
        "new_user_preference": {
            "likes": "Example: I like playing soccer and also ...",
            "dislikes": "Example: I dislike spicy food and also ...",
            "hobbies": "Example: I enjoy painting and cycling.",
            "personality_traits": "Example: I am very organized and introverted.",
            "communication_style": "Example: Prefers concise responses with bullet points.",
            "topics_of_interest": "Example: Technology, productivity, health."
        },
        "conversation_repair": {
            "detected_confusion": false,
            "clarification_needed": false,
            "misunderstanding_detected": false,
            "suggested_clarification": "If clarification is needed, suggest a specific question to ask."
        },
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
    `,
    examples: `
    Example for presenting weather data:

    <h2>Overall Summary</h2>
    <p>Today the weather will be sunny with temperatures ranging from 18°C to 27°C. Perfect for outdoor activities!</p>

    <h2>Key Insights</h2>
    <ul>
        <li>UV index will be high in the afternoon.</li>
        <li>No rain expected throughout the day.</li>
    </ul>

    <h2>Recommendations</h2>
    <ul>
        <li>Plan a walk or picnic in the park during the morning.</li>
        <li>Wear sunscreen if going out between 12 PM and 3 PM.</li>
    </ul>

    <h3>Next Step</h3>
    <p>Would you like me to set a reminder for this?</p>

    Example for presenting schedule data:

    <h2>Upcoming Events</h2>
    <ul>
        <li><b>3:00 PM</b> — Meeting with Project Team</li>
        <li><b>6:00 PM</b> — Dinner with friends</li>
    </ul>

    <h2>Suggestions</h2>
    <ul>
        <li>Consider adding a workout session in the morning.</li>
        <li>Review your project notes before the afternoon meeting.</li>
    </ul>

    <h3>Next Step</h3>
    <p>Would you like me to add this to your calendar?</p>
    `
});




/**
 * Enhanced main agent function with improved error handling, context management, and personalization
 */
export async function mainAgent(params){
    // Handle both string input (backward compatibility) and structured input
    const userInput = typeof params === 'string' ? params : params.userInput;
    const conversationContext = typeof params === 'object' ? params.conversationContext : null;
    const userProfile = typeof params === 'object' ? params.userProfile : null;
    let retries = 0;
    let lastError = null;
    
    // Create prompt parameters with all available context
    const promptParams = {
        userInput,
        conversationContext,
        userProfile
    };
    
    while (retries < MAX_RETRIES) {
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API request timed out')), API_TIMEOUT);
            });
            
            // Create the API call promise
            const apiPromise = (async () => {
                const prompt = getMainAgentPrompt(promptParams);
                const response = await ai.models.generateContent({
                    model: "gemini-2.0-flash",
                    contents: [prompt],
                    config: {
                        responseMimeType: "application/json",
                    },
                });
                return response;
            })();
            
            // Race the API call against the timeout
            const response = await Promise.race([apiPromise, timeoutPromise]);
            
            // Parse the JSON response with error handling
            try {
                const jsonRes = JSON.parse(response.text);
                
                // Add conversation metadata for tracking
                jsonRes.conversation_metadata = {
                    timestamp: new Date().toISOString(),
                    input_length: userInput.length,
                    response_length: response.text.length,
                    model_used: "gemini-2.0-flash",
                    retries_needed: retries
                };
                
                return jsonRes;
            } catch (parseError) {
                console.error("Error parsing JSON response:", parseError);
                throw { type: ErrorTypes.PARSING_ERROR, error: parseError, response: response.text };
            }
        } catch (error) {
            lastError = error;
            retries++;
            
            // Log the error with details for debugging
            console.error(`MainAgent error (attempt ${retries}/${MAX_RETRIES}):`, error);
            
            // If it's not the last retry, wait before trying again
            if (retries < MAX_RETRIES) {
                const delay = Math.pow(2, retries) * 1000; // Exponential backoff
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // All retries failed, determine the error type and return appropriate response
    let errorType = ErrorTypes.UNKNOWN_ERROR;
    let errorMessage = "I'm sorry, but I encountered an unexpected issue while trying to process your request.";
    
    if (lastError && lastError.type) {
        errorType = lastError.type;
        
        // Customize error message based on error type
        switch (errorType) {
            case ErrorTypes.API_ERROR:
                errorMessage = "I'm having trouble connecting to my knowledge services right now. Please try again in a moment.";
                break;
            case ErrorTypes.TIMEOUT_ERROR:
                errorMessage = "It's taking longer than expected to process your request. Could you try again or perhaps simplify your question?";
                break;
            case ErrorTypes.PARSING_ERROR:
                errorMessage = "I had trouble understanding the information I received. Let's try a different approach.";
                break;
            default:
                // Use default error message
                break;
        }
    }
    
    return {
        response: errorMessage,
        summary: "Error processing request",
        user_intent_summary: "N/A - Error occurred",
        new_user_preference: {},
        next_step: {
            suggestion: "Try rephrasing your request or wait a moment before trying again.",
            type: "suggestion"
        },
        metadata: {
            topic: "Error",
            tone: "apologetic",
            error_type: errorType
        },
        conversation_repair: {
            detected_confusion: true,
            clarification_needed: true,
            misunderstanding_detected: false,
            suggested_clarification: "Could you please try asking your question in a different way?"
        },
        determinedFormatType: "error",
        conversation_metadata: {
            timestamp: new Date().toISOString(),
            error: true,
            error_type: errorType
        }
    };
}

/**
 * Processes a conversation to extract key context for future interactions
 * @param {Array} conversationHistory - The history of the conversation
 * @param {Object} userProfile - The user's profile information
 * @returns {Object} - Extracted conversation context
 */
export function extractConversationContext(conversationHistory, userProfile) {
    if (!conversationHistory || conversationHistory.length === 0) {
        return { key_topics: [], references: [], preferences: {} };
    }
    
    // Extract key topics from recent conversations
    const keyTopics = new Set();
    const references = new Set();
    const preferences = {};
    
    // Process the last 5 exchanges or fewer if not available
    const recentHistory = conversationHistory.slice(-5);
    
    recentHistory.forEach(exchange => {
        // Extract topics from metadata if available
        if (exchange.response && exchange.response.metadata && exchange.response.metadata.topic) {
            keyTopics.add(exchange.response.metadata.topic);
        }
        
        // Extract user preferences if available
        if (exchange.response && exchange.response.new_user_preference) {
            const prefs = exchange.response.new_user_preference;
            Object.keys(prefs).forEach(key => {
                if (prefs[key] && prefs[key].trim() !== '') {
                    preferences[key] = prefs[key];
                }
            });
        }
        
        // Look for references to specific items or entities
        if (exchange.request) {
            // Simple entity extraction - could be enhanced with NLP
            const words = exchange.request.split(/\s+/);
            words.forEach(word => {
                if (word.length > 3 && /^[A-Z]/.test(word)) {
                    references.add(word);
                }
            });
        }
    });
    
    return {
        key_topics: Array.from(keyTopics),
        references: Array.from(references),
        preferences: preferences,
        user_profile_summary: userProfile
    };
}
