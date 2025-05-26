import {controlTower} from "./ai/controlTower.js";

//models
import { sendMessageToMainAssistant } from "./ai/mainAssistant.js";
import {mainResearcher} from "./ai/researchModel.js";
import {sendMessageToScheduleAssistant} from "./ai/scheduleAssistant.js";


//tools
import {extractScheduleQueryInfo} from "./tools/extractScheduleQueryInfo.js";
import {extractScheduleCreationInfo} from "./tools/extractScheduleCreationInfo.js";
import {convertInputToWebSearchQuery} from "./tools/convertInputToWebSearchQuery.js";
import {webSearch} from "./tools/webSearch.js";
import {weatherService} from "./tools/weatherService.js";
import {addSchedule,getEvents} from "../DB/schedule.js";


//create a flowRegistry and provide previous context to the model.

const connectQueryInfoToGetEvents = async (userInput,userId)=>{
    const {year, month, day,period, timeCondition, timeReference, timeReferenceEnd} = await extractScheduleQueryInfo(userInput);
        let schedules = [];

        if(period.length>=1){
          for(let i=0;i<period.length;i++){
            const [year, month, day] = period[i].split("-");
            const result = await getEvents(userId,year,month,day||"all",timeCondition,timeReference,timeReferenceEnd);
            schedules.push(...result);
          }
        }else{
          const result = await getEvents(userId,year,month,day||"all",timeCondition,timeReference,timeReferenceEnd);
          schedules.push(...result);
        }

        const formattedSchedules = schedules.map((schedule) => {
          return {
            title: schedule.title,
            description: schedule.description,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            eventCategory: schedule.eventCategory,
            year: schedule.year,
            month: schedule.month,
            day: schedule.day,
          };
        });

        return {
            schedules: formattedSchedules,
            selectedDays: period,
        }
    
}

const connectCreationInfoToAddSchedule = async (userInput,userId)=>{
    const {year,month,day,titleForEvent,descriptionForEvent,startTime,endTime,eventCategory} = await extractScheduleCreationInfo(userInput);
    await addSchedule({userId,title:titleForEvent,description:descriptionForEvent,startTime,endTime,eventCategory,year,month,day});
    return {
        addedEvent:{
            title:titleForEvent,
            description:descriptionForEvent,
            startTime,
            endTime,
            eventCategory,
            year,
            month,
            day
        }
    };
}

const flowMap = {
    scheduleReport: {
      intent: "schedule_report",
      model: "scheduleAssistant",
      flowChart: [
        {
          name: "extractScheduleQueryInfo",
          type: "tool",
          input_from: "user_input"
        },
        {
          name: "getEvents",
          type: "tool",
          input_from: "extractScheduleQueryInfo"
        },
        {
          name: "scheduleAssistant",
          type: "model",
          input_from: "getEvents"
        }
      ],
      chain: async (userInput,userMetaData)=>{
        try{
            const {schedules,selectedDays} = await connectQueryInfoToGetEvents(userInput,userMetaData.id);
            const scheduleAssistantResponse = await sendMessageToScheduleAssistant({
              message:userInput,
              schedules: schedules,
              selectedDays: selectedDays,
            });

            // Now, pass scheduleAssistantResponse to mainAssistant
            const structuredInput = {
                context: "presentationFromPriorModel",
                originalUserInput: userInput,
                sourceModelOutput: scheduleAssistantResponse, // scheduleAssistantResponse is already a JS object
                presentationInstructions: "Please present this schedule report to the user in your usual helpful manner. Focus on clarity and conciseness, highlighting the key schedule details."
            };
            const jsonPromptString = JSON.stringify(structuredInput);
            const finalResponse = await sendMessageToMainAssistant(
                flowMap.scheduleReport.intent,
                jsonPromptString
            );
            return finalResponse;
        }catch(err){
            console.error(`Error in scheduleReport chain for userInput '${userInput}':`, err);
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: "scheduleReport",
                    message: err.message,
                },
                presentationInstructions: "Please inform the user that there was a problem trying to process their schedule report request. Apologize for the inconvenience and suggest they try again shortly. Do not include technical details."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            return sendMessageToMainAssistant(flowMap.scheduleReport.intent, jsonErrorPromptString);
        }
      }
    },
    scheduleRecommend: {
      intent: "schedule_recommend",
      model: "scheduleAssistant",
      flowChart: [
        {
          name: "extractScheduleQueryInfo",
          type: "tool",
          input_from: "user_input"
        },
        {
          name: "getEvents",
          type: "tool",
          input_from: "extractScheduleQueryInfo"
        },
        {
          name: "scheduleAssistant",
          type: "model",
          input_from: "getEvents"
        }
      ],
      chain: async (userInput,userMetaData)=>{
        try{
            const {schedules,selectedDays} = await connectQueryInfoToGetEvents(userInput,userMetaData.id);
            const scheduleAssistantResponse = await sendMessageToScheduleAssistant({
              message:userInput,
              schedules: schedules,
              selectedDays: selectedDays,
            });

            // Now, pass scheduleAssistantResponse to mainAssistant
            const structuredInput = {
                context: "presentationFromPriorModel",
                originalUserInput: userInput,
                sourceModelOutput: scheduleAssistantResponse, // scheduleAssistantResponse is already a JS object
                presentationInstructions: "Please present these schedule recommendations to the user in your usual helpful and insightful manner. Emphasize actionable suggestions and help the user choose."
            };
            const jsonPromptString = JSON.stringify(structuredInput);
            const finalResponse = await sendMessageToMainAssistant(
                flowMap.scheduleRecommend.intent,
                jsonPromptString
            );
            return finalResponse;
        }catch(err){
            console.error(`Error in scheduleRecommend chain for userInput '${userInput}':`, err);
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: "scheduleRecommend",
                    message: err.message,
                },
                presentationInstructions: "Please inform the user that there was a problem trying to process their schedule recommendation request. Apologize for the inconvenience and suggest they try again shortly. Do not include technical details."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            return sendMessageToMainAssistant(flowMap.scheduleRecommend.intent, jsonErrorPromptString);
        }
      }
    },

    scheduleAdd:{
        intent: "schedule_add",
        model: "scheduleAssistant",
        flowChart: [
          {
            name: "extractScheduleCreationInfo",
            type: "tool",
            input_from: "user_input"
          },
          {
            name: "addSchedule",
            type: "tool",
            input_from: "extractScheduleCreationInfo"
          },
          {
            name: "mainAssistant",
            type: "model",
            input_from: "addSchedule"
          }
        ],
        chain: async (userInput,userMetaData)=>{
            try{
            const {addedEvent} = await connectCreationInfoToAddSchedule(userInput,userMetaData.id);
            
            const structuredInput = {
                context: "presentationFromPriorModel",
                originalUserInput: userInput,
                sourceModelOutput: { // Construct a meaningful object for mainAssistant
                    action: "addSchedule",
                    status: "success",
                    eventDetails: addedEvent // The object returned by connectCreationInfoToAddSchedule
                },
                presentationInstructions: "Please inform the user that their schedule event has been successfully added. Clearly state the main details of the event (title, date, time) in a confirmation message. Keep the tone positive and affirming."
            };
            const jsonPromptString = JSON.stringify(structuredInput);
            const finalResponse = await sendMessageToMainAssistant(
                flowMap.scheduleAdd.intent,
                jsonPromptString
            );
            return finalResponse;
            }catch(err){
                console.error(`Error in scheduleAdd chain for userInput '${userInput}':`, err);
                const errorInputForMainAssistant = {
                    context: "systemErrorPresentation",
                    originalUserInput: userInput,
                    errorEncountered: {
                        flowName: "scheduleAdd",
                        message: err.message,
                    },
                    presentationInstructions: "Please inform the user that there was a problem trying to add their schedule event. Apologize for the inconvenience and suggest they try again. Do not include technical details."
                };
                const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
                // Assuming sendMessageToMainAssistant's first argument is intent, second is userInput string
                return sendMessageToMainAssistant(flowMap.scheduleAdd.intent, jsonErrorPromptString);
            }
          }
      },
  
    weatherQuestion: {
      intent: "weather_question",
      model: "mainAssistant",
      flowChart: [
        {
          name: "weatherService",
          type: "tool",
          input_from: "user_input"
        },
        {
          name: "mainAssistant",
          type: "model",
          input_from: "weatherService"
        }
      ],
      chain: async (userInput,userMetaData)=>{
        try{
            // Extract parameters from userMetaData, with fallbacks to existing profile location
            // and default days to 1 if not specified by controlTower (though controlTower should default it)
            const lat = userMetaData.latitude || userMetaData.location?.latitude;
            const lon = userMetaData.longitude || userMetaData.location?.longitude;
            const days = userMetaData.days || 1;

            // Check if essential location data is available
            if (typeof lat === 'undefined' || typeof lon === 'undefined') {
                throw new Error("Location (latitude/longitude) is missing. Cannot fetch weather.");
            }

            const weatherResponse = await weatherService(lat, lon, days);
            
            const structuredInput = {
                context: "presentationFromPriorModel",
                originalUserInput: userInput,
                sourceModelOutput: weatherResponse, 
                presentationInstructions: "Please present this weather report to the user. Ensure you clearly state the location and forecast period covered, then deliver the weather details in an easy-to-understand format."
            };
            const jsonPromptString = JSON.stringify(structuredInput);
            const finalResponse = await sendMessageToMainAssistant(
                flowMap.weatherQuestion.intent,
                jsonPromptString
            );
            return finalResponse;
        }catch(err){
            console.error(`Error in weatherQuestion chain for userInput '${userInput}':`, err);
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: "weatherQuestion",
                    message: err.message,
                },
                presentationInstructions: "Please inform the user that there was a problem trying to fetch the weather information. Apologize for the inconvenience and suggest they try again shortly. Do not include technical details."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            return sendMessageToMainAssistant(flowMap.weatherQuestion.intent, jsonErrorPromptString);
        }
      }
    },
  
    researchTask: {
      intent: "research_task",
      model: "researchModel",
      flowChart: [
        {
          name: "convertInputToWebSearchQuery",
          type: "tool",
          input_from: "user_input"
        },
        {
          name: "researchModel",
          type: "model",
          input_from: "convertInputToWebSearchQuery"
        }
      ],
      chain: async (userInput,userMetaData)=>{
        try{
            const {query} = await convertInputToWebSearchQuery(userInput);
            const researchData = await mainResearcher(query); // Output from mainResearcher
            
            // Now, pass researchData to mainAssistant
            const structuredInput = {
                context: "presentationFromPriorModel",
                originalUserInput: userInput,
                sourceModelOutput: researchData, // researchData is already a JS object
                presentationInstructions: "Please summarize and present these research findings to the user in your usual helpful and insightful manner. Focus on key insights and actionable recommendations if any."
            };
            const jsonPromptString = JSON.stringify(structuredInput);
            const finalResponse = await sendMessageToMainAssistant(
                flowMap.researchTask.intent, // Using flowMap for consistency
                jsonPromptString
            );
            return finalResponse;
        }catch(err){
            console.error(`Error in researchTask chain for userInput '${userInput}':`, err);
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: "researchTask",
                    message: err.message,
                },
                presentationInstructions: "Please inform the user that there was a problem trying to process their research request. Apologize for the inconvenience and suggest they try again shortly or rephrase their query. Do not include technical details."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            return sendMessageToMainAssistant(flowMap.researchTask.intent, jsonErrorPromptString);
        }
      }
    },

    generalQuestionWithWebSearch:{
        intent: "general_question_with_web_search",
        model: "mainAssistant",
        flowChart: [
          {
            name: "convertInputToWebSearchQuery",
            type: "tool",
            input_from: "user_input"
          },
          {
            name: "webSearchService",
            type: "tool",
            input_from: "convertInputToWebSearchQuery"
          },
          {
            name: "mainAssistant",
            type: "model",
            input_from: "webSearchService"
          }
        ],
        chain: async (userInput,userMetaData)=>{
            try{
                const {query} = await convertInputToWebSearchQuery(userInput);
                const webSearchRes = await webSearch(query);

                const structuredInput = {
                    context: "presentationFromPriorModel",
                    originalUserInput: userInput,
                    sourceModelOutput: webSearchRes, // webSearchRes is an array of search result objects
                    presentationInstructions: "Please analyze these web search results and provide a comprehensive answer to my original query. Summarize the relevant information found. If possible, cite key sources or titles briefly within your natural language response. Present the information clearly, potentially using bullet points for distinct findings if that helps readability."
                };
                const jsonPromptString = JSON.stringify(structuredInput);
                const finalResponse = await sendMessageToMainAssistant(
                    flowMap.generalQuestionWithWebSearch.intent,
                    jsonPromptString
                );
                return finalResponse;
            }catch(err){
                console.error(`Error in generalQuestionWithWebSearch chain for userInput '${userInput}':`, err);
                const errorInputForMainAssistant = {
                    context: "systemErrorPresentation",
                    originalUserInput: userInput,
                    errorEncountered: {
                        flowName: "generalQuestionWithWebSearch",
                        message: err.message,
                    },
                    presentationInstructions: "Please inform the user that there was a problem trying to search the web for their query. Apologize for the inconvenience and suggest they try again. Do not include technical details."
                };
                const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
                return sendMessageToMainAssistant(flowMap.generalQuestionWithWebSearch.intent, jsonErrorPromptString);
            }
        }
      },

  
    generalQuestion: {
      intent: "general_question",
      model: "mainAssistant",
      flowChart: [
        {
          name: "mainAssistant",
          type: "model",
          input_from: "user_input"
        }
      ],
      chain: async (userInput,userMetaData)=>{
        try{
        const response = await sendMessageToMainAssistant(flowMap.generalQuestion.intent, userInput); // Ensure intent is passed
        return response;
        }catch(err){
            console.error(`Critical error in generalQuestion chain (mainAssistant itself likely failed for userInput '${userInput}'):`, err);
            return { // This is a raw response, not via mainAssistant
                intent: "system_error",
                response: "I'm terribly sorry, I seem to be having some trouble with my core functions. Please try again in a moment.",
                formatType: "error",
                rawData: { errorCode: "MAIN_ASSISTANT_FAILURE", originalError: err.message },
                modelUsed: null, 
                toolUsed: null
            };
        }
      } 
    }
  };
  

export async function handleUserChat(userInput, userData) {
    try {
        const controlTowerResult = await getResultFromControlTower(userInput, userData);
        console.log("Control Tower Result:", controlTowerResult);
        const { tasks, userMetaData } = controlTowerResult;

        let finalResponse = null; // To store the response to be returned

        if (!tasks || tasks.length === 0) {
            console.warn("No tasks received from Control Tower for input:", userInput);
            // Consider returning a specific error or a default message via mainAssistant
            // For now, let's make mainAssistant generate a "cannot understand" response
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: "handleUserChat",
                    message: "Control Tower returned no tasks. Assistant cannot determine action.",
                },
                presentationInstructions: "Please inform the user that you couldn't understand their request or determine a specific action. Suggest they rephrase or try a different query."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            // Using "generalQuestion" intent as a fallback for this type of error presentation
            finalResponse = await sendMessageToMainAssistant("generalQuestion", jsonErrorPromptString);
            return finalResponse;
        }

        // For MVP, process only the first task if multiple are returned.
        const flowKey = tasks[0];
        if (tasks.length > 1) {
            console.warn(`Multiple tasks (${tasks.length}) received from Control Tower. Processing only the first task ('${flowKey}') for MVP chat response.`);
        }

        const flow = flowMap[flowKey];
        if (!flow) {
            console.error(`No flow found in flowMap for key: ${flowKey}`);
            // Error: No flow definition for the task from Control Tower
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: "handleUserChat",
                    message: `Internal configuration error: No flow definition for task '${flowKey}'.`,
                },
                presentationInstructions: "Please inform the user that there was an internal system configuration issue preventing their request from being processed. Apologize and state that the team has been notified."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            finalResponse = await sendMessageToMainAssistant("system_error", jsonErrorPromptString); // Using a generic "system_error" intent
            return finalResponse;
        }
        
        finalResponse = await flow.chain(userInput, userMetaData);
        console.log(`Response from flow '${flowKey}':`, finalResponse);
        
        return finalResponse; // Return the response from the (first) processed task

    } catch (err) {
        console.error("Error in handleUserChat main execution for userInput '",userInput,"':", err);
        // This top-level error means something went wrong that wasn't caught by individual chains,
        // or the error handling in chains failed to return a mainAssistant response.
        // We need to ensure a user-friendly response is still sent.
        try {
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: "handleUserChat_critical", // Indicate a more generic failure point
                    message: err.message || "An unexpected error occurred processing your chat.",
                },
                presentationInstructions: "Apologize to the user and explain that an unexpected error occurred while trying to process their request. Suggest they try again after a short while. Do not provide technical details."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            // Using a generic "system_error" intent
            return sendMessageToMainAssistant("system_error", jsonErrorPromptString);
        } catch (emergencyErr) {
            // If mainAssistant itself fails during emergency error handling, return a hardcoded raw error.
            console.error("CRITICAL: Failed to use mainAssistant for emergency error handling in handleUserChat:", emergencyErr);
            return {
                intent: "system_error_critical",
                response: "I'm very sorry, but I've encountered a critical problem and can't process your request right now. Please try again later.",
                formatType: "error",
                rawData: { errorCode: "HANDLE_USER_CHAT_EMERGENCY_FALLBACK", originalError: err.message, emergencyError: emergencyErr.message },
                modelUsed: null,
                toolUsed: null
            };
        }
    }
}

async function getResultFromControlTower(userInput,userData){
    try{
        const controlTowerResult = await controlTower( `${userInput}\n\nUser Meta Data: ${JSON.stringify(userData)}`); // Ensure this call is robust
        return controlTowerResult;
    }catch(err){
        // This is a critical error in the controlTower itself.
        // We need to return a structured error that the calling function (handleUserChat) can understand,
        // or it needs its own robust error handling. For now, let's assume handleUserChat's catch will get this.
        console.error("Critical error in getResultFromControlTower:", err);
        throw new Error(`Control Tower failure: ${err.message}`); // Re-throw to be caught by handleUserChat
    }
}
