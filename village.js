// village.js - 마을 관련 기능을 담당하는 모듈

// 양 관련 클래스 import
import { Sheep } from './sheep.js';
import { SheepAnimator } from './sheepAnimator.js';
import { Chest } from './chest.js';

export class Village {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    
    // 마을 배경 이미지
    this.villageBackground = "rgba(50, 120, 80, 0.3)"; // 임시 배경색
    
    // 드래그 관련 상태 추가
    this.isDragging = false;
    this.draggedBuilding = null;
    this.draggedWarpPoint = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    // 충돌 범위 조정 관련 속성 추가
    this.isAdjustingCollision = false;
    this.selectedBuilding = null;
    this.collisionMargin = 10; // 기본 충돌 여백
    this.adjustingCorner = null; // 조정 중인 모서리: 'tl', 'tr', 'bl', 'br'
    this.isEditingPolygon = false; // 다각형 편집 모드
    this.selectedVertex = null; // 선택된 정점 인덱스
    
    // 양 관련 속성 추가
    this.sheepAnimator = new SheepAnimator();
    this.sheeps = [];
    this.numSheeps = 3; // 양 마릿수
    
    // 상자 관련 속성 추가
    this.chests = [];
    this.numChests = 1; // 마을에 생성할 상자 수를 1개로 변경
    this.totalChipsCollected = 0; // 수집한 총 칩 수
    this.autoTransitionThreshold = 100; // 자동 전환을 위한 임계값
    this.showTransitionMessage = false; // 전환 메시지 표시 여부
    this.transitionMessageTime = 0; // 전환 메시지 표시 시간
    
    // 기본 레이아웃 설정 (사용자 제공 데이터)
    const defaultLayout = {
      "buildings": [
        {
          "name": "의료소",
          "x": 0.38666666666666666,
          "y": 0.18125000000000002
        },
        {
          "name": "레스토랑",
          "x": 0.4875,
          "y": 0.25000000000000006
        },
        {
          "name": "총포상",
          "x": 0.5958333333333332,
          "y": 0.29
        },
        {
          "name": "창고",
          "x": 0.31666666666666665,
          "y": 0.41
        }
      ],
      "warpPoint": {
        "x": 0.8125,
        "y": 0.72625
      }
    };
    
    // 건물 이미지 로드
    this.loadBuildingImages();
    
    // 이벤트 리스너 초기화
    this.initEventListeners();
    
    // 플레이어 객체 저장 변수 추가
    this.player = null;
  }
  
  // 이벤트 리스너 초기화
  initEventListeners() {
    // E 키를 눌렀을 때 편집 모드 토글
    window.addEventListener("keydown", (e) => {
      if (e.key === "e" || e.key === "E") {
        if (this.game.isVillageMode) {
          this.toggleEditMode();
        }
      }
      
      // S 키를 눌렀을 때 레이아웃 저장
      if (e.key === "s" || e.key === "S") {
        if (this.game.isVillageMode && this.game.isEditMode) {
          this.saveLayout();
        }
      }
      
      // L 키를 눌렀을 때 레이아웃 로드
      if (e.key === "l" || e.key === "L") {
        if (this.game.isVillageMode && this.game.isEditMode) {
          this.loadLayout();
        }
      }
    });
    
    // 마우스 이벤트 리스너
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    
    // 우클릭 이벤트 처리 (기본 컨텍스트 메뉴 방지)
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault(); // 항상 기본 컨텍스트 메뉴 동작 막기
      
      // 편집 모드가 아닐 때는 대시 기능 활성화
      if (!this.game.isEditMode && this.player) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // 플레이어에게 대시 명령 전달
        console.log("우클릭 대시 명령 전달", x, y);
        this.player.dash(x, y);
      }
    });
    
    // 터치 이벤트 리스너 (모바일)
    this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));
    
    // 디버그 정보 토글 (F2 키)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        this.toggleDebugInfo();
      }
    });
    
    // 양 초기화
    this.initSheeps();
  }
  
  // 편집 모드 토글
  toggleEditMode() {
    this.game.isEditMode = !this.game.isEditMode;
    
    if (this.game.isEditMode) {
      console.log('편집 모드가 활성화되었습니다:');
      console.log('- 건물을 드래그하여 이동할 수 있습니다.');
      console.log('- 건물을 우클릭하여 충돌 영역을 조정할 수 있습니다.');
      console.log('- 워프 포인트를 드래그하여 이동할 수 있습니다.');
      console.log('- 편집 후 E를 눌러 변경사항을 저장하고 편집 모드를 종료합니다.');
      
      // 기본 충돌 여백 설정
      this.collisionMargin = 10;
    } else {
      console.log('편집 모드가 비활성화되었습니다. 변경사항이 저장되었습니다.');
      this.saveLayout();
      
      // 편집 관련 상태 초기화
      this.isDragging = false;
      this.isWarpPointDragging = false;
      this.isBuilidngDragging = false;
      this.draggedBuilding = null;
      this.draggedWarpPoint = false;
      this.selectedBuilding = null;
      this.isAdjustingCollision = false;
      this.isEditingPolygon = false;
      this.selectedVertex = null;
    }
  }
  
  // 배치 저장하기
  saveLayout() {
    // 건물 및 워프 포인트 위치 정보
    const layoutData = {
      buildings: this.buildings.map(building => {
        const buildingData = {
          name: building.name,
          x: building.x / this.canvas.width,
          y: building.y / this.canvas.height
        };
        
        // 다각형 히트박스가 있는 경우 저장
        if (building.hitbox && building.hitbox.length >= 3) {
          buildingData.hitbox = building.hitbox.map(vertex => ({
            x: (vertex.x - building.x) / building.width, // 상대 좌표로 변환
            y: (vertex.y - building.y) / building.height
          }));
        }
        
        return buildingData;
      }),
      warpPoint: {
        x: this.warpPoint.x / this.canvas.width,
        y: this.warpPoint.y / this.canvas.height
      }
    };
    
    // 로컬 스토리지에 저장
    localStorage.setItem('villageLayout', JSON.stringify(layoutData));
    console.log('마을 레이아웃이 저장되었습니다.');
  }
  
  // 배치 불러오기
  loadLayout() {
    // 저장된 레이아웃 데이터 불러오기
    const savedLayout = localStorage.getItem('villageLayout');
    if (savedLayout) {
      try {
        this.layoutData = JSON.parse(savedLayout);
        
        // 저장된 건물 위치 적용
        if (this.layoutData.buildings && this.buildings.length > 0) {
          this.layoutData.buildings.forEach((buildingData, index) => {
            if (index < this.buildings.length) {
              const building = this.buildings[index];
              building.x = buildingData.x * this.canvas.width;
              building.y = buildingData.y * this.canvas.height;
              
              // 모든 건물의 히트박스 템플릿에서 새 히트박스 생성 - 반드시 재생성
              if (building.hitboxTemplate) {
                building.hitbox = building.hitboxTemplate.map(point => {
                  return {
                    x: Math.floor(building.x + point.x * building.width),
                    y: Math.floor(building.y + point.y * building.height)
                  };
                });
                console.log(`${building.name} 히트박스 업데이트됨:`, building.hitbox);
              }
            }
          });
        }
        
        // 워프 포인트 위치 적용
        if (this.layoutData.warpPoint) {
          this.warpPoint.x = this.layoutData.warpPoint.x * this.canvas.width;
          this.warpPoint.y = this.layoutData.warpPoint.y * this.canvas.height;
        }
        
        console.log("레이아웃 로드 완료");
      } catch (error) {
        console.error("레이아웃 데이터 파싱 실패:", error);
      }
    }
  }
  
  // 건물 이미지 로드 함수 수정
  loadBuildingImages() {
    const buildingData = [
      { 
        name: "의료소", 
        path: "assets/Medic Shopp.png", 
        width: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        height: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        // 히트박스 (상대좌표) - 더 넓게 조정
        hitboxTemplate: [
          {x: 0.5, y: 0.2},   // 상단 위치 - 20% 아래로 이동 (12시)
          {x: 0.7, y: 0.3},   // 오른쪽 상단 추가점 (1-2시 방향)
          {x: 0.8, y: 0.5},   // 우측 - 오른쪽에서 20% 안쪽으로 (3시)
          {x: 0.5, y: 0.9},   // 하단 - 아래로 더 확장 (6시)
          {x: 0.1, y: 0.7}    // 왼쪽 하단 - 7시 방향으로 더 확장
        ]
      },
      { 
        name: "레스토랑", 
        path: "assets/Resturant.png", 
        width: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        height: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        hitboxTemplate: [
          {x: 0.5, y: 0.2},   // 상단 위치 - 20% 아래로 이동 (12시)
          {x: 0.7, y: 0.3},   // 오른쪽 상단 추가점 (1-2시 방향)
          {x: 0.8, y: 0.5},   // 우측 - 오른쪽에서 20% 안쪽으로 (3시)
          {x: 0.5, y: 0.9},   // 하단 - 아래로 더 확장 (6시)
          {x: 0.1, y: 0.7}    // 왼쪽 하단 - 7시 방향으로 더 확장
        ]
      },
      { 
        name: "총포상", 
        path: "assets/Gun Shop.png", 
        width: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        height: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        hitboxTemplate: [
          {x: 0.5, y: 0.2},   // 상단 위치 - 20% 아래로 이동 (12시)
          {x: 0.7, y: 0.3},   // 오른쪽 상단 추가점 (1-2시 방향)
          {x: 0.8, y: 0.5},   // 우측 - 오른쪽에서 20% 안쪽으로 (3시)
          {x: 0.5, y: 0.9},   // 하단 - 아래로 더 확장 (6시)
          {x: 0.1, y: 0.7}    // 왼쪽 하단 - 7시 방향으로 더 확장
        ]
      },
      { 
        name: "창고", 
        path: "assets/Shed.png", 
        width: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        height: 192 * 0.9, // 30% -> 10% 축소 (20% 증가)
        hitboxTemplate: [
          {x: 0.5, y: 0.2},   // 상단 위치 - 20% 아래로 이동 (12시)
          {x: 0.7, y: 0.3},   // 오른쪽 상단 추가점 (1-2시 방향)
          {x: 0.8, y: 0.5},   // 우측 - 오른쪽에서 20% 안쪽으로 (3시)
          {x: 0.5, y: 0.9},   // 하단 - 아래로 더 확장 (6시)
          {x: 0.1, y: 0.7}    // 왼쪽 하단 - 7시 방향으로 더 확장
        ]
      }
    ];
    
    // 기본 레이아웃 데이터 정의
    const defaultLayout = {
      "buildings": [
        {
          "name": "의료소",
          "x": 0.38666666666666666,
          "y": 0.18125000000000002
        },
        {
          "name": "레스토랑",
          "x": 0.4875,
          "y": 0.25000000000000006
        },
        {
          "name": "총포상",
          "x": 0.5958333333333332,
          "y": 0.29
        },
        {
          "name": "창고",
          "x": 0.31666666666666665,
          "y": 0.41
        }
      ],
      "warpPoint": {
        "x": 0.8125,
        "y": 0.72625
      }
    };
    
    // 저장된 레이아웃이 없으면 기본 레이아웃 사용
    if (!this.layoutData) {
      this.layoutData = defaultLayout;
    }
    
    // 위에서 정의한 건물 데이터를 기반으로 이미지 로드 및 건물 초기화
    this.buildings = [];
    
    // 각 건물 데이터에 대해 이미지 로드 및 건물 객체 생성
    buildingData.forEach(data => {
      const img = new Image();
      img.src = data.path;
      
      const building = {
        name: data.name,
        image: img,
        width: data.width,
        height: data.height,
        x: 0,
        y: 0,
        hitboxTemplate: data.hitboxTemplate // 상대 좌표 템플릿 저장
      };
      
      // 이미지가 로드되면 히트박스 생성
      img.onload = () => {
        console.log(`${data.name} 이미지 로드 완료`);
      };
      
      this.buildings.push(building);
    });
    
    // 기본 레이아웃 데이터가 있는 경우 적용
    if (this.layoutData && this.layoutData.buildings) {
      this.layoutData.buildings.forEach((buildingData, index) => {
        if (index < this.buildings.length) {
          const building = this.buildings[index];
          building.x = buildingData.x * this.canvas.width;
          building.y = buildingData.y * this.canvas.height;
          
          // 절대 좌표로 히트박스 생성 - 수정된 템플릿 사용
          if (building.hitboxTemplate) {
            building.hitbox = building.hitboxTemplate.map(point => {
              return {
                x: Math.floor(building.x + point.x * building.width),
                y: Math.floor(building.y + point.y * building.height)
              };
            });
            console.log(`초기 ${building.name} 히트박스 생성:`, building.hitbox);
          }
        }
      });
    }
    
    // 워프 포인트 설정
    this.warpPoint = {
      x: this.layoutData.warpPoint.x * this.canvas.width,
      y: this.layoutData.warpPoint.y * this.canvas.height,
      radius: 40,
      interactionDistance: 60,
      active: false,
      glowIntensity: 0,
      lastGlowUpdate: 0,
      glowDirection: 1
    };
    
    // 저장된 배치 불러오기
    this.loadLayout();
  }
  
  // 양 초기화 함수 추가
  async initSheeps() {
    try {
      console.log('양 애니메이션 로드 시작...');
      // 양 애니메이션 리소스 로드
      const loaded = await this.sheepAnimator.loadAnimations();
      if (!loaded) {
        console.error('양 애니메이션 로드 실패');
        return;
      }
      
      // 애니메이션 로드 후 유효성 검사
      const animations = this.sheepAnimator.getAnimations();
      if (!animations || !animations.idle || !animations.idle.frames || animations.idle.frames.length === 0) {
        console.error('필수 idle 애니메이션이 없습니다.');
        return;
      }
      
      console.log('양 애니메이션 로드 완료, 양 생성 시작...');
      
      // 기존 양 초기화
      this.sheeps = [];
      
      // 양 생성 (지정한 마릿수만큼)
      for (let i = 0; i < this.numSheeps; i++) {
        // 랜덤 위치에 양 배치 (건물과 충돌하지 않는 위치에)
        let x, y;
        let validPosition = false;
        let tryCount = 0;
        const maxTries = 50; // 최대 시도 횟수
        
        // 유효한 위치를 찾을 때까지 시도
        while (!validPosition && tryCount < maxTries) {
          tryCount++;
          
          // 화면의 10~90% 영역에 랜덤 위치 설정
          x = this.canvas.width * 0.1 + Math.random() * (this.canvas.width * 0.8);
          y = this.canvas.height * 0.1 + Math.random() * (this.canvas.height * 0.8);
          
          // 건물과 충돌 여부 확인
          validPosition = true;
          for (const building of this.buildings) {
            const margin = 50; // 건물로부터 최소 거리
            if (this.isPointNearBuilding(x, y, building, margin)) {
              validPosition = false;
              break;
            }
          }
          
          // 워프 포인트와의 충돌 확인
          if (validPosition && this.warpPoint) {
            const distance = Math.sqrt(
              Math.pow(x - this.warpPoint.x, 2) + 
              Math.pow(y - this.warpPoint.y, 2)
            );
            if (distance < 100) { // 워프 포인트로부터 100픽셀 이내는 피함
              validPosition = false;
            }
          }
        }
        
        // 적절한 위치를 찾지 못한 경우 기본 위치 사용
        if (!validPosition) {
          console.warn(`양 #${i+1} 위치 찾기 실패, 기본 위치 사용`);
          x = this.canvas.width * (0.2 + i * 0.2);
          y = this.canvas.height * 0.5;
        }
        
        try {
          // 새 양 인스턴스 생성 및 추가
          const sheep = new Sheep(this.canvas, x, y, this.sheepAnimator.getAnimations(), i+1);
          this.sheeps.push(sheep);
          console.log(`양#${i+1} 생성 완료: x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
        } catch (error) {
          console.error(`양#${i+1} 생성 중 오류 발생:`, error);
        }
      }
      
      console.log(`${this.sheeps.length}마리 양 생성 완료`);
    } catch (error) {
      console.error('양 초기화 실패:', error);
    }
  }
  
  // 점이 건물 근처인지 확인
  isPointNearBuilding(x, y, building, margin) {
    // 건물 주변의 마진을 포함한 직사각형 영역 생성
    const rect = {
      left: building.x - building.width/2 - margin,
      right: building.x + building.width/2 + margin,
      top: building.y - building.height/2 - margin,
      bottom: building.y + building.height/2 + margin
    };
    
    // 점이 확장된 영역 내에 있는지 확인
    return (
      x >= rect.left && 
      x <= rect.right && 
      y >= rect.top && 
      y <= rect.bottom
    );
  }
  
  // 양 업데이트 함수
  updateSheeps(deltaTime, player) {
    // player 객체가 없으면 중단
    if (!player) return;
    
    for (const sheep of this.sheeps) {
      // 양 상태 업데이트 (플레이어와 다른 양들 참조 전달)
      sheep.update(deltaTime, player, this.sheeps);
      
      // 양이 건물이나 워프 포인트와 충돌하지 않도록 위치 조정
      this.adjustSheepPosition(sheep);
    }
  }
  
  // 양 위치 조정 (충돌 방지)
  adjustSheepPosition(sheep) {
    // 이전 위치 저장 (텔레포트 감지용)
    const prevX = sheep.x;
    const prevY = sheep.y;
    
    // 건물과의 충돌 처리
    for (const building of this.buildings) {
      // 양과 건물 사이의 거리 계산
      const dx = sheep.x - building.x;
      const dy = sheep.y - building.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 양의 최소 안전 거리
      const minDistance = (building.width + building.height) / 4;
      
      // 충돌 발생 시 양 위치 조정
      if (distance < minDistance) {
        // 충돌 방향에 따라 양을 밀어냄 - 힘을 약하게 조정하여 부드럽게 밀려나도록
        const pushForce = (minDistance - distance) / minDistance;
        
        if (distance > 0) { // 0으로 나누기 방지
          // 보다 부드러운 충돌 해결
          sheep.x += (dx / distance) * pushForce * 3; // 5에서 3으로 감소
          sheep.y += (dy / distance) * pushForce * 3;
          
          // 목표 위치도 점진적으로 조정하여 부드럽게 목표 변경
          if (sheep.targetX !== null && sheep.targetY !== null) {
            // 건물 반대 방향으로 목표점 이동
            sheep.targetX += (dx / distance) * pushForce * 5;
            sheep.targetY += (dy / distance) * pushForce * 5;
          }
        } else {
          // 같은 위치에 있는 경우 (distance = 0) 랜덤 방향으로 밀어냄
          const angle = Math.random() * Math.PI * 2;
          sheep.x += Math.cos(angle) * 3; // 5에서 3으로 감소
          sheep.y += Math.sin(angle) * 3;
        }
        
        // 이동 상태인 경우 목표 지점을 즉시 초기화하지 않고, 도망가는 상태면 유지
        if (sheep.currentState === sheep.states.MOVE) {
          // 바로 IDLE 상태로 전환하지 않고, 목표점만 수정하여 자연스럽게 이동하도록
          if (sheep.targetX !== null && sheep.targetY !== null) {
            // 방향을 건물에서 멀어지는 쪽으로 수정
            const newTargetDist = 50 + Math.random() * 30;
            sheep.targetX = sheep.x + (dx / distance) * newTargetDist;
            sheep.targetY = sheep.y + (dy / distance) * newTargetDist;
          }
        }
        
        // 충돌로 인한 위치 변화 로깅
        console.log(`양#${sheep.id} 건물 충돌 조정: [${prevX.toFixed(1)}, ${prevY.toFixed(1)}] -> [${sheep.x.toFixed(1)}, ${sheep.y.toFixed(1)}], 건물: ${building.name}, 거리: ${distance.toFixed(1)}, 최소거리: ${minDistance.toFixed(1)}`);
      }
    }
    
    // 워프 포인트와의 충돌 처리
    const dwx = sheep.x - this.warpPoint.x;
    const dwy = sheep.y - this.warpPoint.y;
    const warpDistance = Math.sqrt(dwx * dwx + dwy * dwy);
    
    if (warpDistance < 80) { // 워프 포인트와의 안전 거리
      const pushForce = (80 - warpDistance) / 80;
      
      if (warpDistance > 0) {
        // 부드러운 밀어내기
        sheep.x += (dwx / warpDistance) * pushForce * 3; // 5에서 3으로 감소
        sheep.y += (dwy / warpDistance) * pushForce * 3;
        
        // 목표 위치도 조정
        if (sheep.targetX !== null && sheep.targetY !== null) {
          sheep.targetX += (dwx / warpDistance) * pushForce * 5;
          sheep.targetY += (dwy / warpDistance) * pushForce * 5;
        }
      } else {
        const angle = Math.random() * Math.PI * 2;
        sheep.x += Math.cos(angle) * 3;
        sheep.y += Math.sin(angle) * 3;
      }
      
      // 이동 상태인 경우 목표 지점 점진적으로 변경
      if (sheep.currentState === sheep.states.MOVE) {
        if (sheep.targetX !== null && sheep.targetY !== null) {
          // 방향을 워프 포인트에서 멀어지는 쪽으로 수정
          const newTargetDist = 50 + Math.random() * 30;
          sheep.targetX = sheep.x + (dwx / warpDistance) * newTargetDist;
          sheep.targetY = sheep.y + (dwy / warpDistance) * newTargetDist;
        }
      }
      
      // 워프 포인트 충돌로 인한 위치 변화 로깅
      console.log(`양#${sheep.id} 워프포인트 충돌 조정: [${prevX.toFixed(1)}, ${prevY.toFixed(1)}] -> [${sheep.x.toFixed(1)}, ${sheep.y.toFixed(1)}], 거리: ${warpDistance.toFixed(1)}`);
    }
    
    // 화면 밖으로 나가지 않도록 함
    const margin = 50;
    const oldX = sheep.x;
    const oldY = sheep.y;
    
    sheep.x = Math.max(margin, Math.min(this.canvas.width - margin, sheep.x));
    sheep.y = Math.max(margin, Math.min(this.canvas.height - margin, sheep.y));
    
    // 화면 경계 충돌 로깅
    if (oldX !== sheep.x || oldY !== sheep.y) {
      console.log(`양#${sheep.id} 화면경계 충돌 조정: [${oldX.toFixed(1)}, ${oldY.toFixed(1)}] -> [${sheep.x.toFixed(1)}, ${sheep.y.toFixed(1)}]`);
    }
    
    // 전체 위치 변화 로깅
    const totalDx = sheep.x - prevX;
    const totalDy = sheep.y - prevY;
    const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
    
    if (totalDistance > 5) {
      console.warn(`양#${sheep.id} 위치 강제 조정 감지: [${prevX.toFixed(1)}, ${prevY.toFixed(1)}] -> [${sheep.x.toFixed(1)}, ${sheep.y.toFixed(1)}], 이동거리: ${totalDistance.toFixed(1)}`);
    }
  }
  
  // 양 그리기 함수
  drawSheeps(player) {
    // Y 좌표에 따라 양 정렬 (플레이어와의 깊이 관계 표현)
    const sortedSheeps = [...this.sheeps].sort((a, b) => a.y - b.y);
    
    for (const sheep of sortedSheeps) {
      // 플레이어보다 앞에 있는 양만 그림 (플레이어 뒤에 있는 양은 나중에 그림)
      if (sheep.y < player.y) {
        sheep.draw();
      }
    }
  }
  
  // 플레이어 뒤에 있는 양 그리기
  drawSheepsBehindPlayer(player) {
    for (const sheep of this.sheeps) {
      if (sheep.y >= player.y) {
        sheep.draw();
      }
    }
  }
  
  // 마우스 이벤트 핸들러 수정 - 다각형 편집과 기존 코드를 통합
  handleMouseDown(e) {
    // 우클릭 감지
    if (e.button === 2 && this.player && !this.game.isEditMode) {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // 플레이어에게 대시 명령 전달
      this.player.dash(x, y);
      return;
    }
    
    // 일반 클릭 (좌클릭) 처리 - 상자 열기
    if (e.button === 0 && !this.game.isEditMode) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      
      // 클릭한 위치에 상자가 있는지 확인
      for (const chest of this.chests) {
        const dx = mouseX - chest.x;
        const dy = mouseY - chest.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 상자를 클릭했고, 아직 열리지 않았으면 열기
        if (distance < chest.size / 2 && !chest.isOpened && !chest.isAnimating) {
          chest.open();
          console.log("상자가 클릭으로 열렸습니다!");
          return;
        }
      }
    }
    
    // 기존 코드 계속 실행 (에디트 모드 관련)
    if (!this.game.isEditMode || !this.game.isVillageMode) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 워프 포인트와의 상호작용 체크
    const dx = mouseX - this.warpPoint.x;
    const dy = mouseY - this.warpPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 이미 다각형 편집 모드인지 확인
    if (this.isEditingPolygon && this.selectedBuilding && this.selectedBuilding.hitbox) {
      // 다각형 정점 선택 확인
      for (let i = 0; i < this.selectedBuilding.hitbox.length; i++) {
        const vertex = this.selectedBuilding.hitbox[i];
        const dx = mouseX - vertex.x;
        const dy = mouseY - vertex.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 10) {
          this.selectedVertex = i;
          console.log(`정점 ${i} 선택됨`);
          return;
        }
      }
      
      // 정점을 선택하지 않았으면 편집 모드 종료
      this.isEditingPolygon = false;
      this.selectedVertex = null;
      console.log("다각형 편집 모드 종료");
      return;
    }
    
    // 이미 건물 충돌 영역 조정 모드인지 확인
    if (this.selectedBuilding && this.isAdjustingCollision) {
      const margin = this.collisionMargin;
      const building = this.selectedBuilding;
      
      // 충돌 영역의 각 모서리 위치
      const corners = {
        tl: { x: building.x + margin, y: building.y + margin },
        tr: { x: building.x + building.width - margin, y: building.y + margin },
        bl: { x: building.x + margin, y: building.y + building.height - margin },
        br: { x: building.x + building.width - margin, y: building.y + building.height - margin }
      };
      
      // 각 모서리와의 거리 확인
      for (const corner in corners) {
        const cdx = mouseX - corners[corner].x;
        const cdy = mouseY - corners[corner].y;
        const cornerDistance = Math.sqrt(cdx * cdx + cdy * cdy);
        
        if (cornerDistance < 20) { // 모서리 감지 범위
          this.adjustingCorner = corner;
          return;
        }
      }
      
      // 모서리를 클릭하지 않았다면 조정 모드 종료
      this.isAdjustingCollision = false;
      this.adjustingCorner = null;
      console.log(`건물 ${this.selectedBuilding.name}의 충돌 여백: ${this.collisionMargin}px`);
      return;
    }
    
    if (distance <= this.warpPoint.radius) {
      this.isDragging = true;
      this.draggedWarpPoint = true;
      this.draggedBuilding = null;
      this.isWarpPointDragging = true;
      return;
    }
    
    // 건물과의 상호작용 체크 (뒤에서부터 확인하여 위에 있는 건물 우선)
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const building = this.buildings[i];
      if (this.isPointInBuilding(mouseX, mouseY, building)) {
        // 우클릭 시 충돌 범위 조정 모드 활성화
        if (e.button === 2) {
          e.preventDefault();
          this.selectedBuilding = building;
          
          // 이미 다각형이 있으면 다각형 편집 모드, 없으면 일반 마진 조정 모드
          if (building.hitbox && building.hitbox.length >= 3) {
            this.isEditingPolygon = true;
            this.isAdjustingCollision = false;
            console.log(`건물 ${building.name}의 다각형 편집 모드 활성화`);
          } else {
            this.isAdjustingCollision = true;
            this.isEditingPolygon = false;
            console.log(`건물 ${building.name}의 충돌 범위 조정 모드 활성화. 현재 여백: ${this.collisionMargin}px`);
          }
          
          this.isDragging = false;
          this.isBuilidngDragging = false;
          return;
        }
        
        this.isDragging = true;
        this.draggedBuilding = building;
        this.draggedWarpPoint = false;
        this.isBuilidngDragging = true;
        this.dragOffsetX = mouseX - building.x;
        this.dragOffsetY = mouseY - building.y;
        
        // 건물 이동 전 위치 저장 (히트박스 업데이트용)
        building.prevX = building.x;
        building.prevY = building.y;
        
        console.log(`건물 선택됨: ${building.name}`);
        return;
      }
    }
    
    this.selectedBuilding = null;
    this.isAdjustingCollision = false;
    this.isEditingPolygon = false;
    this.isDragging = false;
    this.draggedBuilding = null;
    this.draggedWarpPoint = false;
  }
  
  // 마우스 이동 핸들러 수정 - 다각형 편집과 기존 코드 통합
  handleMouseMove(e) {
    if (!this.game.isEditMode || !this.game.isVillageMode) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 다각형 정점 이동
    if (this.isEditingPolygon && this.selectedBuilding && this.selectedVertex !== null) {
      // 선택된 정점 이동
      this.selectedBuilding.hitbox[this.selectedVertex] = {
        x: mouseX,
        y: mouseY
      };
      return;
    }
    
    // 충돌 범위 조정 중인 경우
    if (this.isAdjustingCollision && this.selectedBuilding && this.adjustingCorner) {
      const building = this.selectedBuilding;
      
      // 마우스 위치에 따라 마진 조정
      switch (this.adjustingCorner) {
        case 'tl': // 왼쪽 위 모서리
          this.collisionMargin = Math.min(
            Math.max(mouseX - building.x, 0),
            Math.max(mouseY - building.y, 0),
            Math.min(building.width / 2, building.height / 2)
          );
          break;
        case 'tr': // 오른쪽 위 모서리
          this.collisionMargin = Math.min(
            Math.max(building.x + building.width - mouseX, 0),
            Math.max(mouseY - building.y, 0),
            Math.min(building.width / 2, building.height / 2)
          );
          break;
        case 'bl': // 왼쪽 아래 모서리
          this.collisionMargin = Math.min(
            Math.max(mouseX - building.x, 0),
            Math.max(building.y + building.height - mouseY, 0),
            Math.min(building.width / 2, building.height / 2)
          );
          break;
        case 'br': // 오른쪽 아래 모서리
          this.collisionMargin = Math.min(
            Math.max(building.x + building.width - mouseX, 0),
            Math.max(building.y + building.height - mouseY, 0),
            Math.min(building.width / 2, building.height / 2)
          );
          break;
      }
      
      // 마진 값을 정수로 반올림
      this.collisionMargin = Math.round(this.collisionMargin);
      return;
    }
    
    // 기존 드래그 로직
    if (this.isDragging) {
      if (this.draggedWarpPoint) {
        // 워프 포인트 이동
        this.warpPoint.x = mouseX;
        this.warpPoint.y = mouseY;
        
        // 화면 경계 체크
        this.warpPoint.x = Math.max(0, Math.min(this.warpPoint.x, this.canvas.width));
        this.warpPoint.y = Math.max(0, Math.min(this.warpPoint.y, this.canvas.height));
      } else if (this.draggedBuilding) {
        // 이전 위치 저장
        const prevX = this.draggedBuilding.x;
        const prevY = this.draggedBuilding.y;
        
        // 건물 이동
        this.draggedBuilding.x = mouseX - this.dragOffsetX;
        this.draggedBuilding.y = mouseY - this.dragOffsetY;
        
        // 화면 경계 체크
        this.draggedBuilding.x = Math.max(0, Math.min(this.draggedBuilding.x, this.canvas.width - this.draggedBuilding.width));
        this.draggedBuilding.y = Math.max(0, Math.min(this.draggedBuilding.y, this.canvas.height - this.draggedBuilding.height));
        
        // 건물이 이동했으면 히트박스 업데이트
        if (prevX !== this.draggedBuilding.x || prevY !== this.draggedBuilding.y) {
          // 건물 위치 변경 시 히트박스 업데이트
          this.onBuildingMoved(this.draggedBuilding);
        }
      }
    }
  }
  
  // 마우스 업 핸들러
  handleMouseUp() {
    // 편집 모드 체크
    if (!this.game.isEditMode || !this.game.isVillageMode) return;
    
    // 충돌 영역 조정 중이었다면
    if (this.isAdjustingCollision && this.selectedBuilding && this.adjustingCorner) {
      console.log(`건물 ${this.selectedBuilding.name}의 충돌 여백 설정: ${this.collisionMargin}px`);
      this.adjustingCorner = null; // 조정 중인 모서리 해제
    }
    
    // 드래그 상태 초기화
    this.isDragging = false;
    this.isWarpPointDragging = false;
    this.isBuilidngDragging = false;
    this.draggedBuilding = null;
    this.draggedWarpPoint = false;
  }
  
  // 터치 이벤트 핸들러
  handleTouchStart(e) {
    if (!this.game.isEditMode || !this.game.isVillageMode) return;
    
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // 워프 포인트 터치 확인
    const dx = touchX - this.warpPoint.x;
    const dy = touchY - this.warpPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.warpPoint.radius) {
      this.isDragging = true;
      this.draggedBuilding = null;
      this.draggedWarpPoint = true;
      this.dragOffsetX = dx;
      this.dragOffsetY = dy;
      return;
    }
    
    // 건물 터치 확인
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const building = this.buildings[i];
      if (this.isPointInBuilding(touchX, touchY, building)) {
        this.isDragging = true;
        this.draggedBuilding = building;
        this.draggedWarpPoint = false;
        this.dragOffsetX = touchX - building.x;
        this.dragOffsetY = touchY - building.y;
        break;
      }
    }
  }
  
  // 터치 이동 핸들러
  handleTouchMove(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    if (this.draggedWarpPoint) {
      // 이전 위치 저장
      const prevX = this.warpPoint.x;
      const prevY = this.warpPoint.y;
      
      // 워프 포인트 위치 업데이트
      this.warpPoint.x = touchX - this.dragOffsetX;
      this.warpPoint.y = touchY - this.dragOffsetY;
      
      // 캔버스 경계 안에 유지
      this.warpPoint.x = Math.max(this.warpPoint.radius, Math.min(this.canvas.width - this.warpPoint.radius, this.warpPoint.x));
      this.warpPoint.y = Math.max(this.warpPoint.radius, Math.min(this.canvas.height - this.warpPoint.radius, this.warpPoint.y));
    } else if (this.draggedBuilding) {
      // 건물 위치 업데이트
      this.draggedBuilding.x = touchX - this.dragOffsetX;
      this.draggedBuilding.y = touchY - this.dragOffsetY;
      
      // 캔버스 경계 안에 유지
      this.draggedBuilding.x = Math.max(0, Math.min(this.canvas.width - this.draggedBuilding.width, this.draggedBuilding.x));
      this.draggedBuilding.y = Math.max(0, Math.min(this.canvas.height - this.draggedBuilding.height, this.draggedBuilding.y));
    }
  }
  
  // 터치 종료 핸들러
  handleTouchEnd() {
    this.isDragging = false;
    this.draggedBuilding = null;
    this.draggedWarpPoint = false;
  }
  
  // 점이 건물 내부에 있는지 확인 (35도 회전된 히트박스)
  isPointInBuilding(x, y, building) {
    // 히트박스가 있으면 다각형 충돌 확인
    if (building.hitbox && building.hitbox.length >= 3) {
      return this.isPointInPolygon(x, y, building.hitbox);
    }
    
    // 히트박스가 없는 경우 - 건물 전체 영역을 충돌 영역으로 간주
    return x >= building.x && 
           x <= building.x + building.width && 
           y >= building.y && 
           y <= building.y + building.height;
  }
  
  // 점이 다각형 내부에 있는지 확인하는 함수 (개선된 알고리즘)
  isPointInPolygon(x, y, polygon) {
    // Ray casting 알고리즘으로 점이 다각형 내부에 있는지 확인
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      // yi와 yj가 y의 반대쪽에 있고 (yi > y) !== (yj > y)
      // x가 선분의 해당 y 지점의 x 좌표보다 작은 경우
      const condition1 = (yi > y) !== (yj > y);
      const condition2 = x < (xj - xi) * (y - yi) / (yj - yi) + xi;
      const intersect = condition1 && condition2;
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
  
  // 건물 그리기 함수 수정 - 35도 회전된 히트박스 표시
  drawBuilding(building) {
    // 건물 이미지가 로드되었는지 확인
    if (building.image && building.image.complete) {
      // 건물 이미지 그리기
      this.ctx.drawImage(
        building.image,
        building.x,
        building.y,
        building.width,
        building.height
      );
      
      // 편집 모드일 때만 추가 표시
      if (this.game.isEditMode) {
        // 드래그 중인 건물은 강조 표시
        if (this.draggedBuilding === building) {
          this.ctx.fillStyle = 'rgba(255, 80, 80, 0.3)';
          this.ctx.fillRect(
            building.x,
            building.y,
            building.width,
            building.height
          );
          
          this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          this.ctx.lineWidth = 3;
        } else {
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          this.ctx.lineWidth = 2;
        }
        
        this.ctx.strokeRect(
          building.x,
          building.y,
          building.width,
          building.height
        );
        
        // 건물 이름 표시
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
          building.name,
          building.x + building.width / 2,
          building.y - 10
        );
        
        // 드래그 안내 아이콘
        if (this.draggedBuilding === building) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          this.ctx.font = '24px Arial';
          this.ctx.fillText('↔', building.x + building.width / 2, building.y + building.height + 20);
        }
        
        // 충돌 영역 시각화 (35도 회전 마름모꼴)
        if (building.hitbox && building.hitbox.length >= 3) {
          this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
          this.ctx.lineWidth = 2;
          
          // 다각형 그리기
          this.ctx.beginPath();
          this.ctx.moveTo(building.hitbox[0].x, building.hitbox[0].y);
          for (let i = 1; i < building.hitbox.length; i++) {
            this.ctx.lineTo(building.hitbox[i].x, building.hitbox[i].y);
          }
          this.ctx.closePath();
          this.ctx.stroke();
          
          // 다각형 정점 표시
          if (this.selectedBuilding === building && this.isEditingPolygon) {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            building.hitbox.forEach((vertex, index) => {
              this.ctx.beginPath();
              this.ctx.arc(vertex.x, vertex.y, 8, 0, Math.PI * 2);
              this.ctx.fill();
              
              // 정점 번호 표시
              this.ctx.fillStyle = 'black';
              this.ctx.font = '10px Arial';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(index.toString(), vertex.x, vertex.y + 3);
              this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            });
          }
        } else {
          // 마름모 그리기 (더 넓은 히트박스)
          const centerX = building.x + building.width / 2;
          const centerY = building.y + building.height / 2;
          const size = Math.min(building.width, building.height) * 0.95; // 히트박스 크기 증가 (0.9 -> 0.95)
          
          this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY - size * 0.95); // 상단
          this.ctx.lineTo(centerX + size * 0.95, centerY); // 우측
          this.ctx.lineTo(centerX, centerY + size * 0.95); // 하단
          this.ctx.lineTo(centerX - size * 0.95, centerY); // 좌측
          this.ctx.closePath();
          this.ctx.stroke();
        }
        
        // 충돌 영역 조정 모드일 경우 추가 UI
        if (this.selectedBuilding === building && this.isAdjustingCollision) {
          // 조정점 표시
          const centerX = building.x + building.width / 2;
          const centerY = building.y + building.height / 2;
          const size = Math.min(building.width, building.height) * 0.95; // 히트박스 크기 증가 (0.9 -> 0.95)
          
          const points = [
            { name: 'top', x: centerX, y: centerY - size },
            { name: 'right', x: centerX + size, y: centerY },
            { name: 'bottom', x: centerX, y: centerY + size },
            { name: 'left', x: centerX - size, y: centerY }
          ];
          
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
          for (const point of points) {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
            this.ctx.fill();
          }
          
          // 마진 값 표시
          this.ctx.fillStyle = 'white';
          this.ctx.font = '14px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(
            `크기: ${Math.round(size)}px`,
            centerX,
            centerY
          );
        }
      }
    }
  }
  
  // 편집 모드 UI 그리기
  drawEditModeUI() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 250, 30);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('편집 모드: M키로 토글, S키로 저장', 20, 30);
    
    // 저장 완료 메시지
    if (this.saveMessageVisible) {
      const alpha = Math.min(1, Math.max(0, 1 - (Date.now() - this.saveMessageTimer) / 3000));
      
      this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
      this.ctx.fillRect(this.canvas.width / 2 - 100, 50, 200, 40);
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = '18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('마을 배치 저장 완료!', this.canvas.width / 2, 75);
    }
  }
  
  // 워프 포인트 그리기
  drawWarpPoint(player) {
    // 플레이어와 워프 포인트 거리 계산
    const dx = player.x - this.warpPoint.x;
    const dy = player.y - this.warpPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 상호작용 가능 거리 내에 있으면 워프 포인트 활성화
    this.warpPoint.active = distance <= this.warpPoint.interactionDistance;
    
    // 발광 효과 업데이트
    const now = Date.now();
    if (now - this.warpPoint.lastGlowUpdate > 50) {
      this.warpPoint.lastGlowUpdate = now;
      
      // 발광 강도 업데이트 (0.3 ~ 0.8 사이에서 변동)
      this.warpPoint.glowIntensity += 0.03 * this.warpPoint.glowDirection;
      if (this.warpPoint.glowIntensity >= 0.8) {
        this.warpPoint.glowIntensity = 0.8;
        this.warpPoint.glowDirection = -1;
      } else if (this.warpPoint.glowIntensity <= 0.3) {
        this.warpPoint.glowIntensity = 0.3;
        this.warpPoint.glowDirection = 1;
      }
    }
    
    // 워프 포인트 그리기
    const gradient = this.ctx.createRadialGradient(
      this.warpPoint.x, this.warpPoint.y, 
      this.warpPoint.radius * 0.3,
      this.warpPoint.x, this.warpPoint.y, 
      this.warpPoint.radius
    );
    
    // 드래그 중이면 색상 변경
    if (this.draggedWarpPoint) {
      gradient.addColorStop(0, `rgba(255, 150, 50, ${this.warpPoint.glowIntensity * 1.2})`);
      gradient.addColorStop(0.7, `rgba(200, 100, 50, ${this.warpPoint.glowIntensity * 0.8})`);
      gradient.addColorStop(1, `rgba(150, 50, 0, 0)`);
    } else {
      gradient.addColorStop(0, `rgba(80, 200, 255, ${this.warpPoint.glowIntensity})`);
      gradient.addColorStop(0.7, `rgba(30, 100, 255, ${this.warpPoint.glowIntensity * 0.7})`);
      gradient.addColorStop(1, `rgba(10, 50, 200, 0)`);
    }
    
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
    
    if (this.draggedWarpPoint) {
      this.ctx.strokeStyle = `rgba(255, 150, 0, ${this.warpPoint.glowIntensity * 0.9})`;
      this.ctx.lineWidth = 3;
    } else {
      this.ctx.strokeStyle = `rgba(100, 200, 255, ${this.warpPoint.glowIntensity * 0.8})`;
      this.ctx.lineWidth = 2;
    }
    
    this.ctx.stroke();
    
    // 편집 모드일 때 워프 포인트도 드래그 가능하게 표시
    if (this.game.isEditMode && this.game.isVillageMode) {
      this.ctx.strokeStyle = this.draggedWarpPoint ? 
        'rgba(255, 150, 0, 0.9)' : 
        'rgba(255, 255, 0, 0.8)';
      this.ctx.lineWidth = this.draggedWarpPoint ? 4 : 3;
      this.ctx.beginPath();
      this.ctx.arc(
        this.warpPoint.x, 
        this.warpPoint.y, 
        this.warpPoint.radius + 5, 
        0, 
        Math.PI * 2
      );
      this.ctx.stroke();
      
      // 워프 포인트 라벨
      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        '워프 포인트',
        this.warpPoint.x,
        this.warpPoint.y - this.warpPoint.radius - 15
      );
      
      // 드래그 중일 때 추가 표시
      if (this.draggedWarpPoint) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('↔', this.warpPoint.x, this.warpPoint.y + this.warpPoint.radius + 25);
      }
    }
  }
  
  // 상호작용 안내 메시지 표시
  drawInstructions(player) {
    // 워프 포인트 안내 메시지 제거됨
    
    // 편집 모드 안내 메시지
    if (this.game.isEditMode && this.game.isVillageMode) {
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "건물을 드래그하여 배치할 수 있습니다",
        this.canvas.width / 2,
        this.canvas.height - 20
      );
    }
    
    // 상자 열기 안내 메시지 추가
    for (const chest of this.chests) {
      if (!chest.isOpened && !chest.isAnimating) {
        // 플레이어가 상자 근처에 있을 때만 표시
        const dx = player.x - chest.x;
        const dy = player.y - chest.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < chest.size * 2) {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          this.ctx.font = "14px Arial";
          this.ctx.textAlign = "center";
          this.ctx.fillText(
            "상자를 열려면 클릭하세요",
            chest.x,
            chest.y - chest.size - 10
          );
        }
      }
    }
  }
  
  // 워프 포인트와 상호작용 시도 (이제는 사용하지 않음)
  tryInteractWithWarpPoint() {
    return false; // 워프 포인트 제거로 항상 false 반환
  }

  // 워프 포인트 그리기 (숨김 처리)
  drawWarpPoint(player) {
    // 워프 포인트 그리지 않음
  }
  
  // 건물 이동 시 히트박스 업데이트
  onBuildingMoved(building) {
    // 건물이 이동되면 히트박스도 함께 업데이트
    if (building.hitboxTemplate) {
      building.hitbox = building.hitboxTemplate.map(point => {
        return {
          x: Math.floor(building.x + point.x * building.width),
          y: Math.floor(building.y + point.y * building.height)
        };
      });
      console.log(`건물 ${building.name} 이동 후 히트박스 업데이트:`, building.hitbox);
    }
    
    // 레이아웃 저장
    this.saveLayout();
  }
  
  // 마을 그리기
  draw(player) {
    // 배경 그리기
    this.ctx.fillStyle = this.villageBackground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 플레이어보다 뒤에 있는 양 그리기
    this.drawSheeps(player);
    
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
    
    // 플레이어보다 앞에 있는 양 그리기
    this.drawSheepsBehindPlayer(player);
    
    // 상자 그리기
    this.drawChests();
    
    // 에디터 모드 UI 그리기
    if (this.game.isEditMode) {
      this.drawEditModeUI();
    }
    
    // 게임 인스트럭션 그리기
    this.drawInstructions(player);
  }
  
  // 플레이어 충돌 영역 시각화 (마름모꼴 형태)
  drawPlayerCollisionArea(player) {
    if (this.game.debugOptions && this.game.debugOptions.showHitboxes) {
      // 플레이어 히트박스 (중앙에 위치한 작은 마름모)
      const centerX = player.x + player.size / 2;
      const centerY = player.y + player.size / 2;
      const size = player.size * 0.9; // 히트박스 크기 증가 (0.8 -> 0.9)
      
      // 마름모꼴 히트박스 그리기 (더 넓은 히트박스)
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY - size * 0.95); // 상단
      this.ctx.lineTo(centerX + size * 0.95, centerY); // 우측
      this.ctx.lineTo(centerX, centerY + size * 0.95); // 하단
      this.ctx.lineTo(centerX - size * 0.95, centerY); // 좌측
      this.ctx.closePath();
      this.ctx.stroke();
    }
  }
  
  // 플레이어 이동 처리 함수
  handlePlayerMovement(player, keys) {
    // 이전 안전 위치 저장 - 게임 시작 시 한 번만 초기화하도록 수정
    if (player.safeX === undefined || player.safeY === undefined) {
      player.safeX = player.x;
      player.safeY = player.y;
    }
    
    // 일반적인 이전 위치는 매 프레임마다 저장
    player.prevX = player.x;
    player.prevY = player.y;
    
    let dx = 0;
    let dy = 0;
    
    // 이동 방향 계산
    if (keys.ArrowUp || keys.w) dy -= player.speed;
    if (keys.ArrowDown || keys.s) dy += player.speed;
    if (keys.ArrowLeft || keys.a) {
      dx -= player.speed;
    }
    if (keys.ArrowRight || keys.d) {
      dx += player.speed;
    }
    
    // 이동이 없으면 처리 중단
    if (dx === 0 && dy === 0) {
      player.isMoving = false;
      return;
    }
    
    player.isMoving = true;
    
    // 디버그 정보 - 현재 플레이어 위치 로그
    if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
      console.log(`플레이어 이동 전 위치: x=${player.x.toFixed(2)}, y=${player.y.toFixed(2)}, 안전위치: x=${player.safeX.toFixed(2)}, y=${player.safeY.toFixed(2)}`);
    }
    
    // 대각선 이동 시 속도 정규화
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx = dx / length * player.speed;
      dy = dy / length * player.speed;
    }
    
    // 충돌 없는 이동만 허용하는 방식으로 변경
    // 1. 임시 위치 계산
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    // 2. 현재 위치에서 충돌 여부 확인 (현재 위치가 안전한지 확인)
    let currentPositionSafe = true;
    for (const building of this.buildings) {
      if (this.willPlayerCollideWithBuilding(player, building)) {
        currentPositionSafe = false;
        if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
          console.log(`현재 위치가 이미 충돌 상태: 건물=${building.name}`);
        }
        break;
      }
    }
    
    // 3. 현재 위치가 안전하지 않으면 마지막 안전 위치로 강제 이동
    if (!currentPositionSafe) {
      player.x = player.safeX;
      player.y = player.safeY;
      
      if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
        console.log(`안전하지 않은 위치에서 안전 위치로 강제 복귀: x=${player.safeX.toFixed(2)}, y=${player.safeY.toFixed(2)}`);
      }
      return;
    }
    
    // 4. X축 이동 시도 (단독으로 체크)
    const playerAfterX = {
      x: newX,
      y: player.y,
      size: player.size
    };
    
    let xCollision = false;
    for (const building of this.buildings) {
      if (this.willPlayerCollideWithBuilding(playerAfterX, building)) {
        xCollision = true;
        if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
          console.log(`X축 충돌 감지: 건물=${building.name}, 위치=x:${building.x.toFixed(2)},y:${building.y.toFixed(2)}`);
        }
        break;
      }
    }
    
    // 5. Y축 이동 시도 (단독으로 체크)
    const playerAfterY = {
      x: player.x,
      y: newY,
      size: player.size
    };
    
    let yCollision = false;
    for (const building of this.buildings) {
      if (this.willPlayerCollideWithBuilding(playerAfterY, building)) {
        yCollision = true;
        if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
          console.log(`Y축 충돌 감지: 건물=${building.name}, 위치=x:${building.x.toFixed(2)},y:${building.y.toFixed(2)}`);
        }
        break;
      }
    }
    
    // 6. 충돌이 없는 방향으로만 이동
    let moved = false;
    
    if (!xCollision) {
      player.x = newX;
      moved = true;
    }
    
    if (!yCollision) {
      player.y = newY;
      moved = true;
    }
    
    // 7. 최종 안전 체크 - 이동 후 충돌이 없으면 현재 위치를 안전 위치로 저장
    let finalPositionSafe = true;
    for (const building of this.buildings) {
      if (this.willPlayerCollideWithBuilding(player, building)) {
        finalPositionSafe = false;
        if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
          console.log(`최종 이동 후 충돌 발생! 건물=${building.name}, 플레이어 위치=x:${player.x.toFixed(2)},y:${player.y.toFixed(2)}`);
        }
        
        // 예상치 못한 충돌 발생 - 안전 위치로 강제 복귀
        player.x = player.safeX;
        player.y = player.safeY;
        
        if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
          console.log(`안전 위치로 강제 복귀: x=${player.safeX.toFixed(2)}, y=${player.safeY.toFixed(2)}`);
        }
        break;
      }
    }
    
    // 8. 최종 위치가 안전하면 새로운 안전 위치로 저장
    if (finalPositionSafe && moved) {
      player.safeX = player.x;
      player.safeY = player.y;
      
      if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
        console.log(`새 안전 위치 저장: x=${player.safeX.toFixed(2)}, y=${player.safeY.toFixed(2)}`);
      }
    }
    
    // 9. 화면 경계 체크
    player.x = Math.max(0, Math.min(player.x, this.canvas.width - player.size));
    player.y = Math.max(0, Math.min(player.y, this.canvas.height - player.size));
    
    // 디버그 정보 - 최종 플레이어 위치 로그
    if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
      console.log(`플레이어 이동 후 위치: x=${player.x.toFixed(2)}, y=${player.y.toFixed(2)}, 이동=${player.isMoving}`);
    }
    
    // 이동 상태 업데이트
    player.isMoving = (player.x !== player.prevX || player.y !== player.prevY);
    
    // 워프 포인트와의 상호작용 체크
    this.warpPoint.active = this.isPlayerCollidingWithWarpPoint(player);
  }
  
  // 벽 충돌 판정을 위한 함수
  willPlayerCollideWithBuilding(player, building) {
    // 기본 AABB 충돌 체크 (최적화)
    const aabbCollision = player.x < building.x + building.width &&
                         player.x + player.size > building.x &&
                         player.y < building.y + building.height &&
                         player.y + player.size > building.y;
                         
    if (!aabbCollision) {
      return false; // 기본 충돌 영역에 없으면 바로 반환
    }
    
    // 디버그 정보 - AABB 충돌 로그
    if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
      console.log(`AABB 충돌 검사: 플레이어(${player.x.toFixed(2)},${player.y.toFixed(2)}) - 건물(${building.name})`);
    }
    
    // 건물의 히트박스가 있는지 확인
    if (building.hitbox && building.hitbox.length >= 3) {
      // 플레이어의 중요 포인트들
      const playerPoints = [
        {x: player.x, y: player.y},                       // 좌상단
        {x: player.x + player.size, y: player.y},         // 우상단
        {x: player.x + player.size, y: player.y + player.size}, // 우하단
        {x: player.x, y: player.y + player.size},         // 좌하단
        {x: player.x + player.size/2, y: player.y},       // 상단 중앙
        {x: player.x + player.size, y: player.y + player.size/2}, // 우측 중앙
        {x: player.x + player.size/2, y: player.y + player.size}, // 하단 중앙
        {x: player.x, y: player.y + player.size/2},       // 좌측 중앙
        {x: player.x + player.size/2, y: player.y + player.size/2} // 중앙
      ];
      
      // 1. 플레이어의 주요 포인트들이 건물 히트박스 내부에 있는지 확인
      for (const point of playerPoints) {
        if (this.isPointInPolygon(point.x, point.y, building.hitbox)) {
          if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
            console.log(`포인트 충돌: 플레이어 포인트(${point.x.toFixed(2)},${point.y.toFixed(2)})가 히트박스 내부에 있음`);
          }
          return true; // 충돌 발생
        }
      }
      
      // 2. 건물 히트박스의 각 점이 플레이어 내부에 있는지 확인
      for (const point of building.hitbox) {
        if (point.x >= player.x && point.x <= player.x + player.size &&
            point.y >= player.y && point.y <= player.y + player.size) {
          if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
            console.log(`히트박스 포인트 충돌: 히트박스 포인트(${point.x.toFixed(2)},${point.y.toFixed(2)})가 플레이어 내부에 있음`);
          }
          return true; // 충돌 발생
        }
      }
      
      // 3. 선분 교차 확인 (선분 교차 체크)
      const playerSegments = [
        [{x: player.x, y: player.y}, {x: player.x + player.size, y: player.y}], // 상단
        [{x: player.x + player.size, y: player.y}, {x: player.x + player.size, y: player.y + player.size}], // 우측
        [{x: player.x + player.size, y: player.y + player.size}, {x: player.x, y: player.y + player.size}], // 하단
        [{x: player.x, y: player.y + player.size}, {x: player.x, y: player.y}] // 좌측
      ];
      
      for (let i = 0; i < building.hitbox.length; i++) {
        const p1 = building.hitbox[i];
        const p2 = building.hitbox[(i + 1) % building.hitbox.length];
        
        for (const segment of playerSegments) {
          if (this.doLinesIntersect(segment[0], segment[1], p1, p2)) {
            if (this.game.debugOptions && this.game.debugOptions.showDebugInfo) {
              console.log(`선분 교차 충돌: 플레이어 선분과 히트박스 선분(${p1.x.toFixed(2)},${p1.y.toFixed(2)}-${p2.x.toFixed(2)},${p2.y.toFixed(2)})이 교차함`);
            }
            return true; // 충돌 발생
          }
        }
      }
      
      // 모든 검사에서 충돌이 감지되지 않음
      return false;
    }
    
    // 히트박스가 없는 경우 기본 AABB 충돌만 사용
    return true; // 이미 기본 AABB 충돌이 확인됨
  }

  /**
   * 플레이어와 워프 포인트가 충돌하는지 확인
   * @param {Object} player - 플레이어 객체
   * @returns {boolean} 충돌 여부
   */
  isPlayerCollidingWithWarpPoint(player) {
    const dx = player.x + player.size/2 - this.warpPoint.x;
    const dy = player.y + player.size/2 - this.warpPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 워프 포인트와의 거리가 일정 범위 내인지 확인
    return distance <= this.warpPoint.interactionDistance;
  }

  // 선분 교차 알고리즘 개선 (수치 오차 처리 추가)
  doLinesIntersect(p1, p2, p3, p4) {
    // 벡터의 외적을 이용한 교차 확인
    function ccw(a, b, c) {
      const val = (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
      return val;
    }
    
    const ccw1 = ccw(p1, p3, p4);
    const ccw2 = ccw(p2, p3, p4);
    const ccw3 = ccw(p1, p2, p3);
    const ccw4 = ccw(p1, p2, p4);
    
    // 두 선분이 교차하는 경우
    if ((ccw1 * ccw2 < 0) && (ccw3 * ccw4 < 0)) return true;
    
    // 선분이 점 위에 있는 경우
    if (ccw1 === 0 && this.isPointOnSegment(p3, p4, p1)) return true;
    if (ccw2 === 0 && this.isPointOnSegment(p3, p4, p2)) return true;
    if (ccw3 === 0 && this.isPointOnSegment(p1, p2, p3)) return true;
    if (ccw4 === 0 && this.isPointOnSegment(p1, p2, p4)) return true;
    
    return false;
  }

  // 점이 선분 위에 있는지 확인
  isPointOnSegment(p1, p2, p) {
    return (p.x <= Math.max(p1.x, p2.x) && p.x >= Math.min(p1.x, p2.x) &&
            p.y <= Math.max(p1.y, p2.y) && p.y >= Math.min(p1.y, p2.y));
  }

  // 디버그 정보 토글 함수 추가
  toggleDebugInfo() {
    if (!this.game.debugOptions) {
      this.game.debugOptions = {};
    }
    
    this.game.debugOptions.showDebugInfo = !this.game.debugOptions.showDebugInfo;
    console.log(`디버그 정보 표시: ${this.game.debugOptions.showDebugInfo ? '켜짐' : '꺼짐'}`);
  }

  // 마을 업데이트
  update(deltaTime, player) {
    // player 객체 업데이트
    if (player) {
      this.player = player;
    }
    
    // 양 업데이트
    this.updateSheeps(deltaTime, player);
    
    // 상자 업데이트
    this.updateChests(player);
  }

  // 플레이어 객체를 저장하는 메서드 추가
  setPlayer(player) {
    this.player = player;
  }

  // 상자 초기화 메서드 추가
  initChests() {
    this.chests = [];
    console.log("상자 초기화 시작...");
    
    // 마을 내 랜덤 위치에 상자 배치
    for (let i = 0; i < this.numChests; i++) {
      let x, y;
      let validPosition = false;
      let attempts = 0;
      const maxAttempts = 100; // 최대 시도 횟수 제한
      
      // 건물이나 워프 포인트와 겹치지 않는 위치 찾기
      while (!validPosition && attempts < maxAttempts) {
        attempts++;
        
        // 화면 내 랜덤 위치 (가장자리에서 조금 떨어짐)
        x = 100 + Math.random() * (this.canvas.width - 200);
        y = 100 + Math.random() * (this.canvas.height - 200);
        
        // 워프 포인트와의 거리 확인
        const distToWarp = Math.sqrt(
          Math.pow(x - this.warpPoint.x, 2) + 
          Math.pow(y - this.warpPoint.y, 2)
        );
        
        // 건물과의 충돌 확인
        let collidesWithBuilding = false;
        for (const building of this.buildings) {
          if (this.isPointNearBuilding(x, y, building, 50)) {
            collidesWithBuilding = true;
            break;
          }
        }
        
        // 다른 상자와의 거리 확인
        let tooCloseToChest = false;
        for (const chest of this.chests) {
          const distToChest = Math.sqrt(
            Math.pow(x - chest.x, 2) + Math.pow(y - chest.y, 2)
          );
          if (distToChest < 100) {
            tooCloseToChest = true;
            break;
          }
        }
        
        // 워프 포인트, 건물, 다른 상자와 충분히 떨어져 있으면 유효
        validPosition = distToWarp > 150 && !collidesWithBuilding && !tooCloseToChest;
      }
      
      // 유효한 위치를 찾지 못했다면 중앙에 배치
      if (!validPosition) {
        console.warn(`유효한 상자 위치를 ${maxAttempts}번 시도 후에도 찾지 못했습니다. 화면 중앙에 배치합니다.`);
        x = this.canvas.width / 2;
        y = this.canvas.height / 2;
      }
      
      // 상자 추가
      const newChest = new Chest(x, y, 60); // 크기를 조금 키움 (50 -> 60)
      this.chests.push(newChest);
      console.log(`상자 #${i+1} 생성: (${x}, ${y})`);
    }
    
    console.log(`${this.chests.length}개의 상자가 마을에 배치되었습니다.`);
  }
  
  // 상자 업데이트 로직
  updateChests(player) {
    if (!player) return;
    
    // 각 상자 업데이트
    this.chests.forEach(chest => {
      chest.update();
      
      // 플레이어가 상자 근처에 있고, 상자가 아직 열리지 않았으면
      if (!chest.isOpened && !chest.isAnimating && chest.checkPlayerCollision(player)) {
        chest.open();
        console.log("상자가 열렸습니다!");
      }
      
      // 칩 수집 처리
      const collectedValue = chest.updateChips(player);
      if (collectedValue > 0) {
        // 칩 가치만큼 플레이어 체력 증가 및 수집 카운터 업데이트
        player.chips = Math.min(player.chips + collectedValue, player.chipBag);
        this.totalChipsCollected += collectedValue;
        
        console.log(`칩 ${collectedValue}개 수집 (총 ${this.totalChipsCollected}/${this.autoTransitionThreshold})`);
        
        // 칩이 임계값에 도달했는지 확인
        if (this.totalChipsCollected >= this.autoTransitionThreshold && !this.showTransitionMessage) {
          // 전환 메시지 표시 시작
          this.showTransitionMessage = true;
          this.transitionMessageTime = Date.now();
          
          // 일정 시간 후 게임 모드로 전환
          setTimeout(() => {
            if (this.game && this.game.isVillageMode) {
              console.log("칩이 충분히 모였습니다! 게임 라운드로 전환합니다.");
              this.game.isVillageMode = false;
              this.game.isStartScreen = false;
              
              // 게임 상태 초기화 (라운드는 유지)
              this.game.isGameOver = false;
              this.game.isPaused = false;
              this.game.isPokerPhase = false;
              
              // 플레이어 체력 확인 - 게임 시작 시 최소 체력 1 보장
              if (player.chips <= 0) {
                player.chips = 1;
                console.log("게임 전환 시 최소 체력 보장: 칩 = 1");
              }
              
              // 라운드 시작
              this.game.isRoundTransition = false;
              this.game.roundStartTime = Date.now();
              this.game.isSpawningEnemies = true;
              this.game.enemiesKilledInRound = 0;
              
              // 플레이어 전투 모드 속도 설정
              player.setModeSpeed(false);
            }
          }, 2000);
        }
      }
    });
  }
  
  // 상자 그리기
  drawChests() {
    this.chests.forEach(chest => {
      chest.draw(this.ctx);
    });
    
    // 전환 메시지 표시
    if (this.showTransitionMessage) {
      const elapsed = Date.now() - this.transitionMessageTime;
      
      if (elapsed < 3000) { // 3초 동안 메시지 표시
        this.ctx.save();
        
        // 메시지 배경
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width/2 - 200, this.canvas.height/2 - 50, 400, 100);
        
        // 메시지 텍스트
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('충분한 칩을 모았습니다!', this.canvas.width/2, this.canvas.height/2 - 15);
        this.ctx.fillText('게임 라운드로 곧 전환됩니다...', this.canvas.width/2, this.canvas.height/2 + 15);
        
        this.ctx.restore();
      } else {
        this.showTransitionMessage = false;
      }
    }
  }
} 