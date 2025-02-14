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
    this.collectedCards = {
      spade: [],
      heart: [],
      diamond: [],
      clover: [],
    };
    this.effects = {
      spade: 0,
      heart: false,
      diamond: false,
      clover: false,
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

    // 플레이어 이미지 로드
    this.playerImage = new Image();
    this.playerImage.src = "player.png"; // 이미지 파일 경로

    // 이미지 로드 완료 후 게임 시작
    this.playerImage.onload = () => {
      this.setupEventListeners();
      this.setupMouseTracking();
      this.setupMobileControls();
      this.gameLoop();
    };
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
    if (this.isGameOver) return;
    if (this.isMobile && this.joystick.active) {
      const dx = this.joystick.moveX - this.joystick.startX;
      const dy = this.joystick.moveY - this.joystick.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.player.x += (dx / distance) * this.player.speed;
        this.player.y += (dy / distance) * this.player.speed;
      }
    } else {
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
    if (this.isGameOver) return;
    if (Math.random() < 0.016) {
      const side = Math.floor(Math.random() * 4);
      let x, y;

      switch (side) {
        case 0:
          x = Math.random() * this.canvas.width;
          y = -20;
          break;
        case 1:
          x = this.canvas.width + 20;
          y = Math.random() * this.canvas.height;
          break;
        case 2:
          x = Math.random() * this.canvas.width;
          y = this.canvas.height + 20;
          break;
        case 3:
          x = -20;
          y = Math.random() * this.canvas.height;
          break;
      }

      const newEnemy = {
        x,
        y,
        size: 20,
        speed: 1.6,
        hp: 5,
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
    const removeEnemies = [];

    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.isDead) return false;

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
  }

  checkCollision(player, enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (player.size + enemy.size) / 2;
  }

  gameOver() {
    this.isGameOver = true;
    alert("게임 오버!");

    this.resetGame();
  }

  resetGame() {
    this.player.hp = 5;
    this.player.maxHp = 5;
    this.player.bulletDamage = 1;
    this.enemies = [];
    this.bullets = [];
    this.cards = [];
    this.score = 0;
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.effects = {
      spade: 0,
      heart: false,
      diamond: false,
      clover: false,
    };
    this.collectedCards = {
      spade: [],
      heart: [],
      diamond: [],
      clover: [],
    };
    this.isGameOver = false;
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

          if (this.effects.diamond && !bullet.isRicochet) {
            enemy.speed *= 0.7;
          }

          if (this.effects.heart && !bullet.isRicochet) {
            if (Math.random() < 0.2) {
              this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
            }
          }

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

  spawnCard(x, y) {
    if (Math.random() < 0.2) {
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

  drawCardSymbol(x, y, type, size, number = null) {
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
      this.ctx.fillText(number, x - size * 0.7, y - size);
      this.ctx.fillText(number, x + size * 0.7, y + size);
    }
  }

  applyCardEffect(type, number) {
    this.collectedCards[type].push(number);
    const powerMultiplier = this.getCardPowerMultiplier(number);

    switch (type) {
      case "spade":
        this.effects.spade += 1;
        this.player.bulletDamage += 1 * powerMultiplier;
        break;
      case "heart":
        this.effects.heart = true;
        break;
      case "diamond":
        this.effects.diamond = true;
        this.effects.slowPower = 0.7 - 0.1 * powerMultiplier;
        break;
      case "clover":
        this.effects.clover = true;
        this.effects.ricochetDamage = 0.5 + 0.1 * powerMultiplier;
        break;
    }
  }

  getCardPowerMultiplier(number) {
    if (number === "A") return 2.0;
    if (["K", "Q", "J"].includes(number)) return 1.5;
    return 1.0;
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
    this.cards = this.cards.filter((card) => {
      if (this.checkCollision(this.player, card)) {
        this.applyCardEffect(card.type, card.number);
        return false;
      }
      return true;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = 10;
    const healthBarY = 70;

    this.ctx.fillStyle = "#444444";
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    const currentHealthWidth = (this.player.hp / 5) * healthBarWidth;
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillRect(
      healthBarX,
      healthBarY,
      currentHealthWidth,
      healthBarHeight
    );

    this.ctx.strokeStyle = "#ffffff";
    this.ctx.strokeRect(
      healthBarX,
      healthBarY,
      healthBarWidth,
      healthBarHeight
    );

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

    if (!this.player.invincible || Math.floor(Date.now() / 100) % 2) {
      // 이미지로 플레이어 그리기
      this.ctx.save(); // 현재 컨텍스트 상태 저장

      // 플레이어 회전 (마우스 방향으로)
      this.ctx.translate(this.player.x, this.player.y);
      const angle = Math.atan2(
        this.mouseY - this.player.y,
        this.mouseX - this.player.x
      );
      this.ctx.rotate(angle);

      // 이미지 그리기
      this.ctx.drawImage(
        this.playerImage,
        -this.player.size / 2,
        -this.player.size / 2,
        this.player.size,
        this.player.size
      );

      this.ctx.restore(); // 컨텍스트 상태 복원
    }

    this.ctx.fillStyle = "#ffff00";
    this.bullets.forEach((bullet) => {
      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.enemies.forEach((enemy) => {
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(
        enemy.x - enemy.size / 2,
        enemy.y - enemy.size / 2,
        enemy.size,
        enemy.size
      );

      const healthBarWidth = enemy.size;
      const healthBarHeight = 4;

      this.ctx.fillStyle = "#444444";
      this.ctx.fillRect(
        enemy.x - healthBarWidth / 2,
        enemy.y - enemy.size / 2 - 10,
        healthBarWidth,
        healthBarHeight
      );

      const currentHealthWidth = (enemy.hp / 5) * healthBarWidth;
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(
        enemy.x - healthBarWidth / 2,
        enemy.y - enemy.size / 2 - 10,
        currentHealthWidth,
        healthBarHeight
      );
    });

    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`Score: ${this.score}`, 10, 30);

    this.cards.forEach((card) => {
      this.drawCardSymbol(card.x, card.y, card.type, card.size, card.number);
    });

    const cardDisplayX = 220;
    const cardDisplayY = 70;
    const cardSpacing = 60;

    Object.entries(this.collectedCards).forEach(([type, numbers], index) => {
      if (numbers.length > 0) {
        this.drawCardSymbol(
          cardDisplayX + index * cardSpacing,
          cardDisplayY,
          type,
          15,
          numbers[numbers.length - 1]
        );
        this.ctx.fillStyle = "white";
        this.ctx.font = "16px Arial";
        this.ctx.fillText(
          `x${numbers.length}`,
          cardDisplayX + index * cardSpacing - 10,
          cardDisplayY + 40
        );
      }
    });

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
    if (!this.isGameOver) {
      this.movePlayer();
      this.spawnEnemy();
      this.updateEnemies();
      this.updateBullets();
      this.updateCards();
    }
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

new Game();
