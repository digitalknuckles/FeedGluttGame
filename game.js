// ==========================
// Shared Constants
// ==========================
const GAME_CONFIG = {
    START_HUNGER: 50,
    WINNING_SCORE: 500,
    LOSING_HUNGER: 0,
    OBJECT_SPAWN_RATE: 350 // ms
};

let score = 0;
let hunger = GAME_CONFIG.START_HUNGER;

// ==========================
// Start Scene (Modern UI)
// ==========================
class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    preload() {
        this.load.image('start_bg', 'assets/backgrounds/start_menu_bg.png');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.image(width / 2, height / 2, 'start_bg')
            .setDisplaySize(width, height);

        // Animated Title
        const title = this.add.text(width / 2, height * 0.25, 'Feed GLUTT!', {
            fontFamily: 'Arial Black',
            fontSize: 'clamp(36px, 8vw, 64px)',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            y: title.y + 10,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Start Button
        this.createButton(width / 2, height * 0.6, 'Tap to Start', () => this.scene.start('GameScene'));
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '28px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 24, y: 14 },
            align: 'center'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        btn.on('pointerdown', callback);
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1));

        return btn;
    }
}

// ==========================
// Game Scene (Optimized Mobile UX)
// ==========================
// ==========================
// Game Scene (Hook + Rope Sway + Particles)
// ==========================
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('game_bg', 'assets/backgrounds/default_bg.png');
        this.load.image('player', 'assets/player/default_player.png');

        // Rope and spark
        this.load.image('rope_segment', 'assets/objects/rope_segment.png');
        this.load.image('spark', 'assets/particles/spark.png');

        for (let i = 1; i <= 7; i++) {
            this.load.image(`object${i}`, `assets/objects/default_object${i}.png`);
        }
    }

    create() {
        score = 0;
        hunger = GAME_CONFIG.START_HUNGER;

        const { width, height } = this.scale;

        // Background guaranteed to show
        this.add.image(width / 2, height / 2, 'game_bg').setDisplaySize(width, height);

        // Player
        this.player = this.physics.add.sprite(width / 2, height * 0.85, 'player')
            .setDisplaySize(120, 120)
            .setImmovable(true);
        this.player.body.setSize(60, 60);
        this.player.body.setOffset(30, 30);

        // Falling objects
        this.objects = this.physics.add.group();
        this.physics.add.overlap(this.player, this.objects, this.collectObject, null, this);

        // Rope setup (hidden until hook spawns)
        this.hookActive = false;
        this.hookObject = null;
        this.hookSpawned = false;
        this.hookSpawnX = 0;
        this.hookRetracting = false;

        this.rope = this.add.tileSprite(0, 0, 4, 1, 'rope_segment')
            .setOrigin(0.5, 0)
            .setVisible(false);

        // Rope particle
        this.ropeEmitter = this.add.particles('spark').createEmitter({
            speed: 0,
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 200,
            follow: this.rope,
            quantity: 1,
            frequency: 50
        });
        this.ropeEmitter.stop();

        // UI
        this.createUI();

        // Spawn objects
        this.time.addEvent({
            delay: GAME_CONFIG.OBJECT_SPAWN_RATE,
            loop: true,
            callback: this.spawnObject,
            callbackScope: this
        });

        // Hunger timer
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                hunger = Math.max(0, hunger - 5);
                this.updateUI();
                if (hunger <= GAME_CONFIG.LOSING_HUNGER) this.scene.start('GameOverScene');
            }
        });

        // Input
        this.input.on('pointermove', pointer => {
            if (pointer.isDown) {
                this.player.x = Phaser.Math.Clamp(pointer.x, this.player.displayWidth / 2, width - this.player.displayWidth / 2);
            }
        });
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    spawnObject() {
        const types = [
            { key: 'object1', value: 1 },
            { key: 'object2', value: 10 },
            { key: 'object3', value: 15 },
            { key: 'object4', value: 5 },
            { key: 'object5', value: 5 },
            { key: 'object6', value: 5, isHook: true }, // only one hook
            { key: 'object7', value: -50 }
        ];

        let data = Phaser.Utils.Array.GetRandom(types);

        // Spawn hook only once
        if (data.isHook && this.hookSpawned) {
            data = types.find(t => !t.isHook);
        }

        const x = Phaser.Math.Between(32, this.scale.width - 32);
        const obj = this.objects.create(x, -32, data.key).setDisplaySize(56, 56);
        obj.value = data.value;
        obj.isHook = data.isHook || false;
        obj.setVelocityY(Phaser.Math.Between(120, 220));

        if (obj.isHook && !this.hookSpawned) {
            this.hookActive = true;
            this.hookObject = obj;
            this.hookSpawned = true;
            this.hookRetracting = false;
            this.hookSpawnX = x;
            this.rope.setVisible(true).setPosition(x, 0);
            this.rope.height = 1;
            this.ropeEmitter.start();
        }
    }

    collectObject(player, obj) {
        if (obj.isHook) return; // hook handled separately
        score += obj.value;
        hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);
        obj.destroy();
        this.updateUI();

        if (score >= GAME_CONFIG.WINNING_SCORE && hunger === 100) this.scene.start('VictoryScene');
        if (hunger <= GAME_CONFIG.LOSING_HUNGER) this.scene.start('GameOverScene');
    }

    update() {
        // Player movement
        if (this.cursors.left.isDown) this.player.x = Math.max(this.player.displayWidth / 2, this.player.x - 10);
        if (this.cursors.right.isDown) this.player.x = Math.min(this.scale.width - this.player.displayWidth / 2, this.player.x + 10);

        // Remove off-screen objects
        this.objects.getChildren().forEach(obj => {
            if (obj.y > this.scale.height + 32) obj.destroy();
        });

        // Hook logic
        if (this.hookActive && this.hookObject) {
            const hook = this.hookObject;
            const sway = Math.sin(this.time.now * 0.005) * 10;
            this.rope.x = this.hookSpawnX + sway;
            this.rope.height = hook.y;

            if (!this.hookRetracting && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), hook.getBounds())) {
                this.hookRetracting = true;
                hook.setVelocityY(-200);
            }

            if (this.hookRetracting) {
                this.player.y = hook.y + 60;
                if (hook.y <= 0) {
                    this.rope.setVisible(false);
                    this.ropeEmitter.stop();
                    this.scene.start('GameOverScene');
                }
            }

            if (hook.y > this.scale.height + 32 && !this.hookRetracting) {
                hook.destroy();
                this.hookActive = false;
                this.hookObject = null;
                this.rope.setVisible(false);
                this.ropeEmitter.stop();
            }
        }

        this.updateUI();
    }
}

// ==========================
// Game Over Scene
// ==========================
class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, height * 0.4, 'Game Over', { fontSize: '64px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(width / 2, height * 0.55, 'Tap or Press ENTER to Retry', { fontSize: '28px', fill: '#fff' }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ENTER', () => this.scene.start('StartScene'));
        this.input.on('pointerdown', () => this.scene.start('StartScene'));
    }
}

// ==========================
// Game Config (Mobile + iframe optimized)
// ==========================
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 390,  // mobile ratio
        height: 844
    },
    parent: 'game-container',
    backgroundColor: '#000',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [StartScene, GameScene, VictoryScene, GameOverScene]
};

// ==========================
// Start Game
// ==========================
const game = new Phaser.Game(config);

// ==========================
// CSS (iframe & animation_url friendly)
// ==========================
// Add to your HTML:
// <style>
// html, body { margin:0; padding:0; background:#000; overflow:hidden; }
// canvas { touch-action:none; }
// </style>
