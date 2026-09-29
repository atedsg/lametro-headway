// work-calc.mjs

// 1. "HH:MM" 형식의 문자열을 총 분(Minutes)으로 바꿔주는 변환 함수
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 2. 분(Minutes)을 다시 "X시간 Y분" 텍스트로 예쁘게 바꿔주는 함수
function minutesToHoursStr(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}시간 ${m}분`;
}

// 3. 하루 근무 계산 메인 함수
function calculateShift({ date, start, end, breakMinutes = 0 }) {
  const startMin = timeToMinutes(start);
  let endMin = timeToMinutes(end);

  // 자정을 넘겨 퇴근한 경우 (예: 22:00 출근 -> 06:00 퇴근)
  if (endMin < startMin) {
    endMin += 24 * 60;
  }

  // 총 구속 시간 - 무급 휴게 시간 = 실제 근무 시간
  const totalWorkedMin = endMin - startMin - breakMinutes;

  // 기본 8시간(480분) 기준 정규/초과 분리
  const standardLimitMin = 8 * 60;
  let regularMin = 0;
  let overtimeMin = 0;

  if (totalWorkedMin > standardLimitMin) {
    regularMin = standardLimitMin;
    overtimeMin = totalWorkedMin - standardLimitMin;
  } else {
    regularMin = totalWorkedMin;
    overtimeMin = 0;
  }

  return {
    date,
    totalWorked: minutesToHoursStr(totalWorkedMin),
    regular: minutesToHoursStr(regularMin),
    overtime: minutesToHoursStr(overtimeMin),
    rawOvertimeHours: (overtimeMin / 60).toFixed(2), // 소수점 수당 계산용 (예: 1.50시간)
  };
}

// ==========================================
// 4. 내 이번 주 스케줄 데이터 넣기 (예시)
// ==========================================
const myShifts = [
  { date: '월요일', start: '05:30', end: '14:00', breakMinutes: 30 }, // 8시간 근무 (기본 8h, OT 0)
  { date: '화요일', start: '05:30', end: '15:30', breakMinutes: 30 }, // 9.5시간 근무 (기본 8h, OT 1.5h)
  { date: '수요일', start: '06:00', end: '16:30', breakMinutes: 45 }, // 9시간 45분 근무
];

console.log('==============================================');
console.log('📋 이번 주 근무 & 오버타임(OT) 정산');
console.log('==============================================');

let weeklyTotalMin = 0;
let weeklyOTHours = 0;

myShifts.forEach((shift) => {
  const res = calculateShift(shift);
  console.log(`[${res.date}] 순 근무: ${res.totalWorked} | 기본: ${res.regular} | 🚨 OT: ${res.overtime}`);

  weeklyOTHours += Number(res.rawOvertimeHours);
});

console.log('----------------------------------------------');
console.log(`💰 이번 주 총 누적 초과근무(OT): ${weeklyOTHours.toFixed(2)} 시간`);
console.log('==============================================');
