// ==========================
// Shared Constants
// ==========================
const GAME_CONFIG = {
    START_HUNGER: 100,
    WINNING_SCORE: 200,
    LOSING_HUNGER: 0,
    OBJECT_SPAWN_RATE: 350
};

let score = 0;
let hunger = GAME_CONFIG.START_HUNGER;

// ==========================
// Start Scene
// ==========================
class StartScene extends Phaser.Scene {
    constructor() { super('StartScene'); }
    preload() { this.load.image('start_bg', 'assets/backgrounds/start_menu_bg.png'); }
    create() {
        const { width, height } = this.scale;
        this.add.image(width / 2, height / 2, 'start_bg').setDisplaySize(width, height);

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

        this.createButton(width / 2, height * 0.6, 'Tap to Start', () => { this.scene.start('GameScene'); });
    }
    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '28px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 24, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', callback);
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1));
    }
}

// ==========================
// Game Scene
// ==========================
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        this.load.image('game_bg', 'assets/backgrounds/default_bg.png');
        this.load.image('player', 'assets/player/default_player.png');
        this.load.image('rope_segment', 'assets/objects/rope_segment.png');
        this.load.image('spark', 'assets/particles/spark.png');
        this.load.image('objectWild', 'assets/objects/default_object.png');

        for (let i = 1; i <= 7; i++) {
            this.load.image(`object${i}`, `assets/objects/default_object${i}.png`);
        }
    }

    create() {
        score = 0;
        hunger = GAME_CONFIG.START_HUNGER;
        const { width, height } = this.scale;

        // Player
        this.player = this.physics.add.sprite(width / 2, height * 0.85, 'player')
            .setDisplaySize(200, 200)
            .setImmovable(true)
            .setDepth(10);
        this.player.body.setSize(60, 60).setOffset(30, 30);

        // Stamina
        this.stamina = 100;
        this.maxStamina = 100;

        // Stack System
        this.stack = [];
        this.stackIcons = [];
        this.stackIconSize = 32;
        this.stackBaseY = height - 40;
        this.maxStackHeight = Math.floor(height / this.stackIconSize);

        // Background
        this.add.image(width / 2, height / 2, 'game_bg').setDisplaySize(width, height);

        // Falling Objects
        this.objects = this.physics.add.group();
        this.physics.add.overlap(this.player, this.objects, this.collectObject, null, this);

        // Hook State
        this.hookActive = false;
        this.hookCooldown = false;
        this.hookObject = null;
        this.hookedPlayer = false;

        // Rope
        this.rope = this.add.tileSprite(0, 0, 6, 1, 'rope_segment')
            .setOrigin(0.5, 0)
            .setVisible(false);

        this.ropeEmitter = this.add.particles('spark').createEmitter({
            speed: 0,
            scale: { start: 0.25, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 200,
            frequency: 60,
            follow: this.rope
        });
        this.ropeEmitter.stop();

        // Tension
        this.tension = 0;
        this.lastPointerX = null;
        this.baseTensionThreshold = 100;
        this.escapeDifficulty = 1;

        // UI
        this.createUI();
        this.tensionBarBg = this.add.rectangle(16, 64, 120, 10, 0x222222).setOrigin(0, 0);
        this.tensionBar = this.add.rectangle(16, 64, 0, 10, 0xff4444).setOrigin(0, 0);

        // Timers
        this.time.addEvent({ delay: GAME_CONFIG.OBJECT_SPAWN_RATE, loop: true, callback: this.spawnObject, callbackScope: this });
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                hunger = Math.max(0, hunger - 1);
                if (hunger <= GAME_CONFIG.LOSING_HUNGER) this.scene.start('GameOverScene');
                this.updateUI();
            }
        });

        // Input
        this.input.on('pointermove', pointer => {
            if (!pointer.isDown) return;
            this.player.x = Phaser.Math.Clamp(pointer.x, this.player.displayWidth / 2, width - this.player.displayWidth / 2);
            if (this.hookedPlayer && this.lastPointerX !== null) this.tension += Math.abs(pointer.x - this.lastPointerX) * 0.5;
            this.lastPointerX = pointer.x;
        });

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    // ==========================
    // UI
    // ==========================
    createUI() {
        this.ui = this.add.container(16, 16);
        this.scoreText = this.add.text(0, 0, `Score: ${score}`, { fontSize: '18px', color: '#fff' });
        this.hungerText = this.add.text(0, 22, `Hunger: ${hunger}%`, { fontSize: '18px', color: '#0f0' });
        this.staminaBg = this.add.rectangle(0, 46, 120, 8, 0x222222).setOrigin(0, 0.5);
        this.staminaBar = this.add.rectangle(0, 46, 120, 8, 0x00ffff).setOrigin(0, 0.5);
        this.ui.add([this.scoreText, this.hungerText, this.staminaBg, this.staminaBar]);
    }

    updateUI() {
        this.scoreText.setText(`Score: ${score}`);
        this.hungerText.setText(`Hunger: ${hunger}%`);
        this.staminaBar.width = Phaser.Math.Clamp(120 * (this.stamina / this.maxStamina), 0, 120);
    }

    // ==========================
    // Stack Logic
    // ==========================
    addToStack(textureKey, obj = null) {
        if (this.stack.length >= this.maxStackHeight) { this.scene.start('GameOverScene'); return; }
        this.stack.push(textureKey);

        const icon = this.add.image(
            this.scale.width - 32,
            this.stackBaseY - (this.stack.length - 1) * this.stackIconSize,
            textureKey
        ).setDisplaySize(this.stackIconSize, this.stackIconSize);

        this.stackIcons.push(icon);

        // Wild card behavior
        if (obj?.isWild) {
            this.startWildCardEffect(icon);
            this.startWildCardTween(icon);
        }

        this.checkStackMatches();
    }

    // Wild Card Animation Tween (slight wiggle)
    startWildCardTween(icon) {
        this.tweens.add({
            targets: icon,
            y: icon.y + Phaser.Math.Between(-2, 2),
            x: icon.x + Phaser.Math.Between(-2, 2),
            duration: Phaser.Math.Between(300, 600),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Wild Card Effect (adjacency destroy + smooth fall)
    startWildCardEffect(icon) {
        if (this.wildCardCooldown) return;
        this.wildCardCooldown = true;

        let elapsed = 0;
        const duration = 15000; // 15 seconds
        const interval = () => Phaser.Math.Between(3000, 5000);

        const timer = this.time.addEvent({
            delay: interval(),
            callback: () => {
                elapsed += timer.delay;
                if (!this.stackIcons.includes(icon)) {
                    timer.remove(false);
                    this.wildCardCooldown = false;
                    return;
                }

                // Find adjacency (exclude wildcards)
                const idx = this.stackIcons.indexOf(icon);
                let candidates = [];
                if (idx > 0 && this.stack[idx - 1] !== 'objectWild') candidates.push(idx - 1);
                if (idx < this.stackIcons.length - 1 && this.stack[idx + 1] !== 'objectWild') candidates.push(idx + 1);

                if (candidates.length > 0) {
                    const randomIdx = Phaser.Utils.Array.GetRandom(candidates);
                    const objToDestroy = this.stackIcons[randomIdx];

                    // Smooth falling + fade animation
                    this.tweens.add({
                        targets: objToDestroy,
                        y: objToDestroy.y + 50,
                        alpha: 0,
                        duration: 400,
                        ease: 'Sine.easeIn',
                        onComplete: () => { objToDestroy.destroy(); }
                    });

                    this.stackIcons.splice(randomIdx, 1);
                    this.stack.splice(randomIdx, 1);
                    this.reflowStack();
                }

                // Destroy wild card itself after 15s
                if (elapsed >= duration) {
                    this.tweens.add({
                        targets: icon,
                        y: icon.y + 50,
                        alpha: 0,
                        duration: 400,
                        ease: 'Sine.easeIn',
                        onComplete: () => icon.destroy()
                    });
                    const idxIcon = this.stackIcons.indexOf(icon);
                    if (idxIcon !== -1) {
                        this.stackIcons.splice(idxIcon, 1);
                        this.stack.splice(idxIcon, 1);
                        this.reflowStack();
                    }
                    timer.remove(false);
                    this.wildCardCooldown = false;
                } else {
                    timer.reset({ delay: interval(), repeat: 0 });
                }
            },
            repeat: -1
        });
    }

    checkStackMatches() {
        let i = 0;
        while (i < this.stack.length) {
            let j = i + 1;
            while (j < this.stack.length && this.stack[j] === this.stack[i]) j++;

            const count = j - i;
            if (this.stack[i] === 'objectWild' && count >= 3) {
                this.stackIcons.forEach(icon => icon.destroy());
                this.stack = [];
                this.stackIcons = [];
                return;
            }

            if (count >= 3) {
                for (let k = i; k < j; k++) this.stackIcons[k].destroy();
                this.stack.splice(i, count);
                this.stackIcons.splice(i, count);
                this.reflowStack();
                return;
            }

            i = j;
        }
    }

    reflowStack() {
        this.stackIcons.forEach((icon, index) => {
            this.tweens.add({
                targets: icon,
                y: this.stackBaseY - index * this.stackIconSize,
                duration: 200,
                ease: 'Back.Out'
            });
        });
    }

    // ==========================
    // Spawning & Collection
    // ==========================
    spawnObject() {
        const types = [
            { key: 'object1', value: 10 },
            { key: 'object2', value: 20 },
            { key: 'object3', value: 25 },
            { key: 'object4', value: 15 },
            { key: 'object5', value: 15 },
            { key: 'object6', value: 0, isHook: true },
            { key: 'object7', value: -50 },
            { key: 'objectWild', value: 25, isWild: true }
        ];

        let data = Phaser.Utils.Array.GetRandom(types);
        if (data.isHook && (this.hookActive || this.hookCooldown)) data = types.find(t => !t.isHook);

        const obj = this.objects.create(
            Phaser.Math.Between(32, this.scale.width - 32),
            -32,
            data.key
        ).setDisplaySize(56, 56);

        obj.value = data.value;
        obj.isHook = data.isHook || false;
        obj.isWild = data.isWild || false;
        obj.setVelocityY(Phaser.Math.Between(120, 220));

        if (obj.isHook) {
            this.hookActive = true;
            this.hookObject = obj;
            this.hookedPlayer = false;
            this.rope.setVisible(true);
            this.ropeEmitter.start();
        }
    }

    collectObject(player, obj) {
        if (obj.isHook) return;
        score += obj.value;
        hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);
        this.stamina = Phaser.Math.Clamp(this.stamina + Math.max(5, obj.value), 0, this.maxStamina);
        this.addToStack(obj.texture.key, obj);
        obj.destroy();
        this.updateUI();
    }

    breakFree() {
        if (!this.hookObject) return;
        this.hookObject.destroy();
        this.hookObject = null;
        this.hookActive = false;
        this.hookedPlayer = false;
        this.tension = 0;
        this.lastPointerX = null;
        this.tensionBar.width = 0;
        this.rope.setVisible(false);
        this.ropeEmitter.stop();
        this.player.y = this.scale.height * 0.85;
        this.escapeDifficulty += 0.25;
        this.hookCooldown = true;
        this.time.delayedCall(3000, () => this.hookCooldown = false);
    }

    update() {
        if (this.cursors.left.isDown) this.player.x -= 10;
        if (this.cursors.right.isDown) this.player.x += 10;

        this.objects.getChildren().forEach(obj => {
            if (obj.y > this.scale.height + 32 && !obj.isHook) obj.destroy();
        });

        if (!this.hookActive || !this.hookObject) return;

        const hook = this.hookObject;
        this.rope.x = hook.x;
        this.rope.height = hook.y + (this.tension * 0.2);

        if (!this.hookedPlayer && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), hook.getBounds())) {
            this.hookedPlayer = true;
            hook.setVelocityY(-220);
        }

        if (this.hookedPlayer) {
            hook.x = this.player.x;
            this.player.y = hook.y + 60;
            this.tension = Math.max(0, this.tension - 0.4);
            this.stamina = Math.max(0, this.stamina - 0.08 * this.escapeDifficulty);
            const threshold = this.baseTensionThreshold * this.escapeDifficulty;
            this.tensionBar.width = Phaser.Math.Clamp((this.tension / threshold) * 120, 0, 120);
            if (this.tension > threshold * 0.75) this.cameras.main.shake(60, 0.003);
            if (this.tension >= threshold && this.stamina > 0) this.breakFree();
            if (hook.y <= 0) this.scene.start('GameOverScene');
        }

        if (hook.y > this.scale.height + 32 && !this.hookedPlayer) {
            hook.destroy();
            this.hookActive = false;
            this.rope.setVisible(false);
            this.ropeEmitter.stop();
        }

        this.updateUI();
    }
}

// ==========================
// Game Over Scene
// ==========================
class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    create() {
        const { width, height } = this.scale;
        this.add.text(width / 2, height * 0.4, 'Game Over', { fontSize: '64px', color: '#fff' }).setOrigin(0.5);
        this.add.text(width / 2, height * 0.55, 'Tap or Press ENTER to Retry', { fontSize: '28px', color: '#fff' }).setOrigin(0.5);
        this.input.keyboard.on('keydown-ENTER', () => this.scene.start('StartScene'));
        this.input.on('pointerdown', () => this.scene.start('StartScene'));
    }
}

// ==========================
// Game Config
// ==========================
const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 490, height: 844 },
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [StartScene, GameScene, GameOverScene]
};

new Phaser.Game(config);
