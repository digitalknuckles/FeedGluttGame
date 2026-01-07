// ==========================
// Game Scene (Hook + Rope Sway + Sparks)
// ==========================
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        const { width, height } = this.scale;

        // Core assets
        this.load.image('game_bg', 'assets/backgrounds/default_bg.png');
        this.load.image('player', 'assets/player/default_player.png');
        this.load.image('spark', 'assets/particles/spark.png');

        // Rope segment for GPU-accelerated rope
        this.load.image('rope_segment', 'assets/objects/rope_segment.png');

        // Falling objects
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

        // Particles for collecting objects
        this.particles = this.add.particles('spark');
        this.collectEmitter = this.particles.createEmitter({
            speed: { min: -100, max: 100 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            quantity: 8,
            on: false
        });

        // GPU rope system
        this.hookActive = false;
        this.hookObject = null;
        this.hookRetracting = false;
        this.hookSpawnX = null;

        // Rope as tileSprite (GPU-accelerated)
        this.rope = this.add.tileSprite(0, 0, 4, 1, 'rope_segment')
            .setOrigin(0.5, 0); // top-center origin
        this.rope.visible = false;

        // Spark trail along rope
        this.ropeEmitter = this.add.particles('spark').createEmitter({
            speed: 0,
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 200,
            quantity: 1,
            frequency: 50,
            follow: this.rope,
            followOffset: { x: 0, y: 0 },
        });
        this.ropeEmitter.stop();

        // UI
        this.createUI();

        // Spawn objects loop
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

        // Swipe / touch movement
        this.input.on('pointermove', pointer => {
            if (pointer.isDown) {
                this.player.x = Phaser.Math.Clamp(pointer.x, this.player.displayWidth / 2, width - this.player.displayWidth / 2);
            }
        });

        // Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();
    }

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

    spawnObject() {
        const types = [
            { key: 'object1', value: 1 },
            { key: 'object2', value: 10 },
            { key: 'object3', value: 15 },
            { key: 'object4', value: 5 },
            { key: 'object5', value: 5 },
            { key: 'object6', value: 5, isHook: true }, // claw/hook object
            { key: 'object7', value: -50 }
        ];

        const data = Phaser.Utils.Array.GetRandom(types);
        const x = Phaser.Math.Between(32, this.scale.width - 32);
        const obj = this.objects.create(x, -32, data.key).setDisplaySize(56, 56);
        obj.value = data.value;
        obj.setVelocityY(Phaser.Math.Between(120, 220));
        obj.isHook = data.isHook || false;

        // Initialize hook if spawned
        if (obj.isHook && !this.hookActive) {
            this.hookActive = true;
            this.hookObject = obj;
            this.hookRetracting = false;
            this.hookSpawnX = x;
            this.rope.visible = true;
            this.rope.height = 0;
            this.rope.x = x;
            this.ropeEmitter.start();
        }
    }

    collectObject(player, obj) {
        if (obj.isHook) return; // hook handled separately
        score += obj.value;
        hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);

        this.collectEmitter.explode(12, obj.x, obj.y);
        obj.destroy();
        this.updateUI();

        if (score >= GAME_CONFIG.WINNING_SCORE && hunger === 100) this.scene.start('VictoryScene');
        if (hunger <= GAME_CONFIG.LOSING_HUNGER) this.scene.start('GameOverScene');
    }

    update() {
        // Player movement
        if (this.cursors.left.isDown) this.player.x = Math.max(this.player.displayWidth / 2, this.player.x - 10);
        else if (this.cursors.right.isDown) this.player.x = Math.min(this.scale.width - this.player.displayWidth / 2, this.player.x + 10);

        // Remove off-screen objects
        this.objects.getChildren().forEach(obj => {
            if (obj.y > this.scale.height + 32 && !obj.isHook) obj.destroy();
        });

        // Hook mechanics
        if (this.hookActive && this.hookObject) {
            const hook = this.hookObject;

            // Soft sway animation
            const sway = Math.sin(this.time.now * 0.005) * 10; // sway amplitude 10px
            this.rope.x = this.hookSpawnX + sway;
            this.rope.height = hook.y;

            // Retract when player collides
            if (!this.hookRetracting && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), hook.getBounds())) {
                this.hookRetracting = true;
                hook.setVelocityY(-200); // retract speed
            }

            // Player attached while retracting
            if (this.hookRetracting) {
                this.player.y = hook.y + 60;
                if (hook.y <= 0) {
                    this.rope.visible = false;
                    this.ropeEmitter.stop();
                    this.scene.start('GameOverScene');
                }
            }

            // Hook falls off screen without player
            if (hook.y > this.scale.height + 32 && !this.hookRetracting) {
                hook.destroy();
                this.hookActive = false;
                this.hookObject = null;
                this.rope.visible = false;
                this.ropeEmitter.stop();
            }
        }

        // Update UI
        this.updateUI();
    }
}
