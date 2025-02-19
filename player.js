import { checkCollision } from "./utils.js";

export class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.size = 30;
    this.speed = 4;
    this.hp = 5;
    this.maxHp = 5;
    this.invincible = false;
    this.invincibleTime = 1000;
    this.bulletSpeed = 5.6;
    this.lastShot = 0;
    this.shotInterval = 600;
    this.bulletDamage = 1;

    // 플레이어 이미지 로드
    this.image = new Image();
    this.image.src = "player.png";
  }

  move(keys, mouseX, mouseY, joystick) {
    if (joystick.active) {
      const dx = joystick.moveX - joystick.startX;
      const dy = joystick.moveY - joystick.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      }
    } else {
      if (keys["ArrowUp"] || keys["w"]) this.y -= this.speed;
      if (keys["ArrowDown"] || keys["s"]) this.y += this.speed;
      if (keys["ArrowLeft"] || keys["a"]) this.x -= this.speed;
      if (keys["ArrowRight"] || keys["d"]) this.x += this.speed;
    }

    // 화면 경계 체크
    this.x = Math.max(
      this.size / 2,
      Math.min(this.canvas.width - this.size / 2, this.x)
    );
    this.y = Math.max(
      this.size / 2,
      Math.min(this.canvas.height - this.size / 2, this.y)
    );
  }

  draw(ctx, mouseX, mouseY) {
    if (!this.invincible || Math.floor(Date.now() / 100) % 2) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
      ctx.rotate(angle);
      ctx.drawImage(
        this.image,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );
      ctx.restore();
    }
  }

  takeDamage(amount) {
    if (!this.invincible) {
      this.hp -= amount;
      this.invincible = true;

      setTimeout(() => {
        this.invincible = false;
      }, this.invincibleTime);

      return this.hp <= 0;
    }
    return false;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
