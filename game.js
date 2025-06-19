/*  Blobby Bossfight – full boss-demo   ©2025  */
/*  Specs:
      • Grotta   • Troll-boss med brun klubba
      • Blobby ska undvika slag → klubba fastnar → spring upp & hoppa på huvudet
      • 2 Blobbys sitter i burar ovanför bossen → räddas när bossen träffats 3 ggr
*/

const W = 800, H = 450, GROUND_Y = 400;

const cfg = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#16181f',
  physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: false } },
  scene: { preload, create, update }
};
const game = new Phaser.Game(cfg);

/* ───────────── Sprites som Base64 (32×32 px) ───────────── */
const IMG = {
  blobby: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAALElEQVR4AWP4////fwYiAphgYGD4T4z/D4ZgwABhgGT4/x8GhMEAAPVxDQnBwSVEAAAAElFTkSuQmCC',
  troll : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAOklEQVR4AWP4////fwYiApjAwMDw/x8GjP8PkGDQysDAwD8CLgMgeioExA0BYYCkOBn8W4FNVQ4AgB5VhUyuZB2aAAAAAElFTkSuQmCC',
  club  : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAARCAYAAADkzr6QAAAARUlEQVR4AWP4////fwYiApjAwMDw/x8GDNnw////AzJgYGD4/x8GhMHw////g/H/HyYgYPgPA5gYGJiH+AUMDEHwPx/HwzEAAAyShN2glDYCAAAAAElFTkSuQmCC',
  cage  : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAI0lEQVR4AWP4////fwYiAphgYGD4T4wgx8DAwMDw/x8GAQYAAN9EDR7zaZ+6AAAAAElFTkSuQmCC'
};

/* ───────────── Variabler ───────────── */
let cursors, player, boss, club, ground;
let cages      = [];
let headHits   = 0;
let infoText, winText;
let bossState  = 'idle';   // idle | windup | slam | stuck | recover

/* ───────────── Ladda resurser ───────────── */
function preload() {
  Object.entries(IMG).forEach(([key, data]) => this.load.image(key, data));
}

/* ───────────── Skapa scen ───────────── */
function create() {
  cursors = this.input.keyboard.createCursorKeys();

  /* Mark */
  ground = this.add.rectangle(W/2, GROUND_Y, W, 100, 0x444444);
  this.physics.add.existing(ground, true);

  /* Spelare */
  player = this.physics.add.sprite(100, 250, 'blobby')
            .setBounce(0.1)
            .setCollideWorldBounds(true);
  this.physics.add.collider(player, ground);

  /* Boss (troll) */
  boss = this.physics.add.sprite(600, 250, 'troll')
          .setImmovable(true)
          .setCollideWorldBounds(true);
  this.physics.add.collider(boss, ground);

  /* Klubba (separat kropp) */
  club = this.physics.add.sprite(boss.x - 40, boss.y + 30, 'club')
           .setImmovable(true)
           .setVisible(false);                    // visas bara vid slam
  this.physics.add.collider(player, club);

  /* Burbesatta Blobbys – två st ovan bossen */
  const cageY = 140;
  for (let i = 0; i < 2; i++) {
    const cage = this.physics.add.sprite(550 + i*60, cageY, 'cage')
                   .setImmovable(true);
    cages.push(cage);
  }

  /* Overlap för vinst (hoppa på huvud) */
  this.physics.add.overlap(player, boss, hitBossHead, canHitHead, this);

  /* UI-text */
  infoText = this.add.text(W/2, 20, 'Undvik klubban, hoppa på huvudet 3 ggr!',
                           {font:'18px Arial', fill:'#ffffff'})
             .setOrigin(0.5);
  winText  = this.add.text(W/2, H/2, '', {font:'32px Arial', fill:'#45ff45'})
             .setOrigin(0.5);

  /* Boss-timers */
  this.time.addEvent({ delay: 2000, callback: bossCycle, callbackScope: this, loop: true });
}

/* ───────────── Boss AI-cykel ───────────── */
function bossCycle() {
  if (headHits >= 3) return;   // redan besegrad

  if (bossState === 'idle') {          // starta attack
    bossState = 'windup';
    club.setVisible(true);
    club.x = boss.x - 40;
    club.y = boss.y + 30;
    this.time.delayedCall(600, () => {
      bossState = 'slam';
      // slå nedåt
      club.y = GROUND_Y - 40;
      // markera fast
      bossState = 'stuck';
      this.time.delayedCall(1200, () => {
        club.setVisible(false);
        bossState = 'recover';
        this.time.delayedCall(500, () => bossState = 'idle');
      });
    });
  }
}

/* ───────────── Logik för träffa bossen ───────────── */
function canHitHead(player, bossSpr) {
  return player.body.velocity.y > 0 && player.y < bossSpr.y - 10;
}
function hitBossHead(player, bossSpr) {
  if (bossState === 'stuck') {
    headHits++;
    if (headHits >= 3) {
      bossSpr.disableBody(true, true);
      club.disableBody(true, true);
      cages.forEach(c => c.destroy());
      winText.setText('BLOBBYS SAVED! 🎉');
    }
  } else {
    // träff från sidan → Game over
    player.setTint(0xff0000);
    this.physics.pause();
    winText.setText('GAME OVER');
  }
}

/* ───────────── Uppdaterings-loop ───────────── */
function update() {
  if (winText.text.startsWith('BLOBBYS')) return;  // spel klar
  /* Spelar-styrning */
  if (cursors.left?.isDown)       player.setVelocityX(-160);
  else if (cursors.right?.isDown) player.setVelocityX(160);
  else                            player.setVelocityX(0);

  if (cursors.up?.isDown && player.body.blocked.down)
      player.setVelocityY(-400);
}
