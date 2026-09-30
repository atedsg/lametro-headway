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

// 각 차량 고유 Run ID / Work Run 파싱 함수 (NE26 중복 고정 문제 해결)
function parseRunId(vehicleObj) {
  if (!vehicleObj) return 'N/A';

  const tripId = vehicleObj.trip?.trip_id || '';
  if (tripId.includes('_')) {
    const parts = tripId.split('_');
    // 세 번째 마디가 있으면 세 번째 마디, 없으면 첫 번째 마디(Trip 번호) 사용
    if (parts.length >= 3 && parts[2]) return `Run ${parts[2]}`;
    if (parts.length >= 1 && parts[0]) return `Trip ${parts[0]}`;
  }

  if (vehicleObj.vehicle?.label) return vehicleObj.vehicle.label;
  return 'N/A';
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

    // 1. 조회 대상 차량 찾기
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

    // 2. 같은 노선 & 같은 방향 차량 분류
    entityList.forEach((e) => {
      const v = e.vehicle;
      if (!v) return;
      if (String(v.vehicle?.id) === String(targetVehicleId)) return;

      const isSameRoute = String(v.trip?.route_id) === String(myRouteId);

      // direction_id 일치 여부 엄격 검증
      const isSameDirection = myDirectionId !== undefined && v.trip?.direction_id !== undefined ? String(v.trip?.direction_id) === String(myDirectionId) : true;

      if (isSameRoute && isSameDirection) {
        const vStopSeq = v.current_stop_sequence || 0;
        const vRun = parseRunId(v);

        const busData = {
          id: String(v.vehicle?.id),
          run: vRun,
          stopSeq: vStopSeq,
        };

        // stop_sequence 기준으로 단순 명쾌하게 분류 (거리 제약 제거)
        if (vStopSeq > myStopSeq) {
          aheadBuses.push(busData);
        } else if (vStopSeq < myStopSeq) {
          behindBuses.push(busData);
        }
      }
    });

    // 3. 정류장 순서 차이가 가장 작은 순서로 정렬
    aheadBuses.sort((a, b) => a.stopSeq - b.stopSeq); // 앞차: 나보다 순번이 가장 조금 높은 차
    behindBuses.sort((a, b) => b.stopSeq - a.stopSeq); // 뒤차: 나보다 순번이 가장 조금 낮은 차

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
