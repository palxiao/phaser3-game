import gameOptions from '@/config/options'
import { STOP_TILE, TRAMPOLINE_TILE } from '@/config/constant'
class GameScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'GameScene'
        });
    }

    preload() {
        console.log('gameScene preload');
    }

    create() {
        this.flipFlop = null
        // This scene is either called to run in attract mode in the background of the title screen
        // or for actual gameplay. Attract mode is based on a JSON-recording.
        if (this.registry.get('attractMode')) {
            console.log('估计是一个全局事件广播，注册事件');
        }

        this.keys = {
            jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            jump2: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            fire: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
        };

        // creation of "level" tilemap
        this.map = this.make.tilemap({
            key: "level"
        });

        // adding tiles to tilemap
        let tile = this.map.addTilesetImage("tileset01", "tile");

        // which layers should we render? That's right, "layer01"
        this.layer = this.map.createStaticLayer("layer01", tile);

        // which tiles will collide? Tiles from 1 to 3
        this.layer.setCollisionBetween(1, 3);

        // adding the hero sprite and enabling ARCADE physics for the hero
        this.hero = this.physics.add.sprite(260, 376, "hero");

        // setting hero horizontal speed
        // this.hero.body.velocity.x = gameOptions.playerSpeed;

        // the hero can jump
        this.canJump = true;

        // the hern cannot double jump
        this.canDoubleJump = false;

        // the hero is not on the wall
        this.onWall = false;

        // waiting for player input
        this.input.on("pointerdown", this.handleJump, this);
        this.keys.jump.on('down', this.handleJump, this)
        this.keys.jump2.on('down', this.handleJump, this)

        // set workd bounds to allow camera to follow the player
        this.cameras.main.setBounds(0, 0, 1920, 1440);

        // making the camera follow the player
        this.cameras.main.startFollow(this.hero);

        this.sound.add('BGM', {volume: 0.4, loop: true}).play()
        this.jumpSound = this.sound.add('jump', {volume: 0.5})
    }

    update(time, delta) {
        // console.log(this.hero.body.velocity.y)
        // 设置一些默认的重力值。查看函数以获得更多信息
        this.setDefaultValues();

        // 处理碰撞 handling collision between the hero and the tiles
        this.physics.world.collide(this.hero, this.layer, function (hero, layer) {
            this.action(hero, layer)
        }, null, this);

        // saving current vertical velocity
        this.previousYVelocity = this.hero.body.velocity.y;
        this.operation()
    }

    action(hero, layer) {
        let shouldStop = false; // should the player stop?

        // 一些临时变量来确定玩家是否只被阻挡一次 some temporary variables to determine if the player is blocked only once
        let blockedDown = hero.body.blocked.down;
        let blockedLeft = hero.body.blocked.left
        let blockedRight = hero.body.blocked.right;

        // 如果英雄击中了什么东西，就不允许双跳 if the hero hits something, no double jump is allowed
        this.canDoubleJump = false;

        // hero on the ground
        if (blockedDown) {
            // hero can jump
            this.canJump = true;
            // if we are on tile 2 (stop tile)...
            if (layer.index == STOP_TILE) {
                // player should stop
                shouldStop = true;
            }
            // 蹦床 if we are on a trampoline and previous player velocity was greater than zero
            if (layer.index == TRAMPOLINE_TILE && this.previousYVelocity > 0) {
                // trampoline jump!
                hero.body.velocity.y = -gameOptions.trampolineImpulse;
                // hero can double jump
                this.canDoubleJump = true
            }
        }

        // hero on the ground and touching a wall on the right
        if (blockedRight) {
            hero.flipX = true;
        }
        // hero on the ground and touching a wall on the right
        if (blockedLeft) {
            hero.flipX = false;
        }

        // 碰到墙 并且不在地上 hero NOT on the ground and touching a wall
        if ((blockedRight || blockedLeft) && !blockedDown) {
            // hero on a wall
            hero.scene.onWall = true;
            // remove gravity
            hero.body.gravity.y = 0;
            // 贴墙下落速度 setting new y velocity
            hero.body.velocity.y = gameOptions.playerGrip;
        }

        // 根据移动方向调整速度 adjusting hero speed according to the direction it's moving
        this.setPlayerXVelocity(!this.onWall || blockedDown, shouldStop);
    }

    // the hero can jump when:
    // canJump 为 true AND 人物在地上 (blocked.down)
    // 或 ： 人物在墙上
    handleJump() {
        // console.log(`canJump ${this.canJump} 在地上 ${this.hero.body.blocked.down} 在墙上 ${this.onWall}`);

        if ((this.canJump && this.hero.body.blocked.down) || this.onWall) {
            this.jumpSound.play()
            // 第一次起跳
            this.hero.body.velocity.y = -gameOptions.playerJump;
            //在墙上 改变水平下落速度 is the hero on a wall? change the horizontal velocity too. This way the hero will jump off the wall
            if (this.onWall) {
                this.setPlayerXVelocity(true);
            }
            // 不能跳跃 hero can't jump anymore
            this.canJump = false;
            // 英雄不在墙上了 hero is not on the wall anymore
            this.onWall = false;
            // 现在可以二段跳了 the hero can now double jump
            this.canDoubleJump = true;
        } else {
            if (this.canDoubleJump) {
                this.jumpSound.play()
                this.canDoubleJump = false;
                // applying double jump force
                this.hero.body.velocity.y = -gameOptions.playerDoubleJump;
            }
        }
    }

    // default values to be set at the beginning of each update cycle,
    // which may be changed according to what happens into "collide" callback function
    //在每个更新周期开始时设置的默认值，
    //可以根据“碰撞”回调函数中发生的情况来改变
    setDefaultValues() {
        this.hero.body.gravity.y = gameOptions.playerGravity;
        this.onWall = false;
        this.setPlayerXVelocity(true);
    }

    // sets player velocity according to the direction it's facing, unless "defaultDirection"
    // is false, in this case multiplies the velocity by -1
    // if stopIt is true, just stop the player
    //根据玩家所面对的方向设置玩家速度，除非“defaultDirection”为假，在这种情况下速度乘以-1
    //如果stopIt是真的，就停止玩家
    setPlayerXVelocity(defaultDirection, stopIt) {
        if (stopIt) {
            this.hero.body.velocity.x = 0;
        } else {
            // this.operation()
            this.hero.body.velocity.x = gameOptions.playerSpeed * (this.hero.flipX ? -1 : 1) * (defaultDirection ? 1 : -1);
        }
    }
    /**
     * 玩家操作
     */
    operation() {
        if (this.keys.jump.isDown) {
            // if (!this.flipFlop) {
            // this.handleJump()
            // this.flipFlop = true;
            // }
        } else if (this.keys.left.isDown) {
            this.hero.flipX = true;
            // this.hero.body.velocity.x = -gameOptions.playerSpeed
        } else if (this.keys.right.isDown) {
            this.hero.flipX = false;
            // this.hero.body.velocity.x = gameOptions.playerSpeed
        } else {
            if (!this.onWall && this.hero.body.blocked.down) {
                // this.hero.setVelocityX(0)
                this.setPlayerXVelocity(null, true)
            }
        }

        // if (this.keys.jump3.isDown) {
        //     if (!this.flipFlop) {
        //         this.handleJump()
        //         this.flipFlop = true;
        //     }
        // }
    }

}

export default GameScene;
