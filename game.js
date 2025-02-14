class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      size: 30,
      speed: 5,
      hp: 5,
      maxHp: 5,
      invincible: false,
      invincibleTime: 1000,
      bulletSpeed: 7,
      lastShot: 0, // 마지막 발사 시간
      shotInterval: 500, // 발사 간격 (0.5초)
      bulletDamage: 1, // 기본 총알 데미지
    };
    this.enemies = [];
    this.score = 0;
    this.keys = {};
    this.bullets = [];
    this.cards = [];
    this.collectedCards = {
      // 수집한 카드 정보를 더 자세하게 저장
      spade: [], // 예: ['A', 'K', 'Q', ...]
      heart: [],
      diamond: [],
      clover: [],
    };
    this.effects = {
      // 효과 상태 추가
      spade: 0, // 공격력 증가
      heart: false, // 흡혈 효과
      diamond: false, // 슬로우 효과
      clover: false, // 도탄 효과
    };

    // 마우스 위치 추적
    this.mouseX = 0;
    this.mouseY = 0;

    // 모바일 컨트롤 관련 속성 추가
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

    this.setupEventListeners();
    this.setupMouseTracking();
    this.setupMobileControls();
    this.gameLoop();
  }

  setupEventListeners() {
    window.addEventListener("keydown", (e) => (this.keys[e.key] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.key] = false));
  }

  setupMouseTracking() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    // 클릭으로 총알 발사
    this.canvas.addEventListener("click", () => this.shoot());
  }

  setupMobileControls() {
    // 터치 이벤트 리스너 추가
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // 발사 버튼 터치 체크
      if (this.isInShootButton(x, y)) {
        this.shoot();
        return;
      }

      // 조이스틱 시작 위치 설정
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

      // 조준 방향 업데이트
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
    if (this.isMobile && this.joystick.active) {
      // 모바일 조이스틱 이동
      const dx = this.joystick.moveX - this.joystick.startX;
      const dy = this.joystick.moveY - this.joystick.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        // 데드존
        this.player.x += (dx / distance) * this.player.speed;
        this.player.y += (dy / distance) * this.player.speed;
      }
    } else {
      // 기존 키보드 컨트롤
      if (this.keys["ArrowUp"]) this.player.y -= this.player.speed;
      if (this.keys["ArrowDown"]) this.player.y += this.player.speed;
      if (this.keys["ArrowLeft"]) this.player.x -= this.player.speed;
      if (this.keys["ArrowRight"]) this.player.x += this.player.speed;
    }
  }

  shoot() {
    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.bullets.push({
      x: this.player.x,
      y: this.player.y,
      speedX: (dx / distance) * this.player.bulletSpeed,
      speedY: (dy / distance) * this.player.bulletSpeed,
      size: 5,
      damage: this.player.bulletDamage,
      isRicochet: false,
    });
  }

  spawnEnemy() {
    if (Math.random() < 0.02) {
      const side = Math.floor(Math.random() * 4);
      let x, y;

      switch (side) {
        case 0: // 위
          x = Math.random() * this.canvas.width;
          y = -20;
          break;
        case 1: // 오른쪽
          x = this.canvas.width + 20;
          y = Math.random() * this.canvas.height;
          break;
        case 2: // 아래
          x = Math.random() * this.canvas.width;
          y = this.canvas.height + 20;
          break;
        case 3: // 왼쪽
          x = -20;
          y = Math.random() * this.canvas.height;
          break;
      }

      // 새로운 적이 기존 적들과 겹치지 않는지 확인
      const newEnemy = {
        x,
        y,
        size: 20,
        speed: 2,
        hp: 5,
        isDead: false,
      };

      // 다른 적들과의 거리를 체크
      const isTooClose = this.enemies.some(
        (enemy) => this.getDistance(newEnemy, enemy) < enemy.size * 2
      );

      // 겹치지 않을 때만 적 추가
      if (!isTooClose) {
        this.enemies.push(newEnemy);
      }
    }
  }

  // 두 객체 사이의 거리를 계산하는 헬퍼 함수
  getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  updateEnemies() {
    // 제거할 적들의 인덱스를 저장할 배열
    const removeEnemies = [];

    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.isDead) return false; // 죽은 적 제거

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
        return false; // 충돌한 적 제거
      }
      return true;
    });
  }

  checkCollision(player, enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (player.size + enemy.size) / 2;
  }

  gameOver() {
    alert("게임 오버!");
    this.player.hp = 5;
    this.enemies = [];
    this.score = 0;
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
  }

  updateBullets() {
    const now = Date.now();
    if (now - this.player.lastShot > this.player.shotInterval) {
      this.shoot();
      this.player.lastShot = now;
    }

    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.speedX;
      bullet.y += bullet.speedY;

      if (
        bullet.x < 0 ||
        bullet.x > this.canvas.width ||
        bullet.y < 0 ||
        bullet.y > this.canvas.height
      ) {
        return false;
      }

      let hitEnemy = false;
      this.enemies.forEach((enemy) => {
        if (!enemy.isDead && !hitEnemy && this.checkCollision(bullet, enemy)) {
          const damage = bullet.damage || this.player.bulletDamage;
          enemy.hp -= damage;

          // 다이아몬드 효과 (슬로우)
          if (this.effects.diamond && !bullet.isRicochet) {
            enemy.speed *= 0.7;
          }

          // 하트 효과 (흡혈)
          if (this.effects.heart && !bullet.isRicochet) {
            this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
          }

          // 클로버 효과 (도탄)
          if (this.effects.clover && !bullet.isRicochet) {
            this.createRicochet(enemy, bullet);
          }

          if (enemy.hp <= 0) {
            enemy.isDead = true;
            this.score += 10;
            this.spawnCard(enemy.x, enemy.y);
          }
          hitEnemy = true;
        }
      });

      return !hitEnemy;
    });
  }

  // 카드 생성 함수 수정
  spawnCard(x, y) {
    if (Math.random() < 0.2) {
      // 20% 확률로만 카드 드롭
      const types = ["spade", "heart", "diamond", "clover"];
      const numbers = [
        "A",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
      ];
      const cardType = types[Math.floor(Math.random() * types.length)];
      const cardNumber = numbers[Math.floor(Math.random() * numbers.length)];

      this.cards.push({
        x,
        y,
        type: cardType,
        number: cardNumber,
        size: 20,
      });
    }
  }

  // 카드 문양 그리기 함수 수정
  drawCardSymbol(x, y, type, size, number = null) {
    // 카드 배경 (흰색 직사각형)
    if (number !== null) {
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillRect(x - size, y - size * 1.4, size * 2, size * 2.8);
      this.ctx.strokeStyle = "#000000";
      this.ctx.strokeRect(x - size, y - size * 1.4, size * 2, size * 2.8);
    }

    // 문양 그리기
    this.ctx.fillStyle = this.getCardColor(type);
    this.ctx.strokeStyle = this.getCardColor(type);

    // ... existing symbol drawing code ...

    // 숫자 그리기
    if (number !== null) {
      this.ctx.fillStyle = this.getCardColor(type);
      this.ctx.font = `${size}px Arial`;
      this.ctx.textAlign = "center";
      // 왼쪽 상단
      this.ctx.fillText(number, x - size * 0.7, y - size);
      // 오른쪽 하단
      this.ctx.fillText(number, x + size * 0.7, y + size);
    }
  }

  // 카드 효과 적용 수정
  applyCardEffect(type, number) {
    this.collectedCards[type].push(number);

    // 카드 등급에 따른 효과 강화
    const powerMultiplier = this.getCardPowerMultiplier(number);

    switch (type) {
      case "spade":
        this.effects.spade += 1;
        this.player.bulletDamage += 1 * powerMultiplier;
        break;
      case "heart":
        this.effects.heart = true;
        this.player.maxHp += 1 * powerMultiplier;
        break;
      case "diamond":
        this.effects.diamond = true;
        // 슬로우 효과 강화
        this.effects.slowPower = 0.7 - 0.1 * powerMultiplier;
        break;
      case "clover":
        this.effects.clover = true;
        // 도탄 데미지 증가
        this.effects.ricochetDamage = 0.5 + 0.1 * powerMultiplier;
        break;
    }
  }

  // 카드 등급에 따른 효과 배율 계산
  getCardPowerMultiplier(number) {
    if (number === "A") return 2.0;
    if (["K", "Q", "J"].includes(number)) return 1.5;
    return 1.0;
  }

  // 도탄 생성
  createRicochet(hitEnemy, bullet) {
    // 살아있는 다른 적들 찾기
    const otherEnemies = this.enemies.filter(
      (enemy) => !enemy.isDead && enemy !== hitEnemy
    );

    // 가장 가까운 적 3개 찾기
    const nearestEnemies = otherEnemies
      .map((enemy) => ({
        enemy,
        distance: this.getDistance(hitEnemy, enemy),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    // 가까운 적들을 향해 도탄 발사
    nearestEnemies.forEach(({ enemy }) => {
      const dx = enemy.x - hitEnemy.x;
      const dy = enemy.y - hitEnemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 도탄이 없다면 기본 방향으로 발사
      if (distance === 0) {
        return;
      }

      this.bullets.push({
        x: hitEnemy.x,
        y: hitEnemy.y,
        speedX: (dx / distance) * this.player.bulletSpeed,
        speedY: (dy / distance) * this.player.bulletSpeed,
        size: 3,
        damage: bullet.damage * 0.5, // 도탄 데미지는 50%
        isRicochet: true,
      });
    });
  }

  // 카드 업데이트
  updateCards() {
    this.cards = this.cards.filter((card) => {
      // 플레이어가 카드를 주웠는지 확인
      if (this.checkCollision(this.player, card)) {
        this.applyCardEffect(card.type, card.number);
        return false;
      }
      return true;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 체력바 그리기
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = 10;
    const healthBarY = 70;

    // 체력바 배경
    this.ctx.fillStyle = "#444444";
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // 현재 체력
    const currentHealthWidth = (this.player.hp / 5) * healthBarWidth;
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillRect(
      healthBarX,
      healthBarY,
      currentHealthWidth,
      healthBarHeight
    );

    // 체력바 테두리
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.strokeRect(
      healthBarX,
      healthBarY,
      healthBarWidth,
      healthBarHeight
    );

    // 조준선 그리기
    const lineLength = 50; // 조준선 길이
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
    if (!this.player.invincible || Math.floor(Date.now() / 100) % 2) {
      this.ctx.fillStyle = "red";
      this.ctx.fillRect(
        this.player.x - this.player.size / 2,
        this.player.y - this.player.size / 2,
        this.player.size,
        this.player.size
      );
    }

    // 총알 그리기
    this.ctx.fillStyle = "#ffff00"; // 노란색 총알
    this.bullets.forEach((bullet) => {
      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 적 그리기 (체력 표시 추가)
    this.enemies.forEach((enemy) => {
      // 적 본체
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(
        enemy.x - enemy.size / 2,
        enemy.y - enemy.size / 2,
        enemy.size,
        enemy.size
      );

      // 적 체력바
      const healthBarWidth = enemy.size;
      const healthBarHeight = 4;

      // 체력바 배경
      this.ctx.fillStyle = "#444444";
      this.ctx.fillRect(
        enemy.x - healthBarWidth / 2,
        enemy.y - enemy.size / 2 - 10,
        healthBarWidth,
        healthBarHeight
      );

      // 현재 체력
      const currentHealthWidth = (enemy.hp / 5) * healthBarWidth;
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(
        enemy.x - healthBarWidth / 2,
        enemy.y - enemy.size / 2 - 10,
        currentHealthWidth,
        healthBarHeight
      );
    });

    // 점수와 HP 텍스트 표시
    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`Score: ${this.score}`, 10, 30);

    // 카드 그리기 수정
    this.cards.forEach((card) => {
      this.drawCardSymbol(card.x, card.y, card.type, card.size, card.number);
    });

    // 수집한 카드 표시 수정
    const cardDisplayX = 220;
    const cardDisplayY = 70;
    const cardSpacing = 60;

    Object.entries(this.collectedCards).forEach(([type, numbers], index) => {
      if (numbers.length > 0) {
        // 가장 최근에 획득한 카드 표시
        this.drawCardSymbol(
          cardDisplayX + index * cardSpacing,
          cardDisplayY,
          type,
          15,
          numbers[numbers.length - 1]
        );
        // 카드 개수 표시
        this.ctx.fillStyle = "white";
        this.ctx.font = "16px Arial";
        this.ctx.fillText(
          `x${numbers.length}`,
          cardDisplayX + index * cardSpacing - 10,
          cardDisplayY + 40
        );
      }
    });

    // 효과 상태 표시
    this.ctx.fillStyle = "white";
    this.ctx.font = "16px Arial";
    this.ctx.fillText(`공격력: ${this.player.bulletDamage}`, 10, 100);
    this.ctx.fillText(`흡혈: ${this.effects.heart ? "ON" : "OFF"}`, 10, 120);
    this.ctx.fillText(
      `슬로우: ${this.effects.diamond ? "ON" : "OFF"}`,
      10,
      140
    );
    this.ctx.fillText(`도탄: ${this.effects.clover ? "ON" : "OFF"}`, 10, 160);

    // 모바일 컨트롤 그리기
    if (this.isMobile) {
      // 조이스틱 그리기
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

      // 발사 버튼 그리기
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

  gameLoop() {
    this.movePlayer();
    this.spawnEnemy();
    this.updateEnemies();
    this.updateBullets();
    this.updateCards(); // 카드 업데이트 추가
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// 게임 시작
new Game();
