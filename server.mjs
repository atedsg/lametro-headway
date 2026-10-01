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

// trip_id 기반 고유 Run ID / Work ID 추출
function parseRunId(vehicleObj) {
  if (!vehicleObj) return 'N/A';
  const tripId = vehicleObj.trip?.trip_id || '';
  if (tripId.includes('_')) {
    const parts = tripId.split('_');
    if (parts.length >= 3 && parts[2]) return `Run ${parts[2]}`;
    if (parts.length >= 1 && parts[0]) return `Trip ${parts[0]}`;
  }
  return vehicleObj.vehicle?.label || 'N/A';
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

    // 1. Target (내 차량) 검색
    const targetEntity = entityList.find((e) => String(e.vehicle?.vehicle?.id) === String(targetVehicleId));

    if (!targetEntity) {
      return res.status(404).json({ error: `차량 번호 ${targetVehicleId}를 찾을 수 없습니다.` });
    }

    const myVehicle = targetEntity.vehicle;
    const myRouteId = myVehicle.trip?.route_id;
    const myDirectionId = myVehicle.trip?.direction_id;
    const myStopSeq = myVehicle.current_stop_sequence || 0;
    const myRun = parseRunId(myVehicle);

    const aheadBuses = [];
    const behindBuses = [];

    // 2. 같은 노선 & 엄격하게 일치하는 direction_id 버스만 분류
    entityList.forEach((e) => {
      const v = e.vehicle;
      if (!v || !v.trip) return;
      if (String(v.vehicle?.id) === String(targetVehicleId)) return;

      const isSameRoute = String(v.trip?.route_id) === String(myRouteId);

      // direction_id가 명확히 동일할 때만 동방향 버스로 인정 (undefined 방지)
      const vDir = v.trip?.direction_id;
      const isSameDirection = myDirectionId !== undefined && vDir !== undefined && String(vDir) === String(myDirectionId);

      if (isSameRoute && isSameDirection) {
        const vStopSeq = v.current_stop_sequence || 0;
        const vRun = parseRunId(v);

        const busData = {
          id: String(v.vehicle?.id),
          run: vRun,
          stopSeq: vStopSeq,
        };

        if (vStopSeq > myStopSeq) {
          aheadBuses.push(busData);
        } else if (vStopSeq < myStopSeq) {
          behindBuses.push(busData);
        }
      }
    });

    // 3. 정류장 순서 차이 정렬
    aheadBuses.sort((a, b) => a.stopSeq - b.stopSeq); // 가장 가까운 앞차
    behindBuses.sort((a, b) => b.stopSeq - a.stopSeq); // 가장 가까운 뒤차

    const leadVehicle = aheadBuses[0] || null;
    const trailVehicle = behindBuses[0] || null;

    res.json({
      timestamp: new Date().toISOString(),
      route_id: myRouteId,
      direction_id: myDirectionId,
      total_line_buses: aheadBuses.length + behindBuses.length + 1,
      my_vehicle: {
        vehicle_id: targetVehicleId,
        run: myRun,
        speed_mph: Math.round(myVehicle.position?.speed || 0),
        stop_sequence: myStopSeq,
      },
      lead_bus: leadVehicle
        ? {
            vehicle_id: leadVehicle.id,
            run: leadVehicle.run,
            stop_sequence: leadVehicle.stopSeq,
            stops_ahead: leadVehicle.stopSeq - myStopSeq,
          }
        : null,
      trail_bus: trailVehicle
        ? {
            vehicle_id: trailVehicle.id,
            run: trailVehicle.run,
            stop_sequence: trailVehicle.stopSeq,
            stops_behind: myStopSeq - trailVehicle.stopSeq,
          }
        : null,
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
