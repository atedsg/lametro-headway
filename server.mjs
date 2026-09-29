import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = '4f0da7eaf402ee4d3b330fb7a10a1a71';
const AGENCY_KEY = 'lametro';
const SWIFTLY_VEHICLES_URL = `https://api.goswift.ly/real-time/${AGENCY_KEY}/gtfs-rt-vehicle-positions`;

app.get('/api/headway', async (req, res) => {
  const targetBus = req.query.bus?.trim();
  if (!targetBus) {
    return res.status(400).json({ error: '차량 번호를 입력하세요.' });
  }

  try {
    let response = await fetch(`${SWIFTLY_VEHICLES_URL}?apiKey=${API_KEY}`, {
      headers: { Accept: 'application/x-protobuf' },
    });

    if (!response.ok) {
      response = await fetch(SWIFTLY_VEHICLES_URL, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/x-protobuf',
        },
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    const vehicles = [];
    for (const entity of feed.entity) {
      if (entity.vehicle && entity.vehicle.vehicle) {
        const v = entity.vehicle;
        const vId = String(v.vehicle.id || '').trim();
        const rId = String(v.trip?.routeId || '').trim();
        const lat = v.position?.latitude;
        const lon = v.position?.longitude;

        if (vId && lat && lon) {
          vehicles.push({
            id: vId,
            route: rId,
            tripId: v.trip?.tripId || '',
            lat,
            lon,
            speed: v.position?.speed ? Math.round(v.position.speed * 2.23694) : 0,
            directionId: v.trip?.directionId ?? null,
          });
        }
      }
    }

    const cleanTarget = targetBus.replace(/^0+/, '');
    const myBus = vehicles.find((v) => v.id === targetBus || v.id.replace(/^0+/, '') === cleanTarget);

    if (!myBus) {
      return res.status(404).json({
        error: `차량 [${targetBus}]번을 모니터링망에서 찾지 못했습니다. (운행 중: ${vehicles.length}대)`,
      });
    }

    const routeBuses = vehicles.filter((v) => v.route === myBus.route);

    const busesWithDist = routeBuses.map((b) => {
      const dLat = (b.lat - myBus.lat) * 69.0;
      const dLon = (b.lon - myBus.lon) * 55.0;
      const dist = Math.hypot(dLat, dLon);

      return {
        id: b.id,
        tripId: b.tripId,
        dist: dist,
        isAhead: b.lon > myBus.lon || b.lat > myBus.lat,
      };
    });

    const aheadBuses = busesWithDist.filter((b) => b.id !== myBus.id && b.isAhead).sort((a, b) => a.dist - b.dist);
    const behindBuses = busesWithDist.filter((b) => b.id !== myBus.id && !b.isAhead).sort((a, b) => a.dist - b.dist);

    const lead = aheadBuses[0] || null;
    const trail = behindBuses[0] || null;

    // 프론트엔드 UI 변수명 완벽 호환
    res.json({
      totalOnRoute: routeBuses.length,
      myBus: {
        id: myBus.id,
        route: myBus.route || 'Line -',
        run: myBus.tripId ? myBus.tripId.slice(-4) : 'N/A',
        speed: myBus.speed,
      },
      leadBus: lead
        ? {
            id: lead.id,
            run: lead.tripId ? lead.tripId.slice(-4) : 'N/A',
            gapMiles: lead.dist.toFixed(2),
            gapMinutes: Math.max(1, Math.round((lead.dist / 12) * 60)),
          }
        : null,
      trailBus: trail
        ? {
            id: trail.id,
            run: trail.tripId ? trail.tripId.slice(-4) : 'N/A',
            gapMiles: trail.dist.toFixed(2),
            gapMinutes: Math.max(1, Math.round((trail.dist / 12) * 60)),
          }
        : null,
      updatedAt: new Date().toLocaleTimeString('en-US'),
    });
  } catch (err) {
    res.status(500).json({ error: `실시간 통신 오류: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Headway Monitor 서버 실행 완료: http://localhost:${PORT}`);
});
