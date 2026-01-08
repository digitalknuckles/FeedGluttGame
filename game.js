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
// Game Scene (Hook + Rope + Tension)
// ==========================
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('game_bg', 'assets/backgrounds/default_bg.png');
        this.load.image('player', 'assets/player/default_player.png');
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

        // Background
        this.add.image(width / 2, height / 2, 'game_bg').setDisplaySize(width, height);

        // Player
        this.player = this.physics.add.sprite(width / 2, height * 0.85, 'player')
            .setDisplaySize(120, 120)
            .setImmovable(true);
        this.player.body.setSize(60, 60).setOffset(30, 30);

        // Falling objects
        this.objects = this.physics.add.group();
        this.physics.add.overlap(this.player, this.objects, this.collectObject, null, this);

        // ==========================
        // Hook / Rope State
        // ==========================
        this.hookActive = false;
        this.hookCooldown = false;
        this.hookObject = null;
        this.hookRetracting = false;
        this.hookedPlayer = false;

        // Rope
        this.rope = this.add.tileSprite(0, 0, 6, 1, 'rope_segment')
            .setOrigin(0.5, 0)
            .setVisible(false);

        // Rope sparks
        this.ropeEmitter = this.add.particles('spark').createEmitter({
            speed: 0,
            scale: { start: 0.25, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 200,
            frequency: 60,
            follow: this.rope
        });
        this.ropeEmitter.stop();

        // ==========================
        // Tension System
        // ==========================
        this.tension = 0;
        this.lastPointerX = null;
        this.baseTensionThreshold = 100;

        // Difficulty scaling
        this.escapeDifficulty = 1;

        // ==========================
        // UI
        // ==========================
        this.createUI();

        // Tension bar
        this.tensionBarBg = this.add.rectangle(16, 64, 120, 10, 0x222222)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        this.tensionBar = this.add.rectangle(16, 64, 0, 10, 0xff4444)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        // ==========================
        // Timers
        // ==========================
        this.time.addEvent({
            delay: GAME_CONFIG.OBJECT_SPAWN_RATE,
            loop: true,
            callback: this.spawnObject,
            callbackScope: this
        });

        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                hunger = Math.max(0, hunger - 5);
                this.updateUI();
                if (hunger <= GAME_CONFIG.LOSING_HUNGER) {
                    this.scene.start('GameOverScene');
                }
            }
        });

        // ==========================
        // Input (movement + wriggle)
        // ==========================
        this.input.on('pointermove', pointer => {
            if (pointer.isDown) {
                this.player.x = Phaser.Math.Clamp(
                    pointer.x,
                    this.player.displayWidth / 2,
                    width - this.player.displayWidth / 2
                );

                if (this.hookedPlayer && this.lastPointerX !== null) {
                    const delta = Math.abs(pointer.x - this.lastPointerX);
                    this.tension += delta * 0.5;
                }

                this.lastPointerX = pointer.x;
            }
        });

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    // ==========================
    // UI
    // ==========================
    createUI() {
        this.ui = this.add.container(16, 16);
        this.scoreText = this.add.text(0, 0, `Score: ${score}`, { fontSize: '20px', color: '#fff' });
        this.hungerText = this.add.text(0, 28, `Hunger: ${hunger}%`, { fontSize: '20px', color: '#0f0' });
        this.ui.add([this.scoreText, this.hungerText]);
        this.ui.setScrollFactor(0);
    }

    updateUI() {
        this.scoreText.setText(`Score: ${score}`);
        this.hungerText.setText(`Hunger: ${hunger}%`);
    }

    // ==========================
    // Spawning
    // ==========================
    spawnObject() {
        const types = [
            { key: 'object1', value: 1 },
            { key: 'object2', value: 10 },
            { key: 'object3', value: 15 },
            { key: 'object4', value: 5 },
            { key: 'object5', value: 5 },
            { key: 'object6', value: 0, isHook: true },
            { key: 'object7', value: -50 }
        ];

        let data = Phaser.Utils.Array.GetRandom(types);

        if (data.isHook && (this.hookActive || this.hookCooldown)) {
            data = types.find(t => !t.isHook);
        }

        const x = Phaser.Math.Between(32, this.scale.width - 32);
        const obj = this.objects.create(x, -32, data.key).setDisplaySize(56, 56);
        obj.value = data.value;
        obj.isHook = data.isHook || false;
        obj.setVelocityY(Phaser.Math.Between(120, 220));

        if (obj.isHook) {
            this.hookActive = true;
            this.hookObject = obj;
            this.hookRetracting = false;
            this.hookedPlayer = false;

            this.rope.setVisible(true);
            this.ropeEmitter.start();
        }
    }

    collectObject(player, obj) {
        if (obj.isHook) return;

        score += obj.value;
        hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);
        obj.destroy();
        this.updateUI();
    }

    // ==========================
    // Escape
    // ==========================
    breakFree() {
        if (!this.hookObject) return;

        this.hookObject.destroy();
        this.hookObject = null;

        this.hookActive = false;
        this.hookRetracting = false;
        this.hookedPlayer = false;

        this.tension = 0;
        this.tensionBar.width = 0;

        this.rope.setVisible(false);
        this.ropeEmitter.stop();

        this.player.y = this.scale.height * 0.85;

        this.escapeDifficulty += 0.25;

        this.hookCooldown = true;
        this.time.delayedCall(3000, () => {
            this.hookCooldown = false;
        });
    }

    // ==========================
    // Update Loop
    // ==========================
    update() {
        // Player keyboard movement
        if (this.cursors.left.isDown) this.player.x -= 10;
        if (this.cursors.right.isDown) this.player.x += 10;

        // Cleanup
        this.objects.getChildren().forEach(obj => {
            if (obj.y > this.scale.height + 32 && !obj.isHook) obj.destroy();
        });

        // Hook logic
        if (this.hookActive && this.hookObject) {
            const hook = this.hookObject;

            // Rope always tethered
            this.rope.x = hook.x;
            this.rope.height = hook.y + (this.tension * 0.15); // visual stretch

            // Collision
            if (!this.hookedPlayer &&
                Phaser.Geom.Intersects.RectangleToRectangle(
                    this.player.getBounds(),
                    hook.getBounds()
                )
            ) {
                this.hookedPlayer = true;
                this.hookRetracting = true;
                hook.setVelocityY(-220);
            }

            // Retracting
            if (this.hookedPlayer) {
                hook.x = this.player.x;
                this.player.y = hook.y + 60;

                // Tension decay
                this.tension = Math.max(0, this.tension - 0.6);

                const threshold = this.baseTensionThreshold * this.escapeDifficulty;
                this.tensionBar.width = Phaser.Math.Clamp(
                    (this.tension / threshold) * 120,
                    0,
                    120
                );

                if (this.tension >= threshold) {
                    this.breakFree();
                }

                // Screen shake near escape
                if (this.tension > threshold * 0.75) {
                    this.cameras.main.shake(50, 0.002);
                }

                if (hook.y <= 0) {
                    this.scene.start('GameOverScene');
                }
            }

            // Missed hook
            if (hook.y > this.scale.height + 32 && !this.hookedPlayer) {
                hook.destroy();
                this.hookActive = false;
                this.rope.setVisible(false);
                this.ropeEmitter.stop();
            }
        }

        this.updateUI();
    }
}

// ==========================
// Victory Scene (Restart Added)
// ==========================
class VictoryScene extends Phaser.Scene {
    constructor() {
        super('VictoryScene');
    }

    preload() {
        this.load.image('victory1', 'assets/Feed_Glutt/victory1.png');
        this.load.image('victory2', 'assets/Feed_Glutt/victory2.png');
    }

    create() {
        const { width, height } = this.scale;
        const key = Phaser.Utils.Array.GetRandom(['victory1', 'victory2']);

        this.add.image(width / 2, height / 2, key)
            .setDisplaySize(width * 0.6, width * 0.6);

        this.add.text(width / 2, height * 0.15, 'You Fed Glutt!', {
            fontSize: 'clamp(32px, 7vw, 56px)',
            color: '#fff'
        }).setOrigin(0.5);

        this.createButton(width / 2, height * 0.75, 'Play Again', () => this.scene.start('StartScene'));
        this.createButton(width / 2, height * 0.85, 'Mint Collectible', () => {
            window.open('https://opensea.io/collection/glutts', '_blank');
        });
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '24px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 20, y: 12 },
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        btn.on('pointerdown', callback);
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1));
        return btn;
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
// Game Config
// ==========================
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 490,
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
