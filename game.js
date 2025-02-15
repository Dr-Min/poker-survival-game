class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      size: 30,
      speed: 4,
      hp: 5,
      maxHp: 5,
      invincible: false,
      invincibleTime: 1000,
      bulletSpeed: 5.6,
      lastShot: 0,
      shotInterval: 600,
      bulletDamage: 1,
    };
    this.enemies = [];
    this.score = 0;
    this.keys = {};
    this.bullets = [];
    this.cards = [];
    this.collectedCards = [];
    this.cardTypes = ['spade', 'heart', 'diamond', 'clover'];
    this.effects = {
      spade: {
        count: 0,
        damageIncrease: 0,
        penetrationDamage: 0,
        criticalChance: 0,
        aoeEnabled: false,
        ultimateEndTime: 0
      },
      heart: {
        count: 0,
        lifeSteal: 0,
        convertChance: 0,
        maxHpIncrease: 0,
        allyPowerUp: false,
        ultimateEndTime: 0
      },
      diamond: {
        count: 0,
        slowAmount: 0,
        stunDuration: 0,
        aoeSlow: false,
        damageAmplify: 0,
        ultimateEndTime: 0
      },
      clover: {
        count: 0,
        ricochetChance: 0,
        explosionEnabled: false,
        bounceCount: 0,
        explosionSize: 1,
        ultimateEndTime: 0
      }
    };

    this.mouseX = 0;
    this.mouseY = 0;

    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      moveX: 0,
      moveY: 0,
      size: 50,
    };
    this.shootButton = {
      x: this.canvas.width - 80,
      y: this.canvas.height - 80,
      size: 60,
    };

    this.isGameOver = false;
    this.gameLoopId = null;

    // 플레이어 이미지 로드
    this.playerImage = new Image();
    this.playerImage.src = "player.png"; // 이미지 파일 경로

    // 카드 이미지 로딩 시스템 추가
    this.cardImages = {
      spade: {},
      heart: {},
      diamond: {},
      clover: {}
    };

    // 이미지 로딩 프로미스 배열
    const imagePromises = [];

    // 각 무늬와 숫자에 대한 이미지 로드
    ['spade', 'heart', 'diamond', 'clover'].forEach(type => {
      for (let i = 1; i <= 13; i++) {
        const img = new Image();
        const promise = new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
        });
        img.src = `V2_4x/${type}/${i}.png`;
        this.cardImages[type][i] = img;
        imagePromises.push(promise);
      }
    });

    // 모든 이미지가 로드되면 게임 시작
    Promise.all(imagePromises)
      .then(() => {
        console.log('모든 카드 이미지 로드 완료');
        this.setupEventListeners();
        this.setupMouseTracking();
        this.setupMobileControls();
        this.startGame();
      })
      .catch(error => {
        console.error('카드 이미지 로드 실패:', error);
      });

    this.weapons = {
      highCard: { name: "리볼버", damage: 1 },
      onePair: { name: "듀얼 리볼버", damage: 2 },
      twoPair: { name: "더블 듀얼 리볼버", damage: 3 },
      threeOfAKind: { name: "트리플 샷건", damage: 4 },
      straight: { name: "레이저 레일건", damage: 5 },
      fullHouse: { name: "샷건+권총 콤보", damage: 6 },
      flush: { name: "플라즈마 캐논", damage: 7 },
      fourOfAKind: { name: "4연발 로켓런처", damage: 8 },
      straightFlush: { name: "레이저 게이트링건", damage: 9 },
      royalStraightFlush: { name: "오비탈 레이저 스트라이크", damage: 10 }
    };
    this.currentWeapon = this.weapons.highCard;
    
    // 라운드 시스템 추가
    this.round = 1;
    this.enemiesKilledInRound = 0;
    this.enemiesRequiredForNextRound = 10; // 다음 라운드로 넘어가기 위한 처치 수
    this.roundStartTime = Date.now();
    this.roundDuration = 60000; // 60초
    this.isRoundTransition = false;
    this.roundTransitionDuration = 3000; // 3초
    this.roundTransitionStartTime = 0;

    this.isPaused = false;
    this.showDebugMenu = false;
    this.debugOptions = {
      selectedCard: { type: 'spade', number: 1 },
      cardTypes: ['spade', 'heart', 'diamond', 'clover'],
      cardNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    };
  }

  setupEventListeners() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
      
      // ESC 키 처리
      if (e.key === "Escape") {
        this.isPaused = !this.isPaused;
        this.showDebugMenu = this.isPaused;
      }

      // 디버그 메뉴에서 카드 추가
      if (this.showDebugMenu && e.key === "Enter") {
        this.applyCardEffect(
          this.debugOptions.selectedCard.type,
          this.debugOptions.selectedCard.number
        );
      }
    });
    
    window.addEventListener("keyup", (e) => (this.keys[e.key] = false));

    // 디버그 메뉴 클릭 이벤트
    this.canvas.addEventListener("click", (e) => {
      if (!this.showDebugMenu) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.handleDebugMenuClick(x, y);
    });
  }

  setupMouseTracking() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener("click", () => this.shoot());
  }

  setupMobileControls() {
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      if (this.isInShootButton(x, y)) {
        this.shoot();
        return;
      }

      this.joystick.active = true;
      this.joystick.startX = x;
      this.joystick.startY = y;
      this.joystick.moveX = x;
      this.joystick.moveY = y;
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.joystick.active) return;

      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.joystick.moveX = touch.clientX - rect.left;
      this.joystick.moveY = touch.clientY - rect.top;

      this.mouseX =
        this.player.x + (this.joystick.moveX - this.joystick.startX) * 2;
      this.mouseY =
        this.player.y + (this.joystick.moveY - this.joystick.startY) * 2;
    });

    this.canvas.addEventListener("touchend", () => {
      this.joystick.active = false;
    });
  }

  isInShootButton(x, y) {
    const dx = x - this.shootButton.x;
    const dy = y - this.shootButton.y;
    return Math.sqrt(dx * dx + dy * dy) < this.shootButton.size;
  }

  movePlayer() {
    if (this.isGameOver || this.isPaused) return;
    
    if (this.isMobile && this.joystick.active) {
      const dx = this.joystick.moveX - this.joystick.startX;
      const dy = this.joystick.moveY - this.joystick.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.player.x += (dx / distance) * this.player.speed;
        this.player.y += (dy / distance) * this.player.speed;
      }
    } else {
      // WASD 및 화살표 키 이동
      if (this.keys["ArrowUp"] || this.keys["w"]) this.player.y -= this.player.speed;
      if (this.keys["ArrowDown"] || this.keys["s"]) this.player.y += this.player.speed;
      if (this.keys["ArrowLeft"] || this.keys["a"]) this.player.x -= this.player.speed;
      if (this.keys["ArrowRight"] || this.keys["d"]) this.player.x += this.player.speed;
    }

    // 플레이어가 화면 밖으로 나가지 않도록 제한
    this.player.x = Math.max(this.player.size/2, Math.min(this.canvas.width - this.player.size/2, this.player.x));
    this.player.y = Math.max(this.player.size/2, Math.min(this.canvas.height - this.player.size/2, this.player.y));
  }

  shoot() {
    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    switch(this.currentWeapon.name) {
      case "리볼버":
        // 기본 단발 발사
        this.createBullet(this.player.x, this.player.y, normalizedDx, normalizedDy, 5, this.currentWeapon.damage);
        break;

      case "듀얼 리볼버":
        // 양쪽에서 두발 발사
        this.createBullet(this.player.x - 10, this.player.y, normalizedDx, normalizedDy, 5, this.currentWeapon.damage);
        this.createBullet(this.player.x + 10, this.player.y, normalizedDx, normalizedDy, 5, this.currentWeapon.damage);
        break;

      case "더블 듀얼 리볼버":
        // 양쪽에서 2발씩 연속 발사 (총 4발)
        for (let i = 0; i < 2; i++) {
          setTimeout(() => {
            if (!this.isGameOver) {
              this.createBullet(this.player.x - 10, this.player.y, normalizedDx, normalizedDy, 5, this.currentWeapon.damage);
              this.createBullet(this.player.x + 10, this.player.y, normalizedDx, normalizedDy, 5, this.currentWeapon.damage);
            }
          }, i * 150);
        }
        break;

      case "트리플 샷건":
        // 삼방향 발사
        this.createBullet(this.player.x, this.player.y, normalizedDx, normalizedDy, 5, this.currentWeapon.damage);
        this.createBullet(this.player.x, this.player.y, normalizedDx * Math.cos(0.3) - normalizedDy * Math.sin(0.3),
                         normalizedDx * Math.sin(0.3) + normalizedDy * Math.cos(0.3), 5, this.currentWeapon.damage);
        this.createBullet(this.player.x, this.player.y, normalizedDx * Math.cos(-0.3) - normalizedDy * Math.sin(-0.3),
                         normalizedDx * Math.sin(-0.3) + normalizedDy * Math.cos(-0.3), 5, this.currentWeapon.damage);
        break;

      case "레이저 레일건":
        // 관통 레이저
        this.createBullet(this.player.x, this.player.y, normalizedDx, normalizedDy, 3, this.currentWeapon.damage, true, "#00ffff");
        break;

      case "샷건+권총 콤보":
        // 샷건 + 정확한 단발
        for (let i = 0; i < 5; i++) {
          const spread = (Math.random() - 0.5) * 0.5;
          this.createBullet(this.player.x, this.player.y, 
            normalizedDx * Math.cos(spread) - normalizedDy * Math.sin(spread),
            normalizedDx * Math.sin(spread) + normalizedDy * Math.cos(spread), 
            4, this.currentWeapon.damage * 0.5);
        }
        this.createBullet(this.player.x, this.player.y, normalizedDx, normalizedDy, 6, this.currentWeapon.damage);
        break;

      case "플라즈마 캐논":
        // 큰 플라즈마 볼
        this.createBullet(this.player.x, this.player.y, normalizedDx, normalizedDy, 12, this.currentWeapon.damage, false, "#ff00ff");
        break;

      case "4연발 로켓런처":
        // 4발 로켓 연속 발사
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            if (!this.isGameOver) {
              this.createBullet(this.player.x, this.player.y, normalizedDx, normalizedDy, 8, this.currentWeapon.damage, false, "#ff4400");
            }
          }, i * 100);
        }
        break;

      case "레이저 게이트링건":
        // 빠른 연속 레이저
        for (let i = 0; i < 8; i++) {
          const spread = (Math.random() - 0.5) * 0.2;
          this.createBullet(this.player.x, this.player.y, 
            normalizedDx * Math.cos(spread) - normalizedDy * Math.sin(spread),
            normalizedDx * Math.sin(spread) + normalizedDy * Math.cos(spread), 
            4, this.currentWeapon.damage * 0.5, true, "#ff0000");
        }
        break;

      case "오비탈 레이저 스트라이크":
        // 궁극기: 전방위 레이저 공격
        for (let i = 0; i < 16; i++) {
          const angle = (Math.PI * 2 * i) / 16;
          this.createBullet(this.player.x, this.player.y,
            Math.cos(angle),
            Math.sin(angle),
            6, this.currentWeapon.damage * 0.8, true, "#ffff00");
        }
        break;
    }
  }

  createBullet(x, y, dx, dy, size, damage, isPiercing = false, color = "#ffff00") {
    const bullet = {
      x,
      y,
      speedX: dx * this.player.bulletSpeed,
      speedY: dy * this.player.bulletSpeed,
      size,
      damage,
      isRicochet: false,
      isPiercing,
      color,
      bounceCount: 0  // 명시적으로 bounceCount 초기화
    };
    
    console.log('총알 생성:', {
      위치: `(${x.toFixed(2)}, ${y.toFixed(2)})`,
      속도: `(${bullet.speedX.toFixed(2)}, ${bullet.speedY.toFixed(2)})`,
      크기: size,
      데미지: damage,
      도탄여부: bullet.isRicochet,
      바운스횟수: bullet.bounceCount
    });
    
    this.bullets.push(bullet);
    return bullet;
  }

  spawnEnemy() {
    if (this.isGameOver || this.isRoundTransition) return;
    
    // 라운드가 증가할수록 적 생성 확률 증가
    if (Math.random() < 0.016 * (1 + this.round * 0.1)) {
      const side = Math.floor(Math.random() * 4);
      let x, y;

      switch (side) {
        case 0: x = Math.random() * this.canvas.width; y = -20; break;
        case 1: x = this.canvas.width + 20; y = Math.random() * this.canvas.height; break;
        case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 20; break;
        case 3: x = -20; y = Math.random() * this.canvas.height; break;
      }

      const newEnemy = {
        x,
        y,
        size: 20,
        speed: 1.6 * (1 + this.round * 0.1), // 라운드가 올라갈수록 속도 증가
        hp: 5 + Math.floor(this.round * 1.5), // 라운드가 올라갈수록 체력 증가
        isDead: false,
      };

      const isTooClose = this.enemies.some(
        (enemy) => this.getDistance(newEnemy, enemy) < enemy.size * 2
      );

      if (!isTooClose) {
        this.enemies.push(newEnemy);
      }
    }
  }

  getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  updateEnemies() {
    const now = Date.now();
    const removeEnemies = [];

    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.isDead) {
        this.enemiesKilledInRound++;
        return false;
      }

      // 스턴 상태 체크
      if (enemy.stunEndTime && now < enemy.stunEndTime) {
        return true;
      }

      // 아군 상태 체크
      if (enemy.isAlly) {
        // 가장 가까운 적 찾기
        let nearestEnemy = null;
        let minDistance = Infinity;
        
        this.enemies.forEach(otherEnemy => {
          if (!otherEnemy.isDead && !otherEnemy.isAlly) {
            const distance = this.getDistance(enemy, otherEnemy);
            if (distance < minDistance) {
              minDistance = distance;
              nearestEnemy = otherEnemy;
            }
          }
        });

        if (nearestEnemy) {
          const dx = nearestEnemy.x - enemy.x;
          const dy = nearestEnemy.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 아군이 적을 향해 이동
          enemy.x += (dx / distance) * enemy.speed;
          enemy.y += (dy / distance) * enemy.speed;

          // 공격 범위 내에 있으면 공격
          if (distance < 100) {
            if (!enemy.lastAttackTime || now - enemy.lastAttackTime > 1000) {
              let damage = 1;
              if (this.effects.heart.allyPowerUp) {
                damage *= 1.5;
              }
              nearestEnemy.hp -= damage;
              enemy.lastAttackTime = now;

              if (nearestEnemy.hp <= 0) {
                nearestEnemy.isDead = true;
                this.score += 5;
              }
            }
          }
        }
        return true;
      }

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;

      if (!this.player.invincible && this.checkCollision(this.player, enemy)) {
        this.player.hp -= 1;
        this.player.invincible = true;

        setTimeout(() => {
          this.player.invincible = false;
        }, this.player.invincibleTime);

        if (this.player.hp <= 0) {
          this.gameOver();
        }
        return false;
      }
      return true;
    });

    // 라운드 진행 상태 체크
    this.checkRoundProgress();
  }

  checkRoundProgress() {
    if (this.isRoundTransition) {
      if (Date.now() - this.roundTransitionStartTime >= this.roundTransitionDuration) {
        this.startNextRound();
      }
      return;
    }

    const roundTimeElapsed = Date.now() - this.roundStartTime;
    if (roundTimeElapsed >= this.roundDuration || this.enemiesKilledInRound >= this.enemiesRequiredForNextRound) {
      this.startRoundTransition();
    }
  }

  startRoundTransition() {
    this.isRoundTransition = true;
    this.roundTransitionStartTime = Date.now();
    this.enemies = []; // 모든 적 제거
    
    // 플레이어 체력 회복
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
  }

  startNextRound() {
    this.round++;
    this.isRoundTransition = false;
    this.enemiesKilledInRound = 0;
    this.roundStartTime = Date.now();
    
    // 라운드가 올라갈 때마다 난이도 증가
    this.enemiesRequiredForNextRound = Math.floor(10 * (1 + this.round * 0.2)); // 처치해야 할 적 증가
    this.roundDuration = Math.max(30000, 60000 - (this.round - 1) * 5000); // 시간은 점점 짧아짐 (최소 30초)
  }

  checkCollision(player, enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (player.size + enemy.size) / 2;
  }

  gameOver() {
    this.stopGame();
    alert("게임 오버!");
    this.resetGame();
    this.startGame();
  }

  resetGame() {
    this.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      size: 30,
      speed: 4,
      hp: 5,
      maxHp: 5,
      invincible: false,
      invincibleTime: 1000,
      bulletSpeed: 5.6,
      lastShot: 0,
      shotInterval: 600,
      bulletDamage: 1,
    };
    this.enemies = [];
    this.bullets = [];
    this.cards = [];
    this.score = 0;
    this.effects = {
      spade: {
        count: 0,
        damageIncrease: 0,
        penetrationDamage: 0,
        criticalChance: 0,
        aoeEnabled: false,
        ultimateEndTime: 0
      },
      heart: {
        count: 0,
        lifeSteal: 0,
        convertChance: 0,
        maxHpIncrease: 0,
        allyPowerUp: false,
        ultimateEndTime: 0
      },
      diamond: {
        count: 0,
        slowAmount: 0,
        stunDuration: 0,
        aoeSlow: false,
        damageAmplify: 0,
        ultimateEndTime: 0
      },
      clover: {
        count: 0,
        ricochetChance: 0,
        explosionEnabled: false,
        bounceCount: 0,
        explosionSize: 1,
        ultimateEndTime: 0
      }
    };
    this.collectedCards = [];
  }

  updateBullets() {
    if (this.isGameOver) return;

    const now = Date.now();
    if (now - this.player.lastShot > this.player.shotInterval) {
      this.shoot();
      this.player.lastShot = now;
    }

    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.speedX;
      bullet.y += bullet.speedY;

      // 화면 밖으로 나가면 제거
      if (bullet.x < 0 || bullet.x > this.canvas.width || bullet.y < 0 || bullet.y > this.canvas.height) {
        return false;
      }

      let hitEnemy = false;
      this.enemies.forEach((enemy) => {
        if (!enemy.isDead && this.checkCollision(bullet, enemy)) {
          // 스페이드 효과: 데미지 증가
          let finalDamage = bullet.damage;
          if (this.effects.spade.damageIncrease > 0) {
            finalDamage *= (1 + this.effects.spade.damageIncrease);
          }

          // 스페이드 효과: 치명타
          if (this.effects.spade.criticalChance > 0 && Math.random() < this.effects.spade.criticalChance) {
            finalDamage *= 2;
          }

          // 스페이드 효과: 관통 데미지 증가
          if (bullet.isPiercing && this.effects.spade.penetrationDamage > 0) {
            finalDamage *= (1 + this.effects.spade.penetrationDamage);
          }

          // 다이아몬드 효과: 데미지 증폭
          if (this.effects.diamond.damageAmplify > 0) {
            finalDamage *= (1 + this.effects.diamond.damageAmplify);
          }

          enemy.hp -= finalDamage;

          // 다이아몬드 효과: 감속
          if (this.effects.diamond.slowAmount > 0) {
            enemy.speed *= (1 - this.effects.diamond.slowAmount);
          }

          // 다이아몬드 효과: 스턴
          if (this.effects.diamond.stunDuration > 0) {
            enemy.stunEndTime = now + this.effects.diamond.stunDuration;
          }

          // 하트 효과: 흡혈
          if (this.effects.heart.lifeSteal > 0) {
            this.player.hp = Math.min(this.player.maxHp, 
              this.player.hp + finalDamage * this.effects.heart.lifeSteal);
          }

          // 클로버 효과: 도탄
          if (this.effects.clover.ricochetChance > 0 && 
              Math.random() < this.effects.clover.ricochetChance) {
            this.handleRicochet(bullet, enemy);
          }

          if (enemy.hp <= 0) {
            enemy.isDead = true;
            this.score += 10;

            // 하트 효과: 아군 전환
            if (this.effects.heart.convertChance > 0 && 
                Math.random() < this.effects.heart.convertChance) {
              enemy.isDead = false;
              enemy.isAlly = true;
              enemy.hp = 5;
            }

            // 클로버 효과: 폭발
            if (this.effects.clover.explosionEnabled) {
              const explosionRadius = 30 * this.effects.clover.explosionSize;
              const explosionDamage = bullet.damage * 0.5;
              
              // 주변 적들에게 폭발 데미지
              this.enemies.forEach(nearbyEnemy => {
                if (!nearbyEnemy.isDead && nearbyEnemy !== enemy) {
                  const distance = this.getDistance(enemy, nearbyEnemy);
                  if (distance < explosionRadius) {
                    const damageMultiplier = 1 - (distance / explosionRadius);
                    const explosionFinalDamage = explosionDamage * damageMultiplier;
                    nearbyEnemy.hp -= explosionFinalDamage;
                    
                    if (nearbyEnemy.hp <= 0) {
                      nearbyEnemy.isDead = true;
                      this.score += 5;
                    }
                  }
                }
              });
            }

            this.spawnCard(enemy.x, enemy.y);
          }

          if (!bullet.isPiercing) {
            hitEnemy = true;
          }
        }
      });

      return !hitEnemy;
    });
  }

  handleRicochet(originalBullet, hitEnemy) {
    console.log('도탄 시도:', {
      클로버개수: this.effects.clover.count,
      도탄확률: this.effects.clover.ricochetChance,
      현재바운스: originalBullet.bounceCount,
      최대바운스: this.effects.clover.bounceCount
    });

    const maxBounces = this.effects.clover.bounceCount + 1;
    if (originalBullet.bounceCount >= maxBounces) {
      console.log('최대 바운스 도달');
      return;
    }

    const nearbyEnemies = this.enemies.filter(e => 
      !e.isDead && 
      e !== hitEnemy && 
      this.getDistance(hitEnemy, e) < 150
    );

    console.log('주변 적 발견:', nearbyEnemies.length);

    if (nearbyEnemies.length > 0) {
      const targets = nearbyEnemies
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      targets.forEach(target => {
        const angle = Math.atan2(
          target.y - hitEnemy.y,
          target.x - hitEnemy.x
        );
        
        // 속도 계산 수정
        const speed = this.player.bulletSpeed * 0.8;
        const newBullet = {
          x: hitEnemy.x,
          y: hitEnemy.y,
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed,
          size: originalBullet.size * 0.7,
          damage: originalBullet.damage * 0.6,
          isRicochet: true,
          isPiercing: false,
          color: "#00ff00",
          bounceCount: (originalBullet.bounceCount || 0) + 1
        };
        
        this.bullets.push(newBullet);
        
        console.log('도탄 총알 생성 완료:', {
          시작위치: `(${newBullet.x.toFixed(2)}, ${newBullet.y.toFixed(2)})`,
          목표위치: `(${target.x.toFixed(2)}, ${target.y.toFixed(2)})`,
          각도: (angle * 180 / Math.PI).toFixed(2) + '도',
          속도: `(${newBullet.speedX.toFixed(2)}, ${newBullet.speedY.toFixed(2)})`,
          크기: newBullet.size.toFixed(2),
          데미지: newBullet.damage.toFixed(2),
          바운스횟수: newBullet.bounceCount
        });
      });
    }
  }

  createExplosion(x, y, radius, damage) {
    this.enemies.forEach(enemy => {
      if (!enemy.isDead) {
        const distance = this.getDistance({x, y}, enemy);
        if (distance < radius) {
          const damageMultiplier = 1 - (distance / radius);
          enemy.hp -= damage * damageMultiplier;
          
          if (enemy.hp <= 0) {
            enemy.isDead = true;
            this.score += 10;
            
            // 2차 폭발 (클로버 4개 이상 효과)
            if (this.effects.clover.explosionSize > 1) {
              this.createExplosion(enemy.x, enemy.y, radius * 0.5, damage * 0.5);
            }
          }
        }
      }
    });
  }

  spawnCard(x, y) {
    if (Math.random() < 0.2) {
      const types = ["spade", "heart", "diamond", "clover"];
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      const cardType = types[Math.floor(Math.random() * types.length)];
      const cardNumber = numbers[Math.floor(Math.random() * numbers.length)];

      this.cards.push({
        x,
        y,
        type: cardType,
        number: cardNumber,
        size: 20,
        createdAt: Date.now(),
        blinkStart: Date.now() + 5000 // 5초 후부터 깜빡임 시작
      });
    }
  }

  drawCardSymbol(x, y, type, size, number = null) {
    if (number !== null) {
      // 이미지로 카드 그리기
      const img = this.cardImages[type][number];
      if (img) {
        const scale = size / 40; // 이미지 크기 조정 (기본 이미지가 40x40 픽셀이라고 가정)
        this.ctx.drawImage(
          img,
          x - size,
          y - size,
          size * 2,
          size * 2
        );
        return;
      }
    }

    // 이미지 로드 실패시 기존 방식으로 그리기 (폴백)
    if (number !== null) {
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillRect(x - size, y - size * 1.4, size * 2, size * 2.8);
      this.ctx.strokeStyle = "#000000";
      this.ctx.strokeRect(x - size, y - size * 1.4, size * 2, size * 2.8);
    }

    this.ctx.fillStyle = this.getCardColor(type);
    this.ctx.strokeStyle = this.getCardColor(type);

    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    if (number !== null) {
      this.ctx.fillStyle = this.getCardColor(type);
      this.ctx.font = `${size}px Arial`;
      this.ctx.textAlign = "center";
      const displayNumber = this.getDisplayNumber(number);
      this.ctx.fillText(displayNumber, x - size * 0.7, y - size);
      this.ctx.fillText(displayNumber, x + size * 0.7, y + size);
    }
  }

  getDisplayNumber(number) {
    switch (number) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return number.toString();
    }
  }

  getCardPowerMultiplier(number) {
    if (number === 1) return 2.0; // Ace
    if (number >= 11) return 1.5; // Face cards
    return 1.0;
  }

  applyCardEffect(type, number) {
    this.collectedCards.push({ type, number });
    if (this.collectedCards.length > 5) {
      this.collectedCards.shift();
    }

    // 각 무늬별 카드 개수 계산
    const cardCounts = {};
    this.collectedCards.forEach(card => {
      cardCounts[card.type] = (cardCounts[card.type] || 0) + 1;
    });

    // 효과 초기화
    this.resetEffects();

    // 스페이드 효과 적용
    if (cardCounts.spade >= 1) {
      this.effects.spade.damageIncrease = 0.25; // 데미지 25% 증가
    }
    if (cardCounts.spade >= 2) {
      this.effects.spade.penetrationDamage = 0.15; // 관통 시 데미지 15% 증가
    }
    if (cardCounts.spade >= 3) {
      this.effects.spade.criticalChance = 0.3; // 치명타 30% 확률
    }
    if (cardCounts.spade >= 4) {
      this.effects.spade.aoeEnabled = true; // 범위 데미지
    }
    if (cardCounts.spade >= 5) {
      this.effects.spade.ultimateEndTime = Date.now() + 10000; // 10초 궁극기
    }

    // 하트 효과 적용
    if (cardCounts.heart >= 1) {
      this.effects.heart.lifeSteal = 0.1; // 흡혈 10%
    }
    if (cardCounts.heart >= 2) {
      this.effects.heart.convertChance = 0.25; // 25% 확률로 아군 전환
    }
    if (cardCounts.heart >= 3) {
      this.effects.heart.maxHpIncrease = 0.3; // 최대 체력 30% 증가
      this.player.maxHp = Math.floor(5 * (1 + this.effects.heart.maxHpIncrease));
    }
    if (cardCounts.heart >= 4) {
      this.effects.heart.allyPowerUp = true; // 아군 강화
    }
    if (cardCounts.heart >= 5) {
      this.effects.heart.ultimateEndTime = Date.now() + 10000; // 10초 궁극기
    }

    // 다이아몬드 효과 적용
    if (cardCounts.diamond >= 1) {
      this.effects.diamond.slowAmount = 0.3; // 30% 감속
    }
    if (cardCounts.diamond >= 2) {
      this.effects.diamond.stunDuration = 1000; // 1초 스턴
    }
    if (cardCounts.diamond >= 3) {
      this.effects.diamond.aoeSlow = true; // 범위 감속
    }
    if (cardCounts.diamond >= 4) {
      this.effects.diamond.damageAmplify = 0.3; // 데미지 30% 증폭
    }
    if (cardCounts.diamond >= 5) {
      this.effects.diamond.ultimateEndTime = Date.now() + 5000; // 5초 궁극기
    }

    // 클로버 효과 적용
    if (cardCounts.clover >= 1) {
      this.effects.clover.ricochetChance = 0.3; // 30% 도탄 확률
    }
    if (cardCounts.clover >= 2) {
      this.effects.clover.explosionEnabled = true; // 폭발 효과
    }
    if (cardCounts.clover >= 3) {
      this.effects.clover.bounceCount = 5; // 5번 바운스
    }
    if (cardCounts.clover >= 4) {
      this.effects.clover.explosionSize = 2; // 폭발 범위 2배
    }
    if (cardCounts.clover >= 5) {
      this.effects.clover.ultimateEndTime = Date.now() + 15000; // 15초 궁극기
    }

    this.effects.spade.count = cardCounts.spade || 0;
    this.effects.heart.count = cardCounts.heart || 0;
    this.effects.diamond.count = cardCounts.diamond || 0;
    this.effects.clover.count = cardCounts.clover || 0;

    const hand = this.checkPokerHand();
    this.currentWeapon = this.weapons[hand];
    this.player.bulletDamage = this.currentWeapon.damage;
  }

  resetEffects() {
    this.effects = {
      spade: {
        count: 0,
        damageIncrease: 0,
        penetrationDamage: 0,
        criticalChance: 0,
        aoeEnabled: false,
        ultimateEndTime: 0
      },
      heart: {
        count: 0,
        lifeSteal: 0,
        convertChance: 0,
        maxHpIncrease: 0,
        allyPowerUp: false,
        ultimateEndTime: 0
      },
      diamond: {
        count: 0,
        slowAmount: 0,
        stunDuration: 0,
        aoeSlow: false,
        damageAmplify: 0,
        ultimateEndTime: 0
      },
      clover: {
        count: 0,
        ricochetChance: 0,
        explosionEnabled: false,
        bounceCount: 0,
        explosionSize: 1,
        ultimateEndTime: 0
      }
    };
  }

  createRicochet(hitEnemy, bullet) {
    const otherEnemies = this.enemies.filter(
      (enemy) => !enemy.isDead && enemy !== hitEnemy
    );

    const nearestEnemies = otherEnemies
      .map((enemy) => ({
        enemy,
        distance: this.getDistance(hitEnemy, enemy),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    nearestEnemies.forEach(({ enemy }) => {
      const dx = enemy.x - hitEnemy.x;
      const dy = enemy.y - hitEnemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        return;
      }

      this.bullets.push({
        x: hitEnemy.x,
        y: hitEnemy.y,
        speedX: (dx / distance) * (this.player.bulletSpeed * 0.8),
        speedY: (dy / distance) * (this.player.bulletSpeed * 0.8),
        size: 3,
        damage: bullet.damage * 0.5,
        isRicochet: true,
      });
    });
  }

  updateCards() {
    const now = Date.now();
    this.cards = this.cards.filter((card) => {
      // 7초가 지난 카드는 제거
      if (now - card.createdAt > 7000) {
        return false;
      }
      
      if (this.checkCollision(this.player, card)) {
        this.applyCardEffect(card.type, card.number);
        return false;
      }
      return true;
    });
  }

  getPokerHandName(hand) {
    switch(hand) {
      case 'royalStraightFlush': return '로열 스트레이트 플러시';
      case 'straightFlush': return '스트레이트 플러시';
      case 'fourOfAKind': return '포카드';
      case 'fullHouse': return '풀하우스';
      case 'flush': return '플러시';
      case 'straight': return '스트레이트';
      case 'threeOfAKind': return '트리플';
      case 'twoPair': return '투페어';
      case 'onePair': return '원페어';
      case 'highCard': return '하이카드';
      default: return '';
    }
  }

  draw() {
    if (this.isGameOver) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 일반 게임 요소 그리기
    if (!this.showDebugMenu) {
      const now = Date.now();

      // 기본 텍스트 정렬 설정
      this.ctx.textAlign = "left";

      // UI 배경 그리기 (왼쪽)
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(10, 10, 300, 230);

      // 점수 표시 (왼쪽 상단 고정)
      this.ctx.fillStyle = "white";
      this.ctx.font = "24px Arial";
      this.ctx.fillText(`점수: ${this.score}`, 20, 40);

      // 라운드 정보 표시 (왼쪽 상단 고정)
      this.ctx.fillText(`라운드: ${this.round}`, 20, 70);
      
      // 라운드 진행 상황 표시
      const progressText = `처치: ${this.enemiesKilledInRound}/${this.enemiesRequiredForNextRound}`;
      this.ctx.fillText(progressText, 20, 100);
      
      // 남은 시간 표시
      const timeLeft = Math.max(0, Math.ceil((this.roundDuration - (now - this.roundStartTime)) / 1000));
      this.ctx.fillText(`남은 시간: ${timeLeft}초`, 20, 130);

      // 현재 무기 정보 표시
      this.ctx.font = "20px Arial";
      this.ctx.fillText(`무기: ${this.currentWeapon.name}`, 20, 160);
      this.ctx.fillText(`공격력: ${this.currentWeapon.damage}`, 20, 190);

      // 체력바
      const healthBarWidth = 200;
      const healthBarHeight = 20;
      const healthBarX = 20;
      const healthBarY = 210;

      // 체력바 배경
      this.ctx.fillStyle = "#444444";
      this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

      // 현재 체력
      const currentHealthWidth = (this.player.hp / this.player.maxHp) * healthBarWidth;
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);

      // 체력바 테두리
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

      // 카드 영역 배경 (오른쪽 상단 고정)
      const cardAreaX = this.canvas.width - 320;
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(cardAreaX - 10, 10, 310, 180);
      
      // 버전 표시 (오른쪽 최상단)
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "right";
      this.ctx.fillText("v.3_1", this.canvas.width - 10, 25);
      this.ctx.textAlign = "left";
      
      // 카드 영역 제목
      this.ctx.fillStyle = "white";
      this.ctx.font = "18px Arial";
      this.ctx.fillText("수집된 카드", cardAreaX, 35);
      
      // 현재 족보 표시
      const currentHand = this.checkPokerHand();
      this.ctx.fillStyle = "#ffff00";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(`현재 족보: ${this.getPokerHandName(currentHand)}`, cardAreaX, 160);
      
      // 효과 표시 영역
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(cardAreaX - 10, 190, 310, 200);

      // 각 무늬별 효과 표시
      this.ctx.font = "14px Arial";
      let effectY = 215;

      // 스페이드 효과
      if (this.effects.spade.count > 0) {
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillText("♠ 스페이드 효과:", cardAreaX, effectY);
          effectY += 20;
          if (this.effects.spade.damageIncrease > 0) {
              this.ctx.fillText(`- 데미지 ${this.effects.spade.damageIncrease * 100}% 증가`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.spade.penetrationDamage > 0) {
              this.ctx.fillText(`- 관통 데미지 ${this.effects.spade.penetrationDamage * 100}% 증가`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.spade.criticalChance > 0) {
              this.ctx.fillText(`- 치명타 확률 ${this.effects.spade.criticalChance * 100}%`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.spade.aoeEnabled) {
              this.ctx.fillText(`- 범위 데미지 활성화`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.spade.ultimateEndTime > now) {
              this.ctx.fillText(`- 궁극기 발동중!`, cardAreaX + 10, effectY);
              effectY += 20;
          }
      }

      // 하트 효과
      if (this.effects.heart.count > 0) {
          this.ctx.fillStyle = "#ff6666";
          this.ctx.fillText("♥ 하트 효과:", cardAreaX, effectY);
          effectY += 20;
          if (this.effects.heart.lifeSteal > 0) {
              this.ctx.fillText(`- 흡혈량 ${this.effects.heart.lifeSteal * 100}%`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.heart.convertChance > 0) {
              this.ctx.fillText(`- 아군 전환 확률 ${this.effects.heart.convertChance * 100}%`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.heart.maxHpIncrease > 0) {
              this.ctx.fillText(`- 최대 체력 ${this.effects.heart.maxHpIncrease * 100}% 증가`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.heart.allyPowerUp) {
              this.ctx.fillText(`- 아군 공격력 50% 증가`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.heart.ultimateEndTime > now) {
              this.ctx.fillText(`- 궁극기 발동중!`, cardAreaX + 10, effectY);
              effectY += 20;
          }
      }

      // 다이아몬드 효과
      if (this.effects.diamond.count > 0) {
          this.ctx.fillStyle = "#ff66ff";
          this.ctx.fillText("◆ 다이아몬드 효과:", cardAreaX, effectY);
          effectY += 20;
          if (this.effects.diamond.slowAmount > 0) {
              this.ctx.fillText(`- 적 이동속도 ${this.effects.diamond.slowAmount * 100}% 감소`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.diamond.stunDuration > 0) {
              this.ctx.fillText(`- ${this.effects.diamond.stunDuration/1000}초 스턴`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.diamond.aoeSlow) {
              this.ctx.fillText(`- 범위 감속 활성화`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.diamond.damageAmplify > 0) {
              this.ctx.fillText(`- 데미지 증폭 ${this.effects.diamond.damageAmplify * 100}%`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.diamond.ultimateEndTime > now) {
              this.ctx.fillText(`- 궁극기 발동중!`, cardAreaX + 10, effectY);
              effectY += 20;
          }
      }

      // 클로버 효과
      if (this.effects.clover.count > 0) {
          this.ctx.fillStyle = "#66ff66";
          this.ctx.fillText("♣ 클로버 효과:", cardAreaX, effectY);
          effectY += 20;
          if (this.effects.clover.ricochetChance > 0) {
              this.ctx.fillText(`- 도탄 확률 ${this.effects.clover.ricochetChance * 100}%`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.clover.explosionEnabled) {
              this.ctx.fillText("- 적 처치시 폭발", cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.clover.bounceCount > 0) {
              this.ctx.fillText(`- ${this.effects.clover.bounceCount}번 바운스`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.clover.explosionSize > 1) {
              this.ctx.fillText(`- 폭발 범위 ${this.effects.clover.explosionSize}배`, cardAreaX + 10, effectY);
              effectY += 20;
          }
          if (this.effects.clover.ultimateEndTime > now) {
              this.ctx.fillText(`- 궁극기 발동중!`, cardAreaX + 10, effectY);
              effectY += 20;
          }
      }

      // 카드 심볼 그리기 전에 텍스트 정렬 중앙으로 변경
      this.ctx.textAlign = "center";
      // 수집된 카드 표시
      this.collectedCards.forEach((card, index) => {
        const cardX = cardAreaX + (index * 60);
        this.drawCardSymbol(cardX, 80, card.type, 20, card.number);
      });
      
      // 다시 왼쪽 정렬로 복구
      this.ctx.textAlign = "left";

      // 조준선
      const lineLength = 50;
      const dx = this.mouseX - this.player.x;
      const dy = this.mouseY - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;

      this.ctx.strokeStyle = "#0066ff";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.x, this.player.y);
      this.ctx.lineTo(
        this.player.x + normalizedDx * lineLength,
        this.player.y + normalizedDy * lineLength
      );
      this.ctx.stroke();

      // 플레이어 그리기
      if (!this.player.invincible || Math.floor(now / 100) % 2) {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        const angle = Math.atan2(
          this.mouseY - this.player.y,
          this.mouseX - this.player.x
        );
        this.ctx.rotate(angle);
        this.ctx.drawImage(
          this.playerImage,
          -this.player.size / 2,
          -this.player.size / 2,
          this.player.size,
          this.player.size
        );
        this.ctx.restore();
      }

      // 총알 그리기
      this.bullets.forEach((bullet) => {
        this.ctx.fillStyle = bullet.color || "#ffff00";
        this.ctx.beginPath();
        this.ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        if (bullet.isPiercing) {
          this.ctx.strokeStyle = bullet.color;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(bullet.x - bullet.speedX * 2, bullet.y - bullet.speedY * 2);
          this.ctx.lineTo(bullet.x, bullet.y);
          this.ctx.stroke();
        }
      });

      // 적 그리기
      this.enemies.forEach((enemy) => {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(
          enemy.x - enemy.size / 2,
          enemy.y - enemy.size / 2,
          enemy.size,
          enemy.size
        );

        const enemyHealthBarWidth = enemy.size;
        const enemyHealthBarHeight = 4;
        const enemyHealthBarY = enemy.y - enemy.size / 2 - 10;

        this.ctx.fillStyle = "#444444";
        this.ctx.fillRect(
          enemy.x - enemyHealthBarWidth / 2,
          enemyHealthBarY,
          enemyHealthBarWidth,
          enemyHealthBarHeight
        );

        const currentEnemyHealthWidth = (enemy.hp / 5) * enemyHealthBarWidth;
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fillRect(
          enemy.x - enemyHealthBarWidth / 2,
          enemyHealthBarY,
          currentEnemyHealthWidth,
          enemyHealthBarHeight
        );
      });

      // 드롭된 카드 그리기
      this.cards.forEach((card) => {
        // 5초 이후부터 깜빡임 효과
        if (now - card.createdAt > 5000) {
          // 250ms 간격으로 깜빡임
          if (Math.floor((now - card.createdAt) / 250) % 2 === 0) {
            this.drawCardSymbol(card.x, card.y, card.type, card.size, card.number);
          }
        } else {
          this.drawCardSymbol(card.x, card.y, card.type, card.size, card.number);
        }
      });

      // 모바일 컨트롤
      if (this.isMobile) {
        if (this.joystick.active) {
          this.ctx.strokeStyle = "#ffffff55";
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(
            this.joystick.startX,
            this.joystick.startY,
            this.joystick.size,
            0,
            Math.PI * 2
          );
          this.ctx.stroke();

          this.ctx.fillStyle = "#ffffff88";
          this.ctx.beginPath();
          this.ctx.arc(
            this.joystick.moveX,
            this.joystick.moveY,
            this.joystick.size / 2,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }

        this.ctx.fillStyle = "#ff000088";
        this.ctx.beginPath();
        this.ctx.arc(
          this.shootButton.x,
          this.shootButton.y,
          this.shootButton.size,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      }

      // 라운드 전환 메시지
      if (this.isRoundTransition) {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = "white";
        this.ctx.font = "48px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(`라운드 ${this.round} 클리어!`, this.canvas.width/2, this.canvas.height/2 - 50);
        this.ctx.fillText(`다음 라운드 준비중...`, this.canvas.width/2, this.canvas.height/2 + 50);
        this.ctx.textAlign = "left";
      }
    }

    // 디버그 메뉴 그리기
    if (this.showDebugMenu) {
      this.drawDebugMenu();
    }

    // 일시정지 메시지
    if (this.isPaused && !this.showDebugMenu) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.fillStyle = "white";
      this.ctx.font = "48px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("일시정지", this.canvas.width/2, this.canvas.height/2);
      this.ctx.font = "24px Arial";
      this.ctx.fillText("ESC를 눌러 재개", this.canvas.width/2, this.canvas.height/2 + 50);
    }
  }

  getCardColor(type) {
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

  startGame() {
    this.isGameOver = false;
    this.gameLoop();
  }

  stopGame() {
    this.isGameOver = true;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  gameLoop() {
    if (!this.isGameOver) {
      if (!this.isPaused) {
        this.movePlayer();
        this.spawnEnemy();
        this.updateEnemies();
        this.updateBullets();
        this.updateCards();
      }
      this.draw();
      this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  checkPokerHand() {
    if (this.collectedCards.length < 1) return 'highCard';
    
    const sortedCards = [...this.collectedCards].sort((a, b) => b.number - a.number);
    const numbers = sortedCards.map(card => card.number);
    const suits = sortedCards.map(card => card.type);

    // 디버깅용 로그
    console.log('현재 카드:', this.collectedCards);
    console.log('정렬된 숫자:', numbers);
    console.log('무늬:', suits);

    // 5장 미만일 경우 현재 가능한 최고 족보 판정
    if (this.collectedCards.length < 5) {
      if (this.hasFourOfAKind(numbers)) return 'fourOfAKind';
      if (this.hasFullHouse(numbers)) return 'fullHouse';
      if (this.hasThreeOfAKind(numbers)) return 'threeOfAKind';
      if (this.hasTwoPair(numbers)) return 'twoPair';
      if (this.hasOnePair(numbers)) return 'onePair';
      return 'highCard';
    }

    // 5장일 경우 모든 족보 판정
    const isAllSameSuit = suits.every(suit => suit === suits[0]);
    
    // 로열 스트레이트 플러시 체크
    const isRoyal = new Set(numbers).size === 5 && 
                    numbers.includes(1) && 
                    numbers.includes(13) && 
                    numbers.includes(12) && 
                    numbers.includes(11) && 
                    numbers.includes(10);
    if (isRoyal && isAllSameSuit) return 'royalStraightFlush';
    
    // 스트레이트 플러시 체크
    const isStraight = this.isStraight(numbers);
    if (isStraight && isAllSameSuit) return 'straightFlush';
    
    // 포카드 체크
    if (this.hasFourOfAKind(numbers)) return 'fourOfAKind';
    
    // 플러시 체크
    if (isAllSameSuit) return 'flush';
    
    // 풀하우스 체크
    if (this.hasFullHouse(numbers)) return 'fullHouse';
    
    // 스트레이트 체크
    if (isStraight) return 'straight';
    
    // 트리플 체크
    if (this.hasThreeOfAKind(numbers)) return 'threeOfAKind';
    
    // 투페어 체크
    if (this.hasTwoPair(numbers)) return 'twoPair';
    
    // 원페어 체크
    if (this.hasOnePair(numbers)) return 'onePair';
    
    return 'highCard';
  }

  isStraight(numbers) {
    const sortedUnique = [...new Set(numbers)].sort((a, b) => b - a);
    if (sortedUnique.length < 5) return false;
    
    // A,2,3,4,5 스트레이트 처리
    if (sortedUnique.includes(1) && 
        sortedUnique.includes(2) && 
        sortedUnique.includes(3) && 
        sortedUnique.includes(4) && 
        sortedUnique.includes(5)) return true;
    
    // 일반적인 스트레이트 체크 (연속된 5개의 숫자)
    const min = Math.min(...sortedUnique);
    const max = Math.max(...sortedUnique);
    if (max - min === 4 && sortedUnique.length === 5) return true;
    
    // 10,J,Q,K,A 스트레이트 처리
    if (sortedUnique.includes(1) && 
        sortedUnique.includes(13) && 
        sortedUnique.includes(12) && 
        sortedUnique.includes(11) && 
        sortedUnique.includes(10)) return true;
    
    return false;
  }

  hasOnePair(numbers) {
    const counts = this.getNumberCounts(numbers);
    return Object.values(counts).some(count => count >= 2);
  }

  hasTwoPair(numbers) {
    const counts = this.getNumberCounts(numbers);
    const pairs = Object.values(counts).filter(count => count >= 2);
    return pairs.length >= 2;
  }

  hasThreeOfAKind(numbers) {
    const counts = this.getNumberCounts(numbers);
    return Object.values(counts).some(count => count >= 3);
  }

  hasFourOfAKind(numbers) {
    const counts = this.getNumberCounts(numbers);
    return Object.values(counts).some(count => count >= 4);
  }

  hasFullHouse(numbers) {
    const counts = this.getNumberCounts(numbers);
    const values = Object.values(counts);
    return values.includes(3) && values.includes(2);
  }

  getNumberCounts(numbers) {
    return numbers.reduce((acc, num) => {
      acc[num] = (acc[num] || 0) + 1;
      return acc;
    }, {});
  }

  updateWeapon() {
    const hand = this.checkPokerHand();
    this.currentWeapon = this.weapons[hand];
    this.player.bulletDamage = this.currentWeapon.damage;
  }

  handleDebugMenuClick(x, y) {
    // 카드 타입 선택 영역
    const typeStartX = this.canvas.width/2 - 200;
    const typeStartY = this.canvas.height/2 - 100;
    
    this.debugOptions.cardTypes.forEach((type, i) => {
      const buttonX = typeStartX + (i * 100);
      const buttonY = typeStartY;
      
      if (x > buttonX && x < buttonX + 80 && 
          y > buttonY && y < buttonY + 30) {
        this.debugOptions.selectedCard.type = type;
      }
    });

    // 카드 숫자 선택 영역
    const numberStartX = typeStartX;
    const numberStartY = typeStartY + 50;
    
    this.debugOptions.cardNumbers.forEach((number, i) => {
      const buttonX = numberStartX + ((i % 7) * 60);
      const buttonY = numberStartY + (Math.floor(i / 7) * 40);
      
      if (x > buttonX && x < buttonX + 50 && 
          y > buttonY && y < buttonY + 30) {
        this.debugOptions.selectedCard.number = number;
      }
    });
  }

  drawDebugMenu() {
    // 반투명 배경
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 제목
    this.ctx.fillStyle = "white";
    this.ctx.font = "32px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("디버그 메뉴", this.canvas.width/2, 100);
    
    // 현재 선택된 카드 정보
    this.ctx.fillText(
      `선택된 카드: ${this.debugOptions.selectedCard.type} ${this.debugOptions.selectedCard.number}`,
      this.canvas.width/2,
      150
    );

    // 카드 타입 선택 버튼
    const typeStartX = this.canvas.width/2 - 200;
    const typeStartY = this.canvas.height/2 - 100;
    
    this.debugOptions.cardTypes.forEach((type, i) => {
      const buttonX = typeStartX + (i * 100);
      const buttonY = typeStartY;
      
      // 버튼 배경
      this.ctx.fillStyle = this.debugOptions.selectedCard.type === type ? "#444" : "#222";
      this.ctx.fillRect(buttonX, buttonY, 80, 30);
      
      // 버튼 텍스트
      this.ctx.fillStyle = "white";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(type, buttonX + 40, buttonY + 20);
    });

    // 카드 숫자 선택 버튼
    const numberStartX = typeStartX;
    const numberStartY = typeStartY + 50;
    
    this.debugOptions.cardNumbers.forEach((number, i) => {
      const buttonX = numberStartX + ((i % 7) * 60);
      const buttonY = numberStartY + (Math.floor(i / 7) * 40);
      
      // 버튼 배경
      this.ctx.fillStyle = this.debugOptions.selectedCard.number === number ? "#444" : "#222";
      this.ctx.fillRect(buttonX, buttonY, 50, 30);
      
      // 버튼 텍스트
      this.ctx.fillStyle = "white";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(number, buttonX + 25, buttonY + 20);
    });

    // 안내 메시지
    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Arial";
    this.ctx.fillText("Enter를 눌러 카드 추가", this.canvas.width/2, this.canvas.height - 100);
    this.ctx.fillText("ESC를 눌러 게임으로 돌아가기", this.canvas.width/2, this.canvas.height - 60);
  }
}

new Game();
