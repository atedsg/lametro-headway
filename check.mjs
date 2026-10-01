async function test() {
  const API_KEY = 'c3d4e8f1-5a2b-4c3d-8e9f-0a1b2c3d4e5f'; // 발급받으신 API Key

  const endpoints = ['https://api.metro.net/agencies/lametro/vehicles', 'https://api.metro.net/agencies/lametro/vehicles/'];

  for (const url of endpoints) {
    try {
      console.log('--- Requesting:', url);
      const res = await fetch(url, {
        headers: {
          apikey: API_KEY,
          Accept: 'application/json',
        },
      });

      console.log('Status Code:', res.status);

      if (res.ok) {
        const data = await res.json();
        const items = data.items || data.entity || (Array.isArray(data) ? data : []);
        console.log('Total Vehicles Found:', items.length);

        const target = items.find((e) => {
          const vId = e.vehicle?.vehicle?.id || e.vehicle?.id || e.id;
          return String(vId) === '4038';
        });

        if (target) {
          console.log('=== Target Vehicle (4038) Raw Object ===');
          console.log(JSON.stringify(target, null, 2));
        } else if (items.length > 0) {
          console.log('=== Sample Vehicle Raw Object ===');
          console.log(JSON.stringify(items[0], null, 2));
        }
        break;
      } else {
        console.log('Failed Body:', await res.text());
      }
    } catch (err) {
      console.error('Fetch Error:', err.message);
    }
  }
}

test();
