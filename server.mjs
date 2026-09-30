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

// Haversine 거리 계산 (miles)
function getDistanceInMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function extractRunId(v) {
  return v.run_id || v.vehicle?.run_id || v.trip?.run_id || v.trip?.trip_id || 'N/A';
}

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

    // 1. Target 차량 찾기
    const targetEntity = entityList.find((e) => String(e.vehicle?.vehicle?.id) === String(targetVehicleId));

    if (!targetEntity) {
      return res.status(404).json({ error: `차량 번호 ${targetVehicleId}를 찾을 수 없습니다.` });
    }

    const myVehicle = targetEntity.vehicle;
    const myRouteId = myVehicle.trip?.route_id;
    const myDirectionId = myVehicle.trip?.direction_id;
    const myLat = myVehicle.position?.latitude;
    const myLon = myVehicle.position?.longitude;

    // 2. 같은 노선 & 같은 direction_id 차량만 추출
    const candidateVehicles = [];

    entityList.forEach((e) => {
      const v = e.vehicle;
      if (!v || !v.position) return;
      if (String(v.vehicle?.id) === String(targetVehicleId)) return;

      const isSameRoute = String(v.trip?.route_id) === String(myRouteId);
      const isSameDirection = myDirectionId !== undefined && v.trip?.direction_id !== undefined ? String(v.trip?.direction_id) === String(myDirectionId) : true;

      if (isSameRoute && isSameDirection) {
        const dist = getDistanceInMiles(myLat, myLon, v.position.latitude, v.position.longitude);

        // 진행 방향에 따른 위치 벡터 계산 (direction_id 0 vs 1 기반 동/서/남/북 벡터 추정)
        // direction_id 0일 때와 1일 때 좌표 변화량(delta)으로 앞/뒤 판별
        const dLat = v.position.latitude - myLat;
        const dLon = v.position.longitude - myLon;

        // direction_id가 0(동/남쪽 진행)인 경우 좌표 증가/감소로 앞/뒤 판별
        let isAhead = false;
        if (String(myDirectionId) === '0') {
          // Eastbound/Southbound일 때 경도(lon) 증가 또는 위도(lat) 감소 방향
          isAhead = dLon > 0 || dLat < 0;
        } else {
          // Westbound/Northbound일 때 경도(lon) 감소 또는 위도(lat) 증가 방향
          isAhead = dLon < 0 || dLat > 0;
        }

        candidateVehicles.push({
          id: v.vehicle?.id,
          lat: v.position.latitude,
          lon: v.position.longitude,
          speed: v.position.speed || 0,
          run: extractRunId(v),
          distance: dist,
          isAhead: isAhead,
        });
      }
    });

    // 앞차 후보군 (isAhead = true 중 가장 가까운 차)
    const aheadBuses = candidateVehicles.filter((b) => b.isAhead);
    aheadBuses.sort((a, b) => a.distance - b.distance);
    const leadVehicle = aheadBuses[0] || null;

    // 뒤차 후보군 (isAhead = false 중 가장 가까운 차)
    const behindBuses = candidateVehicles.filter((b) => !b.isAhead);
    behindBuses.sort((a, b) => a.distance - b.distance);
    const trailVehicle = behindBuses[0] || null;

    const myRun = extractRunId(myVehicle);

    const leadBus = leadVehicle
      ? {
          vehicle_id: leadVehicle.id,
          run: leadVehicle.run,
          distance_miles: leadVehicle.distance.toFixed(2),
          headway_minutes: Math.max(1, Math.round((leadVehicle.distance / 15) * 60)),
        }
      : null;

    const trailBus = trailVehicle
      ? {
          vehicle_id: trailVehicle.id,
          run: trailVehicle.run,
          distance_miles: trailVehicle.distance.toFixed(2),
          headway_minutes: Math.max(1, Math.round((trailVehicle.distance / 15) * 60)),
        }
      : null;

    res.json({
      timestamp: new Date().toISOString(),
      route_id: myRouteId,
      direction_id: myDirectionId,
      total_line_buses: candidateVehicles.length + 1,
      my_vehicle: {
        vehicle_id: targetVehicleId,
        run: myRun,
        speed_mph: Math.round(myVehicle.position?.speed || 0),
      },
      lead_bus: leadBus,
      trail_bus: trailBus,
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
