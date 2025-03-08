// sheep.js - 마을에 존재하는 양 관리 클래스

export class Sheep {
  constructor(canvas, x, y, animationData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.x = x;
    this.y = y;
    
    // 양 상태
    this.states = {
      IDLE: 'idle',      // 기본 상태
      MOVE: 'move',      // 이동 상태
      SLEEP: 'sleep',    // 자는 상태
      GETUP: 'getup',    // 일어나는 상태
      TRANSITION: 'transition', // 전환 상태
      RUNAWAY: 'runaway' // 도망가는 상태 추가
    };
    
    this.currentState = this.states.IDLE;
    this.direction = Math.random() > 0.5 ? 1 : -1; // 1: 오른쪽, -1: 왼쪽
    
    // 양 크기 조정 (20% 증가)
    this.scale = 1.2;
    
    // 애니메이션 데이터 설정
    this.animations = animationData;
    
    // 현재 애니메이션 프레임
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.frameDuration = 100; // 기본 프레임 지속 시간 (ms)
    
    // 양 행동 타이머
    this.stateTimer = Math.random() * 3000; // 랜덤한 초기 타이머 값 (동시 움직임 방지)
    this.stateChangeDuration = this.getRandomDuration(3000, 8000); // 상태 변경 타이밍
    this.moveDuration = 0;
    this.moveTimer = 0;
    this.moveSpeed = 0.5; // 기본 이동 속도
    this.runawaySpeed = 1.0; // 도망가는 속도 (기본 속도의 2배)
    
    // 이동 목표 지점
    this.targetX = null;
    this.targetY = null;
    
    // 무리 행동 관련 속성
    this.flockInfluence = 0.45; // 무리 영향력 (0~1) - 0.3에서 0.45로 증가
    this.minFlockDistance = 40; // 최소 무리 거리 - 50에서 40으로 감소
    this.maxFlockDistance = 120; // 최대 무리 거리 - 150에서 120으로 감소
    
    // 플레이어 감지 거리
    this.playerDetectDistance = 150; // 플레이어 감지 거리
    this.returnToFlockTimer = 0; // 무리로 돌아가는 타이머
  }
  
  // 양 상태 업데이트
  update(deltaTime, player, otherSheeps) {
    // 너무 큰 deltaTime 제한 (텔레포트 방지)
    const cappedDeltaTime = Math.min(deltaTime, 33); // 최대 33ms (약 30fps)
    
    // 프레임 애니메이션 업데이트
    this.frameTimer += cappedDeltaTime;
    
    const animation = this.getCurrentAnimation();
    
    // 애니메이션이 있는 경우에만 프레임 업데이트
    if (animation && animation.frames && animation.frames.length > 0) {
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0;
        
        // 이전 프레임 인덱스 저장
        const prevFrameIndex = this.frameIndex;
        
        // 애니메이션 프레임 업데이트
        this.frameIndex = (this.frameIndex + 1) % animation.frames.length;
        
        // 애니메이션 끝에 도달했는지 확인 (마지막 프레임에서 첫 프레임으로 돌아갈 때)
        if (prevFrameIndex === animation.frames.length - 1 && this.frameIndex === 0) {
          // 애니메이션 사이클 완료 이벤트
          this.onAnimationCycleComplete();
        }
      }
    } else {
      this.frameIndex = 0;
    }
    
    // 상태 관련 타이머 업데이트
    this.stateTimer += cappedDeltaTime;
    
    // 플레이어와의 상호작용 처리
    this.handlePlayerInteraction(player, otherSheeps);
    
    // 상태별 동작 처리
    switch (this.currentState) {
      case this.states.IDLE:
        // 일정 시간마다 상태 변경
        if (this.stateTimer >= this.stateChangeDuration) {
          this.stateTimer = 0;
          this.stateChangeDuration = this.getRandomDuration(3000, 8000);
          this.changeState(otherSheeps);
        }
        break;
        
      case this.states.MOVE:
        // 이동 처리
        this.moveTimer += cappedDeltaTime;
        if (this.moveTimer >= this.moveDuration) {
          this.moveTimer = 0;
          
          // 즉시 IDLE로 변경하지 않고, 현재 위치를 기준으로 주변 목표점 설정 (부드러운 전환)
          if (Math.random() < 0.7) { // 70% 확률로 IDLE로 전환
            this.currentState = this.states.IDLE;
            this.stateTimer = 0;
          } else { // 30% 확률로 계속 이동
            this.moveDuration = this.getRandomDuration(1000, 2000);
            this.setRandomMoveTarget(otherSheeps);
          }
        } else if (this.targetX !== null && this.targetY !== null) {
          // 목표 지점으로 이동
          this.moveTowardTarget(this.moveSpeed);
        }
        
        // 무리 행동 처리
        this.flockingBehavior(otherSheeps);
        break;
        
      case this.states.SLEEP:
        // 일정 시간 후 일어나기
        if (this.stateTimer >= this.stateChangeDuration) {
          this.stateTimer = 0;
          this.currentState = this.states.GETUP;
          this.frameIndex = 0; // 애니메이션 시작부터
        }
        break;
        
      case this.states.GETUP:
        // 애니메이션 끝에서 자동으로 상태 전환 (onAnimationCycleComplete에서 처리)
        break;
        
      case this.states.TRANSITION:
        // 애니메이션 끝에서 자동으로 상태 전환 (onAnimationCycleComplete에서 처리)
        break;
        
      case this.states.RUNAWAY:
        // 도망가는 상태
        if (this.targetX !== null && this.targetY !== null) {
          // 목표 지점으로 빠르게 이동
          this.moveTowardTarget(this.runawaySpeed);
          
          // 목표에 도착하거나 충분히 도망갔다면
          this.returnToFlockTimer += cappedDeltaTime;
          
          if (this.returnToFlockTimer >= 3000) {
            // 도망치다가 충분한 시간이 지났으면 일반 상태로 복귀
            this.returnToFlockTimer = 0;
            this.currentState = this.states.MOVE;
            this.moveDuration = this.getRandomDuration(1500, 3000);
            this.moveTimer = 0;
            this.moveSpeed = 0.5;
            
            // 무리를 향해 새로운 이동 목표 설정
            if (otherSheeps && otherSheeps.length > 1) {
              this.setRandomMoveTarget(otherSheeps);
            }
          }
        } else {
          this.currentState = this.states.IDLE;
          this.stateTimer = 0;
        }
        break;
    }
  }
  
  // 애니메이션 사이클 완료 시 호출
  onAnimationCycleComplete() {
    // 상태에 따라 다른 처리
    switch (this.currentState) {
      case this.states.GETUP:
        // 일어나는 애니메이션 완료 시 IDLE 상태로
        this.currentState = this.states.IDLE;
        this.stateTimer = 0;
        
        // 일어난 후 플레이어가 근처에 있는지 확인 (이 정보를 유지)
        if (this._nearbyPlayer && this._otherSheeps) {
          this.fleeFromPlayer(this._nearbyPlayer, this._otherSheeps, true); // 일어난 직후 플레이어 발견 시 무리로 빠르게 도망
        }
        break;
        
      case this.states.TRANSITION:
        // 전환 애니메이션 완료 시 SLEEP 상태로
        this.currentState = this.states.SLEEP;
        this.stateTimer = 0;
        this.stateChangeDuration = this.getRandomDuration(5000, 15000); // 더 오래 잠
        break;
    }
  }
  
  // 플레이어와의 상호작용 처리
  handlePlayerInteraction(player, otherSheeps) {
    // 플레이어와 다른 양들 정보 유지 (애니메이션 종료 후 사용)
    this._nearbyPlayer = player;
    this._otherSheeps = otherSheeps;
    
    if (!player || this.currentState === this.states.SLEEP) {
      return; // 자는 중에는 플레이어 반응 무시
    }
    
    // 플레이어가 가까이 왔는지 확인
    if (this.isPlayerNearby(player) && 
        this.currentState !== this.states.RUNAWAY &&
        this.currentState !== this.states.GETUP) {
      this.fleeFromPlayer(player, otherSheeps);
    }
  }
  
  // 플레이어가 근처에 있는지 확인
  isPlayerNearby(player) {
    const distance = Math.sqrt(
      Math.pow(this.x - player.x, 2) + 
      Math.pow(this.y - player.y, 2)
    );
    return distance < this.playerDetectDistance;
  }
  
  // 플레이어로부터 도망가기
  fleeFromPlayer(player, otherSheeps, isWakeUpFlee = false) {
    this.currentState = this.states.RUNAWAY;
    
    // 플레이어 반대 방향으로 도망
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // 플레이어 반대 방향으로 점진적으로 이동 - 목표 거리를 줄여서 더 자연스럽게 이동
      const fleeDistance = 100 + Math.random() * 50; // 200~300에서 100~150으로 줄임
      
      // 기존 타겟이 있으면 점진적으로 변경, 없으면 새로 설정
      if (this.targetX !== null && this.targetY !== null) {
        // 새 타겟을 향해 기존 타겟을 서서히 변경
        const newTargetX = this.x + (dx / distance) * fleeDistance;
        const newTargetY = this.y + (dy / distance) * fleeDistance;
        
        // 기존 타겟과 새 타겟을 블렌딩 (부드러운 전환)
        this.targetX = this.targetX * 0.3 + newTargetX * 0.7;
        this.targetY = this.targetY * 0.3 + newTargetY * 0.7;
      } else {
        // 새 타겟 설정
        this.targetX = this.x + (dx / distance) * fleeDistance;
        this.targetY = this.y + (dy / distance) * fleeDistance;
      }
      
      // 다른 양들 방향으로 더 강하게 편향시켜 무리로 모이게 함
      if (otherSheeps && otherSheeps.length > 0) {
        let flockCenterX = 0;
        let flockCenterY = 0;
        let count = 0;
        
        // 무리의 중심 계산
        for (const otherSheep of otherSheeps) {
          if (otherSheep !== this) {
            flockCenterX += otherSheep.x;
            flockCenterY += otherSheep.y;
            count++;
          }
        }
        
        if (count > 0) {
          flockCenterX /= count;
          flockCenterY /= count;
          
          // 무리 중심으로 더 강하게 편향
          const flockInfluence = isWakeUpFlee ? 0.7 : 0.5; // 0.6/0.3에서 0.7/0.5로 증가
          this.targetX = this.targetX * (1 - flockInfluence) + flockCenterX * flockInfluence;
          this.targetY = this.targetY * (1 - flockInfluence) + flockCenterY * flockInfluence;
        }
      }
      
      // 화면 밖으로 나가지 않도록 보정
      this.targetX = Math.max(50, Math.min(this.canvas.width - 50, this.targetX));
      this.targetY = Math.max(50, Math.min(this.canvas.height - 50, this.targetY));
      
      // 방향 설정
      this.direction = dx > 0 ? -1 : 1;
      
      // 도망 속도 설정 (일어난 직후라면 2배 빠르게) - 속도를 약간 줄여 더 자연스러운 이동
      this.moveSpeed = isWakeUpFlee ? this.runawaySpeed * 1.8 : this.runawaySpeed * 0.9;
    }
  }
  
  // 무리 행동 처리
  flockingBehavior(otherSheeps) {
    if (!otherSheeps || otherSheeps.length <= 1 || !this.targetX || !this.targetY) {
      return;
    }
    
    // 무리의 중심 계산
    let centerX = 0;
    let centerY = 0;
    let count = 0;
    
    // 가까운 양들만 고려하도록 범위 확장
    const cohesionRange = this.maxFlockDistance * 1.5; // 더 넓은 범위의 양들을 고려
    
    for (const otherSheep of otherSheeps) {
      if (otherSheep !== this) {
        // 다른 양과의 거리 계산
        const distance = Math.sqrt(
          Math.pow(this.x - otherSheep.x, 2) + 
          Math.pow(this.y - otherSheep.y, 2)
        );
        
        // 결속력(Cohesion): 확장된 범위 내의 양들 쪽으로 이동
        if (distance < cohesionRange) {
          centerX += otherSheep.x;
          centerY += otherSheep.y;
          count++;
          
          // 분리(Separation): 너무 가까운 양들과 충돌 방지
          if (distance < this.minFlockDistance) {
            const repulsionForce = 1 - (distance / this.minFlockDistance);
            this.targetX += (this.x - otherSheep.x) * repulsionForce * 0.03; // 약한 충돌 회피
            this.targetY += (this.y - otherSheep.y) * repulsionForce * 0.03;
          }
          
          // 정렬(Alignment): 가까운 양들과 비슷한 방향으로 이동
          if (distance < this.maxFlockDistance && otherSheep.targetX !== null && otherSheep.targetY !== null) {
            const otherDx = otherSheep.targetX - otherSheep.x;
            const otherDy = otherSheep.targetY - otherSheep.y;
            const thisDx = this.targetX - this.x;
            const thisDy = this.targetY - this.y;
            
            // 방향 정렬 - 다른 양들과 비슷한 방향으로 이동
            const alignmentFactor = 0.2; // 정렬 강도
            this.targetX += otherDx * alignmentFactor;
            this.targetY += otherDy * alignmentFactor;
          }
        }
      }
    }
    
    // 무리의 중심 방향으로 더 강하게 이동
    if (count > 0) {
      centerX /= count;
      centerY /= count;
      
      // 무리 영향력 증가 - 양들이 더 강하게 뭉치도록
      const enhancedFlockInfluence = this.flockInfluence * 1.5; // 50% 증가
      
      // 현재 목표와 무리 중심 사이를 절충
      this.targetX = this.targetX * (1 - enhancedFlockInfluence) + centerX * enhancedFlockInfluence;
      this.targetY = this.targetY * (1 - enhancedFlockInfluence) + centerY * enhancedFlockInfluence;
    }
  }
  
  // 목표 지점으로 이동
  moveTowardTarget(speed) {
    // 목표가 없으면 종료
    if (this.targetX === null || this.targetY === null) {
      return;
    }
    
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 목표까지의 거리에 따라 이동 속도 조절 (가까울수록 느리게)
    let adjustedSpeed = speed;
    if (distance < 30) {
      // 목표에 가까워질수록 속도를 줄임 (부드러운 감속)
      adjustedSpeed = speed * (distance / 30);
    }
    
    if (distance > 0.1) {
      // 직선 이동이 아닌 곡선 경로로 이동 (자연스러운 움직임)
      const targetAngle = Math.atan2(dy, dx);
      const moveAngle = targetAngle + (Math.random() - 0.5) * 0.2; // 약간의 무작위성 추가
      
      const actualSpeed = Math.max(0.1, adjustedSpeed); // 최소 속도 보장
      this.x += Math.cos(moveAngle) * actualSpeed;
      this.y += Math.sin(moveAngle) * actualSpeed;
      
      // 방향 설정 - 적응형 방향 전환 (급격한 방향 전환 방지)
      const directionTarget = dx > 0 ? 1 : -1;
      if (this.direction !== directionTarget) {
        // 10% 확률로 방향 전환 (점진적인 방향 전환을 위해)
        if (Math.random() < 0.1) {
          this.direction = directionTarget;
        }
      } else {
        this.direction = directionTarget;
      }
    } else {
      // 목표 도달 시 점진적으로 다음 상태로 전환
      if (this.currentState === this.states.RUNAWAY) {
        this.currentState = this.states.IDLE;
      }
      // MOVE 상태인 경우 즉시 상태를 변경하지 않고 moveTimer를 통해 처리
      
      // 새로운 목표 설정 (기존 목표는 유지)
      if (Math.random() < 0.1) { // 10% 확률로 목표 초기화
        this.targetX = null;
        this.targetY = null;
      }
    }
  }
  
  // 현재 상태에 따라 새로운 상태로 변경
  changeState(otherSheeps) {
    const rand = Math.random();
    
    // 이전 상태 저장
    const prevState = this.currentState;
    
    if (this.currentState === this.states.IDLE) {
      if (rand < 0.4) {
        // 40% 확률로 이동
        this.currentState = this.states.MOVE;
        
        // 이전 목표 위치가 있는 경우 새 목표 위치와 블렌딩
        const prevTargetX = this.targetX;
        const prevTargetY = this.targetY;
        
        this.setRandomMoveTarget(otherSheeps);
        
        // 이전 목표가 있었다면 부드럽게 전환
        if (prevTargetX !== null && prevTargetY !== null) {
          // 이전 목표와 새 목표를 블렌딩 (70% 새 목표, 30% 이전 목표)
          this.targetX = this.targetX * 0.7 + prevTargetX * 0.3;
          this.targetY = this.targetY * 0.7 + prevTargetY * 0.3;
        }
        
        this.moveDuration = this.getRandomDuration(1500, 4000); // 이동 시간 증가
        this.moveTimer = 0;
        this.moveSpeed = 0.5; // 기본 이동 속도로 리셋
      } else if (rand < 0.6) {
        // 20% 확률로 잠자기 전환
        this.currentState = this.states.TRANSITION;
        this.frameIndex = 0; // 애니메이션 시작부터
      }
      // 40% 확률로 그대로 유지
    }
    
    // 상태 변경 시 로그 (디버깅용)
    if (prevState !== this.currentState) {
      console.log(`양 상태 변경: ${prevState} -> ${this.currentState}, 위치: x=${this.x.toFixed(0)}, y=${this.y.toFixed(0)}`);
    }
  }
  
  // 랜덤한 이동 목표 설정 (무리 중심 고려)
  setRandomMoveTarget(otherSheeps) {
    const maxDistance = 100; // 최대 이동 거리
    const angle = Math.random() * Math.PI * 2; // 랜덤 각도
    const distance = Math.random() * maxDistance; // 랜덤 거리
    
    this.targetX = this.x + Math.cos(angle) * distance;
    this.targetY = this.y + Math.sin(angle) * distance;
    
    // 무리 중심을 약간 고려
    if (otherSheeps && otherSheeps.length > 1) {
      let centerX = 0;
      let centerY = 0;
      let count = 0;
      
      for (const otherSheep of otherSheeps) {
        if (otherSheep !== this) {
          centerX += otherSheep.x;
          centerY += otherSheep.y;
          count++;
        }
      }
      
      if (count > 0) {
        centerX /= count;
        centerY /= count;
        
        // 무리 중심 방향으로 약간 편향
        this.targetX = this.targetX * 0.7 + centerX * 0.3;
        this.targetY = this.targetY * 0.7 + centerY * 0.3;
      }
    }
    
    // 화면 밖으로 벗어나지 않도록 조정
    this.targetX = Math.max(50, Math.min(this.canvas.width - 50, this.targetX));
    this.targetY = Math.max(50, Math.min(this.canvas.height - 50, this.targetY));
  }
  
  // 현재 상태에 맞는 애니메이션 정보 가져오기
  getCurrentAnimation() {
    if (!this.animations) {
      console.warn('애니메이션 데이터가 로드되지 않았습니다.');
      return { image: null, frames: [] };
    }
    
    let animation;
    
    switch (this.currentState) {
      case this.states.MOVE:
      case this.states.RUNAWAY:
        animation = this.animations.move;
        break;
      case this.states.SLEEP:
        animation = this.animations.sleep;
        break;
      case this.states.GETUP:
        animation = this.animations.getup;
        break;
      case this.states.TRANSITION:
        animation = this.animations.transition;
        break;
      default: // IDLE
        animation = this.animations.idle;
        break;
    }
    
    // 해당 상태의 애니메이션이 없으면 idle로 폴백
    if (!animation || !animation.frames || animation.frames.length === 0) {
      console.warn(`${this.currentState} 상태의 애니메이션이 없습니다. idle 애니메이션으로 대체합니다.`);
      
      // idle 애니메이션도 없으면 기본값 반환
      if (!this.animations.idle || !this.animations.idle.frames || this.animations.idle.frames.length === 0) {
        console.warn('idle 애니메이션도 없습니다. 기본값을 반환합니다.');
        return { image: null, frames: [] };
      }
      
      return this.animations.idle;
    }
    
    return animation;
  }
  
  // 랜덤한 시간 간격 반환
  getRandomDuration(min, max) {
    return min + Math.random() * (max - min);
  }
  
  // 양 그리기
  draw() {
    try {
      const animation = this.getCurrentAnimation();
      
      // 애니메이션 데이터가 없으면 종료
      if (!animation || !animation.image) {
        console.warn('애니메이션 데이터 누락: 양을 그릴 수 없습니다.');
        return;
      }
      
      // 프레임 인덱스가 범위를 벗어나면 리셋
      if (this.frameIndex >= animation.frames.length) {
        this.frameIndex = 0;
      }
      
      const frame = animation.frames[this.frameIndex];
      
      // 프레임 데이터가 없으면 종료
      if (!frame) {
        console.warn(`프레임 데이터 누락 (인덱스 ${this.frameIndex})`);
        return;
      }
      
      this.ctx.save();
      this.ctx.translate(this.x, this.y);
      
      // 방향에 따라 좌우 반전
      if (this.direction === -1) {
        this.ctx.scale(-1, 1);
      }
      
      // 크기 확대 (20% 키움)
      this.ctx.scale(this.scale, this.scale);
      
      // 스프라이트 그리기
      this.ctx.drawImage(
        animation.image,
        frame.x, frame.y, frame.width, frame.height,
        -frame.width / 2, -frame.height / 2, frame.width, frame.height
      );
      
      this.ctx.restore();
    } catch (error) {
      console.error('양 그리기 중 오류 발생:', error);
    }
  }
} 