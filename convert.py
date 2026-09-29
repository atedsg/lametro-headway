import pdfplumber
import re

def time_to_minutes(t_str):
    if not t_str:
        return -1
    m = re.match(r'^(\d{1,2})(\d{2})([ap])$', t_str.strip(), re.I)
    if not m:
        return -1
    h, mins, ap = int(m.group(1)), int(m.group(2)), m.group(3).lower()
    if ap == 'p' and h != 12:
        h += 12
    if ap == 'a' and h == 12:
        h = 0
    return h * 60 + mins

# 허용되는 주중 2일 휴무 목록 (토/일 근무 필수)
WEEKDAY_OFF_PATTERNS = ["MO TU", "TU WE", "WE TH", "TH FR"]

matched_runs = []

print("🔍 [주말 근무 필수 / 주중 2일 휴무] 런 스캔 시작...")

with pdfplumber.open('./D13_WORKRUNS (06-07-2026).pdf') as pdf:
    for page_idx, page in enumerate(pdf.pages):
        text = page.extract_text()
        if not text:
            continue
        
        # 목차 및 노타임 리포트 제외
        if "ROSTER REPORT" in text or "NO-TIME REPORT" in text:
            continue
        
        lines = text.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # 메인 런 번호 라인 탐색 (004, 028, 030, 033, 074, 720)
            run_match = re.match(r'^((?:004|028|030|033|074|720)-\d{3})\s+([A-Z0-9]+)?', line)
            if run_match:
                run_id = run_match.group(1)
                duty_type = run_match.group(2) or ""

                if "PT" in duty_type or "PTAM" in line or "PTPM" in line:
                    i += 1
                    continue

                # 휴무일 추출
                days_match = re.search(r'\b(FR SA SU|SA SU MO|TH FR SA|SA SU|TH FR|WE TH|FR SA|SU MO|MO TU|TU WE)\b', line, re.I)
                if not days_match:
                    i += 1
                    continue

                days_off = days_match.group(1).upper()

                # ★ 주말(SA, SU) 휴무는 무조건 탈락 & 주중 2일 휴무만 통과
                if "SA" in days_off or "SU" in days_off:
                    i += 1
                    continue
                if days_off not in WEEKDAY_OFF_PATTERNS:
                    i += 1
                    continue

                # 1차 Sign On 시간 추출
                times = re.findall(r'\b(\d{3,4}[ap])\b', line, re.I)
                sign_on = None
                sign_on_min = -1
                for t in times:
                    t_min = time_to_minutes(t)
                    if 240 <= t_min <= 660:  # 4:00 AM ~ 11:00 AM
                        sign_on = t
                        sign_on_min = t_min
                        break

                # 1차 출근 6:45 AM (405분) ~ 8:00 AM (480분) 조건
                if not (sign_on and 420 <= sign_on_min <= 600):
                    i += 1
                    continue

                # 일일 유급(Paid) 시간 탐색
                daily_paid_str = "0h00"
                daily_paid_val = 0.0

                for offset in range(1, 5):
                    if i + offset >= len(lines):
                        break
                    sub_line = lines[i + offset]
                    if re.match(r'^(?:004|028|030|033|074|720)-\d{3}', sub_line.strip()):
                        break
                    
                    paid_m = re.search(r'Paid\s+(\d{1,2})h(\d{2})', sub_line, re.I)
                    if not paid_m:
                        paid_m = re.search(r'(\d{1,2})h(\d{2})\s*$', sub_line.strip(), re.I)

                    if paid_m:
                        h, m = int(paid_m.group(1)), int(paid_m.group(2))
                        daily_paid_val = round(h + m / 60, 2)
                        daily_paid_str = f"{h}h{m:02d}"
                        break

                # 풀타임 기준(일일 6시간 이상)
                if daily_paid_val >= 6.0:
                    work_days = 5
                    weekly_paid = round(daily_paid_val * work_days, 2)
                    run_type_label = "스플릿(B)" if duty_type == 'B' else "5일제"

                    matched_runs.append({
                        "id": run_id,
                        "page": page_idx + 1,
                        "type": run_type_label,
                        "sign_on": sign_on,
                        "days_off": f"{days_off} 휴무",
                        "daily_paid": daily_paid_str,
                        "weekly_paid": weekly_paid
                    })

            i += 1

# 중복 제거 (동일 런 ID 중복 방지)
seen = set()
unique_runs = []
for r in matched_runs:
    if r["id"] not in seen:
        seen.add(r["id"])
        unique_runs.append(r)

# 주당 페이 순 정렬
unique_runs.sort(key=lambda x: x["weekly_paid"], reverse=True)

print("=" * 96)
print(f"🎯 [주말 근무 / 주중 2일 휴무] 1차 출근 6:45 AM ~ 8:00 AM 순위 (총 {len(unique_runs)}개)")
print("=" * 96)

if not unique_runs:
    print("해당 조건(주말 근무 + 주중 2일 휴무 + 6:45a~8:00a 출근)의 런이 없습니다.")
else:
    for idx, r in enumerate(unique_runs):
        rank = f"{idx+1:>2}위"
        print(f"{rank} | [{r['id']:<8}] | P.{r['page']:<3} | [{r['type']:<8}] | 출근: {r['sign_on']:>5} | {r['days_off']:<12} | 일일: {r['daily_paid']:<8} | 💰 주당: {r['weekly_paid']}h")

print("=" * 96)