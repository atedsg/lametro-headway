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

function extractRunId(v) {
  return v.vehicle?.run_id || v.trip?.run_id || v.run_id || v.trip?.trip_id || 'N/A';
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

    const targetEntity = entityList.find((e) => String(e.vehicle?.vehicle?.id) === String(targetVehicleId));

    if (!targetEntity) {
      return res.status(404).json({ error: `차량 번호 ${targetVehicleId}를 찾을 수 없습니다.` });
    }

    const myVehicle = targetEntity.vehicle;
    const myRouteId = myVehicle.trip?.route_id;
    const myDirectionId = myVehicle.trip?.direction_id;
    const myLat = myVehicle.position?.latitude;
    const myLon = myVehicle.position?.longitude;
    const myStopSeq = myVehicle.current_stop_sequence || 0;

    const sameDirectionVehicles = [];

    entityList.forEach((e) => {
      const v = e.vehicle;
      if (!v || !v.position) return;
      if (String(v.vehicle?.id) === String(targetVehicleId)) return;

      const isSameRoute = String(v.trip?.route_id) === String(myRouteId);
      const isSameDirection = myDirectionId !== undefined && v.trip?.direction_id !== undefined ? String(v.trip?.direction_id) === String(myDirectionId) : true;

      if (isSameRoute && isSameDirection) {
        const dist = getDistanceInMiles(myLat, myLon, v.position.latitude, v.position.longitude);
        const vStopSeq = v.current_stop_sequence || 0;

        // stop_sequence 비교 기반 (또는 상대 거리)
        const isAhead = vStopSeq > myStopSeq;

        sameDirectionVehicles.push({
          id: String(v.vehicle?.id),
          lat: v.position.latitude,
          lon: v.position.longitude,
          speed: v.position.speed || 0,
          run: extractRunId(v),
          distance: dist,
          stopSeq: vStopSeq,
          isAhead: isAhead,
        });
      }
    });

    // 앞차/뒤차 분리 및 거리 정렬
    const aheadBuses = sameDirectionVehicles.filter((b) => b.isAhead);
    aheadBuses.sort((a, b) => a.distance - b.distance);

    const behindBuses = sameDirectionVehicles.filter((b) => !b.isAhead);
    behindBuses.sort((a, b) => a.distance - b.distance);

    // Stop Sequence 구분이 명확하지 않을 때 거리 기반 fallback 정렬
    let leadVehicle = aheadBuses[0] || null;
    let trailVehicle = behindBuses[0] || null;

    if (!leadVehicle && !trailVehicle && sameDirectionVehicles.length > 0) {
      sameDirectionVehicles.sort((a, b) => a.distance - b.distance);
      leadVehicle = sameDirectionVehicles[0];
      trailVehicle = sameDirectionVehicles[1] || null;
    }

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
      total_line_buses: sameDirectionVehicles.length + 1,
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
