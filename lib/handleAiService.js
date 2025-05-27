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
    console.log({
      year,
      month,
      day,
      period,
      timeCondition,
      timeReference,
      timeReferenceEnd
    })
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
    console.log({
      year,
      month,
      day,
      titleForEvent,
      descriptionForEvent,
      startTime,
      endTime,
      eventCategory
    })
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
    let originalTasksForErrorReporting = []; // Store original task keys for error context
    try {
        const controlTowerResult = await getResultFromControlTower(userInput, userData);
        console.log("Control Tower Result:", controlTowerResult);
        const { tasks, userMetaData } = controlTowerResult;
        originalTasksForErrorReporting = tasks ? [...tasks] : [];

        if (!tasks || tasks.length === 0) {
            console.warn("No tasks received from Control Tower for input:", userInput);
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
            // This path returns a single error object, not an array yet.
            // To align with the function's new return type (array of responses), we wrap it.
            const singleErrorResponse = await sendMessageToMainAssistant("generalQuestion", jsonErrorPromptString);
            return [singleErrorResponse]; // Return as an array
        }

        const allTaskResponses = []; // Initialize array to store responses from each task

        for (const flowKey of tasks) {
            console.log(`Processing task: ${flowKey}`);
            const flow = flowMap[flowKey];

            if (!flow) {
                console.error(`No flow found in flowMap for key: ${flowKey}`);
                // Construct an error response FOR THIS SPECIFIC TASK
                const errorInputForMainAssistant = {
                    context: "systemErrorPresentation",
                    originalUserInput: userInput,
                    errorEncountered: {
                        flowName: "handleUserChat_InvalidFlow",
                        taskKey: flowKey,
                        message: `Internal configuration error: No flow definition for task '${flowKey}'.`,
                    },
                    presentationInstructions: "Please inform the user that one part of their request could not be processed due to an internal configuration issue. Mention that other parts of their request might still be processed if applicable."
                };
                const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
                const errorResponseForTask = await sendMessageToMainAssistant("system_error", jsonErrorPromptString);
                allTaskResponses.push(errorResponseForTask);
                continue; // Move to the next task
            }
            
            try {
                const singleTaskResponse = await flow.chain(userInput, userMetaData);
                console.log(`Response from flow '${flowKey}':`, singleTaskResponse);
                allTaskResponses.push(singleTaskResponse);
            } catch (flowChainError) {
                // This catch is for unexpected errors if a flow.chain itself throws
                // despite having its own internal error handling that should call mainAssistant.
                // This is a safety net.
                console.error(`Critical error directly from chain execution of '${flowKey}':`, flowChainError);
                const errorInputForMainAssistant = {
                    context: "systemErrorPresentation",
                    originalUserInput: userInput,
                    errorEncountered: {
                        flowName: flowKey, // The flow that failed critically
                        message: flowChainError.message || "An unexpected error occurred in this specific task.",
                    },
                    presentationInstructions: "Apologize to the user and explain that an unexpected error occurred while trying to process one specific part of their request. Mention that other parts may have succeeded or also failed."
                };
                const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
                const errorResponseForTask = await sendMessageToMainAssistant("system_error", jsonErrorPromptString);
                allTaskResponses.push(errorResponseForTask);
            }
        }
        
        // If allTaskResponses is empty (e.g. tasks array was valid but all flows failed critically before pushing a response)
        // This case should ideally be rare due to error handling in chains and above.
        if (allTaskResponses.length === 0) {
            if (tasks && tasks.length > 0) {
                console.error("All tasks processed but no responses collected. Critical failures in all chains.");
                return { // Return a single critical error object
                    intent: "system_error_critical",
                    response: "I'm very sorry, but I encountered critical problems processing all parts of your request. Please try again later.",
                    formatType: "error",
                    rawData: { errorCode: "HANDLE_USER_CHAT_ALL_CHAINS_FAILED" },
                    modelUsed: null,
                    toolUsed: null
                };
            } else {
                // This case (no tasks from control tower) is already handled earlier and returns a single error object.
                // If it somehow reaches here, it implies tasks array was initially null/empty and that logic needs review.
                // For safety, let's ensure a response:
                console.warn("Reached end of handleUserChat with no tasks and no responses; this indicates an issue with initial no-task handling.");
                const errorInputForMainAssistant = {
                    context: "systemErrorPresentation",
                    originalUserInput: userInput,
                    errorEncountered: {
                        flowName: "handleUserChat_NoTasksFinalFallback",
                        message: "Could not determine any action from the request.",
                    },
                    presentationInstructions: "Please inform the user that you couldn't understand or process their request. Suggest they rephrase."
                };
                const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
                return sendMessageToMainAssistant("system_error", jsonErrorPromptString);
            }
        }

        // If there's only one response, return it directly.
        if (allTaskResponses.length === 1) {
            return allTaskResponses[0];
        }

        // If there are multiple responses, consolidate them.
        console.log("Multiple task responses received. Consolidating for final presentation by mainAssistant.");
        const consolidatedInputForMainAssistant = {
            context: "presentationFromPriorModel",
            originalUserInput: userInput,
            sourceModelOutput: {
                completedTasks: tasks, // Send the original task keys
                results: allTaskResponses // Array of individual response objects
            },
            presentationInstructions: "You have processed multiple distinct requests from the user in a single turn. Please present the result for each task clearly and sequentially. Use headings or distinct visual separators if possible (e.g., '## Result for [Task Name/User Query Snippet]') for each part of the response. If any part resulted in an error, present that error message as part of its section. Summarize briefly at the end if appropriate."
        };

        const jsonPromptString = JSON.stringify(consolidatedInputForMainAssistant);
        // Using a new intent for this specific multi-task presentation scenario
        const finalConsolidatedResponse = await sendMessageToMainAssistant("multiple_tasks_presentation", jsonPromptString);

        return finalConsolidatedResponse;

    } catch (err) { // Top-level catch (e.g., getResultFromControlTower failed)
        console.error(`Error in handleUserChat main execution for userInput '${userInput}':`, err);
        // The response should be a single error object.
        try {
            const errorInputForMainAssistant = {
                context: "systemErrorPresentation",
                originalUserInput: userInput,
                errorEncountered: {
                    flowName: originalTasksForErrorReporting.join(', ') || "handleUserChat_critical",
                    message: err.message || "An unexpected error occurred processing your chat.",
                },
                presentationInstructions: "Apologize to the user and explain that an unexpected error occurred while trying to process their request. Suggest they try again after a short while. Do not provide technical details."
            };
            const jsonErrorPromptString = JSON.stringify(errorInputForMainAssistant);
            // This now returns a single error object
            return sendMessageToMainAssistant("system_error", jsonErrorPromptString); 
        } catch (emergencyErr) {
            console.error("CRITICAL: Failed to use mainAssistant for emergency error handling in handleUserChat:", emergencyErr);
            return { // Return a single error object
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
