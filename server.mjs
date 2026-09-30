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

// Work Run 추출: NE26 고정 문제를 해결하기 위해 trip_id 전체 및 vehicle label 조합 사용
function getVehicleRun(v) {
  if (!v) return 'N/A';
  const tripId = v.trip?.trip_id || '';

  if (tripId) {
    const parts = tripId.split('_');
    // 세 번째 마디가 존재하면 Run 구분자로 사용 (예: 13201_NE26_1 -> Run #1)
    if (parts.length >= 3 && parts[2]) {
      return `Run ${parts[2]}`;
    }
    return parts[0]; // Trip 번호 반환
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

    // 타겟 차량 탐색
    const targetEntity = entityList.find((e) => String(e.vehicle?.vehicle?.id) === String(targetVehicleId));

    if (!targetEntity) {
      return res.status(404).json({ error: `차량 ${targetVehicleId}를 찾을 수 없습니다.` });
    }

    const myVehicle = targetEntity.vehicle;
    const myRouteId = myVehicle.trip?.route_id;
    const myLat = myVehicle.position?.latitude;
    const myLon = myVehicle.position?.longitude;
    const myBearing = myVehicle.position?.bearing || 0;
    const myStopSeq = myVehicle.current_stop_sequence || 0;

    const validCandidates = [];

    entityList.forEach((e) => {
      const v = e.vehicle;
      if (!v || !v.position) return;
      if (String(v.vehicle?.id) === String(targetVehicleId)) return;

      // 1. 같은 노선만 필터링
      if (String(v.trip?.route_id) !== String(myRouteId)) return;

      // 2. 진행 방향(bearing) 검증 (50도 이상 차이나면 반대 방향으로 간주하여 제외)
      const vBearing = v.position.bearing || 0;
      let bearingDiff = Math.abs(myBearing - vBearing);
      if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;

      if (myBearing !== 0 && vBearing !== 0 && bearingDiff > 50) return;

      const dist = getDistanceInMiles(myLat, myLon, v.position.latitude, v.position.longitude);
      const vStopSeq = v.current_stop_sequence || 0;

      validCandidates.push({
        id: String(v.vehicle?.id),
        run: getVehicleRun(v),
        distance: dist,
        stopSeq: vStopSeq,
      });
    });

    // 정류장 순서(stopSeq) 및 거리를 결합한 앞차/뒤차 판별
    const ahead = [];
    const behind = [];

    validCandidates.forEach((b) => {
      if (myStopSeq !== 0 && b.stopSeq !== 0) {
        if (b.stopSeq > myStopSeq) ahead.push(b);
        else if (b.stopSeq < myStopSeq) behind.push(b);
        else {
          if (b.distance < 2.0) behind.push(b);
          else ahead.push(b);
        }
      } else {
        if (b.distance < 3.0) behind.push(b);
        else ahead.push(b);
      }
    });

    ahead.sort((a, b) => a.distance - b.distance);
    behind.sort((a, b) => a.distance - b.distance);

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
