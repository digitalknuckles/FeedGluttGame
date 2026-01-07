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
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('game_bg', 'assets/backgrounds/default_bg.png');
        this.load.image('player', 'assets/player/default_player.png');

        for (let i = 1; i <= 7; i++) {
            this.load.image(`object${i}`, `assets/objects/default_object${i}.png`);
        }

        // Particle effect
        this.load.image('spark', 'assets/particles/spark.png'); // small spark image
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
        const { width } = this.scale;

        // Score and Hunger progress bars
        this.scoreBarBG = this.add.rectangle(20, 20, width - 40, 20, 0x222222).setOrigin(0, 0);
        this.scoreBarFG = this.add.rectangle(20, 20, 0, 20, 0x00ffcc).setOrigin(0, 0);

        this.hungerBarBG = this.add.rectangle(20, 50, width - 40, 20, 0x222222).setOrigin(0, 0);
        this.hungerBarFG = this.add.rectangle(20, 50, (width - 40) * (hunger / 100), 20, 0x00ff00).setOrigin(0, 0);

        // Optional text display
        this.scoreText = this.add.text(20, 20, `Score: ${score}`, { fontSize: '18px', color: '#fff' }).setOrigin(0, 0);
        this.hungerText = this.add.text(20, 50, `Hunger: ${hunger}%`, { fontSize: '18px', color: '#fff' }).setOrigin(0, 0);
    }

    updateUI() {
        const { width } = this.scale;

        // Smoothly tween score bar
        const scoreWidth = Phaser.Math.Clamp((score / GAME_CONFIG.WINNING_SCORE) * (width - 40), 0, width - 40);
        this.tweens.add({
            targets: this.scoreBarFG,
            width: scoreWidth,
            duration: 200,
            ease: 'Quad.easeOut'
        });

        // Smoothly tween hunger bar
        const hungerWidth = Phaser.Math.Clamp((hunger / 100) * (width - 40), 0, width - 40);
        this.tweens.add({
            targets: this.hungerBarFG,
            width: hungerWidth,
            duration: 200,
            ease: 'Quad.easeOut'
        });

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
            { key: 'object6', value: 5 },
            { key: 'object7', value: -50 }
        ];

        const data = Phaser.Utils.Array.GetRandom(types);
        const x = Phaser.Math.Between(32, this.scale.width - 32);
        const obj = this.objects.create(x, -32, data.key).setDisplaySize(56, 56);
        obj.value = data.value;
        obj.setVelocityY(Phaser.Math.Between(120, 220));
    }

    collectObject(player, obj) {
        score += obj.value;
        hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);

        // Particle effect at collection
        this.collectEmitter.explode(12, obj.x, obj.y);

        obj.destroy();
        this.updateUI();

        if (score >= GAME_CONFIG.WINNING_SCORE && hunger === 100) {
            this.scene.start('VictoryScene');
        }

        if (hunger <= GAME_CONFIG.LOSING_HUNGER) {
            this.scene.start('GameOverScene');
        }
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.x = Math.max(this.player.displayWidth / 2, this.player.x - 10);
        } else if (this.cursors.right.isDown) {
            this.player.x = Math.min(this.scale.width - this.player.displayWidth / 2, this.player.x + 10);
        }

        // Remove off-screen objects
        this.objects.getChildren().forEach(obj => {
            if (obj.y > this.scale.height + 32) obj.destroy();
        });
    }
}
