import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

// LA Metro GTFS-RT Vehicle Positions API URL
const METRO_API_URL = 'https://api.metro.net/LAMetroGTFS_Realtime/vehicle_positions.json';

// 두 좌표 간 거리 계산 (Haversine formula, 단위: miles)
function getDistanceInMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // 지구 반지름 (miles)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Run ID / Work Run 추출 헬퍼 함수
function extractRunId(vehicle) {
  return vehicle.run_id || vehicle.vehicle?.run_id || vehicle.trip?.run_id || vehicle.trip?.trip_id || 'N/A';
}

// API 엔드포인트: 특정 차번 기준 앞차/뒤차 간격 조회
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

    // 2. 같은 노선 & "같은 운행 방향(direction_id)" 차량만 필터링
    const sameDirectionVehicles = entityList
      .filter((e) => {
        const v = e.vehicle;
        if (!v || !v.position) return false;
        if (String(v.vehicle?.id) === String(targetVehicleId)) return false; // 내 차량 제외

        const isSameRoute = String(v.trip?.route_id) === String(myRouteId);
        // direction_id가 존재하는 경우 동일한 방향만 선택
        const isSameDirection = myDirectionId !== undefined && v.trip?.direction_id !== undefined ? String(v.trip?.direction_id) === String(myDirectionId) : true;

        return isSameRoute && isSameDirection;
      })
      .map((e) => {
        const v = e.vehicle;
        const dist = getDistanceInMiles(myLat, myLon, v.position.latitude, v.position.longitude);
        return {
          id: v.vehicle?.id,
          lat: v.position.latitude,
          lon: v.position.longitude,
          speed: v.position.speed || 0,
          run: extractRunId(v),
          distance: dist,
        };
      });

    // 3. 거리순 정렬 (가장 가까운 차량 찾기)
    sameDirectionVehicles.sort((a, b) => a.distance - b.distance);

    // 거리 기반 가장 가까운 차량 2대 선택 (앞/뒤 추정)
    const leadVehicle = sameDirectionVehicles[0] || null;
    const trailVehicle = sameDirectionVehicles[1] || null;

    // 4. 각각의 차량에 고유 Run ID 및 정보 개별 할당
    const myRun = extractRunId(myVehicle);

    const leadBus = leadVehicle
      ? {
          vehicle_id: leadVehicle.id,
          run: leadVehicle.run, // 앞차 고유 Run ID
          distance_miles: leadVehicle.distance.toFixed(2),
          headway_minutes: Math.round((leadVehicle.distance / 15) * 60), // 약 15mph 평균속도 기준 추정분
        }
      : null;

    const trailBus = trailVehicle
      ? {
          vehicle_id: trailVehicle.id,
          run: trailVehicle.run, // 뒤차 고유 Run ID
          distance_miles: trailVehicle.distance.toFixed(2),
          headway_minutes: Math.round((trailVehicle.distance / 15) * 60),
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

// 루트 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Headway Monitor 서버 실행 중: http://localhost:${PORT}`);
});
