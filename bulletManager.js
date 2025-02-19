update(canvas, enemies, currentEffects) {
  this.bullets = this.bullets.filter((bullet) => {
    // 총알 업데이트 전에 효과 적용
    const isActive = bullet.update(canvas);
    
    // 비활성화된 총알 제거
    if (!isActive) return false;

    // 화면 밖 체크 로직 개선
    const isOutOfBounds = 
      bullet.x < -100 || 
      bullet.x > canvas.width + 100 ||
      bullet.y < -100 || 
      bullet.y > canvas.height + 100;

    // 화면 밖 처리 로직 강화
    if (isOutOfBounds) {
      const canBounce = bullet.handleBounceWithEffects(canvas, currentEffects);
      return canBounce && bullet.bounceCount < bullet.maxBounceCount;
    }

    // 적 충돌 처리
    const hitEnemy = enemies.find(enemy => 
      !bullet.hitEnemies.includes(enemy.id) && 
      checkCollision(bullet, enemy)
    );

    if (hitEnemy) {
      // 충돌 처리 로직
      this.handleBulletHit(bullet, hitEnemy, currentEffects);
      return bullet.isPiercing; // 관통 여부에 따라 제거 결정
    }

    return true;
  });
} 