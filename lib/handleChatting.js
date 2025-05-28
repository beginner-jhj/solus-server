import {controlAgnet} from "./ai/controlAgent.js";

import { weatherService } from "./tools/weatherService.js";
import {addSchedule} from "../DB/schedule.js";

export async function handleChatting(userRequest,userMetaData){
    try {
        let responseToMainAsistant = {
            functionResponse:[]
        };
        const response = await controlAgnet(userRequest);
        if(response.functionUsed.length>0){
            const functionResponse = executeFunction(response.functionUsed,userMetaData);
            responseToMainAsistant.functionResponse.push(functionResponse);
        }
        return responseToMainAsistant;
    } catch (error) {
        throw new Error(error);
    }
}

function executeFunction(functionCalls, userMetaData){
    for(const functionCall of functionCalls){
        switch(functionCall.name){
            case "get_weather_forecast":
                return executeWeatherForecast({...functionCall.args,...userMetaData.location});
            case "add_schedule_event":
                return executeAddScheduleEvent({...functionCall.args,userId:userMetaData.userId});
            default:
                throw new Error("Invalid function name");
        }
    }
    
}

async function executeWeatherForecast({latitude,longitude,cityName=null,days=1}){
    try{
        if((!latitude && !longitude) && !cityName){
            throw new Error("Please provide latitude, longitude or cityName");
        }

        const weatherData = await weatherService(latitude,longitude,cityName,days);
        const response = {
            name:"get_weather_forecast",
            rawData:weatherData
        }

        return response;
    }catch(err){
        throw new Error(`Error occurred while executing get_weather_forecast: ${err}`);
    }
}

async function executeAddScheduleEvent({userId,title,date,start_time,end_time,description}){
    try{
        const [year,month,day] = date.split("-");
        const [result] = await addSchedule({
            userId,
            title,
            description,
            startTime:start_time,
            endTime:end_time,
            eventCategory:"",
            year,
            month,
            day
        })
        const response = {
            name:"add_schedule_event",
            rawData:result
        }
        return response;
    }catch(err){
        throw new Error(`Error occurred while executing add_schedule_event: ${err}`);
    }
}


