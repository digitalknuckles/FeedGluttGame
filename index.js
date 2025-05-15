<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Feed Glutt!</title>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js"></script>
  <style>
    body { margin: 0; overflow: hidden; background: black; }
    canvas { display: block; margin: 0 auto; }
  </style>
</head>
<body>
<script>
let game;
window.onload = function () {
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a1a1a',
    physics: { default: 'arcade' },
    scene: { preload, create, update }
  };
  game = new Phaser.Game(config);
};

let player, cursors, hungerBar, scoreText, hunger = 25, score = 0;
let gameStarted = false, gameOver = false, gameWon = false;
let defaultPlayerSprite = 'player';
let collisionTimer = 0;
let fallingGroup;
let objectData = [
  { key: 'obj1', value: 5 },
  { key: 'obj2', value: 10 },
  { key: 'obj3', value: 15 },
  { key: 'obj4', value: -5 },
  { key: 'obj5', value: -10 },
  { key: 'obj6', value: -15 },
  { key: 'obj7', value: -20 }
];
let pointerDown = false;

function preload() {
  // Replace with real asset paths
  this.load.image('start', 'assets/start.png');
  this.load.image('player', 'assets/player.png');
  this.load.image('player_hit', 'assets/player_hit.png');
  this.load.image('victory', 'assets/victory.png');
  this.load.image('lose', 'assets/lose.png');
  this.load.image('button', 'assets/button.png');
  for (let i = 1; i <= 7; i++) {
    this.load.image(`obj${i}`, `assets/default_object${i}.png`);
  }
}

function create() {
  const scene = this;

  // Start screen
  this.startImage = this.add.image(400, 300, 'start').setInteractive();
  this.startImage.on('pointerdown', () => startGame.call(scene));

  // Player setup
  player = this.physics.add.sprite(400, 550, 'player').setVisible(false);
  player.setCollideWorldBounds(true);

  // Inputs
  cursors = this.input.keyboard.createCursorKeys();
  this.input.on('pointerdown', (pointer) => { pointerDown = true; pointerStartX = pointer.x; });
  this.input.on('pointerup', () => pointerDown = false);
  this.input.on('pointermove', (pointer) => {
    if (pointerDown) player.x = pointer.x;
  });

  // Groups
  fallingGroup = this.physics.add.group();

  // Text
  scoreText = this.add.text(10, 10, '', { fontSize: '20px', fill: '#fff' }).setDepth(1);
  hungerBar = this.add.text(10, 40, '', { fontSize: '20px', fill: '#ff0' }).setDepth(1);

  // Collision
  this.physics.add.overlap(player, fallingGroup, onCatch, null, this);
}

function startGame() {
  gameStarted = true;
  this.startImage.destroy();
  player.setVisible(true);
  hunger = 25;
  score = 0;
  spawnFallingObject.call(this);
  updateUI.call(this);
}

function update() {
  if (!gameStarted || gameOver) return;

  // Movement
  if (cursors.left.isDown) player.setVelocityX(-200);
  else if (cursors.right.isDown) player.setVelocityX(200);
  else player.setVelocityX(0);

  // Update sprite after collision
  if (collisionTimer > 0 && this.time.now > collisionTimer) {
    player.setTexture(defaultPlayerSprite);
    collisionTimer = 0;
  }

  // Win/Loss check
  if (hunger <= 0) showLoseScreen.call(this);
  if (score >= 1000 && hunger >= 100) showVictoryScreen.call(this);
}

function onCatch(player, obj) {
  const objData = objectData.find(o => o.key === obj.texture.key);
  if (objData) {
    score += objData.value;
    hunger += objData.value;
    if (hunger > 100) hunger = 100;
    if (hunger < 0) hunger = 0;
  }
  player.setTexture('player_hit');
  collisionTimer = this.time.now + 1000;
  obj.destroy();
  spawnFallingObject.call(this);
  updateUI.call(this);
}

function spawnFallingObject() {
  const objType = Phaser.Math.RND.pick(objectData);
  const x = Phaser.Math.Between(50, 750);
  const obj = fallingGroup.create(x, -50, objType.key);
  obj.setVelocityY(Phaser.Math.Between(100, 200));
  obj.setInteractive();
}

function updateUI() {
  scoreText.setText(`Score: ${score}`);
  hungerBar.setText(`Hunger: ${hunger}%`);
}

function showVictoryScreen() {
  gameOver = true;
  player.setVisible(false);
  this.add.image(400, 300, 'victory');
  const claimButton = this.add.image(400, 500, 'button').setInteractive();
  claimButton.on('pointerdown', () => {
    if (!pointerDown) {
      pointerDown = true;
      window.location.href = "https://gateway.pinata.cloud/ipfs/YOUR_CID_HERE";
    }
  });
  this.input.on('pointerup', () => pointerDown = false);
}

function showLoseScreen() {
  gameOver = true;
  player.setVisible(false);
  this.add.image(400, 300, 'lose');

  const restartButton = this.add.image(300, 500, 'button').setInteractive();
  restartButton.on('pointerdown', () => restartGame.call(this));

  const exitButton = this.add.image(500, 500, 'button').setInteractive();
  exitButton.on('pointerdown', () => window.close());
}

function restartGame() {
  this.scene.restart();
  gameStarted = false;
  gameOver = false;
  gameWon = false;
}
</script>
</body>
</html>
