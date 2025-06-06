import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import { getToolsConfig } from "../tools/toolsConfig.js";
import { getControlAgentPrompt } from "../tools/getPrompt.js";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });


export async function controlAgent(userRequest,chatHistory,userProfileInfo) {
  const prompt = getControlAgentPrompt(userRequest,chatHistory,userProfileInfo);
  
  let finalResponse = {
    functionUsed:[],
    originalUserInput: userRequest,
    googleSearchQuery:null
  }

  try {
    const response = await ai.models.generateContent({
      model:process.env.GEMINI_MODEL,
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
