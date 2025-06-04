import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import { getToolsConfig } from "../tools/toolsConfig.js";
import { createPrompt } from "./prompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

const getPrompt = ({ userInput, conversationContext }) =>
  createPrompt({
    role: "super intelligent control tower for an AI assistant",
    context:
      `You orchestrate a suite of internal tools for an assistant similar to JARVIS. ` +
      `Always examine recent conversation context first and try to satisfy the request using that information. ` +
      `Only if the context lacks the needed details should you consider other tools.\n\n` +
      `Conversation context: ${conversationContext ? JSON.stringify(conversationContext) : 'None'}`,
    goal:
      "Select and sequence the best function(s) for the user's request while avoiding unnecessary searches.",
    instructions: [
      "Prioritize the provided conversation context and user profile when determining which functions to use.",
      "Only invoke googleSearch when the context and other tools cannot answer the question.",
      "When multiple functions are required, list them all in the order they should be executed.",
      
      "When user asks about their schedule or calendar, use the appropriate schedule functions:",
      "- For viewing schedules: Use get_schedule_events",
      "- For creating new events: Use add_schedule_event",
      "- For schedule recommendations: Use recommend_schedule",
      "- For schedule-related questions: Use get_schedule_events first, then googleSearch if needed",
      
      // WEATHER-RELATED INSTRUCTIONS
      "When user asks about weather:",
      "- For current or future weather: Use get_weather_forecast",
      "- For weather-related questions: Use get_weather_forecast first, then googleSearch if needed",
      
      // SEARCH-RELATED INSTRUCTIONS
      "Use googleSearch only when:",
      "- The information is not available in our database",
      "- The user is asking about general knowledge",
      "- The user is asking about external information",

      // CONTEXT AWARENESS
      "Always review the provided conversation context and user profile. If the user's request can be answered using that context or recently provided information, do not use googleSearch and instead rely on existing data.",
      
      // FUNCTION SELECTION RULES
      "1. Always check if we have a specific function for the task before using googleSearch",
      "2. For schedule-related requests:",
      "   - 'What's my schedule for next week?' -> get_schedule_events",
      "   - 'What do I have planned for tomorrow?' -> get_schedule_events",
      "   - 'Add a meeting tomorrow at 2pm' -> add_schedule_event",
      "3. For weather-related requests:",
      "   - 'What's the weather tomorrow?' -> get_weather_forecast",
      "   - 'What's the weather in [city] next week?' -> get_weather_forecast",
      "4. For general knowledge:",
      "   - 'What is [topic]?' -> googleSearch",
      "   - 'How does [concept] work?' -> googleSearch",
      
      // DATE HANDLING
      "When handling dates:",
      "1. Use today's date (${new Date().toISOString().split('T')[0]}) as reference if not specified",
      "2. Convert relative dates to absolute dates:",
      "   - 'tomorrow' -> next day from reference date",
      "   - 'next week' -> next 7 days from reference date",
      "   - 'next month' -> next 30 days from reference date",
      "3. For schedule queries:",
      "   - 'next 2 weeks' -> get_schedule_events with dates from today to 14 days ahead",
      "   - 'this month' -> get_schedule_events with dates for current month",
      "   - 'next month' -> get_schedule_events with dates for next month",
      
      // ERROR HANDLING
      "If you're unsure about which function to use:",
      "1. Try to deduce the most likely intent from the user's request",
      "2. If multiple functions could apply, choose the most specific one",
      "3. If no function clearly applies, use googleSearch as a last resort",
      
      // EXAMPLES
      "Correct function selections:",
      "- 'What's my schedule for next 2 weeks?' -> get_schedule_events",
      "- 'Add a meeting tomorrow at 2pm' -> add_schedule_event",
      "- 'What's the weather in Seoul next week?' -> get_weather_forecast",
      "- 'What is quantum computing?' -> googleSearch",
      "- 'What are my schedule recommendations for next week?' -> recommend_schedule",
      
      "Incorrect function selections:",
      "- 'Report my next 2 weeks schedule' -> DO NOT use googleSearch or recommendSchedule",
      "- 'Add a meeting tomorrow' -> DO NOT use googleSearch",
      "- 'What's the weather tomorrow?' -> DO NOT use googleSearch"
    ],
    userInput: userInput,
  });

export async function controlAgent(userRequest, conversationContext = null) {
  const prompt = getPrompt({ userInput: userRequest, conversationContext });
  let finalResponse = {
    functionUsed:[],
    originalUserInput: userRequest,
    googleSearchQuery:null
  }

  try {
    const response = await ai.models.generateContent({
      model:"gemini-2.0-flash",
      contents:[prompt],
      config:{
        tools:[
          {
            functionDeclarations:getToolsConfig(Type)
          },
        ],
        toolConfig:{
          functionCallingConfig:{
            mode:"any"
          }
        }
      }
    })

    if(response.functionCalls && response.functionCalls.length>0){
        finalResponse.functionUsed = response.functionCalls;
    }
    finalResponse.googleSearchQuery = response.functionCalls.find((funcCall) => funcCall.name === "use_google_search")?.args?.query;
    return finalResponse;
  } catch (error) {
    throw new Error(error);
  }
}
