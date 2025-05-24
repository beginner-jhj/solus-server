import "dotenv/config";

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const getLocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (positon) => {
        resolve({
          latitude: positon.coords.latitude,
          longitude: positon.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
};

export async function getWeatherData() {
  try {
    const location = await getLocation();
    const response = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${location.latitude},${location.longitude}`,
      { method: "GET" }
    );
    const jsonRes = await response.json();
    return jsonRes;
  } catch (error) {
    console.error(error);
  }
}
