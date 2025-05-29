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
    userInput: userInput,
  });

export async function controlAgent(userRequest) {
  const prompt = getPrompt(userRequest);
  let finalResponse = {
    functionUsed:[],
    originalUserInput: userRequest,
    generalResponse: null
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [prompt],
      config: {
        responseMimeType: "application/json",
        tools: [
          {
            functionDeclarations:getToolsConfig(Type)
          },
          { googleSearch: {} },
        ],
        toolConfig:{
          functionCallingConfig:{
            mode:"any"
          }
        }
      },

    });
    const jsonRes = JSON.parse(response.text());

    if(response.functionCalls && response.functionCalls.length>0){
        finalResponse.functionUsed = response.functionCalls;
    }

    if(jsonRes.generalResponse){
        finalResponse.generalResponse = jsonRes.generalResponse;
    }
    
    return finalResponse;
  } catch (error) {
    throw new Error(error);
  }
}
