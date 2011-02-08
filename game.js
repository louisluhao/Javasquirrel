/**
 *  JavaSquirrel - A game for Effie
 *
 *  Copyright (c) 2010 Eric Garside (eric@knewton.com)
 *  Dual licensed under:
 *      MIT: http://www.opensource.org/licenses/mit-license.php
 *      GPLv3: http://www.opensource.org/licenses/gpl-3.0.html
 */
 
/*global Crafty, window, jQuery */

/*jslint white: true, browser: true, onevar: true, undef: true, eqeqeq: true, bitwise: true, regexp: false, strict: true, newcap: true, immed: true, maxerr: 50, indent: 4 */
(function($) {

    "use strict";

    //------------------------------
    //
    //  Constants
    //
    //------------------------------

    //------------------------------
    //  Entities
    //------------------------------
    
        /**
         *  @signature {
         *      <face>: [x, y, w, h],
         *
         *      ...
         *  }
         */
    
        /**
         *  Sprite faces for the squirrel.
         */
    var SQUIRREL = {
            forward_rest: [0, 2],
            
            animate_rest_forward: ["rest_forward", 0, 2, 6],
            
            right_rest: [4, 4],
            
            animate_move_right: ["move_right", 0, 4, 2],
            
            animate_rest_right: ["rest_right", 0, 0, 6],
            
            left_rest: [4, 5],
            
            animate_move_left: ["move_left", 0, 5, 2],
            
            animate_rest_left: ["rest_left", 0, 1, 6]
        },
        
        /**
         *  Sprite faces for the trees.
         */
        TREES = {
            tree_summer: [0, 0],
            tree_fall: [0, 1],
            tree_winter: [0, 2],
            tree_zomg: [0, 3]
        },

    //------------------------------
    //  Settings
    //------------------------------
    
        /**
         *  The default run speed.
         */
        RUN_SPEED_DEFAULT = 3,
        
        /**
         *  Default jump.
         */
        JUMP_DEFAULT = 6,
        
        /**
         *  Total number of acorns which can be collected
         */
        MAX_ACORNS = 140,
        
        /**
         *  Title fade duration.
         */
        FADE_DURATION = 3e3,
    
        /**
         *  The default game size.
         */
        DEFAULT_GAME_SIZE = 2e4,
    
        /**
         *  Default Frames per Second
         */
        DEFAULT_FPS = 50,
        
        /**
         *  z-indices for different game layers.
         *
         *  @signature {
         *      <layer>: <zIndex>,
         *
         *      ...
         *  }
         */
        LAYERS = {
            player: 50,
            background: 25,
            foreground: 45,
            UI: 100
        },
        
        /**
         *  Dimensions.
         *
         *  @signature {
         *      <entity>: {
         *          w: <entity_width>,
         *          
         *          h: <entity_height>
         *      },
         *
         *      ...
         *  }
         */
        DIMENSIONS = {
            /**
             *  Size of the game board.
             */
            game: {
                w: DEFAULT_GAME_SIZE, 
                h: 400
            },
            
            /**
             *  The player entity.
             */
            player: {
                w: 32,
                h: 26
            },
            
            /**
             *  The game floor asset.
             */
            floor: {
                w: 115,
                h: 95
            },
            
            /**
             *  Trees.
             */
            tree: {
                h: 133,
                y: 2
            },
            
            tree_home: {
                w: 190,
                h: 190,
                y: 35
            },
            
            /**
             *  The score display.
             */
            acorn: {
                w: 32,
                h: 32
            },
            
            /**
             *  The score display.
             */
            acorn_badge: {
                w: 130,
                h: 130
            },
            
            /**
             *  The score.
             */
            score: {
                w: 130,
                h: 130
            }
        },
        
        /**
         *  Various band heights to generate acorns on.
         */
        ACORN_BAND = {
            high: DIMENSIONS.game.h - DIMENSIONS.floor.h - 70,
            medium: DIMENSIONS.game.h - DIMENSIONS.floor.h - 70,
            low: DIMENSIONS.game.h - DIMENSIONS.floor.h - 30
        },
    
        /**
         *  Asset settings.
         *
         *  @signature {
         *      <asset>: {
         *          <key>: <value>,
         *
         *          ...
         *      },
         *
         *      ...
         *  }
         */
        ASSET = {
            /**
             *  Game settings.
             */
            game: {
                background: "url(image/background.png)"
            },
            
            /**
             *  Game title settings.
             */
            title: {
                text: "Java Squirrel",
                
                css: {
                    color: "#573B23",
                    textAlign: "center"
                },
                    
                font: "900 62px GoodDogRegular"
            },
            
            /**
             *  Game title settings.
             */
            subtitle: {
                text: "a javascript game",
                
                css: {
                    color: "#000",
                    textAlign: "center"
                },
                    
                font: "bold 14px Tahoma"
            },
            
            /**
             *  Game floor.
             */
            floor: {
                image: "image/tile-ground.png"
            },
            
            /**
             *  The forest.
             */
            forest: {
                image: "image/forest.png"
            },
            
            /**
             *  The squirrel.
             */
            squirrel: {
                sprite: "image/squirrel.png",
                sprite_size: 32
            },
            
            /**
             *  The home tree.
             */
            tree_home: {
                sprite: "image/tree-home.png",
                sprite_size: 190
            },
            
            /**
             *  The acorn.
             */
            acorn: {
                sprite: "image/acorn.png",
                sprite_size: 32
            },
            
            /**
             *  The acorn.
             */
            acorn_badge: {
                image: "image/acorn-badge.png",
                
                css: {
                    zIndex: LAYERS.UI + 10,
                    top: 30,
                    left: 15
                },
            },
            
            /**
             *  Game title settings.
             */
            score: {
                text: "0",
                
                css: {
                    color: "#FFF",
                    textAlign: "center"
                },
                    
                font: "bold 24px/160px Tahoma"
            }
        },
        
        /**
         *  Animation timings.
         *
         *  @signature {
         *      <entity>: {
         *          <animation_key>: <animation_value>,
         *  
         *          ...
         *      },
         *
         *      ...
         *  }
         */
        ANIMATE = {
            /**
             *  The player entity
             */
            player: {
                rest_duration: 80,
                move_right_duration: 10,
                move_left_duration: 10,
                life_timeout: 1e4,
                life: undefined
            }
        },

    //------------------------------
    //  Enumeration
    //------------------------------

        /**
         *  Facing enumeration
         */
        FACING = {
            forward: 0,
            left: 1,
            right: 2
        },
        
    //------------------------------
    //
    //  Property declaration
    //
    //------------------------------

    //------------------------------
    //  Aliases
    //------------------------------
    
        /**
         *  The viewport
         */
        vp = Crafty.viewport,
    
    //------------------------------
    //  Player statistics
    //------------------------------

        /**
         *  The current power level of the player.
         *
         *  @signature {
         *      run: <runPower>,
         *
         *      jump: <jumpPower>
         *  }
         */
        power = {
            run: RUN_SPEED_DEFAULT,
            jump: JUMP_DEFAULT
        },
        
        /**
         *  A tracker for the current number of acorn steps.
         */
        acorn_steps = 0,
        
        /**
         *  Max steps before more acorns
         */
        MAX_ACORN_STEPS = 160,
    
    //------------------------------
    //  Score display
    //------------------------------
        
        /**
         *  Display object for the score.
         */
        score,
        
        /**
         *  Display object for the score.
         */
        score_display,
    
    //------------------------------
    //  Player
    //------------------------------
        
        /**
         *  The player.
         */
        player,
    
    //------------------------------
    //  Acorns
    //------------------------------
    
        acorns = {},
        
        acorn_uid = 0,
        
        pending_acorns = 0;
    
    //------------------------------
    //
    //  Cleanup
    //
    //------------------------------
    
    function cleanupAcorns() {
        if (pending_acorns >= MAX_ACORNS) {
            $.each(acorns, function (key, val) {
                acorns[key].destroy();
                delete acorns[key];
                return false;
            });
            
            pending_acorns -= 1;
        }
    }
    
    function generateRandomAcorns(number, range) {
        var index = 0,
            
            rand,
            
            band = 0;
            
        for (; index < number; index += 1) {
            rand = Crafty.randRange(player.x + 60, range);
            band += 1;
            if (band > 2) {
                band = 0;
            }
            manufactureAcorn(rand, band === 0 ? "low" : (band === 1 ? "medium" : "high"));
        }
    }
    
    //------------------------------
    //
    //  Manufacture functions
    //
    //------------------------------
    
    /**
     *  Manufacture the player character.
     *
     *  @return The player character.
     */
    function manufacturePlayer() {
        /**
         *  The player object.
         */
        player = Crafty.e("2D, DOM, squirrel, gravity, controls, twoway, collision, animate, score");
        
            /**
             *  Size of the player.
             */
        var size = DIMENSIONS.player;
        
        player
            
            //  Generic player configuration
            .attr({
                y: vp.height - size.h,
                x: 300,
                z: LAYERS.player,
                facing: FACING.forward,
                right_bound: false,
                viewport_attached: false,
                viewport_offset: 0,
                w: size.w,
                h: size.h
            })
            .gravity("floor")
            .twoway(power.run, power.jump)
        
            //  Player bindings
            .bind("keydown", function (event) {
                
                switch (event.keyCode) {
                
                //  D key / Right arrow
                case Crafty.keys.D:
                case Crafty.keys.RA:
                    this.facing = FACING.right;
                    break;
                    
                //  A key / Left arrow
                case Crafty.keys.A:
                case Crafty.keys.LA:
                    this.facing = FACING.left;
                    break;
                    
                //  S key / Down arrow
                case Crafty.keys.S:
                case Crafty.keys.DA:
                    this.facing = FACING.forward;
                    this.stop();
                    break;
                
                }
                
            })
        
            .bind("change", function (event) {
                
                if (this.__move.right && !this.isPlaying("move_right")) {
                    this.sprite.apply(this, SQUIRREL.right_rest);
                    this.stop();
                    this.animate("move_right", ANIMATE.player.move_right_duration);
                }
                
                if (this.__move.left && !this.isPlaying("move_left")) {
                    this.sprite.apply(this, SQUIRREL.left_rest);
                    this.stop();
                    this.animate("move_left", ANIMATE.player.move_left_duration);
                }
    
                if (event !== undefined &&
                        this.viewport_attached &&
                        event._x !== this.x) {
                        
                        if (this.__move.right && !this.right_bound) {
                            vp.x -= event._x - this.viewport_offset;
                            score_display.move("e", event._x - this.viewport_offset);
                            score.move("e", event._x - this.viewport_offset);
                            acorn_steps += 1;
                            $("#cr-stage").css("marginLeft", event._x - this.viewport_offset);
                        } else if (this.__move.left) {
                            vp.x += this.viewport_offset - event._x;
                            score_display.move("e", event._x - this.viewport_offset);
                            score.move("e", event._x - this.viewport_offset);
                            this.right_bound = false;
                            $("#cr-stage").css("marginLeft", this.viewport_offset - event._x);
                            
                            if (vp.x >= 0) {
                                vp.x = 0;
                                this.viewport_offset = undefined;
                                this.viewport_attached = false;
                            }
                            
                            acorn_steps += 1;
                        }
                        
                        if (acorn_steps > MAX_ACORN_STEPS) {return;
                            console.log("moar acorns");
                            acorn_steps = 0;
                            generateRandomAcorns(5, DIMENSIONS.game.w * 3);
                        }
                }
            })
            
            .bind("keyup", function (event) {
                
                switch (event.keyCode) {
                
                case Crafty.keys.D:
                case Crafty.keys.RA:
                case Crafty.keys.A:
                case Crafty.keys.LA:
                    this.stop();
                    break;
                
                }
                
                switch (this.facing) {
                
                case FACING.right:
                    this.sprite.apply(this, SQUIRREL.right_rest);
                    break;
                    
                case FACING.left:
                    this.sprite.apply(this, SQUIRREL.left_rest);
                    break;
                    
                case FACING.forward:
                    this.sprite.apply(this, SQUIRREL.forward_rest);
                    break;
                
                }
                
            })
            
            //  Animations
            .animate.apply(player, SQUIRREL.animate_move_left)
            .animate.apply(player, SQUIRREL.animate_move_right)
            .animate.apply(player, SQUIRREL.animate_rest_forward)
            .animate.apply(player, SQUIRREL.animate_rest_left)
            .animate.apply(player, SQUIRREL.animate_rest_right);
        
        //  Clear the life interval if it exists
        if (ANIMATE.player.life !== undefined) {
            clearInterval(ANIMATE.player.life);
            ANIMATE.player.life = undefined;
        }
        
        //  Set the life interval
        ANIMATE.player.life = setInterval(function () {
            if (!player.__move.up &&
                    !player.__move.falling &&
                    !player.__move.left &&
                    !player.__move.right) {
                
                switch (player.facing) {
                
                case FACING.right:
                    player.animate("rest_right", ANIMATE.player.rest_duration);
                    break;
                    
                case FACING.left:
                    player.animate("rest_left", ANIMATE.player.rest_duration);
                    break;
                    
                case FACING.forward:
                    player.animate("rest_forward", ANIMATE.player.rest_duration);
                    break;
                
                }
                
            }
        }, ANIMATE.player.life_timeout);
        
        player.animate("rest_forward", ANIMATE.player.rest_duration);
        
        return player;
    }
    
    /**
     *  Manufacture the game floor.
     *
     *  @param  game_size   The size of the game board.
     *
     *  @return The floor.
     */
    function manufactureFloor(game_size) {
            
            /**
             *  The floor.
             */
        var floor = Crafty.e("2D, canvas, floor, image, bottom"),
        
            /**
             *  Size of the floor.
             */
            size = DIMENSIONS.floor;
        
        floor
            .attr({
                x: 0, 
                y: vp.height - size.h, 
                w: game_size,
                h: size.h
            })
            .image(ASSET.floor.image, "repeat-x");
            
        return floor;
    }
    
    /**
     *  Manufacture a forest.
     *
     *  @param x        The x position of the tree.
     *
     *  @param game_size    The size of the game board.
     *
     *  @return The forst.
     */
    function manufactureForest(x, game_size) {  
            /**
             *  The floor.
             */
        var tree = Crafty.e("2D, DOM, image"),
        
            size = DIMENSIONS.tree;
            
        tree
            .attr({
                x: x, 
                y: vp.height - size.h - DIMENSIONS.floor.h + size.y,
                z: LAYERS.background,
                w: game_size, 
                h: size.h
            })
            .image(ASSET.forest.image, "repeat-x");
            
        return tree;
    }
    
    /**
     *  Manufacture an acorn.
     *
     *  @param x    The x position of the acorn.
     *
     *  @param band The acorn band to generate on.
     */
    function manufactureAcorn(x, band) {
            /**
             *  The acorn.
             */
        var acorn = Crafty.e("2D, DOM, hit, collision, acorn"),
        
            size = DIMENSIONS.acorn,
            
            uid;
            
        acorn
            .attr({
                x: x - (size.w / 2), 
                y: ACORN_BAND[band],
                z: LAYERS.foreground,
                w: size.w,
                h: size.h
            }).collision(player, function() {
                this.destroy();
                delete acorns[uid];
                pending_acorns -= 1;
                player.incrementScore(1);
                score.text(player._score);
            });
            
        acorns[uid] = acorn;
        pending_acorns += 1;
            
        return acorn;
    }
    
    //------------------------------
    //
    //  Creation
    //
    //------------------------------
    
    /**
     *  Creates general components.
     */
    function createComponents() {
    
        Crafty.c("barrier", {
            west: null,
            east: null,
            north: null,
            south: null,
            obj: null,
            
            barrier: function(x, y, w, h, obj) {
                if (!this.has("2D")){ 
                    this.addComponent("2D");
                }
                this.attr({x: x, y: y, w: w, h: h});
                this.obj = obj;
                var self = this;
                
                this.west = Crafty.e("2D, hit, collision").attr({x: x, y: y, w: 1, h:h});
                this.east = Crafty.e("2D, hit, collision").attr({x: x + w - 1, y: y, w: 1, h:h});
                this.north = Crafty.e("2D, hit, collision").attr({x: x, y: y, w: w, h:1});
                this.south = Crafty.e("2D, hit, collision").attr({x: x, y: y + h - 1, w: w, h: 1});
                
                return this;
            }
        });
        
    }
    
    /**
     *  Create a game level.
     *
     *  @param game_size    The size of the game board.
     */
    function createLevel(game_size) {
        power.run = RUN_SPEED_DEFAULT;
        power.jump = JUMP_DEFAULT;
        current_jump_bonus = 0;

        game_size = game_size || DEFAULT_GAME_SIZE;
        
        //  Create gameboard
        manufactureFloor(game_size);
        
            //  Create left bound barrier
        var left_bound = Crafty.e("barrier"),
        
            //  Create right scroll bound barrier
            scroll_bound = Crafty.e("barrier"),
            
            //  Create right bound barrier
            right_bound = Crafty.e("barrier"),
            
            //  Create the player
            player = manufacturePlayer(),
            
            /**
             *  The floor.
             */
            tree = Crafty.e("2D, DOM, tree_home, sprite")
                .attr({
                    x: -15, 
                    y: vp.height - DIMENSIONS.tree_home.h - DIMENSIONS.floor.h + DIMENSIONS.tree_home.y,
                    z: LAYERS.foreground,
                    w: DIMENSIONS.tree_home.w, 
                    h: DIMENSIONS.tree_home.h
                });
        
        left_bound
            .barrier((DIMENSIONS.tree_home.w / 2) - 15, 0, 5, vp.height)
            .east
                .collision(player, function() {
                    if (player.facing === FACING.left) {
                        player.x = left_bound.x;
                    }
                });
            
        scroll_bound
            .barrier(600 * 0.7, 0, 5, vp.height, player)
            .west
                .collision(player, function () {
                    if (!player.viewport_attached && 
                            player.facing === FACING.right) {
                        player.viewport_offset = player.x;
                        player.viewport_attached = true;
                    }
                });
                
        right_bound
            .barrier(game_size - (DIMENSIONS.game.w / 2) - 45, 0, 20, vp.height)
            .east
                .collision(player, function () {
                    if (player.facing === FACING.right) {
                        player.right_bound = true;
                        player.x = right_bound.x - 15;
                    }
                });
                
        manufactureForest(600 / 1.6, game_size);
        
        score_display = Crafty.e("2D, DOM, image");
        score = Crafty.e("2D, DOM, text, font");
        
        score_display
            //  Setup the acorn badge
            .css(ASSET.acorn_badge.css)
            .image(ASSET.acorn_badge.image)
            .attr({
                h: DIMENSIONS.acorn_badge.h,
                w: DIMENSIONS.acorn_badge.w
            });
            
        score
            .text(ASSET.score.text)
            .font(ASSET.score.font)
            .css(ASSET.score.css)
            .attr({
                h: DIMENSIONS.score.h,
                w: DIMENSIONS.score.w
            });
            
        generateRandomAcorns(MAX_ACORNS, game_size);
            
        return player;
    }
    
    //------------------------------
    //
    //  Sprite declaration
    //
    //------------------------------
    
    Crafty.sprite(ASSET.squirrel.sprite_size, ASSET.squirrel.sprite, {
        squirrel: SQUIRREL.forward_rest
    });
    
    Crafty.sprite(ASSET.tree_home.sprite_size, ASSET.tree_home.sprite, {
        tree_home: [0, 0]
    });
    
    Crafty.sprite(ASSET.acorn.sprite_size, ASSET.acorn.sprite, {
        acorn: [0, 0]
    });
    
    //------------------------------
    //
    //  Scene declaration
    //
    //------------------------------

    /**
     *  The title screen.
     */
    Crafty.scene("eternal", function() {
        Crafty.background(ASSET.game.background);
        
        var title = Crafty.e("2D, DOM, text, font"),
        
            subtitle = Crafty.e("2D, DOM, text, font"),
            
            size = DIMENSIONS.game.w * 1.25;
            
        title   
            .css(ASSET.title.css)
            .text(ASSET.title.text)
            .font(ASSET.title.font)
            .attr({
                x: 0,
                y: vp.height * 0.05,
                w: 600
            });
            
        subtitle
            .css(ASSET.subtitle.css)
            .text(ASSET.subtitle.text)
            .font(ASSET.subtitle.font)
            .attr({
                x: 0,
                y: (vp.height * 0.05) + 65,
                w: 600
            });

        createLevel();
        
        $(title._element).fadeOut(FADE_DURATION);
        $(subtitle._element).fadeOut(FADE_DURATION);
    });
    
    //------------------------------
    //
    //  Startup
    //
    //------------------------------

    $(function () {
        Crafty.init(DEFAULT_FPS, DIMENSIONS.game.w, DIMENSIONS.game.h);
        Crafty.canvas();
        
        createComponents();
        
        Crafty.scene("eternal");
    });
    
}(jQuery));