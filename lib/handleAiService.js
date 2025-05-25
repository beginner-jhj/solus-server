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

        const response = await sendMessageToScheduleAssistant({
          message:userInput,
          schedules: schedules,
          selectedDays: selectedDays,
        });

        return response;

        }catch(err){
            throw new Error("Failed to process schedule report");
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

        const response = await sendMessageToScheduleAssistant({
          message:userInput,
          schedules: schedules,
          selectedDays: selectedDays,
        });

        return response;

        }catch(err){
            throw new Error("Failed to process schedule recommendation");
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
            return response;
            }catch(err){
                throw new Error("Failed to process schedule addition");
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
        const weatherRes = await weatherService(userMetaData.location.latitude,userMetaData.location.longitude);
        const response = await sendMessageToMainAssistant(`
            Original Input: ${userInput},
            Here is the weather data:
            ${JSON.stringify(weatherRes)}
            please report the weather to me.
        `);
        return response;
        }catch(err){
            throw new Error("Failed to process weather question");
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
        const response = await mainResearcher(query);
        return response;
        }catch(err){
            throw new Error("Failed to process research task");
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
            return response;
            }catch(err){
                throw new Error("Failed to process general question with web search");
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
        const response = await sendMessageToMainAssistant(userInput);
        return response;
        }catch(err){
            throw new Error("Failed to process general question");
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
        const controlTowerResult = await controlTower( `${userInput}\n\nUser Meta Data: ${JSON.stringify(userData)}`);
        return controlTowerResult;
    }catch(err){
        throw new Error(err);
    }
}
