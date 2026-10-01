import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const METRO_API_URL = 'https://api.metro.net/LAMetroGTFS_Realtime/vehicle_positions.json';

app.get('/api/headway', async (req, res) => {
  const targetVehicleId = req.query.vehicle_id;

  if (!targetVehicleId) {
    return res.status(400).json({ error: 'vehicle_id 파라미터가 필요합니다.' });
  }

  try {
    const response = await fetch(METRO_API_URL);
    if (!response.ok) {
      throw new Error(`Metro API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const entityList = data.entity || [];

    // 1. 조회 대상 차량 찾기
    const targetEntity = entityList.find((e) => String(e.vehicle?.vehicle?.id) === String(targetVehicleId));

    if (!targetEntity) {
      return res.status(404).json({ error: `차량 번호 ${targetVehicleId}를 찾을 수 없습니다.` });
    }

    const myVehicle = targetEntity.vehicle;
    const myRouteId = myVehicle.trip?.route_id;

    // 2. 동일 노선(Route)의 모든 차량 원본 데이터 수집
    const sameRouteVehicles = entityList.filter((e) => String(e.vehicle?.trip?.route_id) === String(myRouteId)).map((e) => e.vehicle);

    // 원본 데이터 전체 전달
    res.json({
      timestamp: new Date().toISOString(),
      target_vehicle_id: targetVehicleId,
      my_vehicle_raw: myVehicle,
      total_same_route_count: sameRouteVehicles.length,
      all_route_vehicles_raw: sameRouteVehicles,
    });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: '서버 데이터 처리 중 오류가 발생했습니다.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Headway Monitor 서버 실행 중: http://localhost:${PORT}`);
});
