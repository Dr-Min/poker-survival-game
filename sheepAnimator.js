// sheepAnimator.js - 양 애니메이션을 로드하고 관리하는 모듈

export class SheepAnimator {
  constructor() {
    this.animations = {
      idle: null,
      move: null,
      sleep: null,
      getup: null,
      transition: null
    };
    
    this.loaded = false;
  }
  
  // 모든 양 애니메이션 로드
  async loadAnimations() {
    try {
      // 동시에 모든 애니메이션 리소스 로드
      const [idle, move, sleep, getup, transition] = await Promise.all([
        this.loadAnimationData('Sheep.json', 'Sheep.png'),
        this.loadAnimationData('Sheep_move.json', 'Sheep_move.png'),
        this.loadAnimationData('Sheep_sleep.json', 'Sheep_sleep.png'),
        this.loadAnimationData('Sheep_getup.json', 'Sheep_getup.png'),
        this.loadAnimationData('Sheep_transition.json', 'Sheep_transition.png')
      ]);
      
      this.animations.idle = idle;
      this.animations.move = move;
      this.animations.sleep = sleep;
      this.animations.getup = getup;
      this.animations.transition = transition;
      
      this.loaded = true;
      console.log('양 애니메이션 로드 완료');
      return true;
    } catch (error) {
      console.error('양 애니메이션 로드 실패:', error);
      return false;
    }
  }
  
  // 단일 애니메이션 데이터 로드 (JSON과 이미지)
  async loadAnimationData(jsonFile, imageFile) {
    // 경로 설정
    const jsonPath = `assets/sheep/${jsonFile}`;
    const imagePath = `assets/sheep/${imageFile}`;
    
    // JSON 데이터 로드
    const response = await fetch(jsonPath);
    const data = await response.json();
    
    // 이미지 로드
    const image = await this.loadImage(imagePath);
    
    // 필요한 데이터 추출 및 구조화
    const frames = this.extractFramesFromJSON(data);
    
    return {
      image: image,
      frames: frames
    };
  }
  
  // JSON에서 필요한 프레임 데이터 추출
  extractFramesFromJSON(data) {
    const frames = [];
    
    try {
      // 데이터 로깅
      console.log('JSON 데이터 구조:', Object.keys(data));
      
      // JSON 구조에 따라 다르게 처리
      if (data.frames) {
        console.log('프레임 유형:', Array.isArray(data.frames) ? '배열' : '객체');
        
        // 배열 형태인 경우
        if (Array.isArray(data.frames)) {
          data.frames.forEach((frame, index) => {
            if (frame && frame.frame) {
              frames.push({
                x: frame.frame.x,
                y: frame.frame.y,
                width: frame.frame.w,
                height: frame.frame.h
              });
            } else {
              console.warn(`프레임 데이터 누락 (인덱스 ${index}):`, frame);
            }
          });
        } 
        // 객체 형태인 경우 (키:값 쌍)
        else {
          Object.entries(data.frames).forEach(([key, frame], index) => {
            if (frame && frame.frame) {
              frames.push({
                x: frame.frame.x,
                y: frame.frame.y,
                width: frame.frame.w,
                height: frame.frame.h
              });
            } else {
              console.warn(`프레임 데이터 누락 (키 ${key}, 인덱스 ${index}):`, frame);
            }
          });
        }
      } else if (data.meta && data.meta.size) {
        // 프레임이 없는 경우 기본 프레임 생성 (전체 이미지)
        console.warn('프레임 데이터가 없습니다. 기본 프레임을 생성합니다.');
        frames.push({
          x: 0,
          y: 0,
          width: data.meta.size.w || 192,
          height: data.meta.size.h || 192
        });
      } else {
        // 다른 형식의 JSON인 경우 기본 프레임 생성
        console.warn('알 수 없는 JSON 형식입니다. 기본 프레임을 생성합니다.');
        frames.push({
          x: 0,
          y: 0,
          width: 192,
          height: 192
        });
      }
      
      // 프레임이 없으면 기본 프레임 생성
      if (frames.length === 0) {
        console.warn('추출된 프레임이 없습니다. 기본 프레임을 생성합니다.');
        frames.push({
          x: 0,
          y: 0,
          width: 192,
          height: 192
        });
      }
      
      console.log(`추출된 프레임 수: ${frames.length}`);
    } catch (error) {
      console.error('프레임 데이터 추출 중 오류 발생:', error);
      // 오류 발생 시 기본 프레임 생성
      frames.push({
        x: 0,
        y: 0,
        width: 192,
        height: 192
      });
    }
    
    return frames;
  }
  
  // 이미지 로드를 위한 Promise 래퍼
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
      img.src = src;
    });
  }
  
  // 애니메이션 데이터 반환
  getAnimations() {
    if (!this.loaded) {
      console.warn('애니메이션이 아직 로드되지 않았습니다.');
    }
    return this.animations;
  }
} 