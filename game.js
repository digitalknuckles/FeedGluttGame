// ==========================
// Global Game State
// ==========================
let score = 0;
let hunger = 100;

const GAME_CONFIG = {
    START_HUNGER: 100,
    LOSING_HUNGER: 0,
    OBJECT_SPAWN_RATE: 900,
    WINNING_SCORE: 100
};

// ==========================
// Game Scene (Hook + Rope Sway + Sparks)
// ==========================
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('game_bg', 'assets/backgrounds/default_bg.png');
        this.load.image('player', 'assets/player/default_player.png');
        this.load.image('spark', 'assets/particles/spark.png');
        this.load.image('rope_segment', 'assets/objects/rope_segment.png');

        for (let i = 1; i <= 7; i++) {
            this.load.image(`object${i}`, `assets/objects/default_object${i}.png`);
        }
    }

    create() {
        console.log('GameScene started');

        this.cameras.main.setBackgroundColor('#222');
        this.cameras.main.setZoom(1);

        score = 0;
        hunger = GAME_CONFIG.START_HUNGER;

        const { width, height } = this.scale;

        // Background
        this.add.image(width / 2, height / 2, 'game_bg')
            .setDisplaySize(width, height)
            .setDepth(0);

        // Player
        this.player = this.physics.add.sprite(width / 2, height * 0.85, 'player')
            .setDisplaySize(120, 120)
            .setImmovable(true)
            .setDepth(2);

        this.player.body.setSize(60, 60).setOffset(30, 30);

        // Falling objects
        this.objects = this.physics.add.group();
        this.physics.add.overlap(this.player, this.objects, this.collectObject, null, this);

        // Particles (safe)
        if (this.textures.exists('spark')) {
            this.particles = this.add.particles('spark').setDepth(5);

            this.collectEmitter = this.particles.createEmitter({
                speed: { min: -120, max: 120 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 400,
                quantity: 10,
                on: false,
                blendMode: 'ADD'
            });
        }

        // Hook / rope state
        this.hookActive = false;
        this.hookObject = null;
        this.hookRetracting = false;
        this.hookSpawnX = 0;

        // GPU rope (TileSprite)
        this.rope = this.add.tileSprite(0, 0, 4, 1, 'rope_segment')
            .setOrigin(0.5, 0)
            .setDepth(3)
            .setVisible(false);

        // Rope spark trail
        this.ropeEmitter = this.particles?.createEmitter({
            speed: 0,
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 200,
            frequency: 50,
            follow: this.rope,
            blendMode: 'ADD'
        });
        this.ropeEmitter?.stop();

        // UI
        this.createUI();

        // Spawn loop
        this.time.addEvent({
            delay: GAME_CONFIG.OBJECT_SPAWN_RATE,
            loop: true,
            callback: this.spawnObject,
            callbackScope: this
        });

        // Hunger drain
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                hunger = Math.max(0, hunger - 5);
                this.updateUI();
            }
        });

        // Input
        this.input.on('pointermove', p => {
            if (p.isDown) {
                this.player.x = Phaser.Math.Clamp(
                    p.x,
                    this.player.displayWidth / 2,
                    width - this.player.displayWidth / 2
                );
            }
        });

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    createUI() {
        this.ui = this.add.container(16, 16).setDepth(10);
        this.scoreText = this.add.text(0, 0, `Score: ${score}`, { color: '#fff' });
        this.hungerText = this.add.text(0, 28, `Hunger: ${hunger}%`, { color: '#0f0' });
        this.ui.add([this.scoreText, this.hungerText]);
    }

    updateUI() {
        this.scoreText.setText(`Score: ${score}`);
        this.hungerText.setText(`Hunger: ${hunger}%`);
    }

    spawnObject() {
        const types = [
            { key: 'object1', value: 1 },
            { key: 'object2', value: 10 },
            { key: 'object3', value: 15 },
            { key: 'object4', value: 5 },
            { key: 'object5', value: 5 },
            { key: 'object6', value: 5, isHook: true },
            { key: 'object7', value: -50 }
        ];

        const data = Phaser.Utils.Array.GetRandom(types);
        const x = Phaser.Math.Between(32, this.scale.width - 32);

        const obj = this.objects.create(x, -32, data.key)
            .setDisplaySize(56, 56)
            .setVelocityY(Phaser.Math.Between(120, 220))
            .setDepth(2);

        obj.value = data.value;
        obj.isHook = !!data.isHook;

        if (obj.isHook && !this.hookActive) {
            this.hookActive = true;
            this.hookObject = obj;
            this.hookRetracting = false;
            this.hookSpawnX = x;

            this.rope.setVisible(true);
            this.rope.setSize(4, 1);
            this.rope.x = x;

            this.ropeEmitter?.start();
        }
    }

    collectObject(player, obj) {
        if (obj.isHook) return;

        score += obj.value;
        hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);

        this.collectEmitter?.explode(12, obj.x, obj.y);
        obj.destroy();

        this.updateUI();
    }

    update() {
        if (this.cursors.left.isDown) this.player.x -= 10;
        else if (this.cursors.right.isDown) this.player.x += 10;

        if (this.hookActive && this.hookObject) {
            const hook = this.hookObject;
            const sway = Math.sin(this.time.now * 0.005) * 10;

            this.rope.x = this.hookSpawnX + sway;
            this.rope.setSize(4, Math.max(1, hook.y));

            if (!this.hookRetracting &&
                Phaser.Geom.Intersects.RectangleToRectangle(
                    this.player.getBounds(),
                    hook.getBounds()
                )) {
                this.hookRetracting = true;
                hook.setVelocityY(-220);
            }

            if (this.hookRetracting) {
                this.player.y = hook.y + 60;
                if (hook.y <= 0) {
                    this.rope.setVisible(false);
                    this.ropeEmitter?.stop();
                }
            }
        }
    }
}

// ==========================
// Phaser Config
// ==========================
new Phaser.Game({
    type: Phaser.AUTO,
    width: 390,
    height: 844,
    backgroundColor: '#000',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    scene: [GameScene]
});
