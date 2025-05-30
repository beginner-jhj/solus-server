import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import { getToolsConfig } from "../tools/toolsConfig.js";
import { createPrompt } from "./prompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

const getPrompt = (userInput) =>
  createPrompt({
    role: "intelligent control tower for an AI assistant.",
    context:
      "You are a control tower for an AI assistant. You must determine which intent and flow to use for processing the user's input.",
    goal: "Analyze the user's input and choose the most appropriate function to use.",
    instructions:[
      "If user request requires information that is not available in the database, use google search to get the information. And  give the appropriate query to google search tool.",
    ],
    userInput: userInput,
  });

export async function controlAgent(userRequest) {
  const prompt = getPrompt(userRequest);
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
