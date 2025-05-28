export function getToolsConfig(Type){
    const getWeatherForecastConfig = {
        name: "get_weather_forecast",
        description: `
        Fetches the weather forecast for a specified location and number of days.
        
        If user ask for a specific location, use that location. 
        If user ask for weather at their current location("what's the weather here", "what's the weather today",...) then latitude and longtitude will be used, but these information won't be passed to you so let the cityName parameter be null and set days parameter.
        `,
        parameters: {
          type: Type.OBJECT,
          properties: {
            cityName: {
              type: Type.STRING,
              description: "The name of the city for the forecast. Omit this parameter if user ask for weather at their current location or do not specify a particular place.",
            },
            days: {
              type: Type.NUMBER,
              description: "The number of days for the forecast, typically between 1 and 3 (e.g., 'today' is 1, 'tomorrow' implies 1 or 2 days, 'next 3 days' implies 3 days). If not specified by user, the system will default to 1.",
            }
          },
          required: ["days"]
        }
      };
      
      const addScheduleEventConfig = {
        name: "add_schedule_event",
        description: "Adds a new event to user's schedule. Use this when user ask to create a new meeting, appointment, reminder, or any calendar event. Ensure all necessary details like title, date, and start time are captured from user request.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The title or name of the event."
            },
            date: {
              type: Type.STRING,
              description: `The date of the event in YYYY-MM-DD format. The model must infer this specific date from your queries like 'today', 'tomorrow', 'next Tuesday', or an explicit date.Use today (${new Date().toISOString().split('T')[0]}) as a reference.`
            },
            start_time: {
              type: Type.STRING,
              description: "The start time of the event in HH:MM (24-hour) format. The model must infer this specific time from your queries."
            },
            end_time: {
              type: Type.STRING,
              description: "The end time of the event in HH:MM (24-hour) format. This is optional. Provide if specified by you or reasonably inferable (e.g., a 1-hour meeting).",
              optional: true
            },
            description: {
              type: Type.STRING,
              description: "A brief description or notes for the event. Optional.",
              optional: true
            },
            event_category: {
              type: Type.STRING,
              description: "Choose one of them: 'Work', 'Personal', 'Study', 'Exercise'.",
              optional: true
            }
          },
          required: ["title", "event_category"]
        }
      };
      
      const getScheduleEventsConfig = {
        name: "get_schedule_events",
        description: "Retrieves a list of scheduled events for you based on specified date ranges, time periods, or keywords. Use this when user ask to see their schedule, what events they have, or to report on their upcoming agenda.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            date_period: {
              type: Type.STRING,
              description: "The period for querying events, in YYYY-MM-DD format. It must be an array of [start_date,...,end_date]. ",
              optional: true
            },
            time_condition: {
              type: Type.STRING,
              description: "The condition for querying events, in HH:MM (24-hour) format. It must be one of 'before', 'after', 'between'.",
              optional: true
            },
            time_reference: {
              type: Type.STRING,
              description: "The reference time for querying events, in HH:MM (24-hour) format.",
              optional: true
            },
            time_reference_end: {
              type: Type.STRING,
              description: "The end time for querying events, in HH:MM (24-hour) format. This is optional. Provide if specified by you or reasonably inferable (e.g., a 1-hour meeting).",
              optional: true
            }
          },
          required: ["date_period"]
        }
      };
  return [getWeatherForecastConfig,addScheduleEventConfig,getScheduleEventsConfig];    
}