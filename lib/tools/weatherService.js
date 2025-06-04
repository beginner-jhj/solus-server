import "dotenv/config";

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const summarizeWeatherData = (data)=> {
  return {
    datetime: data.time,
    condition: data.condition.text.trim(),
    temperature: `${data.temp_c}°C (feels like ${data.feelslike_c}°C)`,
    humidity: `${data.humidity}%`,
    chance_of_rain: `${data.chance_of_rain}%`,
    chance_of_snow: `${data.chance_of_snow}%`,
    wind: `${data.wind_kph} kph from ${data.wind_dir}`,
    uv_index: data.uv
  };
}


export async function weatherService(latitude, longitude, cityName=null,days = 1) {
  try {
    // Validate days parameter (1-3)
    let apiDays = Math.max(1, Math.min(parseInt(days, 10) || 1, 3));
    const baseUrl = "https://api.weatherapi.com/v1/forecast.json";
    let url = `${baseUrl}?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=${apiDays}`;
    if(cityName){
      url = `${baseUrl}?key=${WEATHER_API_KEY}&q=${encodeURIComponent(cityName)}&days=${apiDays}`;
    }

    const response = await fetch(
      url,
      { method: "GET" }
    );
    const jsonRes = await response.json();
    // Process forecast data for all days
    const allHourlyData = jsonRes.forecast.forecastday.flatMap(day => day.hour);
    const summarizedData = allHourlyData.map(summarizeWeatherData);
    return summarizedData;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
