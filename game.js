// ==========================
// Game Scene (Optimized Mobile UX + Hook Mechanic + Particles)
// ==========================
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('game_bg', 'assets/backgrounds/default_bg.png');
        this.load.image('player', 'assets/player/default_player.png');
        this.load.image('spark', 'assets/particles/spark.png'); // particle effect

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
        this.player.body.setSize(60, 60);
        this.player.body.setOffset(30, 30);

        // Group for falling objects
        this.objects = this.physics.add.group();
        this.physics.add.overlap(this.player, this.objects, this.collectObject, null, this);

        // Particles
        this.particles = this.add.particles('spark');
        this.collectEmitter = this.particles.createEmitter({
            x: 0,
            y: 0,
            speed: { min: -100, max: 100 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            quantity: 8,
            on: false
        });

        // Hook mechanics
        this.hookActive = false;
        this.hookObject = null;
        this.hookRetracting = false;
        this.hookSpawnX = null;
        this.hookCable = this.add.graphics();

        // UI
        this.createUI();

        // Spawn Objects
        this.time.addEvent({
            delay: GAME_CONFIG.OBJECT_SPAWN_RATE,
            loop: true,
            callback: this.spawnObject,
            callbackScope: this
        });

        // Hunger Timer
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

        // Swipe / Touch movement
        this.input.on('pointermove', pointer => {
            if (pointer.isDown) {
                this.player.x = Phaser.Math.Clamp(
                    pointer.x,
                    this.player.displayWidth / 2,
                    width - this.player.displayWidth / 2
                );
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
        }
    }

    collectObject(player, obj) {
        if (obj.isHook) return; // hook handled in update()
        score += obj.value;
        hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);

        // Particle effect
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

            // Draw cable
            this.hookCable.clear();
            this.hookCable.lineStyle(4, 0xffffff);
            this.hookCable.beginPath();
            this.hookCable.moveTo(this.hookSpawnX, 0); // top spawn
            this.hookCable.lineTo(hook.x, hook.y);
            this.hookCable.strokePath();

            // Collision with player triggers retract
            if (!this.hookRetracting && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), hook.getBounds())) {
                this.hookRetracting = true;
                hook.setVelocityY(-200); // retract speed
            }

            // Retract player with hook
            if (this.hookRetracting) {
                this.player.y = hook.y + 60; // player "attached"
                if (hook.y <= 0) {
                    this.hookCable.clear();
                    this.scene.start('GameOverScene'); // player pulled to top → fail
                }
            }

            // Destroy hook if falls out of scene without player collision
            if (hook.y > this.scale.height + 32 && !this.hookRetracting) {
                hook.destroy();
                this.hookCable.clear();
                this.hookActive = false;
                this.hookObject = null;
            }
        }

        // Update UI
        this.updateUI();
    }
}
