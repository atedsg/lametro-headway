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

function getDistanceInMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Work Run 파싱: trip_id의 세 번째 마디나 trip_id 고유 식별자 추출
function getVehicleRun(v) {
  if (!v) return 'N/A';
  const tripId = v.trip?.trip_id || '';
  if (tripId) {
    const parts = tripId.split('_');
    if (parts.length >= 3 && parts[2]) return `Run ${parts[2]}`;
    if (parts.length >= 2) return `Trip ${parts[0]}`;
    return tripId;
  }
  return v.vehicle?.label || 'N/A';
}

app.get('/api/headway', async (req, res) => {
  const targetVehicleId = req.query.vehicle_id;

  if (!targetVehicleId) {
    return res.status(400).json({ error: 'vehicle_id 파라미터가 필요합니다.' });
  }

  try {
    const response = await fetch(METRO_API_URL);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const entityList = data.entity || [];

    // 1. 내 차량 찾기
    const targetEntity = entityList.find((e) => String(e.vehicle?.vehicle?.id) === String(targetVehicleId));

    if (!targetEntity) {
      return res.status(404).json({ error: `차량 ${targetVehicleId}를 찾을 수 없습니다.` });
    }

    const myVehicle = targetEntity.vehicle;
    const myRouteId = myVehicle.trip?.route_id;
    const myDirectionId = myVehicle.trip?.direction_id;
    const myLat = myVehicle.position?.latitude;
    const myLon = myVehicle.position?.longitude;
    const myBearing = myVehicle.position?.bearing || 0;

    const candidates = [];

    entityList.forEach((e) => {
      const v = e.vehicle;
      if (!v || !v.position) return;
      if (String(v.vehicle?.id) === String(targetVehicleId)) return;

      // 같은 노선 확인
      if (String(v.trip?.route_id) !== String(myRouteId)) return;

      // direction_id 일치 여부 확인 (존재할 경우)
      if (myDirectionId !== undefined && v.trip?.direction_id !== undefined && String(v.trip?.direction_id) !== String(myDirectionId)) {
        return;
      }

      const dist = getDistanceInMiles(myLat, myLon, v.position.latitude, v.position.longitude);

      // 내차 진행방향 베어링 벡터와 타겟버스의 좌표 차이(delta) 계산
      const rad = (myBearing * Math.PI) / 180;
      const vx = Math.sin(rad);
      const vy = Math.cos(rad);
      const dx = (v.position.longitude - myLon) * Math.cos((myLat * Math.PI) / 180);
      const dy = v.position.latitude - myLat;

      const dot = dx * vx + dy * vy;

      candidates.push({
        id: String(v.vehicle?.id),
        run: getVehicleRun(v),
        distance: dist,
        isAhead: dot > 0,
      });
    });

    // 거리순 정렬
    const ahead = candidates.filter((c) => c.isAhead).sort((a, b) => a.distance - b.distance);
    const behind = candidates.filter((c) => !c.isAhead).sort((a, b) => a.distance - b.distance);

    const leadVehicle = ahead[0] || null;
    const trailVehicle = behind[0] || null;

    res.json({
      timestamp: new Date().toISOString(),
      route_id: myRouteId,
      my_vehicle: {
        vehicle_id: targetVehicleId,
        run: getVehicleRun(myVehicle),
        speed_mph: Math.round(myVehicle.position?.speed || 0),
      },
      lead_bus: leadVehicle
        ? {
            vehicle_id: leadVehicle.id,
            run: leadVehicle.run,
            distance_miles: leadVehicle.distance.toFixed(2),
            headway_minutes: Math.max(1, Math.round((leadVehicle.distance / 15) * 60)),
          }
        : null,
      trail_bus: trailVehicle
        ? {
            vehicle_id: trailVehicle.id,
            run: trailVehicle.run,
            distance_miles: trailVehicle.distance.toFixed(2),
            headway_minutes: Math.max(1, Math.round((trailVehicle.distance / 15) * 60)),
          }
        : null,
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
