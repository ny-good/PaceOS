'use strict';

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════

const KM = { '5k': 5, '10k': 10, 'half': 21.0975, 'full': 42.195 };
const DIST_LABEL = { '5k': '5K', '10k': '10K', 'half': '하프마라톤', 'full': '풀마라톤' };
const LS_GOAL  = 'paceos_v1';
const LS_RUNS  = 'paceos_runs';
const LS_PLANS = 'paceos_plans';

const SAMPLE_GOAL = {
  targetDistance: 'full', targetHour: 3, targetMin: 30, targetSec: 0,
  recentDistance: '10k', recentHour: 0, recentMin: 50, recentSec: 0,
  runsPerWeek: '4', weeklyKm: 40, weeksLeft: 16, injury: 'no'
};

// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════

const $ = id => document.getElementById(id);
function pad(n) { return String(Math.round(Math.abs(n))).padStart(2, '0'); }

function fmtTime(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function fmtPace(spk) {
  if (!isFinite(spk) || spk <= 0) return '--:--';
  spk = Math.round(spk);
  return `${Math.floor(spk / 60)}:${pad(spk % 60)}`;
}

function riegelPredict(rSec, rKm, tKm) { return rSec * Math.pow(tKm / rKm, 1.06); }

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function daysBetween(a, b) { return Math.floor((b - a) / 86400000); }

// ═══════════════════════════════════════════════
//  LOCALSTORAGE
// ═══════════════════════════════════════════════

function saveGoal(d) { try { localStorage.setItem(LS_GOAL, JSON.stringify(d)); } catch(_){} }
function loadGoal() { try { return JSON.parse(localStorage.getItem(LS_GOAL)); } catch(_){ return null; } }
function loadRuns() { try { return JSON.parse(localStorage.getItem(LS_RUNS)) || []; } catch(_){ return []; } }
function saveRuns(arr) {
  try {
    localStorage.setItem(LS_RUNS, JSON.stringify(arr));
    return true;
  } catch(e) {
    alert('저장 실패: 브라우저 저장 공간이 부족하거나 개인 정보 보호 모드에서는 저장이 제한될 수 있습니다.\n\n오류: ' + e.message);
    return false;
  }
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('toast-show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('toast-show'), 2200);
}

// ═══════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ═══════════════════════════════════════════════
//  GOAL CALCULATOR (Tab 1)
// ═══════════════════════════════════════════════

function radio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}
function setRadio(name, val) {
  const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
  if (el) el.checked = true;
}
// 거리별 기본 목표 시간 (선택 시 자동 세팅)
const TARGET_DEFAULTS = {
  '5k':  { h:0, m:25, s:0 },
  '10k': { h:0, m:55, s:0 },
  'half':{ h:2, m:10, s:0 },
  'full':{ h:4, m:30, s:0 }
};

function syncRecentTimeVisibility() {
  $('recentTimeGroup').classList.toggle('hidden', radio('recentDistance') === 'none');
}

function updateTargetPacePreview() {
  const d = radio('targetDistance');
  const tDist = d ? KM[d] : null;
  const h = parseInt($('targetHour').value) || 0;
  const m = parseInt($('targetMin').value) || 0;
  const s = parseInt($('targetSec').value) || 0;
  const tSec = h * 3600 + m * 60 + s;
  const el = $('targetPacePreview');
  if (!el) return;
  el.textContent = (tDist && tSec > 0) ? fmtPace(tSec / tDist) + '/km' : '--:--';
}

function resetTargetTimeForDistance(dist) {
  const def = TARGET_DEFAULTS[dist];
  if (!def) return;
  $('targetHour').value = def.h || '';
  $('targetMin').value  = def.m;
  $('targetSec').value  = def.s || '';
  updateTargetPacePreview();
}
function getGoalValues() {
  return {
    targetDistance: radio('targetDistance'),
    targetHour: parseInt($('targetHour').value) || 0, targetMin: parseInt($('targetMin').value) || 0, targetSec: parseInt($('targetSec').value) || 0,
    recentDistance: radio('recentDistance'),
    recentHour: parseInt($('recentHour').value) || 0, recentMin: parseInt($('recentMin').value) || 0, recentSec: parseInt($('recentSec').value) || 0,
    runsPerWeek: $('runsPerWeek').value,
    weeklyKm: parseFloat($('weeklyKm').value) || 0,
    weeksLeft: parseInt($('weeksLeft').value) || 12,
    injury: radio('injury')
  };
}
function applyGoalValues(d) {
  setRadio('targetDistance', d.targetDistance || 'full');
  $('targetHour').value = d.targetHour ?? ''; $('targetMin').value = d.targetMin ?? ''; $('targetSec').value = d.targetSec ?? '';
  setRadio('recentDistance', d.recentDistance || '10k');
  $('recentHour').value = d.recentHour ?? ''; $('recentMin').value = d.recentMin ?? ''; $('recentSec').value = d.recentSec ?? '';
  $('runsPerWeek').value = d.runsPerWeek || '4';
  $('weeklyKm').value = d.weeklyKm || ''; $('weeksLeft').value = d.weeksLeft || '';
  setRadio('injury', d.injury || 'no');
  syncRecentTimeVisibility();
  updateTargetPacePreview();
}
function validateGoal(v) {
  if (!v.targetDistance) return '목표 거리를 선택해주세요.';
  const tSec = v.targetHour * 3600 + v.targetMin * 60 + v.targetSec;
  if (tSec <= 0) return '목표 기록을 입력해주세요.';
  const pace = tSec / KM[v.targetDistance];
  if (pace < 180) return '목표 기록이 너무 빠릅니다 (최소 3:00/km).';
  if (pace > 1500) return '목표 기록이 너무 느립니다 (최대 25:00/km).';
  if (v.recentDistance !== 'none') {
    const rSec = v.recentHour * 3600 + v.recentMin * 60 + v.recentSec;
    if (rSec <= 0) return '최근 기록을 입력하거나 "없음"을 선택해주세요.';
    const rPace = rSec / KM[v.recentDistance];
    if (rPace < 180 || rPace > 1500) return '최근 기록 페이스가 유효 범위를 벗어났습니다.';
  }
  if (v.weeksLeft < 1) return '대회까지 남은 주는 1주 이상이어야 합니다.';
  return null;
}
// 거리별 훈련 페이스 오프셋 (초/km) — 단거리일수록 목표 페이스와 간격이 좁아야 함
const PACE_OFFSETS = {
  '5k':  { easy: 52, tempo: 14, interval: -20, longrun: 62,  recovery: 78 },
  '10k': { easy: 60, tempo: 16, interval: -15, longrun: 75,  recovery: 90 },
  'half':{ easy: 68, tempo: 17, interval: -12, longrun: 88,  recovery: 103 },
  'full':{ easy: 75, tempo: 18, interval: -10, longrun: 97,  recovery: 110 }
};

function calcGoal(v) {
  const tDist = KM[v.targetDistance], tSec = v.targetHour * 3600 + v.targetMin * 60 + v.targetSec, tPace = tSec / tDist;
  let predictedSec = null, difficulty = 'unknown', probability = 50;
  if (v.recentDistance !== 'none') {
    const rSec = v.recentHour * 3600 + v.recentMin * 60 + v.recentSec;
    predictedSec = riegelPredict(rSec, KM[v.recentDistance], tDist);
    const diff = (predictedSec - tSec) / predictedSec;
    if (diff < -0.03) { difficulty = 'easy'; probability = 80; }
    else if (diff <= 0.03) { difficulty = 'normal'; probability = 65; }
    else if (diff <= 0.08) { difficulty = 'challenge'; probability = 40; }
    else { difficulty = 'hard'; probability = 20; }
  }
  const off = PACE_OFFSETS[v.targetDistance] || PACE_OFFSETS['full'];
  return {
    tDist, tSec, tPace, predictedSec, difficulty, probability,
    easyPace:     tPace + off.easy,
    tempoPace:    tPace + off.tempo,
    intervalPace: Math.max(180, tPace + off.interval),
    longRunPace:  tPace + off.longrun,
    recoveryPace: tPace + off.recovery,
    recDist: recommendedWeekly(v.targetDistance, v.weeksLeft),
    keyPoints: buildKeyPoints(v, difficulty)
  };
}
function recommendedWeekly(dist, w) {
  const t = { '5k': [35,22], '10k': [50,32], 'half': [65,42], 'full': [90,55] }[dist];
  if (w <= 3) return `${t[1]}~${Math.round(t[1]*1.2)}`;
  if (w <= 8) return `${Math.round(t[0]*.7)}~${t[0]}`;
  return `${Math.round(t[0]*.75)}~${t[0]}`;
}
function buildKeyPoints(v, difficulty) {
  const pts = [];
  if (difficulty === 'hard') pts.push('목표 기록이 현재 실력 대비 상당히 도전적입니다. 단계별 중간 목표를 먼저 세워보세요.');
  if (difficulty === 'easy') pts.push('충분히 달성 가능한 목표입니다. 조금 더 높은 목표에 도전해보는 것도 좋습니다.');
  if (v.weeklyKm < 30 && (v.targetDistance === 'half' || v.targetDistance === 'full')) pts.push('주간 러닝 거리가 적습니다. 점진적으로 늘려 유산소 기반을 강화하세요.');
  if (v.weeksLeft <= 6) pts.push(`대회까지 ${v.weeksLeft}주 남았습니다. 강도보다 컨디션 관리에 집중하세요.`);
  else if (v.weeksLeft >= 16) pts.push('훈련 기간이 충분합니다. 체계적인 빌드업으로 실력을 끌어올리세요.');
  if (parseInt(v.runsPerWeek) <= 2) pts.push('주 3회 이상 훈련 시 기록 향상 효과가 크게 높아집니다.');
  if (v.injury === 'yes') pts.push('부상 회복이 최우선입니다. 통증 없는 범위에서만 훈련하세요.');
  else pts.push({ '5k': '스피드 훈련과 스트라이드 드릴로 달리기 효율을 높이세요.', '10k': '인터벌 훈련으로 VO2max를 높이면 빠른 기록 단축이 가능합니다.', 'half': '템포런으로 젖산 역치 페이스를 끌어올리는 것이 핵심입니다.', 'full': '주 1회 30km 이상 롱런이 풀마라톤 완주 능력의 핵심입니다.' }[v.targetDistance] || '꾸준한 훈련과 충분한 회복이 기록 단축의 핵심입니다.');
  return pts;
}
function makePlan(v, calc) {
  const { easyPace, tempoPace, intervalPace, longRunPace, recoveryPace } = calc;
  const runs = parseInt(v.runsPerWeek), wkm = v.weeklyKm || defaultWeeklyKm(v.targetDistance), inj = v.injury === 'yes';
  const REST = (d, a, desc='완전한 휴식 또는 스트레칭') => ({ day:d, abbr:a, type:'rest', badge:'b-rest', name:'휴식', desc, pace:null, km:null });
  const EASY = (d, a, km, desc='편안한 대화 가능 페이스') => ({ day:d, abbr:a, type:'easy', badge:'b-easy', name:'이지런', desc, pace:easyPace, km });
  const TEMPO = (d, a, km) => ({ day:d, abbr:a, type:'tempo', badge:'b-tempo', name:'템포런', desc:'지속 가능한 불편한 페이스 (20~40분)', pace:tempoPace, km });
  const INTERVAL = (d, a, km) => ({ day:d, abbr:a, type:'interval', badge:'b-interval', name:'인터벌', desc:'400m~1km 반복, 충분한 휴식 포함', pace:intervalPace, km });
  const LONGRUN = (d, a, km) => ({ day:d, abbr:a, type:'longrun', badge:'b-longrun', name:'롱런', desc:'여유 있는 대화 페이스 유지', pace:longRunPace, km });
  const RECOVERY = (d, a, km) => ({ day:d, abbr:a, type:'recovery', badge:'b-recovery', name:'회복 조깅', desc:'매우 가볍게, 30분 이내', pace:recoveryPace, km });
  if (inj) return [
    REST('월','MON','완전 휴식 및 아이싱'), EASY('화','TUE',Math.max(5,Math.round(wkm*.2)),'통증 없는 범위의 가벼운 조깅'),
    REST('수','WED','스트레칭 및 폼롤러'), RECOVERY('목','THU',Math.max(4,Math.round(wkm*.15))),
    REST('금','FRI','완전 휴식'), EASY('토','SAT',Math.max(8,Math.round(wkm*.3)),'통증 없는 편안한 달리기'),
    REST('일','SUN','완전 휴식 또는 산책')
  ];
  const lkm = Math.max(10,Math.round(wkm*.38)), ekm = Math.max(6,Math.round(wkm*.22)), tkm = Math.max(6,Math.round(wkm*.20)), ikm = Math.max(5,Math.round(wkm*.13)), rkm = Math.max(4,Math.round(wkm*.10));
  if (runs <= 2) return [REST('월','MON'),REST('화','TUE'),EASY('수','WED',Math.round(wkm*.40)),REST('목','THU'),REST('금','FRI','롱런 전날 휴식'),LONGRUN('토','SAT',Math.round(wkm*.60)),REST('일','SUN')];
  if (runs === 3) return [REST('월','MON'),REST('화','TUE'),EASY('수','WED',ekm),TEMPO('목','THU',tkm),REST('금','FRI','롱런 전날 휴식'),LONGRUN('토','SAT',lkm),REST('일','SUN')];
  if (runs === 4) return [REST('월','MON'),INTERVAL('화','TUE',ikm),EASY('수','WED',ekm),TEMPO('목','THU',tkm),REST('금','FRI','롱런 전날 휴식'),LONGRUN('토','SAT',lkm),REST('일','SUN')];
  return [REST('월','MON'),INTERVAL('화','TUE',ikm),EASY('수','WED',ekm),TEMPO('목','THU',tkm),REST('금','FRI','롱런 전날 휴식'),LONGRUN('토','SAT',lkm),RECOVERY('일','SUN',rkm)];
}
function defaultWeeklyKm(d) { return { '5k':25, '10k':35, 'half':50, 'full':60 }[d] || 40; }
function makeStrategy(v, calc) {
  const { tDist, tPace } = calc;
  const zones = [
    { label:'초반 30%', range:`0–${(tDist*.3).toFixed(1)}km`, pace:fmtPace(tPace+7.5), tag:'여유있게 시작' },
    { label:'중반 50%', range:`${(tDist*.3).toFixed(1)}–${(tDist*.8).toFixed(1)}km`, pace:fmtPace(tPace), tag:'목표 페이스' },
    { label:'후반 20%', range:`${(tDist*.8).toFixed(1)}–${tDist.toFixed(1)}km`, pace:'빌드업 ↑', tag:'여유 시 가속' }
  ];
  const supply = {
    '5k':  [{ icon:'💧', text:'보급보다 페이스 안정에 집중하세요.' }, { icon:'🏃', text:'출발 전 200~300ml 수분 섭취 후 레이스 진행' }],
    '10k': [{ icon:'💧', text:'출발 전 300~400ml 수분 섭취' }, { icon:'🥤', text:'5km 지점 급수대에서 소량(100ml) 섭취' }],
    'half':[{ icon:'💧', text:'급수대마다 100~150ml 규칙적으로 섭취' }, { icon:'🍬', text:'40~50분마다 에너지 젤 1개 (총 1~2개 준비)' }, { icon:'🎯', text:'8~10km 지점에서 첫 번째 보급 시작 권장' }],
    'full':[{ icon:'💧', text:'급수대마다 소량씩 꾸준히 섭취' }, { icon:'🍬', text:'30~40분마다 에너지 젤 1개 (총 4~5개 준비)' }, { icon:'🧂', text:'후반부 전해질 보충 — 소금 정제 또는 스포츠음료' }, { icon:'⚠️', text:'30km 이후 근육 경련 대비 마그네슘 준비 권장' }]
  };
  return { zones, supply: supply[v.targetDistance] };
}
// ═══════════════════════════════════════════════
//  GEAR RECOMMENDATIONS
// ═══════════════════════════════════════════════

const GEAR_RECS = [
  {
    tier: 'budget',
    label: '입문  ~10만원',
    tagline: '처음 시작이라면 여기서 충분',
    cls: 'gear-budget',
    items: [
      { icon:'👟', cat:'러닝화', name:'아식스 GEL-CONTEND 8 / 뉴발란스 680v8', price:'6~9만원', tip:'쿠션·내구성 검증된 입문 스테디셀러. 관절 충격 흡수에 충실' },
      { icon:'👕', cat:'웨어', name:'데카트론 키프런 드라이핏 세트', price:'1~3만원/개', tip:'해외 브랜드 대비 70% 저렴. 땀 배출과 봉제 품질 모두 합격점' },
      { icon:'📱', cat:'기록 앱', name:'Nike Run Club / Strava 무료 플랜', price:'무료', tip:'GPS·페이스·훈련 히스토리 전부 무료. 입문자에게 충분한 기능 제공' },
    ]
  },
  {
    tier: 'mid',
    label: '중급  10~30만원',
    tagline: '기록 단축을 진지하게 노린다면',
    cls: 'gear-mid',
    items: [
      { icon:'👟', cat:'훈련화', name:'나이키 페가수스 41 / 아식스 GT-2000 13', price:'14~19만원', tip:'주 5회 이상 고강도 훈련에도 6개월 이상 버티는 범용 훈련화의 정석' },
      { icon:'⌚', cat:'GPS 시계', name:'가민 포러너 55 / 애플워치 SE 2세대', price:'18~25만원', tip:'심박수+GPS 실시간 페이스. 훈련 데이터가 쌓일수록 성장 속도 가속' },
      { icon:'🧴', cat:'영양·보조', name:'카보젤 에너지젤 + 하이포토닉 전해질 정제', price:'3~5만원/월', tip:'하프 이상 레이스에서 30~40분마다 보급. 후반 에너지 고갈 방지의 핵심' },
    ]
  },
  {
    tier: 'pro',
    label: '프로  30만원+',
    tagline: 'PB를 깨는 도구에 투자할 준비가 됐다면',
    cls: 'gear-pro',
    items: [
      { icon:'🏆', cat:'카본 레이싱화', name:'나이키 알파플라이 3 / 아디다스 아디오스 프로 3', price:'30~50만원', tip:'탄소섬유판 반발력으로 마라톤 기록 1~4% 향상이 연구로 입증. 레이스 전용 사용 권장' },
      { icon:'⌚', cat:'고급 GPS', name:'가민 포러너 265 / 코로스 페이스 3', price:'35~55만원', tip:'VO2max 추정·훈련 부하·회복 시간 자동 분석. 스마트 코치 수준의 피드백 제공' },
      { icon:'💆', cat:'회복 도구', name:'하이퍼볼트 마사지건 / CEP 컴프레션 타이츠', price:'10~30만원', tip:'근육 피로 회복 단축 효과. 주 5회 이상 고강도 훈련 시 부상 예방에 큰 차이' },
    ]
  }
];

// ═══════════════════════════════════════════════
//  YOUTUBE CHANNELS
// ═══════════════════════════════════════════════

const YOUTUBE_CHANNELS = [
  {
    flag: '🇰🇷', name: 'RUNUP TV · 런업TV', level: '모든 레벨',
    tags: ['러닝화 리뷰', '기어 비교', '장비 추천'],
    desc: '국내 유일 러닝 기어 전문 채널. 러닝화·GPS 시계·웨어를 소비자 관점에서 심층 리뷰. 실버버튼(구독자 10만) 달성. 장비 구매 전 반드시 확인해야 할 채널.',
    url: 'https://www.youtube.com/channel/UCGDGw1dMotpPPWXC6ee_cZA'
  },
  {
    flag: '🇰🇷', name: '둥근해혁', level: '중급~고급',
    tags: ['서브3 도전', '풀마라톤', '훈련 일지'],
    desc: '2024년 달리기 시작 → 1년 만에 동아마라톤 서브-3 달성. 일반인이 어떻게 서브-3까지 성장하는지 단계별로 보여주는 현실 밀착 훈련 일지. 동기부여 최강.',
    url: 'https://www.youtube.com/channel/UCmBnO3MHj4byRpqJwuwwcpg'
  },
  {
    flag: '🇰🇷', name: 'Sub3 TV', level: '중급~고급',
    tags: ['풀마라톤', '서브3', '레이스 현장'],
    desc: '마라톤 서브-3 도전 전문 채널. 실전 레이스 페이스 영상과 서브-3 달성 스토리가 풍부. 서브-3·3.5를 목표로 하는 마라토너에게 실질적 자극이 되는 콘텐츠.',
    url: 'https://www.youtube.com/@KimKiWon'
  },
  {
    flag: '🌐', name: 'The Running Channel', level: '초급~중급',
    tags: ['훈련 팁', '러닝화 리뷰', '대회 정보'],
    desc: 'UK 기반 글로벌 채널, 구독자 80만+. 입문자부터 서브-3 도전자까지 모든 레벨의 훈련 팁·기어 리뷰·레이스 도전 영상. 유튜브 자동 자막으로 내용 파악 가능.',
    url: 'https://www.youtube.com/@runningchannel'
  },
  {
    flag: '🌐', name: 'Vo2maxProductions', level: '중급~고급',
    tags: ['VO2max', '인터벌 과학', '훈련 원리'],
    desc: '미국 프로 마라토너 Sage Canaday(보스턴 마라톤 Top16 · 2:16) 직접 운영. VO2max 향상·인터벌 설계·부상 예방의 과학적 원리를 가장 체계적으로 설명하는 채널.',
    url: 'https://www.youtube.com/@Vo2maxProductions'
  },
  {
    flag: '🌐', name: 'kofuzi', level: '초급~중급',
    tags: ['훈련 일지', '마라톤', '러닝화 리뷰'],
    desc: '커뮤니티 러너 Michael Ko 운영, 구독자 23만+. 서브-3·보스턴 마라톤 도전 과정을 솔직하게 담은 브이로그. 러닝화 리뷰도 탁월해 입문자에게 특히 추천.',
    url: 'https://www.youtube.com/@kofuzi'
  }
];

function renderGearRecs(targetDist) {
  const highlight = { '5k':'mid', '10k':'mid', 'half':'pro', 'full':'pro' };
  const recTier = highlight[targetDist] || 'mid';
  return GEAR_RECS.map(tier => `
    <div class="gear-tier${tier.tier === recTier ? ' gear-tier-hl' : ''}">
      <div class="gear-tier-hd">
        <span class="gear-tier-label ${tier.cls}">${tier.label}</span>
        ${tier.tier === recTier ? '<span class="gear-rec-badge">목표 거리 추천</span>' : ''}
      </div>
      <div class="gear-tagline">${tier.tagline}</div>
      <div class="gear-items">
        ${tier.items.map(item => `
          <div class="gear-item">
            <div class="gear-item-row">
              <span class="gear-icon">${item.icon}</span>
              <div class="gear-item-body">
                <div class="gear-cat">${item.cat} <span class="gear-price">${item.price}</span></div>
                <div class="gear-name">${item.name}</div>
              </div>
            </div>
            <div class="gear-tip">${item.tip}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function renderYouTubeChannels() {
  return `<div class="yt-list">${YOUTUBE_CHANNELS.map(ch => `
    <div class="yt-card">
      <div class="yt-card-hd">
        <span class="yt-flag">${ch.flag}</span>
        <div class="yt-meta">
          <span class="yt-name">${ch.name}</span>
          <span class="yt-level">${ch.level}</span>
        </div>
        <div class="yt-tags">${ch.tags.map(t => `<span class="yt-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="yt-desc">${ch.desc}</div>
      <a class="btn-yt" href="${ch.url}" target="_blank" rel="noopener">▶ 유튜브에서 보기</a>
    </div>`).join('')}</div>`;
}

const DIFF_META = {
  easy:    { label:'쉬움',  cls:'diff-easy',      sub:'현재 실력으로 충분히 달성 가능' },
  normal:  { label:'적정',  cls:'diff-normal',    sub:'현재 실력에 딱 맞는 목표' },
  challenge:{ label:'도전', cls:'diff-challenge', sub:'훈련하면 달성 가능한 목표' },
  hard:    { label:'무리',  cls:'diff-hard',      sub:'목표 수준 재조정 권장' },
  unknown: { label:'--',    cls:'',               sub:'최근 기록 입력 시 계산 가능' }
};
function renderGoalResults(v, calc, plan, strat) {
  $('rTargetPace').textContent = fmtPace(calc.tPace);
  if (calc.predictedSec) {
    $('rPredicted').textContent = fmtTime(calc.predictedSec);
    const diff = Math.round((calc.predictedSec - calc.tSec) / 60);
    $('rPredictedSub').textContent = `예상 대비 ${diff >= 0 ? '+' : ''}${diff}분`;
  } else {
    $('rPredicted').textContent = '기록 없음'; $('rPredictedSub').textContent = '최근 기록 입력 시 계산';
  }
  const dm = DIFF_META[calc.difficulty];
  $('rDifficulty').textContent = dm.label; $('rDifficulty').className = `stat-value ${dm.cls}`; $('rDifficultySub').textContent = dm.sub;
  $('rProbability').textContent = `${calc.probability}%`;
  $('rWeeklyDist').textContent = calc.recDist;
  $('rKeyPoints').innerHTML = calc.keyPoints.map(t => `<div class="kp-item"><span class="kp-arrow">→</span><span>${t}</span></div>`).join('');
  $('rEasy').textContent = fmtPace(calc.easyPace); $('rTempo').textContent = fmtPace(calc.tempoPace);
  $('rInterval').textContent = fmtPace(calc.intervalPace); $('rLongRun').textContent = fmtPace(calc.longRunPace);
  $('injuryAlert').classList.toggle('hidden', v.injury !== 'yes');
  $('weeklyPlan').innerHTML = plan.map(d => `
    <div class="day-row t-${d.type}">
      <div class="day-abbr">${d.abbr}</div>
      <div class="day-badge ${d.badge}">${d.name}</div>
      <div class="day-info"><div class="day-name">${d.name}</div><div class="day-desc">${d.desc}</div></div>
      ${d.pace ? `<div class="day-meta"><div class="day-pace">${fmtPace(d.pace)}/km</div><div class="day-km">${d.km ? d.km+'km' : ''}</div></div>` : ''}
    </div>`).join('');
  $('raceStrategy').innerHTML = `
    <div class="strat-section">
      <div class="strat-title">📍 ${DIST_LABEL[v.targetDistance]} 페이스 전략</div>
      <div class="zone-row">${strat.zones.map(z => `<div class="zone-card"><div class="zone-label">${z.label}</div><div class="zone-range">${z.range}</div><div class="zone-pace">${z.pace}</div><div class="zone-tag">${z.tag}</div></div>`).join('')}</div>
    </div>
    <div class="strat-section">
      <div class="strat-title">🥤 보급 전략</div>
      <ul class="supply-list">${strat.supply.map(s => `<li class="supply-item"><span class="s-icon">${s.icon}</span><span>${s.text}</span></li>`).join('')}</ul>
    </div>`;
  $('gearRecs').innerHTML = renderGearRecs(v.targetDistance);
  $('ytChannels').innerHTML = renderYouTubeChannels();
  $('results').classList.remove('hidden');
  setTimeout(() => $('results').scrollIntoView({ behavior:'smooth', block:'start' }), 60);
}
function onGenerate() {
  const errEl = $('errorMsg'); errEl.classList.add('hidden');
  const v = getGoalValues(); saveGoal(v);
  const err = validateGoal(v);
  if (err) { errEl.textContent = err; errEl.classList.remove('hidden'); errEl.scrollIntoView({ behavior:'smooth', block:'nearest' }); return; }
  const calc = calcGoal(v);
  renderGoalResults(v, calc, makePlan(v, calc), makeStrategy(v, calc));
}
function onReset() {
  localStorage.removeItem(LS_GOAL); applyGoalValues(SAMPLE_GOAL);
  $('results').classList.add('hidden'); $('errorMsg').classList.add('hidden');
  window.scrollTo({ top:0, behavior:'smooth' });
}

// ═══════════════════════════════════════════════
//  SAVED PLANS & CHECKLIST
// ═══════════════════════════════════════════════

function loadPlans()       { try { return JSON.parse(localStorage.getItem(LS_PLANS)) || []; } catch(_){ return []; } }
function storePlans(arr)   { try { localStorage.setItem(LS_PLANS, JSON.stringify(arr)); return true; } catch(e){ alert('저장 실패: ' + e.message); return false; } }

let _activePlanId = null;
let _planWeeks    = {};

function onSavePlan() {
  const v = getGoalValues();
  const err = validateGoal(v);
  if (err) { alert(err); return; }
  const calc = calcGoal(v);
  const template = makePlan(v, calc);
  const plans = loadPlans();
  const plan = {
    id: Date.now(),
    savedAt: todayStr(),
    label: `${DIST_LABEL[v.targetDistance]} ${fmtTime(calc.tSec)} 도전`,
    goalValues: v,
    paces: { easy:calc.easyPace, tempo:calc.tempoPace, interval:calc.intervalPace, longrun:calc.longRunPace, recovery:calc.recoveryPace },
    weeklyTemplate: template,
    weeksLeft: v.weeksLeft,
    completions: {}
  };
  plans.unshift(plan);
  if (storePlans(plans)) {
    showToast('✅ 훈련 플랜 저장 완료!');
    renderSavedPlans();
    setTimeout(() => $('savedPlansSection').scrollIntoView({ behavior:'smooth', block:'start' }), 120);
  }
}

function onDeletePlan(id) {
  if (!confirm('이 훈련 플랜을 삭제할까요?')) return;
  storePlans(loadPlans().filter(p => p.id !== id));
  if (_activePlanId === id) _activePlanId = null;
  renderSavedPlans();
}

function togglePlanChecklist(id) {
  _activePlanId = (_activePlanId === id) ? null : id;
  if (_activePlanId && !_planWeeks[id]) {
    const plan = loadPlans().find(p => p.id === id);
    if (plan) {
      const days = Math.max(0, Math.floor((new Date() - new Date(plan.savedAt + 'T00:00:00')) / 86400000));
      _planWeeks[id] = Math.min(Math.floor(days / 7) + 1, plan.weeksLeft);
    }
  }
  renderSavedPlans();
}

function setActiveWeek(planId, week) {
  _planWeeks[planId] = week;
  renderSavedPlans();
}

function toggleCompletion(planId, key) {
  const plans = loadPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;
  if (!plan.completions) plan.completions = {};
  if (plan.completions[key]) { delete plan.completions[key]; }
  else { plan.completions[key] = { date: todayStr() }; }
  storePlans(plans);
  renderSavedPlans();
}

function renderSavedPlans() {
  const plans = loadPlans();
  if (!$('savedPlansSection')) return;
  $('savedPlansEmpty').classList.toggle('hidden', plans.length > 0);
  $('savedPlansList').classList.toggle('hidden', plans.length === 0);
  $('savedPlansList').innerHTML = plans.map(p => renderSavedPlanCard(p)).join('');
}

function renderSavedPlanCard(plan) {
  const comp    = plan.completions || {};
  const tmpl    = plan.weeklyTemplate;
  const actDays = tmpl.filter(d => d.type !== 'rest').length;
  const totalSlots = plan.weeksLeft * actDays;
  const doneCount  = Object.keys(comp).length;
  const pct = totalSlots > 0 ? Math.min(100, Math.round(doneCount / totalSlots * 100)) : 0;
  const startDate  = new Date(plan.savedAt + 'T00:00:00');
  const daysPassed = Math.max(0, Math.floor((new Date() - startDate) / 86400000));
  const curWeek    = Math.min(Math.floor(daysPassed / 7) + 1, plan.weeksLeft);
  const isOpen     = _activePlanId === plan.id;
  const dispWeek   = _planWeeks[plan.id] || curWeek;

  return `
    <div class="sp-card">
      <div class="sp-header">
        <div class="sp-info">
          <div class="sp-title">🎯 ${plan.label}</div>
          <div class="sp-meta">${fmtDate(plan.savedAt)} 저장 · ${plan.weeksLeft}주 플랜 · 현재 <b>${curWeek}주차</b></div>
          <div class="sp-prog-wrap"><div class="sp-prog-bar" style="width:${pct}%"></div></div>
          <div class="sp-prog-label">완료 ${doneCount}회 · ${pct}% 달성</div>
        </div>
        <div class="sp-btns">
          <button class="btn-sp-cl${isOpen ? ' sp-open' : ''}" onclick="togglePlanChecklist(${plan.id})">${isOpen ? '▲ 닫기' : '📋 체크리스트'}</button>
          <button class="btn-sp-del" onclick="onDeletePlan(${plan.id})">✕</button>
        </div>
      </div>
      ${isOpen ? renderChecklist(plan, dispWeek) : ''}
    </div>`;
}

function renderChecklist(plan, weekNum) {
  const w    = weekNum;
  const tw   = plan.weeksLeft;
  const comp = plan.completions || {};
  const tmpl = plan.weeklyTemplate;

  let wStart = Math.max(1, w - 2);
  let wEnd   = Math.min(tw, wStart + 4);
  if (wEnd - wStart < 4) wStart = Math.max(1, wEnd - 4);

  const actDays = tmpl.filter(d => d.type !== 'rest').length;
  const wkBtns = [];
  for (let i = wStart; i <= wEnd; i++) {
    const wDone = tmpl.filter((_, j) => comp[`w${i}_d${j}`]).length;
    wkBtns.push(`<button class="wb${i === w ? ' wb-a' : ''}" onclick="setActiveWeek(${plan.id},${i})">W${i}<span class="wb-s">${wDone}/${actDays}</span></button>`);
  }

  const weekDone = tmpl.filter((_, j) => comp[`w${w}_d${j}`]).length;

  const dayRows = tmpl.map((day, idx) => {
    const key  = `w${w}_d${idx}`;
    const done = !!comp[key];
    const isRest = day.type === 'rest';
    return `
      <div class="cl-row${done ? ' cl-done' : ''}${isRest ? ' cl-rest' : ''}">
        <label class="cl-cb">
          <input type="checkbox" ${done ? 'checked' : ''} onchange="toggleCompletion(${plan.id},'${key}')">
          <span class="cl-box"></span>
        </label>
        <span class="cl-abbr">${day.abbr}</span>
        <span class="cl-badge ${day.badge}">${day.name}</span>
        <span class="cl-detail">${day.pace ? fmtPace(day.pace)+'/km' : ''}${day.km ? ' · '+day.km+'km' : ''}</span>
        ${done && comp[key]?.date ? `<span class="cl-date">${fmtDate(comp[key].date)}</span>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="cl-wrap">
      <div class="cl-nav-row">
        ${w > 1  ? `<button class="cl-arr" onclick="setActiveWeek(${plan.id},${w-1})">◀</button>` : '<span></span>'}
        <div class="cl-wbtns">${wkBtns.join('')}</div>
        ${w < tw ? `<button class="cl-arr" onclick="setActiveWeek(${plan.id},${w+1})">▶</button>` : '<span></span>'}
      </div>
      <div class="cl-week-hd">Week ${w} <span class="cl-wof">/ ${tw}주</span> <span class="cl-wdone">${weekDone} / ${tmpl.length}일 완료</span></div>
      <div class="cl-days">${dayRows}</div>
    </div>`;
}

// ═══════════════════════════════════════════════
//  RUNNING LOG (Tab 2)
// ═══════════════════════════════════════════════

function updateAutoPace() {
  const km = parseFloat($('logKm').value) || 0;
  const sec = (parseInt($('logHour').value)||0)*3600 + (parseInt($('logMin').value)||0)*60 + (parseInt($('logSec').value)||0);
  $('autoPaceVal').textContent = (km > 0 && sec > 0) ? fmtPace(sec/km) : '--:--';
}

function initLogForm() {
  $('logDate').value = todayStr();
  ['logKm','logHour','logMin','logSec'].forEach(id => $(id).addEventListener('input', updateAutoPace));
}

function getLogFormValues() {
  const km = parseFloat($('logKm').value) || 0;
  const h = parseInt($('logHour').value)||0, m = parseInt($('logMin').value)||0, s = parseInt($('logSec').value)||0;
  const totalSec = h*3600 + m*60 + s;
  return {
    id: Date.now(),
    date: $('logDate').value,
    km,
    hours: h, minutes: m, seconds: s,
    totalSec,
    pace: km > 0 && totalSec > 0 ? totalSec / km : 0,
    course: $('logCourse').value.trim(),
    type: $('logType').value,
    rpe: parseInt($('logRpe').value),
    condition: document.querySelector('input[name="logCondition"]:checked')?.value || '보통',
    memo: $('logMemo').value.trim()
  };
}

function validateLog(v) {
  if (!v.date) return '날짜를 입력해주세요.';
  if (v.km <= 0 || v.km > 200) return '올바른 거리(km)를 입력해주세요.';
  if (v.totalSec <= 0) return '기록 시간을 입력해주세요.';
  const pace = v.pace;
  if (pace < 120 || pace > 1800) return '페이스가 유효 범위를 벗어났습니다 (2:00~30:00/km).';
  return null;
}

function clearLogForm() {
  $('logDate').value = todayStr(); $('logKm').value = '';
  $('logHour').value = ''; $('logMin').value = ''; $('logSec').value = '';
  $('logCourse').value = ''; $('logType').value = 'Easy';
  $('logRpe').value = '5'; document.querySelector('input[name="logCondition"][value="좋음"]').checked = true;
  $('logMemo').value = ''; $('autoPaceVal').textContent = '--:--';
}

function onSaveRun() {
  const v = getLogFormValues();
  const err = validateLog(v);
  if (err) { alert(err); return; }
  const runs = loadRuns();
  runs.unshift(v);
  const ok = saveRuns(runs);
  if (!ok) return;
  clearLogForm();
  $('addRunForm').classList.add('hidden');
  $('toggleAddRun').textContent = '＋ 기록 추가';
  renderLog();
  showToast('✅ 기록이 저장됐어요!');
}

function onDeleteRun(id) {
  if (!confirm('이 기록을 삭제할까요?')) return;
  saveRuns(loadRuns().filter(r => r.id !== id));
  renderLog();
}

function onClearAllRuns() {
  if (!confirm('모든 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
  saveRuns([]);
  renderLog();
}

// ── Analytics ──────────────────────────────────

function calcStats(runs) {
  if (!runs.length) return null;
  const now = new Date();
  const totalKm = runs.reduce((s,r) => s + r.km, 0);
  const totalSec = runs.reduce((s,r) => s + r.totalSec, 0);
  const avgPace = totalSec / totalKm;
  const longestKm = Math.max(...runs.map(r => r.km));
  const fastestPace = Math.min(...runs.filter(r => r.pace > 0).map(r => r.pace));
  const last7 = runs.filter(r => daysBetween(new Date(r.date + 'T00:00:00'), now) <= 7).reduce((s,r) => s+r.km, 0);
  const last30 = runs.filter(r => daysBetween(new Date(r.date + 'T00:00:00'), now) <= 30).reduce((s,r) => s+r.km, 0);
  const thisMonth = runs.filter(r => { const d = new Date(r.date + 'T00:00:00'); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).reduce((s,r) => s+r.km, 0);
  const typeCounts = {}; runs.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '--';
  const avgRpe = runs.filter(r => r.rpe > 0).reduce((s,r) => s+r.rpe, 0) / runs.filter(r => r.rpe > 0).length;
  return { totalKm, avgPace, longestKm, fastestPace, last7, last30, thisMonth, topType, avgRpe };
}

function calcPBs(runs) {
  const pbs = { '1K': null, '5K': null, '10K': null, '하프': null, '풀': null };
  const ranges = { '5K': [4.75,5.25], '10K': [9.5,10.5], '하프': [20,22.2], '풀': [40,44] };
  Object.entries(ranges).forEach(([label, [lo, hi]]) => {
    const matching = runs.filter(r => r.km >= lo && r.km <= hi);
    if (matching.length) {
      const best = matching.reduce((a,b) => a.totalSec < b.totalSec ? a : b);
      pbs[label] = { time: best.totalSec, date: best.date };
    }
  });
  // 1K PB: runs where km is 0.9-1.1
  const oneK = runs.filter(r => r.km >= 0.9 && r.km <= 1.1);
  if (oneK.length) { const best = oneK.reduce((a,b) => a.totalSec < b.totalSec ? a : b); pbs['1K'] = { time: best.totalSec, date: best.date }; }
  return pbs;
}

function generateInsights(runs) {
  if (runs.length < 3) return [{ icon:'💡', text:'기록을 3개 이상 추가하면 성장 분석이 시작됩니다.' }];
  const insights = [];
  const now = new Date();
  const inDays = (r, days) => daysBetween(new Date(r.date + 'T00:00:00'), now) <= days;
  const recent30 = runs.filter(r => inDays(r, 30));
  const prev30 = runs.filter(r => { const d = daysBetween(new Date(r.date + 'T00:00:00'), now); return d > 30 && d <= 60; });
  const r30km = recent30.reduce((s,r) => s+r.km, 0);
  const p30km = prev30.reduce((s,r) => s+r.km, 0);
  if (p30km > 0) {
    if (r30km > p30km * 1.1) insights.push({ icon:'📈', text:`최근 30일 누적 거리(${r30km.toFixed(0)}km)가 이전 30일 대비 증가하고 있어요.` });
    else if (r30km < p30km * 0.8) insights.push({ icon:'📉', text:`최근 30일 훈련량이 이전 대비 감소했어요. 부상이나 과훈련 여부를 확인해보세요.` });
  }
  const highRpe = recent30.filter(r => r.rpe >= 8);
  if (recent30.length > 0 && highRpe.length / recent30.length > 0.4) insights.push({ icon:'🔥', text:'최근 고강도 훈련 비중이 높아요. Recovery Run 비중을 늘려보세요.' });
  const longRunPct = runs.filter(r => r.type === 'Long Run').length / runs.length;
  if (longRunPct < 0.1 && runs.length >= 5) insights.push({ icon:'🏃', text:'Long Run 비중이 낮아 하프/풀 준비에는 지구력 훈련이 부족할 수 있어요.' });
  const tempoPct = runs.filter(r => r.type === 'Tempo').length / runs.length;
  if (tempoPct < 0.1 && runs.length >= 5) insights.push({ icon:'⚡', text:'Tempo Run 기록이 부족해 목표 페이스 적응력이 낮을 수 있어요.' });
  const badCondHighRpe = runs.filter(r => r.condition === '나쁨' && r.rpe >= 7);
  if (badCondHighRpe.length >= 2) insights.push({ icon:'😴', text:'컨디션이 나쁜 날에도 고강도 훈련이 보이네요. 수면과 회복을 우선시하세요.' });
  const typeSet = new Set(runs.map(r => r.type));
  if (typeSet.size === 1) insights.push({ icon:'🔄', text:'다양한 훈련 타입을 섞어보세요. Easy, Tempo, Long Run 조합이 균형 잡힌 훈련의 기본입니다.' });
  if (!insights.length) insights.push({ icon:'✅', text:'훈련이 균형 잡혀 있어요. 꾸준히 유지하면서 점진적으로 거리를 늘려보세요!' });
  return insights;
}

// ── Charts ─────────────────────────────────────

const TYPE_COLORS = {
  'Easy':'#4fc3f7','Tempo':'#ffa726','Interval':'#ef5350',
  'Long Run':'#ab47bc','Race':'#ff5252','Recovery':'#66bb6a'
};
let _charts = {};

const CHART_BASE = {
  responsive: true, maintainAspectRatio: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid:{ color:'rgba(255,255,255,.06)' }, ticks:{ color:'#888899', font:{ size:11 } } },
    y: { grid:{ color:'rgba(255,255,255,.06)' }, ticks:{ color:'#888899', font:{ size:11 } } }
  }
};

function destroyChart(id) { if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; } }

function buildWeeklyChart(runs) {
  destroyChart('weekly');
  const ctx = $('chartWeekly'); if (!ctx) return;
  const map = {};
  runs.forEach(r => {
    const d = new Date(r.date + 'T00:00:00');
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() + diff);
    const k = mon.toISOString().split('T')[0];
    map[k] = (map[k] || 0) + r.km;
  });
  const sorted = Object.entries(map).sort((a,b) => a[0].localeCompare(b[0])).slice(-12);
  const labels = sorted.map(([k]) => { const d = new Date(k+'T00:00:00'); return `${d.getMonth()+1}/${d.getDate()}`; });
  const data   = sorted.map(([,v]) => Math.round(v * 10) / 10);
  _charts.weekly = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor:'rgba(0,255,136,.2)', borderColor:'#00ff88', borderWidth:1.5, borderRadius:4 }] },
    options: { ...CHART_BASE, aspectRatio:2.2,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: c => c.parsed.y + ' km' } } },
      scales:{ ...CHART_BASE.scales, y:{ ...CHART_BASE.scales.y, beginAtZero:true, ticks:{ color:'#888899', font:{size:11}, callback: v => v+'km' } } }
    }
  });
}

function buildPaceChart(runs) {
  destroyChart('pace');
  const ctx = $('chartPace'); if (!ctx) return;
  const valid = [...runs].filter(r => r.pace > 120 && r.pace < 1200).slice(0,30).reverse();
  if (valid.length < 2) return;
  const labels = valid.map(r => { const d = new Date(r.date+'T00:00:00'); return `${d.getMonth()+1}/${d.getDate()}`; });
  const data   = valid.map(r => Math.round(r.pace / 6) / 10);
  const fmtV   = v => { const m=Math.floor(v), s=Math.round((v-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
  _charts.pace = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,.1)', borderWidth:2, tension:0.35, pointRadius:3, pointBackgroundColor:'#60a5fa', fill:true }] },
    options: { ...CHART_BASE, aspectRatio:2.2,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: c => fmtV(c.parsed.y)+'/km' } } },
      scales:{ ...CHART_BASE.scales, y:{ ...CHART_BASE.scales.y, reverse:true, ticks:{ color:'#888899', font:{size:11}, callback: fmtV } } }
    }
  });
}

function buildTypeChart(runs) {
  destroyChart('type');
  const ctx = $('chartType'); if (!ctx) return;
  const counts = {};
  runs.forEach(r => { counts[r.type] = (counts[r.type]||0) + 1; });
  const labels = Object.keys(counts), data = Object.values(counts);
  const colors = labels.map(l => TYPE_COLORS[l] || '#888899');
  _charts.type = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors.map(c=>c+'55'), borderColor: colors, borderWidth:1.5, hoverOffset:6 }] },
    options: { responsive:true, maintainAspectRatio:true, aspectRatio:1.8,
      plugins:{
        legend:{ position:'right', labels:{ color:'#888899', font:{size:11}, boxWidth:12, padding:10 } },
        tooltip:{ callbacks:{ label: c => `${c.label} ${c.parsed}회` } }
      }
    }
  });
}

function initChartTabs(runs) {
  document.querySelectorAll('.ct-tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.ct-tab').forEach(b => b.classList.remove('ct-act'));
      document.querySelectorAll('.ct-pane').forEach(p => p.classList.add('hidden'));
      btn.classList.add('ct-act');
      $('ctPane-' + btn.dataset.t).classList.remove('hidden');
      if (btn.dataset.t === 'weekly') buildWeeklyChart(runs);
      else if (btn.dataset.t === 'pace') buildPaceChart(runs);
      else if (btn.dataset.t === 'type') buildTypeChart(runs);
    };
  });
}

function renderLog() {
  const runs = loadRuns();
  const hasRuns = runs.length > 0;
  $('logEmpty').classList.toggle('hidden', hasRuns);
  $('logDashboard').classList.toggle('hidden', !hasRuns);
  $('runListSection').classList.toggle('hidden', !hasRuns);
  if (!hasRuns) return;

  // Charts
  initChartTabs(runs);
  buildWeeklyChart(runs);

  // Stats
  const s = calcStats(runs);
  $('st-totalRuns').textContent = runs.length;
  $('st-totalKm').textContent = s.totalKm.toFixed(1);
  $('st-avgPace').textContent = fmtPace(s.avgPace) + '/km';
  $('st-longestKm').textContent = s.longestKm.toFixed(1);
  $('st-fastestPace').textContent = fmtPace(s.fastestPace) + '/km';
  $('st-last7').textContent = s.last7.toFixed(1);
  $('st-last30').textContent = s.last30.toFixed(1);
  $('st-thisMonth').textContent = s.thisMonth.toFixed(1);
  $('st-topType').textContent = s.topType;
  $('st-avgRpe').textContent = isNaN(s.avgRpe) ? '--' : s.avgRpe.toFixed(1);

  // PBs
  const pbs = calcPBs(runs);
  $('pbGrid').innerHTML = Object.entries(pbs).map(([dist, pb]) => `
    <div class="pb-card">
      <div class="pb-dist">${dist}</div>
      ${pb ? `<div class="pb-time">${fmtTime(pb.time)}</div><div class="pb-date">${fmtDate(pb.date)}</div>` : `<div class="pb-empty">--</div>`}
    </div>`).join('');

  // Insights
  const insights = generateInsights(runs);
  $('insightsList').innerHTML = insights.map(i => `
    <div class="insight-item">
      <div class="insight-icon">${i.icon}</div>
      <div class="insight-text">${i.text}</div>
    </div>`).join('');

  // Run list
  const typeBadgeClass = t => ({ 'Easy':'rt-Easy','Tempo':'rt-Tempo','Interval':'rt-Interval','Long Run':'rt-LongRun','Race':'rt-Race','Recovery':'rt-Recovery' }[t] || 'rt-Easy');
  const condIcon = c => ({ '좋음':'😊','보통':'😐','나쁨':'😞' }[c] || '😐');
  $('runList').innerHTML = runs.map(r => `
    <div class="run-card">
      <div class="run-card-header">
        <div class="run-card-left">
          <span class="run-date">${fmtDate(r.date)}</span>
          <span class="run-type-badge ${typeBadgeClass(r.type)}">${r.type}</span>
          <span class="run-rpe">RPE ${r.rpe}</span>
          <span class="run-condition">${condIcon(r.condition)}</span>
        </div>
        <button class="delete-run" onclick="onDeleteRun(${r.id})">✕</button>
      </div>
      <div class="run-stats">
        <div class="run-stat"><div class="run-stat-val hl">${r.km.toFixed(2)}</div><div class="run-stat-label">km</div></div>
        <div class="run-stat"><div class="run-stat-val">${fmtTime(r.totalSec)}</div><div class="run-stat-label">기록</div></div>
        <div class="run-stat"><div class="run-stat-val">${fmtPace(r.pace)}</div><div class="run-stat-label">/km</div></div>
      </div>
      <div class="run-meta">
        ${r.course ? `<div class="run-meta-item">📍 <span>${r.course}</span></div>` : ''}
        <div class="run-meta-item">컨디션 <span>${r.condition}</span></div>
      </div>
      ${r.memo ? `<div class="run-memo">${r.memo}</div>` : ''}
    </div>`).join('');
}

// ═══════════════════════════════════════════════
//  KNOWLEDGE LIBRARY (Tab 3)
// ═══════════════════════════════════════════════

const KNOWLEDGE = [
  // ── 호흡법 ──────────────────────────────────
  { id:'br1', cat:'breathing', catLabel:'호흡법', title:'기본 원칙',
    summary:'호흡을 억지로 조절하려 하지 말고 강도에 맞게 자연스럽게 흘려라',
    points:['코로만 숨 쉬려고 억지로 버티지 말 것','편안한 조깅은 코+입 혼합 호흡이 자연스럽다','고강도 구간은 입 호흡 비중이 자연스럽게 증가한다','어깨를 들썩이지 말고 복부와 갈비뼈가 확장되는 느낌','호흡이 무너지면 페이스가 과하다는 신호다'],
    tags:['호흡','기초','코','입','복식호흡'] },
  { id:'br2', cat:'breathing', catLabel:'호흡법', title:'리듬 호흡법',
    summary:'걸음 수에 맞춰 호흡 리듬을 만들면 페이스 컨트롤이 쉬워진다',
    points:['Easy Run: 3걸음 들이마시고 3걸음 내쉬기','Moderate Run: 2걸음 들이마시고 2걸음 내쉬기','Tempo / Race Pace: 2걸음 들이마시고 1~2걸음 내쉬기','Sprint / Interval: 짧고 빠르게, 자세가 무너지지 않는 범위'],
    tags:['호흡','리듬','페이스','이지런','템포','인터벌'] },
  { id:'br3', cat:'breathing', catLabel:'호흡법', title:'상황별 호흡 전략',
    summary:'오르막에서는 보폭을 줄이고 호흡 리듬을 최우선으로 지켜라',
    points:['초반: 숨이 편해야 정상 — 편하면 맞는 페이스다','오르막: 보폭 줄이고 호흡 리듬 우선 유지','후반: 팔치기와 호흡을 함께 정리하며 리듬 회복','숨이 턱 막힐 때: 30~60초 페이스를 낮춰 회복'],
    tags:['호흡','오르막','후반','전략','상황'] },
  { id:'br4', cat:'breathing', catLabel:'호흡법', title:'페이스 강도 체크법',
    summary:'대화 가능 여부가 가장 정확한 강도 측정 도구다',
    points:['Easy Run: 대화가 자연스럽게 이어져야 한다','Tempo Run: 짧은 문장만 말할 수 있는 정도','Race Pace: 통제된 불편함 — 호흡이 거칠지만 무너지지 않음','숨이 아니라 다리가 먼저 힘들어야 좋은 페이스 배분이다'],
    tags:['호흡','페이스','강도','대화','체크'] },
  // ── 초보자 ──────────────────────────────────
  { id:'beg1', cat:'beginner', catLabel:'초보자', title:'처음 달리기 시작하는 법',
    summary:'천천히, 자주, 즐겁게 — 빠른 것보다 꾸준한 것이 먼저다',
    points:['처음부터 빠르게 뛰지 말 것 — 심박이 안정적인 페이스부터','주 3회면 충분하다, 횟수보다 꾸준함이 핵심','걷기와 달리기를 번갈아 해도 훈련이다','부상 방지가 기록 향상보다 절대 우선','Easy Run 비중이 전체의 70~80%여야 한다'],
    tags:['초보자','시작','걷기','이지런','페이스','부상'] },
  { id:'beg2', cat:'beginner', catLabel:'초보자', title:'5K 완주 12주 플랜',
    summary:'걷기→달리기 인터벌로 시작해 12주 만에 5K 완주가 가능하다',
    points:['1~3주: 1분 달리기+2분 걷기 × 8세트, 주 3회','4~6주: 2분 달리기+1분 걷기 × 8세트','7~9주: 5분 달리기+1분 걷기 × 5세트','10~12주: 15분 → 20분 → 5K 완주 도전','페이스보다 지속 시간을 늘리는 것이 핵심'],
    tags:['초보자','5K','12주','걷기','달리기','플랜'] },
  // ── 10K ─────────────────────────────────────
  { id:'10k1', cat:'10k', catLabel:'10K 준비', title:'10K 핵심 전략',
    summary:'지속 가능한 페이스 감각을 먼저 키워야 한다',
    points:['핵심은 지속 가능한 페이스 감각이다','주 3~4회 훈련 권장','Easy Run + Tempo Run + Long Run 조합이 효과적','목표 페이스보다 빠른 인터벌은 주 1회 이하','레이스 초반 오버페이스는 후반 붕괴의 원인'],
    tags:['10K','페이스','인터벌','템포','오버페이스'] },
  { id:'10k2', cat:'10k', catLabel:'10K 준비', title:'서브-50 / 서브-45 공략',
    summary:'서브-50은 5:00/km, 서브-45는 4:30/km 페이스 유지가 핵심이다',
    points:['서브-50 (5:00/km): 템포런 5:10~5:20/km × 20분이 기준 훈련','서브-45 (4:30/km): 인터벌 400m × 8회, 목표 4:00~4:15/km','주간 40~50km, 주 2회 질주 훈련','레이스 초반 4~5km를 목표보다 3~5초 느리게','마지막 2km에서만 전력 질주'],
    tags:['10K','서브50','서브45','인터벌','템포런','페이스'] },
  // ── 하프마라톤 ───────────────────────────────
  { id:'h1', cat:'half', catLabel:'하프마라톤', title:'하프마라톤 준비 핵심',
    summary:'롱런 적응과 후반 5km 페이스 유지가 기록을 결정한다',
    points:['롱런이 가장 중요한 훈련이다','12~18km 롱런 적응이 필요하다','Tempo Run으로 목표 페이스 지속 능력 강화','보급 연습을 훈련에 포함 (40~50분마다 젤)','후반 5km 페이스 유지가 기록 향상의 핵심'],
    tags:['하프','하프마라톤','롱런','보급','젤','페이스'] },
  { id:'h2', cat:'half', catLabel:'하프마라톤', title:'서브-2 / 서브-1:45 공략',
    summary:'서브-2는 5:41/km, 서브-1:45는 4:58/km 목표 페이스다',
    points:['서브-2 (5:41/km): 주간 50~60km, 롱런 16~18km 필수','서브-1:45 (4:58/km): 주간 60~70km, 인터벌+템포런 병행','10km 레이스 기록이 서브-50이어야 서브-2 현실적','보급: 출발 60분 전 젤 1개, 10km 지점 1개','후반 5km 네거티브 스플릿 목표'],
    tags:['하프','서브2','서브1:45','페이스','롱런','인터벌'] },
  // ── 풀마라톤 ─────────────────────────────────
  { id:'f1', cat:'full', catLabel:'풀마라톤', title:'풀마라톤 준비 핵심',
    summary:'주간 거리와 롱런 누적이 기반, 30km 이후는 에너지 관리 싸움이다',
    points:['주간 거리와 롱런 누적이 핵심이다','25~32km 롱런 경험이 필요하다','레이스 페이스보다 느린 훈련이 대부분이어도 괜찮다','젤, 수분, 전해질 보급 전략 필수','30km 이후는 체력보다 에너지 관리 싸움이다'],
    tags:['풀','풀마라톤','롱런','보급','젤','전해질','30km'] },
  { id:'f2', cat:'full', catLabel:'풀마라톤', title:'풀마라톤 보급 전략',
    summary:'30~40분마다 젤 1개, 급수대마다 소량씩 꾸준히 섭취하라',
    points:['30~40분마다 에너지 젤 1개 섭취 (총 4~5개 준비)','급수대(약 2.5km 간격)마다 소량(100~150ml) 꾸준히 섭취','후반부 전해질 보충 중요 — 소금 정제 또는 스포츠음료','30km 이후 근육 경련 대비 마그네슘 준비','처음 먹어보는 보급식은 레이스 날 절대 사용 금지'],
    tags:['풀','보급','젤','전해질','수분','마그네슘','경련'] },
  { id:'f3', cat:'full', catLabel:'풀마라톤', title:'서브-4 / 서브-3:30 공략',
    summary:'서브-4는 5:41/km, 서브-3:30은 4:58/km를 42.195km 유지하는 것이다',
    points:['서브-4 (5:41/km): 주간 50~60km, 롱런 28~30km 1회 이상','서브-3:30 (4:58/km): 주간 70~80km, 마라톤 페이스 훈련 필수','둘 다 초반 10km를 목표보다 10초 느리게 시작','서브-3:30은 하프 서브-1:40 기록이 선행 조건','30km 이후 붕괴 방지 = 초반 페이스 절제'],
    tags:['풀','서브4','서브3:30','페이스','롱런','마라톤'] },
  // ── 훈련법 ──────────────────────────────────
  { id:'tr1', cat:'training', catLabel:'훈련법', title:'80/20 훈련법',
    summary:'훈련의 80%는 저강도(Easy), 20%만 고강도로 — 이것이 엘리트 공식이다',
    points:['엘리트 마라토너들의 공통점: 훈련 80%가 저강도 (Zone 1~2)','나머지 20%에서만 인터벌, 템포 등 고강도 실시','중강도(회색지대)를 너무 많이 달리면 회복과 향상 모두 놓친다','Easy Run이 쉽게 느껴지는 것이 정상 — 일부러 빠르게 달리지 말 것','저강도 훈련이 많을수록 고강도 훈련의 효과가 극대화된다'],
    tags:['훈련법','80/20','저강도','고강도','이지런','인터벌','엘리트'] },
  { id:'tr2', cat:'training', catLabel:'훈련법', title:'VO2max 인터벌 훈련',
    summary:'400~1200m 반복 질주로 최대산소섭취량을 끌어올리는 훈련이다',
    points:['목적: VO2max (최대산소섭취량) 향상 → 달리기 효율 증가','강도: 최대 심박수 90~95% (숨이 턱 막히는 느낌)','구성: 400m~1200m 반복, 휴식 시간은 운동 시간과 동일','주 1회 이상 넘기지 말 것 (과도하면 부상 리스크)','초보자는 주 1회 800m × 4~5회부터 시작'],
    tags:['훈련법','인터벌','VO2max','400m','800m','심박수','고강도'] },
  { id:'tr3', cat:'training', catLabel:'훈련법', title:'젖산역치 훈련 (템포런)',
    summary:'불편하지만 지속 가능한 속도 — 이 경계선을 밀어내는 것이 템포런이다',
    points:['젖산역치 = 젖산이 급격히 축적되기 직전 강도 (최대 심박수 80~90%)','이 역치를 높이면 더 빠른 페이스를 더 오래 유지할 수 있다','훈련법: 20~40분 지속 달리기, 목표 레이스 페이스보다 15~30초 빠르게','10km 레이스 페이스가 템포런의 기준이 된다','주 1~2회, 인터벌과 같은 날 하지 말 것'],
    tags:['훈련법','템포런','젖산역치','지속주','레이스페이스','고강도'] },
  { id:'tr4', cat:'training', catLabel:'훈련법', title:'파틀렉 훈련',
    summary:'빠르게·느리게를 자유롭게 섞는 스웨덴식 훈련법 — 재미있고 효과적이다',
    points:['파틀렉(Fartlek) = 스웨덴어로 "스피드 플레이"','구조: Easy Run 중간에 1~5분 빠른 구간을 불규칙하게 삽입','장점: 딱딱한 인터벌보다 훈련 부담이 적고 즐겁다','초보자: 30초 빠르게 + 2분 쉽게 × 5~8회','중급자 이상: 2~5분 빠르게 + 동일 시간 쉽게 × 5~8회'],
    tags:['훈련법','파틀렉','이지런','스피드','재미','초보자','중급자'] },
  { id:'tr5', cat:'training', catLabel:'훈련법', title:'심박수 훈련 존(Zone)',
    summary:'심박수로 강도를 정확히 관리하면 훈련 효과가 극대화된다',
    points:['Zone 1 (최대 심박 50~60%): 회복 조깅, 대화 완전 가능','Zone 2 (60~70%): Easy Run, 이 구간이 훈련의 80%를 차지해야 함','Zone 3 (70~80%): 템포런 경계, 짧은 문장만 가능','Zone 4 (80~90%): 역치 훈련, 대화 불가','Zone 5 (90~100%): 인터벌·스프린트, 수초~수분만 지속 가능','최대 심박수 추정: 220 - 나이 (개인차 있음)'],
    tags:['훈련법','심박수','존훈련','Zone2','이지런','강도','최대심박'] },
  { id:'tr6', cat:'training', catLabel:'훈련법', title:'테이퍼링 전략',
    summary:'레이스 2~3주 전 훈련량 감소 — 이 기간이 기록을 완성시킨다',
    points:['테이퍼링 = 대회 전 훈련량을 점진적으로 줄이는 기간','풀마라톤: 3주 테이퍼링 (주간 거리 50% → 30% → 10% 감소)','하프마라톤: 2주 테이퍼링','강도는 유지하되 볼륨만 줄인다','기운이 남는다고 갑자기 훈련 늘리지 말 것','테이퍼링 중 컨디션 이상한 느낌 = 정상 (피로 빠지는 과정)'],
    tags:['훈련법','테이퍼링','대회준비','풀마라톤','하프','훈련량'] },
  { id:'tr7', cat:'training', catLabel:'훈련법', title:'카던스 최적화',
    summary:'분당 170~180보가 부상을 줄이고 효율을 높이는 황금 카던스다',
    points:['카던스 = 분당 발걸음 수 (양발 합산)','분당 170~180보: 대부분의 러너에게 이상적인 범위','카던스가 낮으면 보폭이 넓어지고 발꿈치 충격이 증가한다','현재보다 5~10%씩 천천히 높여나갈 것 (급격한 변화 금지)','메트로놈 앱이나 BPM 음악으로 리듬 연습','카던스 향상이 정강이·무릎 통증에도 효과적'],
    tags:['훈련법','카던스','보폭','부상예방','효율','착지','스트라이드'] },
  // ── 영양/보급 ────────────────────────────────
  { id:'nt1', cat:'nutrition', catLabel:'영양/보급', title:'달리기 전 식사 전략',
    summary:'달리기 2~3시간 전 탄수화물 위주 식사, 30분 전은 소량만',
    points:['2~3시간 전: 밥, 빵, 바나나 등 탄수화물 위주 식사 (300~500kcal)','30~60분 전: 바나나 반 개, 에너지 젤, 소화가 빠른 탄수화물만','지방·단백질 과다 섭취 금지 — 소화가 오래 걸려 복통 유발','훈련 전 식사는 레이스 당일에도 동일하게 연습할 것','아침 공복 러닝은 30~60분 Easy Run까지는 가능'],
    tags:['영양','식사','탄수화물','보급','달리기전','바나나','젤'] },
  { id:'nt2', cat:'nutrition', catLabel:'영양/보급', title:'레이스 중 보급 타이밍',
    summary:'60분 이상 달리면 에너지 젤이 필수 — 배고프기 전에 먹어야 한다',
    points:['60분 이상 달리면 외부 에너지 보충 필수','30~40분마다 에너지 젤 1개 (탄수화물 20~30g)','젤은 반드시 물과 함께 섭취 (스포츠음료와 동시 섭취 금지)','시간당 탄수화물 목표: 60~90g (고강도는 90g 이상 가능)','카페인 포함 젤은 레이스 후반 25~30km에 사용','훈련 중 미리 실험해보지 않은 보급식 레이스 날 사용 금지'],
    tags:['영양','젤','보급','레이스','탄수화물','카페인','수분'] },
  { id:'nt3', cat:'nutrition', catLabel:'영양/보급', title:'달리기 후 회복 영양',
    summary:'30분 이내 탄수화물+단백질 섭취가 회복 속도를 결정한다',
    points:['30분 이내 황금 창: 탄수화물 3 + 단백질 1 비율로 섭취','탄수화물: 글리코겐 저장량 회복','단백질: 근육 수리 및 합성 (20~30g 권장)','바나나+우유, 초코우유, 그릭요거트+과일이 간편하고 효과적','수분 손실 보충: 운동 전후 체중 차이 × 1.5배를 물로 보충'],
    tags:['영양','회복','단백질','탄수화물','30분','글리코겐','수분'] },
  { id:'nt4', cat:'nutrition', catLabel:'영양/보급', title:'수분 보충 전략',
    summary:'갈증이 느껴지면 이미 늦다 — 미리, 꾸준히 마셔야 한다',
    points:['달리기 2~3시간 전 500~600ml 충분히 수분 보충','달리기 중 20분마다 150~200ml 소량씩','심한 땀 = 전해질(나트륨) 손실 → 스포츠음료 or 소금 정제 추가','저나트륨혈증 주의: 물만 너무 많이 마시면 위험','소변 색이 연한 노란색 = 수분 상태 양호','레이스 중 체중 2% 이상 손실 시 퍼포먼스 5~8% 감소'],
    tags:['수분','전해질','나트륨','스포츠음료','소금','탈수'] },
  // ── 회복 ────────────────────────────────────
  { id:'rec1', cat:'recovery', catLabel:'회복', title:'회복의 중요성',
    summary:'훈련은 자극이고 회복이 실제 강해지는 시간이다 — 쉬는 것도 훈련이다',
    points:['적응은 쉬는 시간에 일어난다 — 훈련 후 48~72시간이 근육 재건 시간','강도 높은 훈련 후 최소 1~2일 Easy 또는 Rest 필수','주 1~2일 완전 휴식 또는 완전 저강도 회복주','연속 고강도 훈련 금지 — 같은 근육군 연속 자극은 손상 유발','회복 지표: 기상 안정 심박수 (평소보다 5~7 이상 높으면 피로 상태)'],
    tags:['회복','휴식','훈련','적응','안정심박수','피로'] },
  { id:'rec2', cat:'recovery', catLabel:'회복', title:'수면과 달리기 퍼포먼스',
    summary:'수면 7~9시간이 훈련 효과를 극대화하는 가장 강력한 회복 도구다',
    points:['수면 부족 → 코르티솔 상승 → 글리코겐 저장 감소 → 퍼포먼스 저하','수면 중 성장호르몬 분비 → 근육 회복 및 합성','수면 8시간 이상인 선수가 스프린트 5% 향상 (Stanford 연구)','수면 부족 상태에서 고강도 훈련 = 부상 위험 2배 이상','취침 2~3시간 전 고강도 운동 금지 (교감신경 활성화)'],
    tags:['수면','회복','성장호르몬','퍼포먼스','부상','코르티솔'] },
  { id:'rec3', cat:'recovery', catLabel:'회복', title:'폼롤러·스트레칭 루틴',
    summary:'러닝 후 10분 스트레칭으로 회복 속도를 높이고 부상을 예방한다',
    points:['동적 스트레칭은 달리기 전 (레그스윙, 힙서클, 니드라이브)','정적 스트레칭은 달리기 후 (각 부위 30초 이상 유지)','필수 스트레칭: 햄스트링, 종아리, IT밴드, 고관절굴곡근','폼롤러: 종아리·IT밴드·대퇴사두근 각 60~90초','격한 통증 부위는 폼롤러 직접 압박 금지 (옆 근육에서 접근)'],
    tags:['회복','스트레칭','폼롤러','IT밴드','종아리','동적','정적'] },
  // ── 부상 예방 ────────────────────────────────
  { id:'inj1', cat:'injury', catLabel:'부상 예방', title:'부상 예방 원칙',
    summary:'3일 이상 통증이 지속되면 즉시 훈련 강도를 낮춰라',
    points:['통증이 3일 이상 지속되면 훈련 강도 낮추기','같은 부위 통증이 반복되면 즉시 휴식','러닝화 수명 주기적 체크 (500~800km마다 교체)','갑작스러운 주간 거리 30% 이상 증가 금지','수면 부족 상태에서 고강도 훈련 금지'],
    tags:['부상','통증','러닝화','주간거리','수면','예방'] },
  { id:'inj2', cat:'injury', catLabel:'부상 예방', title:'무릎·정강이 통증 대처',
    summary:'무릎 통증은 오버스트라이딩, 정강이 통증은 급격한 거리 증가가 주원인이다',
    points:['무릎 통증: 보폭 줄이기, 착지를 발 중간으로 교정','정강이 부목: 주간 거리를 10% 이상 갑자기 늘리지 않기','IT밴드 증후군: 엉덩이 근력 운동과 폼롤러로 예방','아킬레스건: 힐드롭 낮은 신발로 서서히 전환','발바닥 통증: 아침 첫 발걸음 통증이 신호, 즉시 러닝 강도 낮추기'],
    tags:['부상','무릎','정강이','IT밴드','아킬레스','발바닥','통증'] },
  // ── 러닝폼 ──────────────────────────────────
  { id:'frm1', cat:'form', catLabel:'러닝폼', title:'기본 러닝 자세',
    summary:'자연스럽고 효율적인 자세는 부상을 줄이고 에너지를 아껴준다',
    points:['머리: 시선을 10~15m 앞에 고정, 턱을 살짝 당김','어깨: 긴장 풀고 자연스럽게 내림, 들썩이지 않기','팔: 90도로 접어 앞뒤로 (좌우 스윙 낭비 금지)','상체: 발목에서 앞으로 1~3도 기울이기','발: 엉덩이 아래에서 착지, 앞으로 내딛지 않기','코어: 복부에 가벼운 긴장 유지'],
    tags:['러닝폼','자세','착지','팔치기','코어','효율','어깨'] },
  { id:'frm2', cat:'form', catLabel:'러닝폼', title:'착지 방식과 부상 연관성',
    summary:'뒤꿈치를 앞에 내딛는 오버스트라이딩이 부상의 주요 원인이다',
    points:['힐 스트라이크 자체가 문제가 아니라 엉덩이 앞에서 착지가 문제','미드풋 착지: 발의 중간 부분으로 착지, 충격 분산에 유리','포어풋 착지: 고속 질주에서는 효율적이나 종아리 피로 증가','가장 중요한 것: 착지 위치가 몸 무게 중심 아래','카던스를 높이면 오버스트라이딩 자연스럽게 교정됨'],
    tags:['러닝폼','착지','힐스트라이크','미드풋','포어풋','오버스트라이딩','카던스'] },
  // ── 장비 ────────────────────────────────────
  { id:'gear1', cat:'gear', catLabel:'장비', title:'러닝화 선택 가이드',
    summary:'발볼·아치 타입에 맞는 신발 선택이 부상 예방의 시작이다',
    points:['러닝화 전문 매장에서 발 타입 (중립/과회내/회외) 분석받을 것','쿠션형: 장거리·Easy Run, 반응형: 속도 훈련·레이스','발볼 넓은 발: 와이드핏 모델 필수','힐드롭(뒤꿈치-앞꿈치 높이 차): 8~12mm가 일반적, 낮을수록 전환 신중히','교체 시기: 500~800km (한국 기준 6~12개월), 충격 흡수력 저하가 신호','레이스용·훈련용 분리 사용 권장'],
    tags:['장비','러닝화','쿠션','힐드롭','발볼','아치','교체'] },
  { id:'gear2', cat:'gear', catLabel:'장비', title:'날씨별 러닝 전략',
    summary:'더위와 추위 모두 준비 없이 뛰면 위험하다 — 기온별 전략이 필요하다',
    points:['여름 (25°C 이상): 페이스 10~20% 낮추기, 이른 새벽 or 늦은 밤 추천','여름: 수분 15~20분마다 보충, 밝은 색 기능성 의류','겨울 (0°C 이하): 레이어드 착용, 장갑·귀마개 필수','겨울: 워밍업 시간 2배, 코어 체온 유지가 중요','장마·비: 방수 러닝화+양말, 발 물집 방지 바셀린','황사·미세먼지: 마스크 착용 or 실내 훈련 대체'],
    tags:['장비','날씨','여름','겨울','비','황사','수분','레이어드'] },
  // ── 멘탈 ────────────────────────────────────
  { id:'men1', cat:'mental', catLabel:'멘탈', title:'러닝의 벽(Wall) 극복',
    summary:'30km 이후 벽은 에너지 고갈이 원인 — 전략과 멘탈 훈련으로 극복 가능하다',
    points:['풀마라톤 30km, 하프 후반에 찾아오는 "더 이상 못 뛰겠다"는 느낌이 벽','원인: 글리코겐 고갈 + 근육 피로 + 심리적 한계의 복합','예방: 보급 전략 + 초반 페이스 절제가 90%를 해결','극복: 500m 단위로 나누어 생각, "지금 이 한 걸음"에 집중','긍정적 자기 대화: "나는 여기까지 준비했다, 이건 감각일 뿐이다"','훈련에서 피로한 상태로 마지막 몇 km 뛰는 연습이 실전 준비'],
    tags:['멘탈','벽','30km','자기대화','집중','에너지','심리'] },
  { id:'men2', cat:'mental', catLabel:'멘탈', title:'훈련 동기 유지하기',
    summary:'기록보다 습관이 먼저다 — 동기가 없어도 달릴 수 있는 시스템을 만들어라',
    points:['목표를 크게 하나 정하되, 과정 지표(주간 km)로 관리하라','기록 앱에 꼬박꼬박 입력하면 연속성이 동기가 된다','혼자 어려우면 러닝크루 또는 러닝 파트너 활용','나쁜 훈련이 없는 훈련보다 낫다 — 짧게라도 나가라','목표 달성 후 새 목표를 빠르게 설정할 것 (공백 기간 방지)'],
    tags:['멘탈','동기','습관','러닝크루','목표','기록','연속성'] },
  // ── 레이스 당일 ───────────────────────────────
  { id:'rd1', cat:'race', catLabel:'레이스 당일', title:'레이스 당일 전략',
    summary:'초반 30%를 여유 있게 시작하면 후반 페이스 붕괴가 없다',
    points:['전날 새로운 음식 절대 금지','출발 2~3시간 전 식사 완료','초반 30%는 반드시 목표 페이스보다 5~10초 느리게','목표 페이스는 중반부터 안정적으로 유지','마지막 20%에서만 빌드업 시도','기록 욕심보다 페이스 붕괴 방지가 우선'],
    tags:['레이스','당일','전략','초반','페이스','식사','보급'] },
  { id:'rd2', cat:'race', catLabel:'레이스 당일', title:'레이스 전날 준비',
    summary:'레이스는 당일이 아닌 전날 밤 이미 절반이 결정된다',
    points:['카보로딩은 레이스 2~3일 전부터 서서히','전날 저녁은 익숙한 탄수화물 위주 식사','수면 7~8시간 — 잠이 안 와도 누워서 휴식','장비 전날 밤 모두 준비, 레이스 당일 새 장비 금지','긴 스트레칭보다 짧은 활성화 워밍업이 적합'],
    tags:['레이스','전날','준비','카보로딩','수면','장비'] }
];

let currentKnowledgeCat = 'all';
let currentKnowledgeSearch = '';

function renderKnowledge() {
  const q = currentKnowledgeSearch.toLowerCase();
  const filtered = KNOWLEDGE.filter(k => {
    const matchCat = currentKnowledgeCat === 'all' || k.cat === currentKnowledgeCat;
    const matchQ = !q || [k.title, k.summary, ...k.points, ...k.tags].join(' ').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  $('knowledgeEmpty').classList.toggle('hidden', filtered.length > 0);
  $('knowledgeCards').innerHTML = filtered.map(k => `
    <div class="know-card">
      <div class="know-header">
        <span class="know-cat-badge kcat-${k.cat}">${k.catLabel}</span>
        <div class="know-title">${k.title}</div>
      </div>
      <div class="know-summary">${k.summary}</div>
      <ul class="know-points">${k.points.map(p => `<li>${p}</li>`).join('')}</ul>
    </div>`).join('');
}

function initKnowledge() {
  renderKnowledge();
  $('knowledgeSearch').addEventListener('input', e => {
    currentKnowledgeSearch = e.target.value;
    renderKnowledge();
  });
  document.getElementById('categoryPills').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentKnowledgeCat = pill.dataset.cat;
    renderKnowledge();
  });
}

// ═══════════════════════════════════════════════
//  SEOUL COURSES (Tab 4)
// ═══════════════════════════════════════════════

const COURSE_COORDS = {
  1:  { lat:37.5265, lng:126.9337 },
  2:  { lat:37.5115, lng:126.9984 },
  3:  { lat:37.5219, lng:127.0857 },
  4:  { lat:37.5509, lng:126.9889 },
  5:  { lat:37.5445, lng:127.0374 },
  6:  { lat:37.5657, lng:126.9228 },
  7:  { lat:37.5700, lng:126.8977 },
  8:  { lat:37.5097, lng:127.1053 },
  9:  { lat:37.5170, lng:126.8618 },
  10: { lat:37.5692, lng:126.9941 },
  11: { lat:37.5232, lng:126.9305 },
  12: { lat:37.4825, lng:127.0964 },
  13: { lat:37.4826, lng:127.0510 },
  14: { lat:37.6037, lng:127.0858 },
  15: { lat:37.5720, lng:126.9769 },
  16: { lat:37.5765, lng:126.9769 },
  17: { lat:37.5200, lng:127.1210 },
  18: { lat:37.5322, lng:127.0620 },
  19: { lat:37.6579, lng:126.9766 },
  20: { lat:37.5115, lng:126.9984 }
};

const COURSES = [
  { id:1, name:'여의도 한강공원', area:'영등포/여의도', areaTag:'여의도', distLabel:'5~15km', minKm:5, maxKm:15, difficulty:'쉬움', features:'평지, 넓은 길, 접근성 최고', targets:['초보자','10K 준비','5K 준비'], pros:'페이스 유지 쉬움, 야간 러닝 최적', cons:'주말 매우 혼잡', bestTime:'평일 저녁, 주말 이른 오전', type:'한강 평지', tags:['초보자','5K','10K','야간 러닝','여의도','평지'] },
  { id:2, name:'반포 한강공원', area:'반포/잠원', areaTag:'반포', distLabel:'5~20km', minKm:5, maxKm:20, difficulty:'쉬움', features:'야경, 평지, 장거리 연결 최적', targets:['하프 준비','롱런','10K'], pros:'장거리 코스 설계 용이, 야경 아름다움', cons:'저녁 시간 자전거 주의', bestTime:'이른 아침, 밤', type:'한강 평지', tags:['하프','롱런','10K','야간 러닝','반포','평지'] },
  { id:3, name:'잠실 한강공원', area:'잠실', areaTag:'잠실', distLabel:'5~21km', minKm:5, maxKm:21, difficulty:'쉬움', features:'한강변 장거리 러닝 최적', targets:['하프 준비','풀 준비','롱런'], pros:'길이 넓고 페이스 유지 좋음', cons:'바람 강한 날 체감 난이도 상승', bestTime:'오전', type:'한강 장거리', tags:['하프','풀','롱런','잠실','장거리','평지'] },
  { id:4, name:'남산 둘레길', area:'중구/용산', areaTag:'중구', distLabel:'5~8km', minKm:5, maxKm:8, difficulty:'중간', features:'업힐, 다운힐, 심폐·근력 강화', targets:['중급자','언덕 훈련','10K'], pros:'심폐 기능과 하체 근력 동시 강화', cons:'초보자 오버페이스 주의', bestTime:'오전, 해질녘', type:'언덕', tags:['언덕 훈련','중급자','10K','중구','언덕','남산'] },
  { id:5, name:'서울숲-한강 연결 코스', area:'성수/뚝섬', areaTag:'성수', distLabel:'5~12km', minKm:5, maxKm:12, difficulty:'쉬움', features:'공원과 한강 연결, 감성 러닝', targets:['초보자','5K','10K'], pros:'풍경 좋고 지루하지 않음', cons:'주말 방문객 많음', bestTime:'오전', type:'공원+한강', tags:['초보자','5K','10K','성수','공원','감성'] },
  { id:6, name:'경의선숲길-연남 코스', area:'마포/연남', areaTag:'마포', distLabel:'3~7km', minKm:3, maxKm:7, difficulty:'쉬움', features:'짧은 도심 조깅, 접근성 최고', targets:['회복주','초보자'], pros:'접근성 좋고 가볍게 뛰기 좋음', cons:'보행자 많아 속도 훈련 어려움', bestTime:'이른 아침', type:'도심 조깅', tags:['회복주','초보자','마포','도심','짧은 거리'] },
  { id:7, name:'월드컵공원-하늘공원', area:'상암', areaTag:'상암', distLabel:'5~15km', minKm:5, maxKm:15, difficulty:'중간', features:'공원+언덕, 다양한 코스 조합', targets:['중급자','언덕 훈련','10K','하프 준비'], pros:'언덕+평지 혼합 훈련 가능', cons:'언덕 구간 체력 소모 큼', bestTime:'오전, 오후', type:'공원+언덕', tags:['언덕 훈련','중급자','10K','하프','상암','언덕'] },
  { id:8, name:'석촌호수', area:'송파', areaTag:'송파', distLabel:'2.5~10km', minKm:2.5, maxKm:10, difficulty:'쉬움', features:'순환 코스, 페이스 체크 용이', targets:['초보자','5K 준비'], pros:'반복주 훈련에 최적, 페이스 측정 쉬움', cons:'사람 많을 때 속도 훈련 어려움', bestTime:'이른 아침', type:'순환 코스', tags:['초보자','5K','송파','순환','반복주'] },
  { id:9, name:'안양천', area:'구로/양천/영등포', areaTag:'안양천', distLabel:'5~20km', minKm:5, maxKm:20, difficulty:'쉬움', features:'긴 평지 코스, 장거리 훈련 최적', targets:['10K','하프 준비','풀 준비','롱런'], pros:'장거리 훈련에 이상적, 한적함', cons:'구간별 자전거 주의', bestTime:'오전, 저녁', type:'하천 평지', tags:['10K','하프','풀','롱런','안양천','장거리','평지'] },
  { id:10, name:'청계천', area:'종로/중구', areaTag:'중구', distLabel:'3~8km', minKm:3, maxKm:8, difficulty:'쉬움', features:'도심 접근성, 직장인 러너 최적', targets:['직장인 러너','회복주','초보자'], pros:'출퇴근 전후 활용 편리', cons:'보행자 많고 폭이 좁음', bestTime:'이른 아침', type:'도심 하천', tags:['회복주','초보자','중구','도심','직장인','짧은 거리'] },
  { id:11, name:'여의도 고구마런', area:'영등포/여의도', areaTag:'여의도', distLabel:'8~14km', minKm:8, maxKm:14, difficulty:'쉬움', features:'여의도 섬 전체 + 노들섬 경유, 고구마 모양 루프 코스', targets:['10K 준비','하프 준비','중급자'], pros:'노들섬 카페 중간 쉬어가기, 러닝크루 성지', cons:'주말 자전거·보행자 매우 혼잡', bestTime:'평일 이른 아침, 야간', type:'순환 루프', tags:['10K','하프','중급자','여의도','야간 러닝','순환','고구마런'] },
  { id:12, name:'탄천 하천길', area:'강남/송파', areaTag:'탄천', distLabel:'7~21km', minKm:7, maxKm:21, difficulty:'쉬움', features:'수서~한강 평탄 하천길, 마라토너 성지, km 표식 설치', targets:['10K','하프 준비','풀 준비','롱런'], pros:'장거리 훈련 최적, km 표식으로 페이스 측정 쉬움', cons:'그늘 없어 여름 직사광선 주의', bestTime:'이른 아침, 저녁', type:'하천 평지', tags:['10K','하프','풀','롱런','탄천','장거리','평지'] },
  { id:13, name:'양재천 코스', area:'서초/강남', areaTag:'양재천', distLabel:'5~15km', minKm:5, maxKm:15, difficulty:'쉬움', features:'잘 정비된 하천 산책로, 야간 조명 완비', targets:['초보자','10K','야간 러닝','회복주'], pros:'야간 조명 설치 완비, 조용하고 쾌적한 환경', cons:'주말 오전 가족 보행자 많음', bestTime:'저녁, 야간', type:'하천 평지', tags:['초보자','10K','야간 러닝','회복주','양재천','평지'] },
  { id:14, name:'중랑천-경춘선숲길', area:'노원/중랑', areaTag:'중랑천', distLabel:'5~20km', minKm:5, maxKm:20, difficulty:'쉬움', features:'폐철길 숲길+하천 연결, 한강까지 20km 장거리', targets:['10K','하프 준비','풀 준비','롱런'], pros:'한적하고 장거리 훈련에 최적, 독특한 경관', cons:'접근성이 상대적으로 낮음', bestTime:'주말 오전', type:'하천 평지', tags:['10K','하프','풀','롱런','중랑천','장거리','평지'] },
  { id:15, name:'광화문-청계천-종묘 시티런', area:'종로/중구', areaTag:'종로', distLabel:'5~8km', minKm:5, maxKm:8, difficulty:'쉬움', features:'도심 야경과 역사 공간, 서울 대표 야간 시티런', targets:['초보자','직장인 러너','야간 러닝','회복주'], pros:'야경이 아름답고 동기 부여 효과, 목요일 7979 러닝크루 운영', cons:'보행자 많고 신호등 대기 있음', bestTime:'밤 (오후 7시 이후)', type:'시티런', tags:['초보자','야간 러닝','회복주','종로','도심','직장인','시티런'] },
  { id:16, name:'덕수궁-경복궁-북촌 역사 코스', area:'중구/종로', areaTag:'종로', distLabel:'7~11km', minKm:7, maxKm:11, difficulty:'쉬움', features:'덕수궁, 광화문, 경복궁, 북촌한옥마을, 종묘 연결 8.7km', targets:['중급자','직장인 러너','야간 러닝'], pros:'서울 역사와 함께 달리는 감성 코스, 오르내림 거의 없음', cons:'관광객·보행자 혼재, 구간별 신호 대기', bestTime:'이른 아침, 밤', type:'시티런', tags:['중급자','야간 러닝','직장인','종로','도심','시티런','역사'] },
  { id:17, name:'올림픽공원 순환', area:'송파', areaTag:'송파', distLabel:'5~10km', minKm:5, maxKm:10, difficulty:'쉬움', features:'넓은 공원 내 순환, 일부 흙길 포함', targets:['초보자','5K 준비','10K','회복주'], pros:'차 없는 공원, 흙길로 관절 부담 적음', cons:'대회 시즌 주말 혼잡', bestTime:'오전', type:'공원 순환', tags:['초보자','5K','10K','회복주','송파','순환','공원'] },
  { id:18, name:'뚝섬 한강공원', area:'광진/성수', areaTag:'뚝섬', distLabel:'5~15km', minKm:5, maxKm:15, difficulty:'쉬움', features:'뚝섬~서울숲 연결, 강변+공원 혼합 코스', targets:['초보자','10K','하프 준비','롱런'], pros:'서울숲 방향 연장 가능, 다양한 경로 설계', cons:'주말 이용객 과밀', bestTime:'평일 저녁', type:'공원+한강', tags:['초보자','10K','하프','롱런','뚝섬','광진','공원'] },
  { id:19, name:'북한산 둘레길', area:'강북/은평', areaTag:'북한산', distLabel:'5~20km', minKm:5, maxKm:20, difficulty:'어려움', features:'산림 트레일, 흙길+경사+자연 경관', targets:['중급자','트레일 러닝','언덕 훈련'], pros:'하체 근력·심폐 기능 강화, 자연 속 트레일 경험', cons:'비 후 미끄럼 주의, 트레일화 권장', bestTime:'주말 오전 (햇빛 있을 때)', type:'트레일', tags:['중급자','언덕 훈련','강북','트레일','장거리','자연'] },
  { id:20, name:'반포 야경런 (잠수교 루프)', area:'반포/서초', areaTag:'반포', distLabel:'5~10km', minKm:5, maxKm:10, difficulty:'쉬움', features:'잠수교 횡단 포함 루프, 달빛무지개분수 야경', targets:['초보자','5K 준비','10K','야간 러닝'], pros:'잠수교 건너는 특별한 경험, 달빛무지개분수 야경 최고', cons:'잠수교 홍수 시 통제, 차량 통제 시간 확인 필요', bestTime:'밤 (달빛무지개분수 운영 시간)', type:'순환 루프', tags:['초보자','5K','10K','야간 러닝','반포','순환'] }
];

function scoreCourse(course, purpose, area, difficulty, type) {
  let score = 0;
  if (purpose !== 'all') {
    const pLower = purpose.toLowerCase();
    if (course.tags.some(t => t.toLowerCase().includes(pLower) || pLower.includes(t.toLowerCase()))) score += 3;
  }
  if (area !== 'all' && (course.areaTag === area || course.area.includes(area))) score += 2;
  if (difficulty !== 'all' && course.difficulty === difficulty) score += 2;
  if (type !== 'all' && course.type === type) score += 2;
  return score;
}

function matchReason(course, purpose, area, difficulty, type) {
  const parts = [];
  if (purpose !== 'all' && course.tags.some(t => t.toLowerCase().includes(purpose.toLowerCase()))) parts.push(`${purpose} 훈련에 적합한 코스`);
  if (area !== 'all') parts.push(`${area} 지역`);
  if (difficulty !== 'all') parts.push(`${difficulty} 난이도`);
  if (!parts.length) parts.push(`${course.difficulty} 난이도의 ${course.type} 코스`);
  return parts.join(' · ');
}

function renderCourseCard(course, isRecommended, reason) {
  const diffClass = { '쉬움':'cbadge-easy', '중간':'cbadge-medium', '어려움':'cbadge-hard' }[course.difficulty] || 'cbadge-easy';
  return `
    <div class="course-card ${isRecommended ? 'recommended' : ''}">
      <div class="course-name">${isRecommended ? '⭐ ' : ''}${course.name}</div>
      <div class="course-badges">
        <span class="cbadge cbadge-area">${course.area}</span>
        <span class="cbadge ${diffClass}">${course.difficulty}</span>
        <span class="cbadge cbadge-type">${course.type}</span>
        <span class="cbadge cbadge-dist">${course.distLabel}</span>
      </div>
      <div class="course-rows">
        <div class="course-row"><span class="course-row-label">대상</span><span class="course-row-val">${course.targets.join(', ')}</span></div>
        <div class="course-row"><span class="course-row-label">특징</span><span class="course-row-val">${course.features}</span></div>
        <div class="course-row"><span class="course-row-label">장점</span><span class="course-row-val">${course.pros}</span></div>
        <div class="course-row"><span class="course-row-label">주의</span><span class="course-row-val">${course.cons}</span></div>
        <div class="course-row"><span class="course-row-label">시간</span><span class="course-row-val">${course.bestTime}</span></div>
      </div>
      ${reason ? `<div class="course-match-reason">✓ ${reason}</div>` : ''}
      <button class="btn-map-open" onclick="openCourseMap(${course.id})">🗺️ 지도 보기</button>
    </div>`;
}

function openCourseMap(id) {
  const course = COURSES.find(c => c.id === id);
  if (!course) return;
  const coords = COURSE_COORDS[id];
  const modal = $('courseMapModal');

  $('mapModalTitle').textContent = course.name;

  if (coords) {
    const d = course.maxKm >= 15 ? 0.032 : course.maxKm >= 8 ? 0.020 : 0.013;
    const { lat, lng } = coords;
    const bbox = `${(lng-d).toFixed(5)},${(lat-d*0.65).toFixed(5)},${(lng+d).toFixed(5)},${(lat+d*0.65).toFixed(5)}`;
    $('mapFrame').src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
    $('mapExternalLinks').innerHTML = `
      <a class="btn-map-ext" href="https://map.naver.com/v5/search/${encodeURIComponent(course.name)}" target="_blank" rel="noopener">네이버 지도에서 보기</a>
      <a class="btn-map-ext" href="https://map.kakao.com/?q=${encodeURIComponent(course.name)}" target="_blank" rel="noopener">카카오 지도에서 보기</a>`;
  } else {
    $('mapFrame').src = '';
  }

  const diffClass = { '쉬움':'cbadge-easy', '중간':'cbadge-medium', '어려움':'cbadge-hard' }[course.difficulty] || 'cbadge-easy';
  $('mapModalInfo').innerHTML = `
    <div class="course-badges" style="margin-bottom:12px">
      <span class="cbadge cbadge-area">${course.area}</span>
      <span class="cbadge ${diffClass}">${course.difficulty}</span>
      <span class="cbadge cbadge-dist">${course.distLabel}</span>
      <span class="cbadge cbadge-type">${course.type}</span>
    </div>
    <div class="course-rows">
      <div class="course-row"><span class="course-row-label">특징</span><span class="course-row-val">${course.features}</span></div>
      <div class="course-row"><span class="course-row-label">장점</span><span class="course-row-val">${course.pros}</span></div>
      <div class="course-row"><span class="course-row-label">주의</span><span class="course-row-val">${course.cons}</span></div>
      <div class="course-row"><span class="course-row-label">추천 시간</span><span class="course-row-val">${course.bestTime}</span></div>
    </div>`;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCourseMap() {
  $('courseMapModal').classList.add('hidden');
  $('mapFrame').src = '';
  document.body.style.overflow = '';
}

function renderCourses(purpose, area, difficulty, type) {
  const hasFilter = purpose !== 'all' || area !== 'all' || difficulty !== 'all' || type !== 'all';
  let filtered = COURSES;
  if (area !== 'all') filtered = filtered.filter(c => c.areaTag === area || c.area.includes(area));
  if (difficulty !== 'all') filtered = filtered.filter(c => c.difficulty === difficulty);
  if (type !== 'all') filtered = filtered.filter(c => c.type === type);
  if (purpose !== 'all') filtered = filtered.filter(c => c.tags.some(t => t.toLowerCase().includes(purpose.toLowerCase()) || purpose.toLowerCase().includes(t.toLowerCase())));

  // Recommended top 3
  if (hasFilter && filtered.length > 0) {
    const scored = filtered.map(c => ({ course: c, score: scoreCourse(c, purpose, area, difficulty, type) })).sort((a,b) => b.score - a.score);
    const top3 = scored.slice(0, 3);
    const rest = scored.slice(3);
    $('recommendedSection').classList.remove('hidden');
    $('recommendedCourses').innerHTML = top3.map(({course}) => renderCourseCard(course, true, matchReason(course, purpose, area, difficulty, type))).join('');
    $('allCourses').innerHTML = rest.length ? rest.map(({course}) => renderCourseCard(course, false, '')).join('') : '<p style="color:var(--text3);font-size:14px;padding:12px 0">추천 코스 외 조건에 맞는 추가 코스가 없어요.</p>';
  } else {
    $('recommendedSection').classList.add('hidden');
    $('allCourses').innerHTML = (hasFilter ? filtered : COURSES).map(c => renderCourseCard(c, false, '')).join('');
  }
}

function initCourses() {
  renderCourses('all', 'all', 'all', 'all');
  $('applyFilters').addEventListener('click', () => {
    renderCourses($('cfPurpose').value, $('cfArea').value, $('cfDifficulty').value, $('cfType').value);
    $('recommendedSection').scrollIntoView({ behavior:'smooth', block:'start' });
  });
  $('mapModalClose').addEventListener('click', closeCourseMap);
  $('courseMapModal').addEventListener('click', e => { if (e.target === $('courseMapModal')) closeCourseMap(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCourseMap(); });
}

// ═══════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // localStorage 사용 가능 여부 체크
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
  } catch(e) {
    showToast('⚠️ 저장 불가 — 개인정보 보호 모드를 해제해주세요');
  }

  // Tab nav
  initTabs();

  // Goal tab
  applyGoalValues(loadGoal() || SAMPLE_GOAL);
  document.querySelectorAll('input[name="recentDistance"]').forEach(el => el.addEventListener('change', syncRecentTimeVisibility));
  document.querySelectorAll('input[name="targetDistance"]').forEach(el =>
    el.addEventListener('change', () => resetTargetTimeForDistance(el.value))
  );
  ['targetHour','targetMin','targetSec'].forEach(id =>
    $(id).addEventListener('input', updateTargetPacePreview)
  );
  document.querySelectorAll('#tab-goal input, #tab-goal select').forEach(el => el.addEventListener('change', () => saveGoal(getGoalValues())));
  $('generateBtn').addEventListener('click', onGenerate);
  $('resetBtn').addEventListener('click', onReset);
  $('savePlanBtn').addEventListener('click', onSavePlan);
  renderSavedPlans();

  // Log tab
  initLogForm();
  $('toggleAddRun').addEventListener('click', () => {
    const form = $('addRunForm');
    const isHidden = form.classList.contains('hidden');
    form.classList.toggle('hidden', !isHidden);
    $('toggleAddRun').textContent = isHidden ? '✕ 닫기' : '＋ 기록 추가';
    if (isHidden) { clearLogForm(); form.scrollIntoView({ behavior:'smooth', block:'start' }); }
  });
  $('cancelAddRun').addEventListener('click', () => {
    $('addRunForm').classList.add('hidden');
    $('toggleAddRun').textContent = '＋ 기록 추가';
  });
  $('saveRunBtn').addEventListener('click', onSaveRun);
  $('clearAllRuns').addEventListener('click', onClearAllRuns);
  renderLog();

  // Knowledge tab
  initKnowledge();

  // Courses tab
  initCourses();
});

// Expose handlers globally (called from inline onclick)
window.onDeleteRun          = onDeleteRun;
window.openCourseMap        = openCourseMap;
window.togglePlanChecklist  = togglePlanChecklist;
window.setActiveWeek        = setActiveWeek;
window.toggleCompletion     = toggleCompletion;
window.onDeletePlan         = onDeletePlan;
