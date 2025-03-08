// 보물상자 클래스 - 애니메이션과 칩 획득 기능을 구현
export class Chest {
  constructor(x, y, size = 50) {
    this.x = x; // 상자 X 위치
    this.y = y; // 상자 Y 위치
    this.size = size; // 상자 크기
    this.isOpened = false; // 상자가 열렸는지 여부
    this.isAnimating = false; // 애니메이션 중인지 여부
    this.frameIndex = 0; // 현재 프레임 인덱스
    this.tickCount = 0; // 애니메이션 틱 카운트
    this.ticksPerFrame = 3; // 프레임당 틱 수
    this.totalFrames = 40; // 총 프레임 수를 40으로 수정 (JSON에서 0-39)
    
    // 칩 관련 속성
    this.chipsAmount = 100; // 상자에서 나오는 칩 수를 정확히 100개로 설정
    this.chips = []; // 튀어나오는 칩 파티클
    this.shouldSpawnChips = false; // 애니메이션 완료 후 칩 생성 여부
    
    // 캔버스 크기 저장 (일반적인 값으로 초기화, 나중에 업데이트)
    this.canvasWidth = 800;
    this.canvasHeight = 600;
    
    // 칩이 상자 주변으로만 떨어질 수 있는 범위 설정
    this.chipRadius = 150; // 상자 중심으로부터 최대 거리
    
    // 이미지 로드
    this.loadImages();
  }
  
  // 이미지 로드
  loadImages() {
    // 상자 이미지 로드
    this.chestImage = new Image();
    
    // 이미지 로딩 성공 처리
    this.chestImage.onload = () => {
      console.log("상자 이미지 로딩 성공:", this.chestImage.src);
      this.useDefaultChest = false;
    };
    
    // 이미지 로딩 오류 처리
    this.chestImage.onerror = () => {
      console.error("상자 이미지 로딩 실패:", this.chestImage.src);
      // 로딩 실패 시 기본 색상으로 대체
      this.useDefaultChest = true;
    };
    
    // 기본적으로 기본 상자 사용 (이미지가 로드되면 false로 변경)
    this.useDefaultChest = true;
    
    // 이미지 경로 설정 (onload/onerror 핸들러 등록 후 설정)
    this.chestImage.src = "assets/Chest 3.png";
    console.log("상자 이미지 로딩 시작:", this.chestImage.src);
    
    // 칩 이미지는 직접 그리도록 수정 (card.js의 drawChipDrops 방식 사용)
    this.useDefaultChip = true;
  }
  
  // 플레이어와 상자 충돌 확인
  checkPlayerCollision(player) {
    const distance = Math.sqrt(
      Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
    );
    return distance < (player.size / 2 + this.size / 2);
  }
  
  // 상자 열기
  open() {
    if (!this.isOpened && !this.isAnimating) {
      this.isAnimating = true;
      this.frameIndex = 0;
      console.log("상자 열기 시작");
      
      // 참고: 칩 생성은 이제 30프레임에서 자동으로 이루어짐
      // 애니메이션은 끝까지 재생됨
    }
  }
  
  // 칩 생성 메서드 - 애니메이션 완료 후 호출
  spawnChips() {
    // 칩의 개수는 20-35개 사이로 하되, 합계가 100이 되도록 분배
    const totalChips = 100;
    const minChipsCount = 20; // 최소 파티클 수
    const maxChipsCount = 35; // 최대 파티클 수
    const chipsCount = Math.floor(Math.random() * (maxChipsCount - minChipsCount + 1)) + minChipsCount;
    
    // 각 칩의 개별 가치 계산 (첫 번째 칩은 보정을 위한 값)
    const chipValues = Array(chipsCount).fill(0);
    let remainingValue = totalChips;
    
    // 마지막 하나를 제외한 칩 가치 할당
    for (let i = 0; i < chipsCount - 1; i++) {
      // 각 칩마다 1~10 사이의 랜덤한 값 할당 (마지막은 남은 값으로 조정)
      const value = Math.max(1, Math.min(10, Math.floor(Math.random() * 10) + 1));
      const adjustedValue = Math.min(value, remainingValue - 1); // 항상 1 이상은 남겨둠
      chipValues[i] = adjustedValue;
      remainingValue -= adjustedValue;
    }
    
    // 마지막 칩에 남은 값 할당
    chipValues[chipsCount - 1] = remainingValue;
    
    // 칩 값 섞기
    for (let i = chipValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chipValues[i], chipValues[j]] = [chipValues[j], chipValues[i]];
    }
    
    // 칩 파티클 생성
    for (let i = 0; i < chipsCount; i++) {
      // 상자 중심에서 모든 방향으로 퍼지는 효과
      const angle = Math.random() * Math.PI * 2; // 0-360도 랜덤 방향
      const speed = 2 + Math.random() * 3; // 속도 감소 (기존 3~8 -> 2~5)
      
      this.chips.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed, // 방향성 있는 속도로 변경
        vy: Math.sin(angle) * speed - 2, // 위쪽으로 약간 더 튀어오르게
        size: 6 + Math.random() * 4, // 크기 감소 (기존 12~20 -> 6~10)
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2, // 회전 속도 감소
        collected: false,
        alpha: 1,
        value: chipValues[i] // 각 칩의 가치 (총합 100)
      });
    }
    
    console.log(`${chipsCount}개의 칩 생성 완료! 총 가치: ${chipValues.reduce((a, b) => a + b, 0)}`);
  }
  
  // 칩 업데이트 (플레이어 방향으로 모이도록)
  updateChips(player) {
    if (!player) return 0; // 플레이어가 없으면 수집된 칩 가치 0 반환
    
    let collectedValue = 0; // 이번 프레임에 수집된 칩의 총 가치
    
    // 플레이어의 캔버스 참조로 실제 캔버스 크기 업데이트
    if (player.canvas) {
      this.canvasWidth = player.canvas.width;
      this.canvasHeight = player.canvas.height;
    }
    
    for (let i = 0; i < this.chips.length; i++) {
      const chip = this.chips[i];
      
      if (chip.collected) continue;
      
      // 플레이어와 충돌 확인
      const dx = player.x - chip.x;
      const dy = player.y - chip.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 플레이어가 가까워지면 칩을 플레이어 쪽으로 이동
      if (distance < 150) {
        const speed = 0.05 + (1 - distance / 150) * 0.1; // 거리가 가까울수록 빨라짐
        chip.vx += dx * speed;
        chip.vy += dy * speed;
      }
      
      // 칩 운동 업데이트
      chip.vy += 0.03; // 중력 감소 (원래 0.05)
      chip.vx *= 0.98; // 마찰
      chip.vy *= 0.98; // 마찰
      
      // 칩 위치 업데이트
      chip.x += chip.vx;
      chip.y += chip.vy;
      chip.rotation += chip.rotationSpeed;
      
      // 상자로부터의 거리 계산
      const chestDx = chip.x - this.x;
      const chestDy = chip.y - this.y;
      const chestDistance = Math.sqrt(chestDx * chestDx + chestDy * chestDy);
      
      // 상자 주변으로만 제한 (지정된 반경 밖으로 나가지 않도록)
      if (chestDistance > this.chipRadius) {
        // 상자 방향으로 정규화된 벡터 계산
        const norm = this.chipRadius / chestDistance;
        // 상자 중심 기준으로 최대 반경 내 위치로 조정
        chip.x = this.x + chestDx * norm;
        chip.y = this.y + chestDy * norm;
        // 벽에 부딪혔을 때 속도 감소 및 방향 반전
        chip.vx *= -0.5;
        chip.vy *= -0.5;
      }
      
      // 플레이어와 충돌하면 칩 수집
      if (distance < player.size / 2 + 5) {
        chip.collected = true;
        chip.alpha = 0;
        collectedValue += chip.value || 1; // 칩 가치 누적 (기본값 1)
        console.log(`칩 수집: ${chip.value || 1}개 (남은 칩: ${this.chips.filter(c => !c.collected).length}개)`);
      }
    }
    
    // 수집된 칩 제거
    this.chips = this.chips.filter(chip => chip.alpha > 0);
    
    return collectedValue; // 이번 프레임에 수집된 칩 가치 반환
  }
  
  // 애니메이션 업데이트
  update() {
    // 애니메이션 상태 업데이트
    if (this.isAnimating) {
      this.tickCount++;
      
      if (this.tickCount > this.ticksPerFrame) {
        this.tickCount = 0;
        
        // 애니메이션 프레임 업데이트
        if (this.frameIndex < this.totalFrames - 1) {
          this.frameIndex++;
          // 애니메이션 진행상황 로깅 (디버깅용)
          if (this.frameIndex % 5 === 0) {
            console.log(`상자 애니메이션 진행 중: ${this.frameIndex}/${this.totalFrames-1}`);
          }
          
          // 30프레임 부근에서 칩 생성 (애니메이션은 계속 진행)
          if (this.frameIndex === 30 && !this.chips.length) {
            console.log("상자 30프레임 도달: 칩 생성 시작!");
            this.shouldSpawnChips = true;
            this.spawnChips();
          }
        }
      }
    }
    
    // 애니메이션 완료 후 상태 업데이트
    if (this.isAnimating && this.frameIndex >= this.totalFrames - 1) {
      this.isOpened = true;
      this.isAnimating = false;
    }
  }
  
  // 그리기
  draw(ctx) {
    // 상자 위치에 작은 마커 표시 (디버깅용)
    ctx.save();
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // 상자 그리기
    if (this.useDefaultChest) {
      // 이미지 로딩 실패 시 기본 상자 그리기
      ctx.save();
      ctx.translate(this.x, this.y);
      
      // 닫힌 상자 또는 열린 상자 상태에 따라 다른 색상 사용
      if (this.isOpened) {
        // 열린 상자
        ctx.fillStyle = "#CD853F"; // 밝은 갈색
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        
        // 열린 상자 안쪽
        ctx.fillStyle = "#DEB887"; // 더 밝은 갈색
        ctx.fillRect(-this.size / 2.5, -this.size / 3, this.size / 1.25, this.size / 2);
        
        // "OPEN" 텍스트
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("OPEN", 0, 0);
      } else {
        // 닫힌 상자 본체
        ctx.fillStyle = "#8B4513"; // 어두운 갈색
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        
        // 상자 뚜껑
        ctx.fillStyle = "#A0522D"; // 중간 갈색
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 3);
        
        // 장식선
        ctx.strokeStyle = "#FFD700"; // 황금색 장식
        ctx.lineWidth = 3;
        ctx.strokeRect(-this.size / 2.5, -this.size / 3, this.size / 1.25, this.size / 5);
        
        // 자물쇠
        ctx.fillStyle = "#FFD700"; // 황금색
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 상자 테두리
      ctx.strokeStyle = "#5D4037"; // 어두운 갈색 테두리
      ctx.lineWidth = 4;
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
      
      ctx.restore();
    } else if (this.chestImage.complete) {
      // 이미지가 로드된 경우 스프라이트 사용
      const frameWidth = 32; // 프레임 가로 크기
      const frameHeight = 32; // 프레임 세로 크기
      
      ctx.save();
      ctx.translate(this.x, this.y);
      
      // 상자가 이미 열려있고 애니메이션이 끝난 경우 마지막 프레임 유지
      const frameIndex = this.isOpened && !this.isAnimating ? this.totalFrames - 1 : this.frameIndex;
      
      // 단순히 프레임 인덱스에 따라 위치 계산
      // 스프라이트시트가 한 줄로 되어 있다고 가정
      const sx = frameIndex * frameWidth;
      const sy = 0;
      
      // 디버깅 정보
      if (frameIndex % 5 === 0) {
        console.log(`상자 그리기: 프레임 ${frameIndex}/${this.totalFrames-1}, 위치 (${sx}, ${sy})`);
      }
      
      // 상자 그리기
      ctx.drawImage(
        this.chestImage,
        sx, sy, frameWidth, frameHeight,
        -this.size / 2, -this.size / 2, this.size, this.size
      );
      
      ctx.restore();
    }
    
    // 칩 그리기 (card.js에서 사용하는 방식으로 직접 그리기)
    for (const chip of this.chips) {
      if (chip.collected) continue;
      
      ctx.save();
      ctx.globalAlpha = chip.alpha;
      
      // 그림자 효과
      ctx.beginPath();
      ctx.arc(chip.x + 1, chip.y + 1, chip.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();
      
      // 칩 외부 테두리
      ctx.beginPath();
      ctx.arc(chip.x, chip.y, chip.size, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700"; // 황금색
      ctx.fill();
      
      // 칩 내부 원
      ctx.beginPath();
      ctx.arc(chip.x, chip.y, chip.size * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = "#FFA500"; // 주황색
      ctx.fill();
      
      // 칩 가치 텍스트 (큰 가치만 표시, 크기 조건 삭제)
      if (chip.value > 8) {
        ctx.fillStyle = "white";
        ctx.font = "bold 8px Arial"; // 폰트 크기 감소
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(chip.value.toString(), chip.x, chip.y);
      }
      
      // 추가 반짝임 효과 (더 미묘하게)
      const time = Date.now() / 800; // 더 느린 애니메이션
      const glowSize = chip.size * (1.05 + 0.05 * Math.sin(time + chip.rotation)); // 반짝임 효과 감소
      
      ctx.beginPath();
      ctx.arc(chip.x, chip.y, glowSize, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 0, 0.2)"; // 더 투명하게
      ctx.lineWidth = 1; // 테두리 줄이기
      ctx.stroke();
      
      ctx.restore();
    }
  }
} 