// village.js - 마을 관련 기능을 담당하는 모듈

export class Village {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    
    // 마을 배경 이미지
    this.villageBackground = "rgba(50, 120, 80, 0.3)"; // 임시 배경색
    
    // 건물 이미지 로드
    this.buildings = [
      {
        name: "의료소",
        image: new Image(),
        x: canvas.width * 0.2,
        y: canvas.height * 0.3,
        width: 192,
        height: 192,
      },
      {
        name: "레스토랑",
        image: new Image(),
        x: canvas.width * 0.5,
        y: canvas.height * 0.4,
        width: 192,
        height: 192,
      },
      {
        name: "총포상",
        image: new Image(),
        x: canvas.width * 0.8,
        y: canvas.height * 0.3,
        width: 192,
        height: 192,
      },
      {
        name: "창고",
        image: new Image(),
        x: canvas.width * 0.6,
        y: canvas.height * 0.7,
        width: 192,
        height: 192,
      }
    ];
    
    // 워프 포인트 정의
    this.warpPoint = {
      x: canvas.width * 0.5,
      y: canvas.height * 0.6,
      radius: 40,
      active: false,
      interactionDistance: 60, // 상호작용 가능 거리
      glowIntensity: 0, // 발광 효과 강도 (0~1)
      lastGlowUpdate: 0,
      glowDirection: 1, // 1: 증가, -1: 감소
    };
    
    // 이미지 경로 설정 및 로드
    this.buildings[0].image.src = "assets/Medic Shopp.png"; // 의료소
    this.buildings[1].image.src = "assets/Resturant.png"; // 레스토랑
    this.buildings[2].image.src = "assets/Gun Shop.png"; // 총포상
    this.buildings[3].image.src = "assets/Shed.png"; // 창고
  }
  
  // 마을 그리기
  draw(player) {
    // 배경 그리기
    this.ctx.fillStyle = this.villageBackground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 건물 그리기 (플레이어보다 뒤에 있는 건물)
    this.buildings.forEach(building => {
      if (building.y + building.height < player.y) {
        this.drawBuilding(building);
      }
    });
    
    // 워프 포인트 그리기
    this.drawWarpPoint(player);
    
    // 건물 그리기 (플레이어보다 앞에 있는 건물)
    this.buildings.forEach(building => {
      if (building.y + building.height >= player.y) {
        this.drawBuilding(building);
      }
    });
    
    // 안내 메시지 표시
    this.drawInstructions(player);
  }
  
  // 건물 그리기
  drawBuilding(building) {
    this.ctx.drawImage(
      building.image,
      building.x - building.width / 2,
      building.y - building.height / 2,
      building.width,
      building.height
    );
    
    // 건물 이름 표시
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      building.name,
      building.x,
      building.y - building.height / 2 - 10
    );
  }
  
  // 워프 포인트 그리기
  drawWarpPoint(player) {
    const now = Date.now();
    
    // 발광 효과 업데이트
    if (now - this.warpPoint.lastGlowUpdate > 50) {
      this.warpPoint.glowIntensity += 0.05 * this.warpPoint.glowDirection;
      if (this.warpPoint.glowIntensity >= 1) {
        this.warpPoint.glowIntensity = 1;
        this.warpPoint.glowDirection = -1;
      } else if (this.warpPoint.glowIntensity <= 0.3) {
        this.warpPoint.glowIntensity = 0.3;
        this.warpPoint.glowDirection = 1;
      }
      this.warpPoint.lastGlowUpdate = now;
    }
    
    // 워프 포인트와 플레이어 거리 계산
    const dx = this.warpPoint.x - player.x;
    const dy = this.warpPoint.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 상호작용 가능 여부 갱신
    this.warpPoint.active = distance <= this.warpPoint.interactionDistance;
    
    // 워프 포인트 그리기
    const gradient = this.ctx.createRadialGradient(
      this.warpPoint.x, this.warpPoint.y, 
      this.warpPoint.radius * 0.3,
      this.warpPoint.x, this.warpPoint.y, 
      this.warpPoint.radius
    );
    
    gradient.addColorStop(0, `rgba(80, 200, 255, ${this.warpPoint.glowIntensity})`);
    gradient.addColorStop(0.7, `rgba(30, 100, 255, ${this.warpPoint.glowIntensity * 0.7})`);
    gradient.addColorStop(1, `rgba(10, 50, 200, 0)`);
    
    this.ctx.beginPath();
    this.ctx.arc(
      this.warpPoint.x, 
      this.warpPoint.y, 
      this.warpPoint.radius, 
      0, 
      Math.PI * 2
    );
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // 워프 포인트 테두리
    this.ctx.beginPath();
    this.ctx.arc(
      this.warpPoint.x, 
      this.warpPoint.y, 
      this.warpPoint.radius, 
      0, 
      Math.PI * 2
    );
    this.ctx.strokeStyle = `rgba(100, 200, 255, ${this.warpPoint.glowIntensity * 0.8})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
  
  // 상호작용 안내 메시지 표시
  drawInstructions(player) {
    if (this.warpPoint.active) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "18px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "E키를 눌러 게임 시작",
        this.warpPoint.x,
        this.warpPoint.y - this.warpPoint.radius - 20
      );
    }
  }
  
  // 워프 포인트와 상호작용 시도
  tryInteractWithWarpPoint() {
    if (this.warpPoint.active) {
      // 게임 시작 로직 호출
      return true;
    }
    return false;
  }
} 