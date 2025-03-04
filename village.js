// village.js - 마을 관련 기능을 담당하는 모듈

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
      if (this.game.isEditMode && this.game.isVillageMode) {
        e.preventDefault();
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
  
  // 마우스 이벤트 핸들러 수정 - 다각형 편집과 기존 코드를 통합
  handleMouseDown(e) {
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
  }
  
  // 워프 포인트와 상호작용 시도
  tryInteractWithWarpPoint() {
    if (this.warpPoint.active) {
      console.log("워프 포인트 활성화 - 게임 라운드 시작");
      // 게임 모드를 마을에서 라운드 모드로 변경
      if (this.game.startRound) {
        this.game.startRound(); // 게임의 startRound 메서드 호출
      } else {
        // 기존 호환성을 위한 코드
        this.game.isVillageMode = false;
        this.game.player.setModeSpeed(false); // 전투 모드 속도 설정
      }
    }
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
    
    // 편집 모드 UI 그리기
    if (this.game.isEditMode) {
      this.drawEditModeUI();
    }
    
    // 플레이어 충돌 영역 시각화 (마름모꼴 형태)
    this.drawPlayerCollisionArea(player);
    
    // 마을 안내 메시지 그리기
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
      player.facingLeft = true;
    }
    if (keys.ArrowRight || keys.d) {
      dx += player.speed;
      player.facingLeft = false;
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
} 