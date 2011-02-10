/**
 *	JavaSquirrel - A game for Effie
 *
 *	Copyright (c) 2010 Eric Garside (eric@knewton.com)
 *	Dual licensed under:
 *		MIT: http://www.opensource.org/licenses/mit-license.php
 *		GPLv3: http://www.opensource.org/licenses/gpl-3.0.html
 */
 
/*global Crafty, window, jQuery */

/*jslint white: true, browser: true, onevar: true, undef: true, eqeqeq: true, bitwise: true, regexp: false, strict: true, newcap: true, immed: true, maxerr: 50, indent: 4 */

(function($) {

	"use strict";

	//------------------------------
	//
	//	Constants
	//
	//------------------------------
	
	//------------------------------
	//  Game
	//------------------------------
	
		/**
		 *	The game configuration.
		 */
	var GAME = {
			/**
			 *	Game width.
			 */
			width: 700,
			
			/**
			 *	Game height.
			 */
			height: 400,
			
			/**
			 *	Frames per second.
			 */
			fps: 50,
			
			/**
			 *	The top of the floor.
			 */
			floor: 0,
			
			/**
			 *	The player object
			 */
			player: undefined,
			
			/**
			 *	Flag to determine if the game has been initialized.
			 */
			initialized: false,
			
			/**
			 *	The maximum number of acorns to nom at once.
			 */
			max_nom_nom: 15,
			
			/**
			 *	Flag to determine if the game is paused.
			 */
			pause: false,
			
			/**
			 *	The current season.
			 */
			season: "spring",
			
			/**
			 *	The rate at which coffee decays.
			 */
			coffee_decay: .25,
			
			/**
			 *	The coffee run buff.
			 */
			coffee_run_buff: 5
		},

	//------------------------------
	//	Enumeration
	//------------------------------

		/**
		 *	Facing enumeration
		 */
		FACING = {
			forward: 0,
			left: 1,
			right: 2
		},
		
		/**
		 *	Game layers z indices.
		 */
		LAYERS = {
			background: 25,
			player: 50,
			foreground: 75
		},
		
	//------------------------------
	//
	//	Property declaration
	//
	//------------------------------
	
	//------------------------------
	//  Player
	//------------------------------
	
		player_state = {
			/**
			 *	The unbuffed player run speed.
			 */
			base_run_speed: 3,
			
			/**
			 *	The current player run speed.
			 */
			current_run_speed: 3,
			
			/**
			 *	The debuff associated with the number of acorns in the cheeks.
			 */
			acorn_cheeks_debuff: 0,
			
			/**
			 *	The coffee run buff.
			 */
			coffee_run_buff: 0,
			
			/**
			 *	The unbuffed player jump height.
			 */
			base_jump_height: 8,
			
			/**
			 *	The player run speed.
			 */
			current_jump_height: 8,
			
			/**
			 *	The golden acorn jump buff.
			 */
			golden_acorn_jump_buff: 1
		},
		
	//------------------------------
	//  Introduction
	//------------------------------
	
		/**
		 *	Introduction state object.
		 */
		introduction = {
			enabled: false,
			acorn_generated: false,
			acorn_eaten: false,
			powerups_generated: false,
			golden_acorn: false,
			drink_coffee: false,
			eaten_pile: false
		},
		
	//------------------------------
	//  Timers
	//------------------------------
	
		/**
		 *	The drain coffee timeout.
		 */
		drain_coffee;
	
	//------------------------------
	//
	//	Internal methods
	//
	//------------------------------
	
	//------------------------------
	//  Buff control
	//------------------------------
	
	/**
	 *	Partially drain the coffee buff.
	 */
	function drainCoffeeBuff() {
		player_state.coffee_run_buff -= GAME.coffee_decay;
		
		if (player_state.coffee_run_buff < 0) {
			player_state.coffee_run_buff = 0;
		}
		
		if (drain_coffee !== undefined) {
			clearTimeout(drain_coffee);
			drain_coffee = undefined;	
		}
		
		if (player_state.coffee_run_buff > 0) {
			drain_coffee = setTimeout(drainCoffeeBuff, 500);
		}
		
		updatePlayerMovement();
	}
	
	/**
	 *	Render the coffee meter.
	 */
	function coffeeMeter() {
		if (player_state.coffee_run_buff === GAME.coffee_run_buff) {
			$("#coffee-meter").css("opacity", 1);
			$("#coffee-progress-bar").css("width", "100%").animate({
				width: 0
			}, 
			
				1e4,
				
				function () {
					$("#coffee-meter").css("opacity", 0.25);
				});
			
			drainCoffeeBuff();
		}
	}
	
	/**
	 *	Handle the golden acorn.
	 */
	function goldenAcornMeter () {
		$("#golden-acorn-meter").css("opacity", 1);
		$("#golden-acorn-progress-bar").css("width", "100%").animate({
			width: 0
		}, 
		
			1e4, 
			
			function () {
				$("#golden-acorn-meter").css("opacity", 0.25);
			});
	}
	
	//------------------------------
	//  System setup
	//------------------------------
	
	/**
	 *	Define reusable components.
	 */
	function defineComponents() {
		//	Override twoway to add in pause functionality.
		Crafty.components().twoway.twoway = function(speed,jump) {
			if(speed) this._speed = speed;
			this._jump = jump;
			
			var move = this.__move;
			
			this.bind("enterframe", function() {
				if (GAME.pause) {
					return;
				}
				
				var old = this.pos(),
					changed = false;
				if(move.right) {
					this.x += this._speed;
					changed = true;
				}
				if(move.left) {
					this.x -= this._speed;
					changed = true;
				}
				if(move.up) {
					this.y -= this._jump;
					this._autumning = true;
					changed = true;
				}
			}).bind("keydown", function(e) {
				if(e.keyCode === Crafty.keys.RA || e.keyCode === Crafty.keys.D) {
					move.right = true;
				}
				if(e.keyCode === Crafty.keys.LA || e.keyCode === Crafty.keys.A) {
					move.left = true;
				}
				if(e.keyCode === Crafty.keys.UA || e.keyCode === Crafty.keys.W) {
					move.up = true;
				}
			}).bind("keyup", function(e) {
				if(e.keyCode === Crafty.keys.RA || e.keyCode === Crafty.keys.D) {
					move.right = false;
				}
				if(e.keyCode === Crafty.keys.LA || e.keyCode === Crafty.keys.A) {
					move.left = false;
				}
			});
			
			return this;
		};
	
		Crafty.c("barrier", {
			west: null,
			east: null,
			north: null,
			south: null,
			
			barrier: function(x, y, w, h) {
				if(!this.has("2D")){
					this.addComponent("2D");
				}
				this.attr({
					x: x, 
					y: y, 
					w: w, 
					h: h
				});
				
				var self = this;
				
				this.west = Crafty.e("2D, hit, collision").attr({x: x, y: y, w: 1, h:h});
				this.east = Crafty.e("2D, hit, collision").attr({x: x + w - 1, y: y, w: 1, h:h});
				this.north = Crafty.e("2D, hit").attr({x: x, y: y, w: w, h:1})
				this.south = Crafty.e("2D, hit, collision").attr({x: x, y: y + h - 1, w: w, h: 1});
				
				return this;
			}
		});
		
		Crafty.c("player", {
			//	The jump height
			_jump: 0,
			
			//	The number of acorns in the player's cheeks.
			cheeks: 0,
			
			//	Any temporary buffs for the player.
			buffs: [],
			
			/**
			 *	Eat acorns.
			 *
			 *	@param acorns	The number of acorns to eat. Default is 1.
			 */
			eatAcorn: function (acorns) {
				if (acorns !== undefined) {
					if (acorns > GAME.max_nom_nom - this.cheeks) {
						acorns = GAME.max_nom_nom - this.cheeks;
					}
				} else {
					acorns = 1;
				}
			
				if (this.cheeks + acorns <= GAME.max_nom_nom) {
					this.cheeks += acorns;
					this.trigger("om-nom-nom");
					
					player_state.acorn_cheeks_debuff = (2 * (this.cheeks / GAME.max_nom_nom));
					updatePlayerMovement();
					return true;
				}
				
				return false;
			},
			
			/**
			 *	Eat a golden acorn.
			 */
			eatGoldenAcorn: function () {
				player_state.golden_acorn_jump_buff = 1.75;
				
				this.trigger("bling-nom-nom");
				
				goldenAcornMeter();

				updatePlayerMovement();
			},
			
			/**
			 *	Drink a cup of coffee.
			 */
			drinkCoffee: function () {
				player_state.coffee_run_buff = GAME.coffee_run_buff;
				
				this.trigger("coffee-coffee-coffee");
				
				coffeeMeter();
			}
		});

		Crafty.sprite(133, "image/trees.png", {
			tree_spring: [0, 0],
			tree_autumn: [0, 1],
			tree_winter: [0, 2],
			tree_summer: [0, 3]
		});
	}
	
	//------------------------------
	//  Player management
	//------------------------------
	
	/**
	 *	Update the player movement using the new values.
	 */
	function updatePlayerMovement() {
		player_state.current_run_speed = player_state.base_run_speed - player_state.acorn_cheeks_debuff + player_state.coffee_run_buff;
		player_state.current_jump_height = player_state.base_jump_height * player_state.golden_acorn_jump_buff;
		
		GAME.player._jump = player_state.current_jump_height;
		GAME.player._speed = player_state.current_run_speed;
	}
	
	//------------------------------
	//  Introduction scenes
	//------------------------------
	
	/**
	 *	Generate the acorn meter introduction.
	 */
	function acornMeterIntroduction() {
		destroyIntroductionAssets();
		
		$("#introduction-acorn-meter, #acorn-meter, #introduction-next, #introduction-prev").show();
	}
	
	//------------------------------
	//  Meters
	//------------------------------
	
	/**
	 *	Flash the progress bar.
	 */
	function flashProgressBar() {
		if (GAME.max_nom_nom !== GAME.player.cheeks) {
			return;
		}
	
		$("#acorn-progress-bar").fadeTo(750, 0.5, function () {
			$("#acorn-progress-bar").fadeTo(750, 1.0, function () {
				flashProgressBar();
			});
		});
	}
	
	//------------------------------
	//  World generation
	//------------------------------
	
	/**
	 *	Generate the game floor.
	 */
	function generateFloor() {
		GAME.floor = GAME.height - 30;
	
		Crafty.e("2D, canvas, floor, image, bottom, persist")
			.attr({
				x: 0,
				y: GAME.floor, 
				w: GAME.width,
				h: 30
			})
			.image("image/tile-ground.png", "repeat-x");
	}
	
	/**
	 *	Generate the player.
	 */
	function generatePlayer() {
	
			/**
			 *	Sprite position declarations.
			 */
		var sprite = {
				forward_rest: [0, 2],
				
				right_rest: [4, 4],
				
				right_run: [0, 4],
				
				left_rest: [4, 5],
				
				left_run: [0, 5]
			},
			
			/**
			 *	Sprite animation declarations.
			 */
			animation = {
				rest_forward: ["rest_forward", 0, 2, 6],
				
				move_right: ["move_right", 0, 4, 2],
				
				rest_right: ["rest_right", 0, 0, 6],
				
				move_left: ["move_left", 0, 5, 2],
				
				rest_left: ["rest_left", 0, 1, 6]
			};
			
		/**
		 *	Define the squirrel sprite.
		 */
		Crafty.sprite(32, "image/squirrel.png", {
			squirrel: sprite.forward_rest
		});
		
		/**
		 *	Define the game's player.
		 */
		GAME.player = Crafty.e("2D, DOM, squirrel, gravity, controls, twoway, collision, animate, score, persist, hit, player");
			
		/**
		 *	Configure the player.
		 */
		GAME.player
			/**
			 *	Generic player configuration.
			 */
			.attr({
				y: GAME.height - 26,
				x: 32,
				z: LAYERS.player,
				facing: FACING.forward,
				w: 32,
				h: 26
			})
			.gravity("floor")
			.twoway(player_state.current_run_speed, player_state.current_jump_height)
			
			/**
			 *	Player keybindings.
			 */
			.bind("keydown", function (event) {
				if (GAME.pause) {
					return;
				}
			
				switch (event.keyCode) {
				
				case Crafty.keys.D:
				case Crafty.keys.RA:
					if (this.facing !== FACING.right) {
						this.sprite.apply(this, sprite.right_run);
					}
					this.facing = FACING.right;
					break;
					
				case Crafty.keys.A:
				case Crafty.keys.LA:
					if (this.facing !== FACING.left) {
						this.sprite.apply(this, sprite.left_run);
					}
					this.facing = FACING.left;
					break;
					
				case Crafty.keys.S:
				case Crafty.keys.DA:
					this.facing = FACING.forward;
					this.sprite.apply(this, sprite.forward_rest);
					break;
				
				}
			})
			
			/**
			 *	Player changes.
			 */
			.bind("change", function (event) {
				if (this.__move.right && !this.isPlaying("move_right")) {
					this.stop();
					this.animate("move_right", 10);
				}
				
				if (this.__move.left && !this.isPlaying("move_left")) {
					this.stop();
					this.animate("move_left", 10);
				}
			})
			
			/**
			 *	The keyup event.
			 */
			.bind("keyup", function (event) {
				if (GAME.pause) {
					return;
				}
				
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
					this.sprite.apply(this, sprite.right_rest);
					break;
					
				case FACING.left:
					this.sprite.apply(this, sprite.left_rest);
					break;
					
				case FACING.forward:
					this.sprite.apply(this, sprite.forward_rest);
					break;
				
				}
				
			})
			
			/**
			 *	Animations.
			 */
			.animate.apply(GAME.player, animation.move_left)
			.animate.apply(GAME.player, animation.move_right)
			.animate.apply(GAME.player, animation.rest_forward)
			.animate.apply(GAME.player, animation.rest_left)
			.animate.apply(GAME.player, animation.rest_right)
			
			/**
			 *	Om nom nom nom nom nom nom.
			 */
			.bind("om-nom-nom", function () {
				if (introduction.enabled && 
						!introduction.acorn_eaten) {
					introduction.acorn_eaten = true;
					acornMeterIntroduction();
				}
				
				var percent = Math.round((this.cheeks / GAME.max_nom_nom) * 100);
				
				$("#acorn-progress-bar").css("width", percent + "%");
				
				if (percent === 100) {
					flashProgressBar();
				}
			});
			
		/**
		 *	Render an animation every so often, to make the squirrel move.
		 */
		setInterval(function () {
			var player = GAME.player;
			
			if (!player.__move.up &&
					!player.__move.autumning &&
					!player.__move.left &&
					!player.__move.right) {
				
				switch (player.facing) {
				
				case FACING.right:
					player.animate("rest_right", 80);
					break;
					
				case FACING.left:
					player.animate("rest_left", 80);
					break;
					
				case FACING.forward:
					player.animate("rest_forward", 80);
					break;
				
				}
				
			}
		}, 5e3);
	}
	
	/**
	 *	Generate an acorn.
	 *
	 *	@param x		The horizontal offset.
	 *
	 *	@param y		The vertical offset.
	 *
	 *	@param autumnen	True if gravity should effect the acorn.
	 */
	function generateAcorn(x, y, autumnen) {
		var acorn_item = Crafty.e("2D, DOM, image, hit, collision")
			.attr({
				x: x,
				y: y, 
				w: 20,
				h: 20,
				z: LAYERS.background
			})
			.image("image/acorn.png", "no-repeat")
			.collision()
			.onhit("player", function () {
				if (GAME.player.eatAcorn()) {
					this.destroy();
				}
			});
			
		if (autumnen) {
			acorn_item.addComponent("gravity");
			acorn_item.gravity("floor");
		}
		
		return acorn_item;
	}
	
	/**
	 *	Generate acorn pile
	 *
	 *	@param x		The horizontal offset.
	 *
	 *	@param y		The vertical offset.
	 */
	function generateAcornPile(x, y) {
		return acorn_item = Crafty.e("2D, DOM, image, hit, collision, gravity")
			.attr({
				x: x,
				y: GAME.floor - y - 54, 
				w: 54,
				h: 54,
				z: LAYERS.background
			})
			.image("image/acorn-pile.png", "no-repeat")
			.collision()
			.onhit("player", function () {
				if (GAME.player.eatAcorn(GAME.max_nom_nom)) {
					GAME.player.trigger("om-nom-nom-pile");
					console.log("eh?");
					this.destroy();
				}
			})
			.gravity("floor");
	}
	
	/**
	 *	Generate golden acorn.
	 *
	 *	@param x		The horizontal offset.
	 *
	 *	@param y		The vertical offset.
	 */
	function generateGoldenAcorn(x, y) {
		return acorn_item = Crafty.e("2D, DOM, image, hit, collision, gravity")
			.attr({
				x: x,
				y: GAME.floor - y - 20, 
				w: 20,
				h: 20,
				z: LAYERS.background
			})
			.image("image/golden-acorn.png", "no-repeat")
			.collision()
			.onhit("player", function () {
				GAME.player.eatGoldenAcorn();
				this.destroy();
			})
			.gravity("floor");
	}
	
	/**
	 *	Generate coffee
	 *
	 *	@param x		The horizontal offset.
	 *
	 *	@param y		The vertical offset.
	 */
	function generateCoffee(x, y) {
		return acorn_item = Crafty.e("2D, DOM, image, hit, collision, gravity")
			.attr({
				x: x,
				y: y - 45, 
				w: 48,
				h: 41,
				z: LAYERS.background
			})
			.image("image/coffee-cup.png", "no-repeat")
			.collision()
			.onhit("player", function () {
				GAME.player.drinkCoffee()
				this.destroy();
			})
			.gravity("floor");
	}
	
	/**
	 *	Generate a random tree.
	 *
	 *	@param x		The horizontal offset.
	 *
	 *	@param acorns	Should acorns be generated. Default true.
	 *
	 *	@param season	Optional season override.
	 */
	function generateTree(x, acorns, season) {
		Crafty.e("2D, DOM, tree, tree_" + season || GAME.season)
			.attr({
				x: x,
				y: GAME.floor - 130, 
				w: 82,
				h: 133
			});
			
		var count = 0;
			
		if (acorns) {
			switch (season || GAME.season) {
			
			case "spring":
				count = Crafty.randRange(0, 5);
				break;
				
			case "summer":
				count = Crafty.randRange(0, 4);
				break;
				
			case "autumn":
				count = Crafty.randRange(0, 2);
				break;
				
			case "winter":
				count = Crafty.randRange(0, 1);
				break;
			
			}
			
			console.log(count)
		}
	}
	
	/**
	 *	Generate the home tree.
	 */
	function generateHome() {
		Crafty.e("2D, DOM, image")
			.attr({
				x: -85,
				y: GAME.floor - 150, 
				w: 190,
				h: 165
			})
			.image("image/tree-home.png", "no-repeat");
			
		generateScreenBarrier("left", function () {
			GAME.player.x = this.x + 10;
			
			if (GAME.player.cheeks > 0) {
				GAME.player.incrementScore(GAME.player.cheeks);
            	$("#score").text(GAME.player._score);
            	GAME.player.cheeks = 0;
            	$("#acorn-progress-bar").css("width", "0%");
            	player_state.acorn_cheeks_debuff = 0;
				updatePlayerMovement();
			}
		});
	}
	
	/**
	 *	Generate a platform.
	 *
	 *	@param w	The width.
	 *
	 *	@param x	The x position.
	 *
	 *	@param y	The y position.
	 */
	function generatePlatform(w, x, y) {
		var barrier = Crafty.e("barrier, DOM, image")
			.barrier(x, GAME.floor - y - 25, w, 25)
			.image("image/tile-ground.png", "repeat-x");
		
		barrier.north.addComponent("floor");
	}
	
	/**
	 *	Generate a screen progression collision object.
	 *
	 *	@param x		Horizontal offset.
	 *
	 *	@param scene	The scene to transition to on collision.
	 *
	 *	@param side		The side to reorient the player on.
	 *
	 *	@param y		Vertical offset. Defaults to 0.
	 *
	 *	@param h		The height. Defaults to screen height.
	 */
	function generateSceneProgression(x, scene, side, y, h) {
		if (x === 0) {
			x = 10;
		}
	
		Crafty.e("2D, hit, collision, DOM, color")//@debug: DOM,color
			.attr({
				x: x - 10,
				y: y || -100,
				w: 10,
				h: h || GAME.height + 100
			})
			.color("#F00")//@debug
			.collision()
			.onhit("player", function () {
				Crafty.scene(scene);
				
				switch (side) {
				
				case "right":
					resetPlayer("right");
					break;
					
				case "tree":
					GAME.player.x = 52;
					GAME.player.y = GAME.floor - 100;
					break;
					
				default:
					resetPlayer();
					break;
				
				}
			});
	}
	
	/**
	 *	Generate a screen barrier.
	 *
	 *	@param side	The side of the screen to put the barrier on. Default is left.
	 *
	 *	@return	The screen barrier.
	 */
	function generateScreenBarrier(side, onhit) {
		if (side !== "left" &&
				side !== "right") {
			side = "left";		
		}
	
		return Crafty.e("2D, hit, collision, DOM, color")//@debug: DOM,color
			.attr({
				x: side === "left" ? 0 : GAME.width - 10,
				y: -75,
				w: 10,
				h: GAME.height + 75
			})
			.color("#0F0")//@debug
			.collision()
			.onhit("player", onhit || function () {
				if (side === "left") { 
					GAME.player.x = this.x + 10;
				} else {
					GAME.player.x = this.x - 32;
				}
			});
	}
	
	/**
	 *	Generate the world.
	 */
	function genesis() {
		Crafty.background("url(image/background.jpg) no-repeat 0 -15px");
		
		generateFloor();
		generatePlayer();
		updatePlayerMovement();
		GAME.player.animate("rest_forward", 80);
	}
	
	//------------------------------
	//  State management
	//------------------------------
	
	/**
	 *	Destroy the title screen assets.
	 */
	function destroyTitleAssets() {
		$("#title-screen").hide();
	}
	
	/**
	 *	Destroy the introduction assets.
	 */
	function destroyIntroductionAssets() {
		$(".introduction-asset").hide();
	}
	
	/**
	 *	Reset the player location.
	 *
	 *	@param side	"left" or "right". Default is left.
	 */
	function resetPlayer(side) {
		if (side !== "left" &&
				side !== "right") {
			side = "left";		
		}
		
		GAME.player.x = side === "left" ? 32 : GAME.width - 62;
	}
	
	/**
	 *	Initialize the game screen.
	 *
	 *	@param timer	The total time for this session.
	 */
	function initializeGame(time) {
		$("#score, #acorn-meter, #golden-acorn-meter, #coffee-meter").show();
		destroyTitleAssets();
		resetPlayer();
	}
	
	//------------------------------
	//  Scene creation
	//------------------------------

	/**
	 *	The title screen.
	 */
	Crafty.scene("title", function() {
		GAME.initialized = false;
		
		generateScreenBarrier();
	
		generatePlatform(GAME.width - 200, 200, GAME.floor - 50);
		generatePlatform(GAME.width - 300, 300, GAME.floor - 125);
		generatePlatform(GAME.width - 400, 400, GAME.floor - 200);
		generatePlatform(GAME.width - 500, 500, GAME.floor - 275);
	
		generateSceneProgression(GAME.width, "introduction", "tree", GAME.floor - 50, 50);
		generateSceneProgression(GAME.width, "spring", "tree", GAME.floor - 125, 50);
		generateSceneProgression(GAME.width, "summer", "tree", GAME.floor - 200, 50);
		generateSceneProgression(GAME.width, "autumn", "tree", GAME.floor - 275, 50);
		generateSceneProgression(GAME.width, "winter", "tree", GAME.floor - 400, 100);
		
		$("#title-screen").show();
	});
	
	Crafty.scene("introduction-tree", function () {
		destroyTitleAssets();
		destroyIntroductionAssets();
		
		if (!introduction.enabled) {
			GAME.initialized = true;
			introduction.enabled = true;
		}
		
		$("#introduction-tree, #introduction-next").show();
		
		generateHome();
		generateSceneProgression(GAME.width, "introduction-acorn");
	});
	
	Crafty.scene("introduction-acorn", function () {
		destroyIntroductionAssets();
		
		generateSceneProgression(0, "introduction-tree", "right");
		generateSceneProgression(GAME.width, "introduction-buffs", "left");
		
		if (introduction.acorn_eaten) {
			$("#introduction-acorn-meter, #introduction-next, #introduction-prev").show();
		} else {
			$("#introduction-acorn, #score, #introduction-next, #introduction-prev").show();
			
			if (!introduction.acorn_generated) {
				introduction.acorn_generated = true;
				generateAcorn(130, 65, true).attr({z: 150});
			}
		}
	});
	
	Crafty.scene("introduction-buffs", function () {
		destroyIntroductionAssets();
		
		generateSceneProgression(0, "introduction-acorn", "right");
		generateSceneProgression(GAME.width, "introduction-season", "left");
		
		$("#introduction-next, #introduction-prev").show();
		
		generatePlatform(125, (GAME.width / 2) - 63, 35);
		
		generatePlatform(75, 50, 180);
		generatePlatform(125, (GAME.width / 2) - 63, 130);

		if (!introduction.powerups_generated) {
			introduction.powerups_generated = true;
			
			$("#introduction-buffs").show();
			
			GAME.player.bind("om-nom-nom-pile", function () {
				if (!introduction.eaten_pile) {
					introduction.eaten_pile = true;
					destroyIntroductionAssets();
					$("#introduction-buff-acorn-pile, #acorn-meter").show();
				}
				
				GAME.player.unbind("om-nom-nom-pile", this);
			});
			
			GAME.player.bind("bling-nom-nom", function () {
				if (!introduction.golden_acorn) {
					introduction.golden_acorn = true;
					destroyIntroductionAssets();
					$("#introduction-buff-golden-acorn, #golden-acorn-meter").show();
				}
				
				GAME.player.unbind("bling-nom-nom", this);
			});
			
			GAME.player.bind("coffee-coffee-coffee", function () {
				if (!introduction.drink_coffee) {
					introduction.drink_coffee = true;
					destroyIntroductionAssets();
					$("#introduction-buff-coffee, #coffee-meter").show();
				}
				
				GAME.player.unbind("coffee-coffee-coffee", this);
			});
		}
		
		if (!introduction.eaten_pile) {
			generateAcornPile((GAME.width / 2) - 27, 35);
		}
		
		if (!introduction.drink_coffee) {
			generateCoffee(65, 180);
		}
		
		if (!introduction.golden_acorn) {
			generateGoldenAcorn((GAME.width / 2) - 10, 145);
		}
	});
	
	Crafty.scene("introduction-season", function () {
		destroyIntroductionAssets();
		
		$("#introduction-season, #introduction-season-times, #introduction-next, #introduction-prev").show();
		
		generateTree(125, true, "spring");
		generateTree(250, true, "summer");
		generateTree(375, true, "autumn");
		generateTree(500, true, "winter");
		
		generateSceneProgression(0, "introduction-buffs", "right");
		generateSceneProgression(GAME.width, "introduction-burrow", "left");
	});
	
	Crafty.scene("spring", function () {
		initializeGame();
		generateScreenBarrier();
		generateScreenBarrier("right");
	});
	
	Crafty.scene("summer", function () {
		initializeGame();
		generateScreenBarrier();
		generateScreenBarrier("right");
	});
	
	Crafty.scene("autumn", function () {
		initializeGame();
		generateScreenBarrier();
		generateScreenBarrier("right");
	});
	
	Crafty.scene("winter", function () {
		initializeGame();
		generateScreenBarrier();
		generateScreenBarrier("right");
	});
	
	//------------------------------
	//
	//	Startup
	//
	//------------------------------
	
	window.GAME = GAME;

	$(function () {
		Crafty.init(GAME.fps, GAME.width, GAME.height);
		Crafty.canvas();
		
		defineComponents();
		genesis();
		
		Crafty.scene("introduction-season");
	});
	
}(jQuery));