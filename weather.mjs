// weather.mjs
async function getWeather() {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=34.05&longitude=-118.24&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto';

  try {
    const response = await fetch(url);
    const data = await response.json();

    const currentTemp = data.current.temperature_2m;
    const humidity = data.current.relative_humidity_2m; // 현재 습도 (%)
    const maxTemp = data.daily.temperature_2m_max[0];
    const minTemp = data.daily.temperature_2m_min[0];
    const rainChance = data.daily.precipitation_probability_max[0];

    console.log('====================================');
    console.log(`🌤️  현재 기온: ${currentTemp}°F`);
    console.log(`💧  현재 습도: ${humidity}%`);
    console.log(`📈  오늘 최고: ${maxTemp}°F / 최저: ${minTemp}°F`);
    console.log(`☔  강수 확률: ${rainChance}%`);
    console.log('====================================');
  } catch (error) {
    console.error('날씨 정보를 가져오는 중 에러 발생:', error);
  }
}

getWeather();
