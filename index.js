// feedglutt_game.js - Phaser.js port of Feed Glutt!

import Phaser from 'phaser';

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const PLAYER_WIDTH = 200;
const PLAYER_HEIGHT = 200;
const NORMAL_OBJECT_SIZE = 64;
const OBJECT_SPAWN_INTERVAL = 333;
const WINNING_SCORE = 500;
const LOSING_HUNGER_THRESHOLD = 0;

let score = 0;
let hunger = 10;

class FeedGluttScene extends Phaser.Scene {
  constructor() {
    super('FeedGlutt');
    this.objects = [];
    this.objectTimer = 0;
  }

  preload() {
    this.load.image('bg', 'assets/backgrounds/default_bg.png');
    this.load.image('start_bg', 'assets/backgrounds/start_menu_bg.png');
    this.load.image('player', 'assets/player/default_player.png');
    for (let i = 1; i <= 7; i++) {
      this.load.image(`object${i}`, `assets/objects/default_object${i === 1 ? '' : i}.png`);
    }
    this.load.image('victory1', 'assets/Feed_Glutt/victory1.png'); // replace with actual files
  }

  create() {
    this.bg = this.add.image(0, 0, 'bg').setOrigin(0);
    this.player = this.physics.add.sprite(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 150, 'player')
      .setOrigin(0.5, 0.5).setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT).setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.objectsGroup = this.physics.add.group();

    this.fallingObjects = [
      { key: 'object1', value: 1 },
      { key: 'object2', value: 10 },
      { key: 'object3', value: 15 },
      { key: 'object4', value: 5 },
      { key: 'object5', value: 5 },
      { key: 'object6', value: 5 },
      { key: 'object7', value: -5 },
    ];

    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });
    this.hungerText = this.add.text(10, 40, 'Hunger: 10%', { fontSize: '20px', fill: '#fff' });

    this.physics.add.overlap(this.player, this.objectsGroup, this.collectObject, null, this);
  }

  update(time, delta) {
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-300);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(300);
    } else {
      this.player.setVelocityX(0);
    }

    if (time - this.objectTimer > OBJECT_SPAWN_INTERVAL) {
      this.spawnObject();
      this.objectTimer = time;
    }

    if (score >= WINNING_SCORE && hunger >= 100) {
      this.scene.start('Victory');
    } else if (hunger <= LOSING_HUNGER_THRESHOLD) {
      this.scene.start('GameOver');
    }
  }

  spawnObject() {
    const objData = Phaser.Math.RND.pick(this.fallingObjects);
    const x = Phaser.Math.Between(0, SCREEN_WIDTH - NORMAL_OBJECT_SIZE);
    const sprite = this.objectsGroup.create(x, -64, objData.key).setDisplaySize(NORMAL_OBJECT_SIZE, NORMAL_OBJECT_SIZE);
    sprite.value = objData.value;
    sprite.setVelocityY(Phaser.Math.Between(100, 200));
  }

  collectObject(player, obj) {
    score += obj.value;
    hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);
    obj.destroy();
    this.scoreText.setText('Score: ' + score);
    this.hungerText.setText('Hunger: ' + hunger + '%');
  }
}

class VictoryScene extends Phaser.Scene {
  create() {
    this.add.image(0, 0, 'victory1').setOrigin(0);
    const text = this.add.text(SCREEN_WIDTH / 2 - 150, 50, 'You Fed Glutt!\nClaim Your Badge!', {
      fontSize: '32px',
      fill: '#fff',
      align: 'center'
    });

    const mintBtn = this.add.text(SCREEN_WIDTH / 2 - 100, 500, 'Mint Collectible', {
      fontSize: '24px',
      backgroundColor: '#0f0',
      color: '#000',
      padding: { x: 10, y: 5 },
      borderRadius: 5,
    }).setInteractive();

    mintBtn.on('pointerdown', () => {
      window.open('https://opensea.io/collection/gluttog/overview', '_blank');
    });
  }
}

class GameOverScene extends Phaser.Scene {
  create() {
    this.add.text(SCREEN_WIDTH / 2 - 100, SCREEN_HEIGHT / 2, 'Game Over', {
      fontSize: '48px', fill: '#fff'
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  parent: 'game-container', // for iframe
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [FeedGluttScene, VictoryScene, GameOverScene],
};

const game = new Phaser.Game(config);
