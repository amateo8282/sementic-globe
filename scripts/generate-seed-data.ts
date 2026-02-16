/**
 * 시드 데이터 생성 스크립트
 *
 * 다양한 한국어 메시지를 생성하고, OpenAI로 임베딩을 만든 뒤,
 * 코사인 유사도 기반으로 구체 좌표를 배치하여 Supabase에 저장한다.
 *
 * 실행 방법:
 *   npx tsx --env-file=.env.local scripts/generate-seed-data.ts
 *
 * 필수 환경변수:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import { createClient } from "@supabase/supabase-js";

// ─── 환경변수 검증 ──────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error(
    "필수 환경변수가 없습니다: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── 시드 메시지 정의 (10개 카테고리 x 30개 = 300개) ──────────

const SEED_MESSAGES: string[] = [
  // 사랑/관계 (30)
  "사랑은 결국 시간이 증명해주는 거라고 생각해",
  "오래 만난 사람이랑 헤어지니까 세상이 달라 보인다",
  "좋아하는 사람한테 먼저 연락하는 거 왜 이렇게 어렵지",
  "연애 초반의 설렘이 영원했으면 좋겠다",
  "이별 후에 더 성장하는 사람이 되고 싶어",
  "짝사랑은 아름답지만 결국 외롭다",
  "오랜 친구가 연인보다 나을 때가 있어",
  "첫사랑은 왜 항상 아련하게 남을까",
  "결혼보다 중요한 건 같이 있을 때 편한 거",
  "사랑한다는 말보다 행동이 중요해",
  "매일 문자하는 것도 사랑의 한 형태야",
  "헤어진 사람 SNS를 보는 건 자해행위",
  "인연이면 다시 만나게 되어 있다고 믿어",
  "솔로가 편한 건지 외로운 건지 구분이 안 가",
  "좋은 관계는 서로 존중하는 거지 집착하는 게 아니야",
  "부모님이 결혼 얘기하면 왜 이렇게 압박감이 드는지",
  "진정한 사랑은 상대의 성장을 응원하는 것",
  "커플이 꼭 모든 취미를 같이 할 필요는 없어",
  "먼 거리 연애는 정말 힘들지만 그만큼 소중해",
  "사랑에 빠지면 세상 모든 노래가 내 얘기 같아",
  "연애하면서 나를 잃으면 안 돼",
  "좋은 사람 만나는 건 결국 내가 좋은 사람이 되는 것",
  "기념일에 선물보다 함께 시간 보내는 게 좋아",
  "사랑받고 싶으면 먼저 사랑하는 법을 배워야 해",
  "혼자서도 행복한 사람이 함께할 때도 행복해",
  "잘 맞는 사람을 찾는 게 아니라 맞춰가는 거야",
  "마음을 여는 데 시간이 걸리는 사람도 있어",
  "관계에서 가장 중요한 건 대화야",
  "상처받을 용기가 있어야 진짜 사랑할 수 있어",
  "누군가를 진심으로 좋아해본 적 있니",

  // 직장/커리어 (30)
  "야근하면서 뭐가 이렇게 보람 없을 수 있지",
  "회사 그만두고 싶지만 현실이 허락하지 않는다",
  "좋은 팀장을 만나면 회사생활이 180도 달라져",
  "워라밸은 정말 중요하다고 느끼는 요즘",
  "프리랜서 생활은 자유롭지만 불안하기도 해",
  "이직을 고민할 때마다 머리가 복잡해",
  "월요일 아침마다 출근하기 싫다는 생각이 든다",
  "회의가 너무 많으면 정작 일할 시간이 없어",
  "성과보다 태도를 보는 상사가 좋다",
  "연봉 협상은 항상 긴장되지만 꼭 해야 해",
  "재택근무 경험하고 나니 사무실이 답답해",
  "커리어 전환은 용기가 필요하지만 후회하지 않을 거야",
  "일에 치여 살다 보면 내가 뭘 좋아하는지 잊게 돼",
  "좋은 동료가 있으면 힘든 일도 버틸 수 있어",
  "번아웃이 오면 쉬어야 해, 억지로 버티면 안 돼",
  "자기 일을 즐기는 사람이 부러워",
  "면접 볼 때마다 긴장돼서 실력 발휘를 못 해",
  "인턴 시절이 제일 순수했던 것 같아",
  "창업은 로맨스가 아니라 현실이야",
  "회사에서 인정받으면 기분이 정말 좋다",
  "직장 내 인간관계가 제일 피곤해",
  "일과 생활의 균형을 찾는 게 인생의 숙제",
  "신입 때 멘토가 있었으면 많이 달랐을 텐데",
  "이직 후 3개월이 적응하기 가장 힘든 시기",
  "회사 밖에서 나의 가치를 알아야 해",
  "야근 수당도 없이 야근하는 현실이 씁쓸하다",
  "능력보다 정치가 중요한 회사는 떠나야 해",
  "꿈을 위해 안정적인 직장을 포기할 수 있을까",
  "경력 3년 차에 방향을 잡지 못하면 답답해",
  "좋아하는 일을 하면서 돈도 벌 수 있다면 최고지",

  // 음식/맛집 (30)
  "비 오는 날에는 역시 파전에 막걸리지",
  "혼밥도 맛있는 집을 알면 전혀 외롭지 않아",
  "엄마가 해준 밥이 세상에서 제일 맛있어",
  "떡볶이 맛집을 찾아다니는 게 취미가 됐다",
  "커피 없으면 하루를 시작할 수 없는 사람",
  "제철 과일을 먹을 때 행복감이 폭발한다",
  "라면 끓이는 것도 나름의 기술이 필요해",
  "처음 가본 이탈리안 레스토랑이 인생 맛집이었다",
  "매운 음식 먹으면 스트레스가 확 풀려",
  "베이킹은 실패해도 과정이 즐거워",
  "편의점 도시락도 꽤 괜찮은 시대가 됐다",
  "집밥의 소중함을 자취하면서 알게 됐어",
  "디저트는 별도의 위가 있다고 믿어",
  "새벽에 먹는 치킨은 왜 그렇게 맛있을까",
  "건강한 식단을 유지하는 게 생각보다 어렵다",
  "카페에서 케이크랑 커피 조합은 최고야",
  "국밥 한 그릇에 소주 한 잔이면 하루의 피로가 풀린다",
  "직접 요리하면 뭐든 더 맛있게 느껴져",
  "길거리 음식의 매력은 분위기에 있어",
  "맛있는 거 먹으면 기분이 좋아지는 건 과학",
  "다이어트 중에 야식의 유혹은 정말 힘들어",
  "해장국 한 그릇이면 숙취도 해결돼",
  "고기를 구울 때 나는 냄새가 세상에서 제일 좋아",
  "한식이 세계에서 인정받는 걸 보면 뿌듯해",
  "혼술 문화가 이제 당연해진 세상",
  "맛집 웨이팅은 길어도 기대감이 있으니까 참을 수 있어",
  "간장게장은 밥도둑이 맞다",
  "아침을 든든하게 먹으면 하루가 달라져",
  "여행 가면 그 지역 음식을 꼭 먹어봐야 해",
  "음식 사진 찍는 것도 이제 문화가 됐어",

  // 여행 (30)
  "제주도는 몇 번을 가도 좋다",
  "혼자 여행하면 진짜 나를 만나게 돼",
  "여행의 묘미는 계획에 없던 일이 생길 때",
  "비행기 타는 순간부터 이미 여행은 시작이야",
  "유럽 배낭여행은 인생에 한 번쯤 해봐야 해",
  "시골 마을에서 느끼는 여유가 진짜 힐링",
  "야경 예쁜 도시에 가면 시간 가는 줄 모른다",
  "여행지에서 만난 사람들이 잊을 수 없어",
  "캠핑은 자연과 하나 되는 느낌이라 좋아",
  "여행 가방 싸는 것부터 설레기 시작해",
  "해외여행 갈 때 현지 음식 도전이 제일 재밌어",
  "온천에 몸 담그면 모든 피로가 녹아내린다",
  "기차 여행은 창밖 풍경 보는 맛이야",
  "일본 여행은 편의점만 가도 재밌어",
  "여행 후 일상에 돌아오면 조금 우울해져",
  "사진보다 기억에 남는 여행이 좋은 여행",
  "항공권 특가 알림이 오면 심장이 뛴다",
  "바다가 보이는 숙소에서 잠들고 싶다",
  "로컬처럼 여행하는 게 진짜 여행이야",
  "숲길 산책하면 머릿속이 깨끗해져",
  "여행 중에 읽는 책은 더 깊게 다가와",
  "낯선 도시의 카페에서 멍하니 앉아 있는 시간이 좋아",
  "겨울 여행은 눈 내리는 곳으로 가야 제맛",
  "길을 잃어봐야 진짜 여행자가 된다고 생각해",
  "해변에서 일몰 보는 건 언제나 감동이야",
  "여행은 돈이 아니라 마음의 여유가 필요해",
  "친구랑 로드트립하면 추억이 배로 쌓여",
  "여행 사진 정리하면 그때 감정이 다시 살아나",
  "언어가 통하지 않아도 사람은 통한다",
  "여행지에서 우연히 발견한 장소가 최고의 명소",

  // 기술/프로그래밍 (30)
  "코딩하다 버그 잡으면 희열이 장난 아니야",
  "새로운 프레임워크 배우는 게 취미가 됐다",
  "GPT 시대에 프로그래머의 역할이 변하고 있어",
  "클린 코드는 미래의 나를 위한 선물",
  "사이드 프로젝트를 완성하는 게 제일 어렵다",
  "개발자 커뮤니티에서 배우는 게 학교보다 많아",
  "오픈소스에 기여하면 보람이 크다",
  "풀스택 개발자가 되려면 끝이 없어",
  "코드 리뷰는 귀찮지만 결국 코드 품질을 높여줘",
  "새벽 코딩은 집중력이 최고다",
  "기술 면접은 항상 떨리지만 성장의 기회야",
  "타입스크립트 쓰면 자바스크립트로 돌아갈 수 없어",
  "좋은 API 설계가 좋은 서비스를 만든다",
  "배포 후 에러 나면 심장이 멈추는 것 같아",
  "디자인 패턴을 실무에 적용하면 코드가 깔끔해져",
  "기술 블로그 쓰면서 정리하면 이해도가 올라가",
  "리눅스 커맨드라인에 익숙해지면 생산성이 확 올라가",
  "깃 충돌 해결하는 건 늘 긴장되는 작업",
  "테스트 코드 없이 리팩토링하는 건 모험이야",
  "AI 기술의 발전 속도가 너무 빨라서 따라가기 힘들다",
  "도커를 쓰면 개발 환경 세팅이 편해져",
  "알고리즘 문제 풀면 두뇌가 활성화되는 느낌",
  "레거시 코드를 리팩토링하는 건 고고학 같아",
  "좋은 개발 도구는 생산성을 10배 높여줘",
  "마이크로서비스는 필요할 때만 도입해야 해",
  "코딩은 논리와 창의력이 만나는 지점이야",
  "스타트업에서 개발하면 다양한 경험을 할 수 있어",
  "데이터베이스 설계가 서비스의 기반을 결정해",
  "프론트엔드와 백엔드의 경계가 점점 흐려지고 있어",
  "개발을 처음 시작할 때 Hello World 찍던 감동이 있었다",

  // 건강/운동 (30)
  "러닝 시작한 뒤로 몸도 마음도 건강해졌어",
  "헬스장 가기 싫은 날도 가면 기분이 좋아져",
  "요가하면 몸과 마음이 동시에 편해져",
  "건강은 잃어봐야 그 소중함을 안다",
  "충분히 자는 것만으로도 삶의 질이 올라가",
  "스트레칭은 하루 10분이면 되는데 잘 안 하게 돼",
  "등산하면서 보는 풍경이 운동 보상이야",
  "수영은 전신 운동이라 효과가 확실해",
  "명상을 시작한 뒤로 불안감이 줄었어",
  "규칙적인 식사가 건강의 기본이야",
  "자전거 타고 출퇴근하면 운동도 되고 교통비도 절약돼",
  "운동 후 먹는 프로틴은 왜 이렇게 맛있을까",
  "걷기만 해도 우울감이 줄어드는 걸 느꼈어",
  "필라테스는 몸의 균형을 잡아줘서 좋아",
  "건강검진 결과가 좋으면 그날 하루가 행복해",
  "물 2리터 마시기를 목표로 하고 있어",
  "근력 운동이 나이 들수록 중요하다는 걸 깨달았어",
  "운동 습관은 한 번 잡히면 빠지기 어려워",
  "스트레스 받을 때 운동이 최고의 해소법이야",
  "건강한 몸에 건강한 정신이 깃든다는 말이 맞아",
  "코어 운동은 모든 운동의 기본이야",
  "아침 공복에 하는 운동이 효과가 좋다더라",
  "운동 파트너가 있으면 동기부여가 확 돼",
  "다이어트는 운동보다 식단이 더 중요해",
  "마라톤 완주하면 인생관이 바뀐다고 하던데",
  "홈트레이닝도 꾸준하면 효과가 있어",
  "유산소와 무산소를 번갈아 하면 최고야",
  "잠을 잘 자는 것만큼 좋은 보약이 없어",
  "체중계 숫자보다 거울에 비친 내 모습이 중요해",
  "운동을 쉬면 몸이 바로 반응하는 게 느껴져",

  // 음악/영화/문화 (30)
  "비 오는 날 재즈 음악 들으면 감성이 폭발해",
  "영화 보고 나오면 한동안 그 세계에 빠져 있어",
  "플레이리스트를 만드는 것도 하나의 예술이야",
  "콘서트에서 느끼는 라이브의 에너지는 대체 불가야",
  "책 읽는 시간이 줄어드는 게 아쉬워",
  "넷플릭스 추천 알고리즘이 나보다 내 취향을 잘 알아",
  "어렸을 때 들었던 노래가 지금도 위로가 된다",
  "독립영화에서 느끼는 감동은 특별해",
  "미술관에 가면 시간이 멈추는 느낌이야",
  "좋은 음악은 말로 표현할 수 없는 감정을 전달해",
  "영화 엔딩 크레딧까지 보는 사람 여기 있어",
  "팟캐스트 듣는 게 출퇴근 시간의 낙이야",
  "뮤지컬은 무대에서 직접 봐야 진가를 알 수 있어",
  "옛날 한국 영화 다시 보면 새로운 감동이 있어",
  "악기 하나 배우고 싶은데 시간이 없어",
  "사진 찍는 것도 세상을 바라보는 하나의 방식이야",
  "웹툰이 이제 하나의 거대한 문화 산업이 됐어",
  "전시회에서 영감을 받으면 창작 욕구가 솟아",
  "드라마 정주행은 시작하면 멈출 수가 없어",
  "밤에 듣는 발라드는 감정을 증폭시켜",
  "다큐멘터리를 보면 세상을 더 넓게 보게 돼",
  "버스킹하는 사람들의 열정이 부러워",
  "책 한 권이 인생을 바꿀 수 있다고 믿어",
  "K-팝이 세계를 휩쓰는 걸 보면 자랑스러워",
  "클래식 음악은 집중력을 높여줘",
  "영화 속 명대사를 가끔 인용하게 된다",
  "갤러리에서 작품 앞에 서 있으면 시간이 멈춰",
  "음악 없는 하루는 상상할 수 없어",
  "애니메이션도 예술의 한 형태라고 생각해",
  "오래된 LP판의 소리는 디지털로 대체할 수 없어",

  // 자연/날씨 (30)
  "벚꽃이 필 때 산책하면 마음이 환해져",
  "비 오는 소리 들으면서 창밖 보는 게 좋아",
  "가을 단풍은 자연이 주는 최고의 선물",
  "눈 오는 날 아침은 세상이 조용해져서 좋다",
  "바다 앞에 서면 내 고민이 작게 느껴져",
  "별이 가득한 밤하늘을 본 적이 언제였는지",
  "일출을 보면 하루를 이긴 것 같은 기분이야",
  "숲속 산책은 최고의 명상이야",
  "여름 소나기 맞으면 어린 시절로 돌아간 느낌",
  "겨울 아침 공기가 폐를 깨끗하게 해주는 것 같아",
  "꽃이 피고 지는 걸 보면 삶의 순환을 느껴",
  "바람 부는 날 공원에서 벤치에 앉아 있고 싶어",
  "무지개를 보면 왠지 좋은 일이 생길 것 같아",
  "나무 그늘에서 낮잠 자는 건 최고의 사치야",
  "호수에 비친 하늘을 보면 평화로워져",
  "해질녘 하늘의 색감은 어떤 화가도 재현할 수 없어",
  "봄비 내리면 대지의 냄새가 참 좋다",
  "산 정상에 올라가면 세상을 다 가진 기분이야",
  "자연 속에 있으면 시간이 다르게 흘러",
  "도시에 살면서 자연이 그리울 때가 많아",
  "달이 밝은 밤에는 감성이 폭발해",
  "파도 소리는 세상에서 가장 좋은 백색소음이야",
  "가을 바람이 불면 왠지 센티멘털해져",
  "안개 낀 아침은 신비로워서 좋아",
  "비 온 뒤 맑은 하늘이 더 아름다워",
  "계절이 바뀔 때마다 새로운 시작 같아",
  "새벽 이슬 맺힌 풀잎을 보면 자연의 경이를 느껴",
  "강가에서 바람 맞으면 머리가 맑아져",
  "별똥별을 본 적 있어? 소원 빌었니?",
  "자연은 우리에게 가장 솔직한 거울이야",

  // 철학/인생 (30)
  "인생은 짧지만 하루는 길다",
  "후회 없는 선택은 없지만 선택을 후회하지는 말자",
  "행복은 목적지가 아니라 여정 그 자체야",
  "나이가 들수록 시간이 빨리 가는 느낌이야",
  "실패는 성공의 반대가 아니라 과정이야",
  "완벽함을 추구하다 보면 아무것도 시작하지 못해",
  "비교는 행복의 적이야",
  "감사하는 마음을 가지면 일상이 특별해져",
  "내가 통제할 수 없는 건 내려놓는 연습이 필요해",
  "오늘 하루도 충분히 잘 살았다",
  "작은 성취를 축하하는 것도 중요해",
  "과거를 바꿀 수 없으니 지금에 집중하자",
  "남의 시선을 의식하면 내 인생을 못 살아",
  "어른이 된다는 건 선택의 연속이야",
  "모든 일에는 때가 있다는 걸 믿어",
  "정답은 없지만 최선의 선택은 있어",
  "꿈을 꾸는 것만으로도 가치가 있어",
  "성장은 불편함에서 시작돼",
  "하고 싶은 거 하면서 살기에 인생은 짧아",
  "혼자만의 시간이 가장 솔직한 시간이야",
  "삶의 의미는 스스로 만들어 가는 거야",
  "지금 힘든 것도 나중에는 추억이 될 거야",
  "잘 쉬는 것도 능력이야",
  "나를 모르면 세상을 알 수 없어",
  "어제의 나보다 조금 더 나은 오늘의 나",
  "인생에서 가장 큰 용기는 진솔해지는 것",
  "매일 같은 하루도 관점을 바꾸면 새로워",
  "포기하지 않으면 실패가 아니야",
  "나를 사랑하는 것이 모든 관계의 시작이야",
  "살아있다는 것 자체가 기적이야",

  // 일상/감정 (30)
  "아침에 눈 뜨면 감사하다는 생각이 들어",
  "주말이 너무 빨리 가서 아쉬워",
  "빨래 개는 것도 나름의 명상이야",
  "택배 오는 날이 기다려지는 소소한 행복",
  "혼자 있는 시간이 가장 편해",
  "퇴근 후 집에 누울 때가 하루 중 제일 좋아",
  "강아지랑 산책하면 세상 근심이 사라져",
  "고양이가 무릎에 올라오면 움직일 수 없어",
  "목요일은 금요일을 앞둔 설렘이 있어",
  "새벽에 혼자 깨어 있으면 세상이 내 것 같아",
  "좋은 향기를 맡으면 기분이 바뀌어",
  "깨끗이 정리된 방을 보면 마음도 정돈돼",
  "늦잠 자는 것도 나에게 주는 선물이야",
  "산책하면서 음악 듣는 게 최고의 루틴",
  "일기 쓰면 하루를 정리할 수 있어서 좋아",
  "기분이 안 좋을 때 따뜻한 차 한잔이 위로가 돼",
  "오래간만에 친구 만나면 에너지가 충전돼",
  "비 오는 날 창문 두드리는 소리가 좋아",
  "카페에서 혼자 시간 보내는 것도 즐거워",
  "아무것도 안 하는 것도 하나의 활동이야",
  "좋아하는 옷 입으면 자신감이 올라가",
  "버스에서 창밖 보면서 멍 때리는 시간이 좋아",
  "새로운 계절이 오면 기분이 새로워져",
  "작은 선물을 받으면 하루 종일 기분이 좋아",
  "집에서 요리하면서 음악 듣는 저녁이 좋아",
  "알람 없이 자연스럽게 일어나는 아침이 최고야",
  "좋아하는 사람들과 함께하면 뭐든 즐거워",
  "한강 가서 치맥하면 스트레스가 확 풀려",
  "밤하늘 보면서 생각에 잠기는 시간이 좋아",
  "오늘도 무사히 하루를 보냈다는 것에 감사해",
];

// ─── OpenAI 배치 임베딩 ────────────────────────────────────────

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
}

/** OpenAI 임베딩 API를 배치로 호출한다 (최대 50개씩) */
async function batchEmbed(
  texts: string[],
  batchSize = 50
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(texts.length / batchSize);

    console.log(
      `임베딩 배치 ${batchNum}/${totalBatches} (${batch.length}개)...`
    );

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        input: batch,
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI API 오류 (${response.status}): ${errorBody}`
      );
    }

    const data: EmbeddingResponse = await response.json();
    // index 순서대로 정렬
    const sorted = data.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map((d) => d.embedding));

    console.log(`  토큰 사용량: ${data.usage.total_tokens}`);

    // rate limit 대비 짧은 대기
    if (i + batchSize < texts.length) {
      await sleep(500);
    }
  }

  return allEmbeddings;
}

// ─── K-means 클러스터링 + 구체 배치 ─────────────────────────────

/** 두 벡터의 코사인 유사도 계산 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** 두 벡터의 코사인 거리 (1 - 유사도) */
function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/** 벡터의 평균 계산 */
function meanVector(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      mean[i] += vec[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    mean[i] /= vectors.length;
  }
  return mean;
}

/**
 * K-means 클러스터링 (코사인 거리 기반)
 * 임베딩을 k개의 의미적 군집으로 분류한다
 */
function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations = 50
): { assignments: number[]; centroids: number[][] } {
  const n = embeddings.length;

  // k-means++ 초기화: 서로 먼 포인트를 초기 중심으로 선택
  const centroidIndices: number[] = [Math.floor(Math.random() * n)];
  while (centroidIndices.length < k) {
    const distances = embeddings.map((emb, i) => {
      if (centroidIndices.includes(i)) return 0;
      let minDist = Infinity;
      for (const ci of centroidIndices) {
        const dist = cosineDistance(emb, embeddings[ci]);
        if (dist < minDist) minDist = dist;
      }
      return minDist * minDist;
    });
    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < n; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroidIndices.push(i);
        break;
      }
    }
    // 안전장치: r이 남으면 마지막 미선택 인덱스 추가
    if (centroidIndices.length < centroidIndices.length) {
      for (let i = 0; i < n; i++) {
        if (!centroidIndices.includes(i)) {
          centroidIndices.push(i);
          break;
        }
      }
    }
  }

  let centroids = centroidIndices.map((i) => [...embeddings[i]]);
  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // 할당 단계: 각 포인트를 가장 가까운 중심에 배정
    const newAssignments = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = cosineDistance(embeddings[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      newAssignments[i] = bestCluster;
    }

    // 수렴 확인
    const changed = newAssignments.some(
      (a, i) => a !== assignments[i]
    );
    assignments = newAssignments;

    if (!changed) {
      console.log(`  K-means 수렴: ${iter + 1}번째 반복`);
      break;
    }

    // 업데이트 단계: 중심 재계산
    const newCentroids: number[][] = [];
    for (let c = 0; c < k; c++) {
      const members = embeddings.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        newCentroids.push(meanVector(members));
      } else {
        // 빈 클러스터는 랜덤 재초기화
        newCentroids.push([...embeddings[Math.floor(Math.random() * n)]]);
      }
    }
    centroids = newCentroids;
  }

  return { assignments, centroids };
}

/**
 * 피보나치 구면 분포: k개 포인트를 구체 위에 균등 분배
 * 클러스터 중심을 최대한 떨어뜨린다
 */
function fibonacciSpherePoints(
  k: number
): Array<{ lat: number; lng: number }> {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const points: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < k; i++) {
    const y = 1 - (2 * i) / (k - 1 || 1);
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    const lat = (Math.asin(y) * 180) / Math.PI;
    const lng = ((theta % (2 * Math.PI)) * 180) / Math.PI - 180;

    points.push({ lat, lng });
  }

  return points;
}

/**
 * K-means 결과를 기반으로 구체 좌표 배치
 * 1. 각 클러스터 중심을 구체 위 균등 분배된 위치에 매핑
 * 2. 클러스터 내 메시지는 중심 주변에 유사도 비례로 분산
 */
function placeWithClusters(
  embeddings: number[][],
  assignments: number[],
  centroids: number[][],
  spreadRadius = 20
): Array<{ lat: number; lng: number }> {
  const k = centroids.length;
  const spherePoints = fibonacciSpherePoints(k);

  console.log(`  클러스터 ${k}개를 구체 위에 배치...`);
  for (let c = 0; c < k; c++) {
    const count = assignments.filter((a) => a === c).length;
    console.log(
      `  클러스터 ${c}: ${count}개 메시지, 중심 (${spherePoints[c].lat.toFixed(1)}, ${spherePoints[c].lng.toFixed(1)})`
    );
  }

  const coords: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < embeddings.length; i++) {
    const cluster = assignments[i];
    const center = spherePoints[cluster];
    const centroid = centroids[cluster];

    // 클러스터 중심과의 거리에 비례한 오프셋
    const distFromCenter = cosineDistance(embeddings[i], centroid);
    const offsetScale = distFromCenter * spreadRadius;

    // 클러스터 내에서 고유한 각도로 분산 (겹침 방지)
    const clusterMembers = assignments
      .map((a, idx) => ({ a, idx }))
      .filter((x) => x.a === cluster)
      .map((x) => x.idx);
    const indexInCluster = clusterMembers.indexOf(i);
    const angleInCluster =
      (indexInCluster / clusterMembers.length) * 2 * Math.PI;

    // 약간의 랜덤 노이즈 추가
    const jitter = (Math.random() - 0.5) * 3;

    const latOffset =
      Math.cos(angleInCluster) * offsetScale + jitter;
    const lngOffset =
      Math.sin(angleInCluster) * offsetScale + jitter;

    const newLat = Math.max(
      -90,
      Math.min(90, center.lat + latOffset)
    );
    const newLng = Math.max(
      -180,
      Math.min(180, center.lng + lngOffset)
    );

    coords.push({ lat: newLat, lng: newLng });
  }

  return coords;
}

// ─── Supabase 배치 저장 ────────────────────────────────────────

/** 임베딩 벡터를 pgvector 문자열로 변환 */
function embeddingToString(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/** 메시지를 Supabase에 배치 저장 (50개씩) */
async function batchInsert(
  messages: Array<{
    content: string;
    embedding: number[];
    lat: number;
    lng: number;
  }>,
  batchSize = 50
): Promise<number> {
  let insertedCount = 0;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(messages.length / batchSize);

    console.log(
      `DB 저장 배치 ${batchNum}/${totalBatches} (${batch.length}개)...`
    );

    const rows = batch.map((msg) => ({
      content: msg.content,
      embedding: embeddingToString(msg.embedding),
      lat: msg.lat,
      lng: msg.lng,
      reaction_count: 0,
    }));

    const { error } = await supabase.from("messages").insert(rows);

    if (error) {
      console.error(`배치 ${batchNum} 저장 실패:`, error.message);
      throw new Error(`DB 저장 실패: ${error.message}`);
    }

    insertedCount += batch.length;
  }

  return insertedCount;
}

// ─── 군집 검증 ─────────────────────────────────────────────────

interface Cluster {
  center: { lat: number; lng: number };
  messages: string[];
  avgSimilarity: number;
}

/** 간단한 거리 기반 군집 분석 (좌표 거리 기준) */
function analyzeClusters(
  messages: string[],
  coords: Array<{ lat: number; lng: number }>,
  embeddings: number[][],
  clusterRadius = 15
): Cluster[] {
  const assigned = new Set<number>();
  const clusters: Cluster[] = [];

  for (let i = 0; i < messages.length; i++) {
    if (assigned.has(i)) continue;

    // 이 메시지를 중심으로 반경 내 메시지 찾기
    const members: number[] = [i];
    assigned.add(i);

    for (let j = i + 1; j < messages.length; j++) {
      if (assigned.has(j)) continue;

      const dist = Math.sqrt(
        Math.pow(coords[i].lat - coords[j].lat, 2) +
          Math.pow(coords[i].lng - coords[j].lng, 2)
      );

      if (dist <= clusterRadius) {
        members.push(j);
        assigned.add(j);
      }
    }

    // 군집 내 평균 코사인 유사도 계산
    let totalSim = 0;
    let simCount = 0;
    for (let a = 0; a < members.length; a++) {
      for (let b = a + 1; b < members.length; b++) {
        totalSim += cosineSimilarity(
          embeddings[members[a]],
          embeddings[members[b]]
        );
        simCount++;
      }
    }

    if (members.length >= 3) {
      // 3개 이상 모인 것만 군집으로 인정
      const centerLat =
        members.reduce((sum, idx) => sum + coords[idx].lat, 0) /
        members.length;
      const centerLng =
        members.reduce((sum, idx) => sum + coords[idx].lng, 0) /
        members.length;

      clusters.push({
        center: { lat: centerLat, lng: centerLng },
        messages: members.map((idx) => messages[idx]),
        avgSimilarity: simCount > 0 ? totalSim / simCount : 0,
      });
    }
  }

  return clusters;
}

// ─── 유틸리티 ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── 메인 실행 ─────────────────────────────────────────────────

async function main() {
  const K = 10; // 클러스터 수 (카테고리 수와 동일)

  console.log("=== Semantic Globe 시드 데이터 생성 ===");
  console.log(`메시지 수: ${SEED_MESSAGES.length}개, 클러스터: ${K}개\n`);

  // 0. 기존 데이터 정리
  console.log("[0/5] 기존 데이터 정리 중...");
  const { error: deleteReactionsErr } = await supabase
    .from("reactions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteReactionsErr) {
    console.warn("  reactions 정리 실패 (무시 가능):", deleteReactionsErr.message);
  }
  const { error: deleteErr } = await supabase
    .from("messages")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteErr) {
    console.warn("  messages 정리 실패:", deleteErr.message);
  }
  console.log("  기존 데이터 정리 완료\n");

  // 1. 임베딩 생성
  console.log("[1/5] OpenAI 임베딩 생성 중...");
  const embeddings = await batchEmbed(SEED_MESSAGES);
  console.log(`임베딩 완료: ${embeddings.length}개\n`);

  // 2. K-means 클러스터링
  console.log(`[2/5] K-means 클러스터링 (K=${K})...`);
  const { assignments, centroids } = kMeansClustering(embeddings, K);
  console.log(`클러스터링 완료\n`);

  // 3. 좌표 배치
  console.log("[3/5] 클러스터 기반 구체 좌표 배치 중...");
  const coords = placeWithClusters(embeddings, assignments, centroids);
  console.log(`좌표 배치 완료: ${coords.length}개\n`);

  // 4. DB 저장
  console.log("[4/5] Supabase에 저장 중...");
  const insertData = SEED_MESSAGES.map((content, i) => ({
    content,
    embedding: embeddings[i],
    lat: coords[i].lat,
    lng: coords[i].lng,
  }));
  const insertedCount = await batchInsert(insertData);
  console.log(`DB 저장 완료: ${insertedCount}개\n`);

  // 5. 군집 검증
  console.log("[5/5] 군집 분석 중...");
  const clusters = analyzeClusters(
    SEED_MESSAGES,
    coords,
    embeddings
  );

  console.log(`\n=== 군집 분석 결과 ===`);
  console.log(`총 군집 수: ${clusters.length}개`);
  console.log(
    `군집에 포함된 메시지: ${clusters.reduce((sum, c) => sum + c.messages.length, 0)}개 / ${SEED_MESSAGES.length}개`
  );

  // 상위 10개 군집 출력
  const topClusters = clusters
    .sort((a, b) => b.messages.length - a.messages.length)
    .slice(0, 10);

  topClusters.forEach((cluster, i) => {
    console.log(
      `\n--- 군집 ${i + 1} (${cluster.messages.length}개, 평균 유사도: ${cluster.avgSimilarity.toFixed(3)}) ---`
    );
    console.log(
      `  위치: (${cluster.center.lat.toFixed(2)}, ${cluster.center.lng.toFixed(2)})`
    );
    // 대표 메시지 3개만 출력
    cluster.messages.slice(0, 3).forEach((msg) => {
      console.log(`  - ${msg.substring(0, 50)}...`);
    });
    if (cluster.messages.length > 3) {
      console.log(`  ... 외 ${cluster.messages.length - 3}개`);
    }
  });

  // Go/No-Go 판단
  const significantClusters = clusters.filter(
    (c) => c.messages.length >= 5 && c.avgSimilarity > 0.3
  );
  console.log(`\n=== Go/No-Go 판단 ===`);
  console.log(
    `유의미한 군집 (5개 이상, 유사도 0.3+): ${significantClusters.length}개`
  );

  if (significantClusters.length >= 5) {
    console.log("결과: GO - 군집이 유의미하게 형성됨");
  } else if (significantClusters.length >= 3) {
    console.log(
      "결과: 조건부 GO - 군집 형성이 약하지만 진행 가능"
    );
  } else {
    console.log(
      "결과: NO-GO - 접근법 재검토 필요 (UMAP 도입 권장)"
    );
  }

  console.log("\n시드 데이터 생성 완료!");
}

main().catch((err) => {
  console.error("스크립트 실행 실패:", err);
  process.exit(1);
});
