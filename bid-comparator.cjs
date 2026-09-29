const fs = require('fs');
const pdf = require('pdf-parse');

// 시간을 '분(Minutes)' 단위 숫자로 변환 (예: 645a -> 405분)
function timeToMinutes(timeStr) {
  if (!timeStr) return -1;
  const match = timeStr.trim().match(/^(\d{1,2})(\d{2})([ap])$/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const isPm = match[3].toLowerCase() === 'p';
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return h * 60 + m;
}

async function runComparator() {
  try {
    const dataBuffer = fs.readFileSync('./D13_WORKRUNS (06-07-2026).pdf');
    const data = await pdf(dataBuffer);
    const fullText = data.text;

    // 1. 진짜 메인 런 번호만 타겟팅 (줄 맨 앞 또는 공백 뒤의 3자리-3자리 + Type 플래그)
    // 예: 033-008 B, 033-191 F, 004-051 A 등
    const mainRunRegex = /(?:^|\n)\s*((?:004|028|030|033|074|720)-\d{3})\s+([A-Z0-9]+)/g;
    const matches = [...fullText.matchAll(mainRunRegex)];

    const parsedRuns = [];

    for (let i = 0; i < matches.length; i++) {
      const currentRunId = matches[i][1];
      const dutyType = matches[i][2]; // B, F, A, ATR, PTAM 등
      const startIndex = matches[i].index;
      const endIndex = matches[i + 1] ? matches[i + 1].index : fullText.length;

      const block = fullText.slice(startIndex, endIndex);

      // 파트타임(PTAM, PTPM) 및 단시간 런 제외
      if (dutyType.includes('PT') || block.includes('PTAM') || block.includes('PTPM')) continue;

      // 2. [핵심] 1차 출근 시간(Sign On) 추출
      // 런 선언부 바로 뒤에서 첫 번째로 나오는 유효한 시간 패턴만 채택
      const headerSnippet = block.slice(0, 200);
      const timeMatches = [...headerSnippet.matchAll(/(\d{1,2})(\d{2}[ap])/gi)];

      let firstSignOn = null;
      let firstSignOnMin = -1;

      for (const tm of timeMatches) {
        const rawTime = tm[0];
        // BR 번호와 뭉쳐진 경우(예: 19538a) 뒤에서 3~4자리만 분리
        const candidate = rawTime.length > 4 ? rawTime.slice(-4) : rawTime;
        const min = timeToMinutes(candidate);

        // 정상적인 오전 출근 시간 범위(4:00 AM ~ 11:59 AM)
        if (min >= 240 && min < 720) {
          firstSignOn = candidate;
          firstSignOnMin = min;
          break; // 무조건 첫 번째 조각의 Sign On만 잡고 종료!
        }
      }

      if (!firstSignOn) continue;

      // 3. 유급 시간(Paid) 추출: 해당 런 블록의 맨 마지막 XhYY 시간
      const hourMatches = [...block.matchAll(/(\d{1,2})h(\d{2})/g)];
      if (hourMatches.length === 0) continue;

      const lastHour = hourMatches[hourMatches.length - 1];
      const dailyH = parseInt(lastHour[1], 10);
      const dailyM = parseInt(lastHour[2], 10);
      const dailyPaidHours = Number((dailyH + dailyM / 60).toFixed(2));

      // 일일 유급 6시간 미만은 제외
      if (dailyPaidHours < 6) continue;

      // 4. 휴무일(Days Off) 추출
      const daysOffMatch = block.match(/\b(FR SA SU|SA SU MO|TH FR SA|SA SU|TH FR|WE TH|FR SA|SU MO|MO TU|TU WE)\b/i);
      const daysOff = daysOffMatch ? daysOffMatch[0].toUpperCase() : '확인 필요';

      // 5. 근무 일수 계산 (휴무일이 3일이거나 Type이 F인 경우 4일제, 그 외 5일제)
      const isFourDays = daysOff.split(' ').length === 3 || dutyType === 'F';
      const workDays = isFourDays ? 4 : 5;
      const weeklyPaidHours = Number((dailyPaidHours * workDays).toFixed(2));

      // 스플릿 여부 표시
      const runTypeLabel = dutyType === 'B' ? '스플릿(B)' : isFourDays ? '4일제(F)' : '일반 Straight';

      parsedRuns.push({
        id: currentRunId,
        type: runTypeLabel,
        signOn: firstSignOn,
        signOnMin: firstSignOnMin,
        daysOff: daysOff,
        workDays: workDays,
        dailyPaid: `${dailyH}h${String(dailyM).padStart(2, '0')}`,
        weeklyHours: weeklyPaidHours,
      });
    }

    // ========================================================
    // 🎯 필터 조건: 1차 출근 6:45 AM (405분) ~ 8:00 AM (480분)
    // ========================================================
    const targetMin = timeToMinutes('645a');
    const targetMax = timeToMinutes('800a');

    const filtered = parsedRuns.filter((r) => r.signOnMin >= targetMin && r.signOnMin <= targetMax);

    // 중복 제거
    const uniqueRuns = [];
    const seen = new Set();
    for (const r of filtered) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        uniqueRuns.push(r);
      }
    }

    // 주당 페이 높은 순 정렬
    uniqueRuns.sort((a, b) => b.weeklyHours - a.weeklyHours);

    console.log('========================================================================================');
    console.log(`🎯 [D13 Workrun 통합 검색] 1차 출근 6:45a ~ 8:00a (스플릿/Straight 포함: 총 ${uniqueRuns.length}개)`);
    console.log('========================================================================================');

    if (uniqueRuns.length === 0) {
      console.log('해당 출근 시간대의 런을 찾지 못했습니다.');
    } else {
      uniqueRuns.forEach((r, idx) => {
        const rank = String(idx + 1).padStart(2, ' ');
        const id = r.id.padEnd(8, ' ');
        const type = r.type.padEnd(12, ' ');
        const signOn = r.signOn.padStart(5, ' ');
        const days = `${r.workDays}일제(${r.daysOff})`.padEnd(16, ' ');
        const daily = `일일: ${r.dailyPaid}`.padEnd(12, ' ');
        const weekly = `주당: ${r.weeklyHours}h`;

        console.log(`${rank}위 | [${id}] | [${type}] | 출근: ${signOn} | ${days} | ${daily} | 💰 ${weekly}`);
      });
    }
    console.log('========================================================================================');
  } catch (err) {
    console.error('실행 중 에러 발생:', err);
  }
}

runComparator();
