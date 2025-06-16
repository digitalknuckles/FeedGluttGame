// Start Scene
class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    preload() {
        this.load.image('start_bg', 'assets/backgrounds/start_menu_bg.png');
    }

    create() {
        this.add.image(400, 300, 'start_bg').setDisplaySize(800, 600);
        this.add.text(250, 100, 'Feed GLUTT!', { fontSize: '64px', fill: '#fff' });
        this.add.text(200, 300, 'Press ENTER to Start', { fontSize: '32px', fill: '#fff' });

        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('GameScene');
        });
    }
}

// Game Scene
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
    }

    create() {
        score = 0;
        hunger = 10;

        this.add.image(400, 300, 'game_bg').setDisplaySize(800, 600);

        this.player = this.physics.add.sprite(400, 500, 'player').setDisplaySize(200, 200).setImmovable();

        this.cursors = this.input.keyboard.createCursorKeys();

        this.objects = this.physics.add.group();

        this.objectTimer = this.time.addEvent({
            delay: 333,
            callback: this.spawnObject,
            callbackScope: this,
            loop: true
        });

        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', fill: '#fff' });
        this.hungerText = this.add.text(10, 40, 'Hunger: 10%', { fontSize: '24px', fill: '#fff' });
    }

    spawnObject() {
        const objTypes = [
            { key: 'object1', value: 1 },
            { key: 'object2', value: 10 },
            { key: 'object3', value: 15 },
            { key: 'object4', value: 5 },
            { key: 'object5', value: 5 },
            { key: 'object6', value: 5 },
            { key: 'object7', value: -5 }
        ];

        const objData = Phaser.Utils.Array.GetRandom(objTypes);
        const x = Phaser.Math.Between(32, 768);
        const obj = this.objects.create(x, -32, objData.key).setDisplaySize(64, 64);
        obj.value = objData.value;
        obj.speed = Phaser.Math.Between(100, 200);
        obj.setVelocityY(obj.speed);
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.x = Math.max(100, this.player.x - 10);
        } else if (this.cursors.right.isDown) {
            this.player.x = Math.min(700, this.player.x + 10);
        }

        this.objects.getChildren().forEach(obj => {
            if (obj.y > 600) {
                obj.destroy();
            } else if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), obj.getBounds())) {
                score += obj.value;
                hunger = Phaser.Math.Clamp(hunger + obj.value, 0, 100);
                obj.destroy();

                this.scoreText.setText(`Score: ${score}`);
                this.hungerText.setText(`Hunger: ${hunger}%`);

                if (score >= WINNING_SCORE && hunger === 100) {
                    this.scene.start('VictoryScene');
                }

                if (hunger <= LOSING_HUNGER_THRESHOLD) {
                    this.scene.start('GameOverScene');
                }
            }
        });
    }
}

// Victory Scene
class VictoryScene extends Phaser.Scene {
    constructor() {
        super('VictoryScene');
    }

    preload() {
        this.load.image('victory1', 'assets/Feed_Glutt/victory1.png');
        this.load.image('victory2', 'assets/Feed_Glutt/victory2.png');
    }

    create() {
        const victoryImages = ['victory1', 'victory2'];
        const chosen = Phaser.Utils.Array.GetRandom(victoryImages);
        this.add.image(400, 300, chosen).setDisplaySize(400, 400);
        this.add.text(150, 50, 'You Fed Glutt!', { fontSize: '64px', fill: '#fff' });

        this.add.text(300, 550, 'Mint Collectible', { fontSize: '32px', fill: '#0f0', backgroundColor: '#000' })
            .setInteractive()
            .on('pointerdown', () => {
                window.open('https://opensea.io/collection/gluttog/overview', '_blank');
            });
    }
}

// Game Over Scene
class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create() {
        this.add.text(250, 250, 'Game Over', { fontSize: '64px', fill: '#fff' });
        this.add.text(200, 350, 'Press ENTER to Retry', { fontSize: '32px', fill: '#fff' });

        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('StartScene');
        });
    }
}

// Now define config + game AFTER the classes
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [StartScene, GameScene, VictoryScene, GameOverScene]
};

const game = new Phaser.Game(config);

// Shared variables
let score = 0;
let hunger = 10;
const WINNING_SCORE = 500;
const LOSING_HUNGER_THRESHOLD = 0;
