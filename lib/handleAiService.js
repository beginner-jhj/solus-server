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
            const response = await sendMessageToMainAssistant(`
                Original Input: ${userInput}
                I have added the following event:
                ${JSON.stringify(addedEvent)}
                Report added schedules to me.

                Report Format:
                   I added the following event successfully:
                   (event details)
                `);
            return response; // This is the successful response from mainAssistant
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
                const response = await sendMessageToMainAssistant(`
                Original Input: ${userInput},
                Here is the web search result:
                ${JSON.stringify(webSearchRes)}
                please report the web search result to me.
            `);
            return response; // This is the successful response from mainAssistant
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
  

export async function handleUserChat(userInput,userData){
    try{
        const controlTowerResult = await getResultFromControlTower(userInput,userData);
        console.log("Control Tower Result:",controlTowerResult);
        const {tasks,userMetaData} = controlTowerResult;
        for(const flowKey of tasks){
            const flow = flowMap[flowKey];
            const response = await flow.chain(userInput,userMetaData);
            console.log("Response:",response);
        }
        

    }catch(err){
        throw new Error(err);
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
