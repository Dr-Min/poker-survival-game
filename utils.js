// 거리 계산 함수
export function getDistance(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// 충돌 체크 함수
export function checkCollision(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (obj1.size + obj2.size) / 2;
}

// 랜덤 정수 생성 함수 (min 이상, max 이하)
export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 카드 색상 가져오기
export function getCardColor(type) {
  switch (type) {
    case "spade":
      return "#000000";
    case "heart":
      return "#ff0000";
    case "diamond":
      return "#ff00ff";
    case "clover":
      return "#00ff00";
  }
}

// 카드 번호 표시 변환
export function getDisplayNumber(number) {
  switch (number) {
    case 1:
      return "A";
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    default:
      return number.toString();
  }
}

// 파일 번호 변환 함수
export function getFileNumber(type, number) {
  const baseOffset = {
    heart: 0,
    diamond: 13,
    spade: 26,
    clover: 39,
  }[type];

  let fileIndex;
  if (number === 1) fileIndex = 1;
  else if (number === 13) fileIndex = 2;
  else if (number === 12) fileIndex = 3;
  else if (number === 11) fileIndex = 4;
  else fileIndex = number + 3;

  return String(baseOffset + fileIndex).padStart(2, "0");
}
