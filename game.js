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
			 *	Is the game over?
			 */
			over: false,
			
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
			max_nom_nom: 25,
			
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
			coffee_run_buff: 5,
			
			/**
			 *	The scene acting as home tree.
			 */
			home_tree_scene: undefined,
			
			/**
			 *	The timer object.
			 */
			timer: undefined,
			
			/**
			 *	The current scene.
			 */
			current_scene: undefined,
			
			/**
			 *	The burrow return scene.
			 */
			burrow_destination: undefined
		},
		
		/**
		 *	A map of scenes.
		 */
		SCENE_DEFINITION = {},
		
		/**
		 *	The current scene the player is in.
		 */
		CURRENT_SCENE = 0,
		
		/**
		 *	A collection of acorn IDs to their consumed status
		 */
		CONSUMED = {},
		
		/**
		 *	Unique ID for acorns.
		 */
		UID = 0,

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
			base_run_speed: 4,
			
			/**
			 *	The current player run speed.
			 */
			current_run_speed: 4,
			
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
			eaten_pile: false,
			burrow_bound: false,
			burrow_used: false,
			acorn_bound: false
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
		$("#coffee-meter").css("opacity", 1);
		$("#coffee-progress-bar").stop().css("width", "100%").animate({
			width: 0
		}, 
		
			1e4,
			
			function () {
				$("#coffee-meter").css("opacity", 0.25);
			});
		
		drainCoffeeBuff();
	}
	
	/**
	 *	Handle the golden acorn.
	 */
	function goldenAcornMeter () {
		$("#golden-acorn-meter").css("opacity", 1);
		$("#golden-acorn-progress-bar").stop().css("width", "100%").animate({
			width: 0
		}, 
		
			1e4, 
			
			function () {
				$("#golden-acorn-meter").css("opacity", 0.25);
				player_state.golden_acorn_jump_buff = 1;
				updatePlayerMovement();
			});
		
		updatePlayerMovement();
	}
	
	//------------------------------
	//  System setup
	//------------------------------
	
	/**
	 *	Define reusable components.
	 */
	function defineComponents() {
		//	Override twoway to add in pause functionality.
		Crafty.components().twoway.twoway = function(speed, jump) {
			if (speed) {
				this._speed = speed;
			}
			
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
					this._falling = true;
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
			
			/**
			 *	Eat acorns.
			 *
			 *	@param fill	Should the cheeks be filled if possible?
			 */
			eatAcorn: function (fill) {
				var acorns = 1;
			
				if (fill) {
					if (GAME.max_nom_nom === this.cheeks) {
						return false;
					}
					
					acorns = GAME.max_nom_nom - this.cheeks;
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
			},
			
			/**
			 *	Drink a cup of coffee.
			 */
			drinkCoffee: function () {
				player_state.coffee_run_buff = GAME.coffee_run_buff;
				
				this.trigger("coffee-coffee-coffee");
				
				coffeeMeter();
			},
			
			/**
			 *	Burrow home.
			 *
			 *	@param burrow	The burrow being used.
			 */
			burrow: function (burrow) {
				if (burrow === false) {
					return;
				}
			
				GAME.pause = true;
				this.trigger("dig-dug");
				
				var destination;
				
				if (introduction.enabled) {
					if (GAME.current_scene === GAME.home_tree_scene) {
						destination = GAME.burrow_destination;
					} else {
						GAME.burrow_destination = GAME.current_scene;
						destination = GAME.home_tree_scene;
					}
				} else {
					if (GAME.current_scene === GAME.home_tree_scene) {
						CURRENT_SCENE = GAME.burrow_destination
						destination = "generic";
					} else {
						GAME.burrow_destination = CURRENT_SCENE;
						destination = GAME.home_tree_scene;
					}
				}
				
				GAME.current_scene = destination;
				Crafty.scene(destination);
				
				GAME.pause = false;
			}
		});

		Crafty.sprite(133, __CONFIG.images.trees, {
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
		
		$("#acorn-meter, #introduction-next, #introduction-prev").show();
		
		if (GAME.current_scene === "introduction-acorn") {
			$("#introduction-acorn-meter").show();
		}
	}
	
	/**
	 *	Eat the acorn in the intro.
	 */
	function introEatAcorn() {
		if (introduction.enabled && !introduction.acorn_eaten) {
			introduction.acorn_eaten = true;
			acornMeterIntroduction();
		}
		
		GAME.player.unbind("om-nom-nom", introEatAcorn);
	}
	
	/**
	 *	Eat an acorn pile in the intro.
	 */
	function introEatPile() {
		if (introduction.enabled && !introduction.eaten_pile) {
			introduction.eaten_pile = true;
			destroyIntroductionAssets();
			$("#introduction-buff-acorn-pile, #acorn-meter").show();
		}
		
		GAME.player.unbind("om-nom-nom-pile", introEatPile);
	}
	
	/**
	 *	Eat a golden acorn in the intro.
	 */
	function introGoldenAcorn() {
		if (introduction.enabled && !introduction.golden_acorn) {
			introduction.golden_acorn = true;
			destroyIntroductionAssets();
			$("#introduction-buff-golden-acorn, #golden-acorn-meter").show();
		}
		
		GAME.player.unbind("bling-nom-nom", introGoldenAcorn);
	}
	
	/**
	 *	Drink coffee in the intro.
	 */
	function introDrinkCoffee() {
		if (introduction.enabled && !introduction.drink_coffee) {
			introduction.drink_coffee = true;
			destroyIntroductionAssets();
			$("#introduction-buff-coffee, #coffee-meter").show();
		}
		
		GAME.player.unbind("coffee-coffee-coffee", introDrinkCoffee);
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
	
	/**
	 *	Clear out your cheeks.
	 */
	function clearCheeks() {
		GAME.player.cheeks = 0;
    	$("#acorn-progress-bar").css("width", "0%");
    	player_state.acorn_cheeks_debuff = 0;
		updatePlayerMovement();
	}
	
	/**
	 *	Generate a safe burp location.
	 *
	 *	@return	The burp object.
	 */
	function safeBurp(use_uid) {
		var x = 1 * GAME.player._x,
			burp = {
				x: 0,
				y: GAME.player._y + 26,
				uid: use_uid ? UID++ : undefined
			};
			
		console.log(burp.y, GAME.player._y, GAME.floor - burp.y - 54)
		
		if (x + 54 > GAME.width - 15) {
			x -= 54;
		} else if (x - 54 < 15) {
			x += 54;
		} else if (GAME.player.facing === FACING.right) {
			x += 54;
		} else {
			x -= 54;
		}
		
		burp.x = x;
		
		return burp;	
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
			.image(__CONFIG.images.ground, "repeat-x");
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
		Crafty.sprite(32, __CONFIG.images.squirrel, {
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
				if (GAME.over && event.keyCode === Crafty.keys.ENT) {
					restartGame();
					return;
				}
				
				if (GAME.pause) {
					return;
				}
				
				var burp;
			
				switch (event.keyCode) {
				
				case Crafty.keys.SP:
					this.burrow(this.hit("burrow"));
					break;
					
				case Crafty.keys.C:
					if (this.cheeks === GAME.max_nom_nom) {
						clearCheeks();
						this.drinkCoffee();
					}
					break;
					
				case Crafty.keys.G:
					if (this.cheeks === GAME.max_nom_nom) {
						clearCheeks();
						this.eatGoldenAcorn();
					}
					break;
					
				case Crafty.keys.B:
					if (this.cheeks === GAME.max_nom_nom) {
						clearCheeks();
						
						if (SCENE_DEFINITION[CURRENT_SCENE] === undefined) {
							burp = safeBurp(false);
						} else {
							burp = safeBurp(true);
							SCENE_DEFINITION[CURRENT_SCENE].piles.push(burp);
						}
						
						generateAcornPile(burp.x, burp.y, burp.uid);
					}
					break;
				
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
	 *	@param fallen	True if gravity should effect the acorn.
	 *
	 *	@param uid		An optional UID for the acorn.
	 */
	function generateAcorn(x, y, fallen, uid) {
		var acorn_item = Crafty.e("2D, DOM, image, hit, collision")
			.attr({
				x: x,
				y: y, 
				w: 20,
				h: 20,
				z: LAYERS.background,
				uid: uid
			})
			.image(__CONFIG.images.acorn, "no-repeat")
			.collision()
			.onhit("player", function () {
				if (GAME.player.eatAcorn()) {
					CONSUMED[this.uid] = true;
					this.destroy();
				}
			});
			
		if (fallen) {
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
	 *
	 *	@param uid		An optional UID.
	 */
	function generateAcornPile(x, y, uid) {
		return Crafty.e("2D, DOM, image, hit, collision, gravity")
			.attr({
				x: x,
				y: y - 54, 
				w: 54,
				h: 54,
				z: LAYERS.background,
				uid: uid
			})
			.image(__CONFIG.images.acorn_pile, "no-repeat")
			.collision()
			.onhit("player", function () {
				if (GAME.player.cheeks < GAME.max_nom_nom) {
					if (GAME.player.eatAcorn(true)) {
						GAME.player.trigger("om-nom-nom-pile");
						CONSUMED[this.uid] = true;
						this.destroy();
					}
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
	 *
	 *	@param uid		An optional UID.
	 */
	function generateGoldenAcorn(x, y, uid) {
		return Crafty.e("2D, DOM, image, hit, collision, gravity")
			.attr({
				x: x,
				y: GAME.floor - y - 20, 
				w: 20,
				h: 20,
				z: LAYERS.background,
				uid: uid
			})
			.image(__CONFIG.images.golden_acorn, "no-repeat")
			.collision()
			.onhit("player", function () {
				GAME.player.eatGoldenAcorn();
				CONSUMED[this.uid] = true;
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
	 *
	 *	@param uid		An optional UID.
	 */
	function generateCoffee(x, y, uid) {
		return Crafty.e("2D, DOM, image, hit, collision, gravity")
			.attr({
				x: x,
				y: y - 45, 
				w: 48,
				h: 41,
				z: LAYERS.background,
				uid: uid
			})
			.image(__CONFIG.images.coffee_cup, "no-repeat")
			.collision()
			.onhit("player", function () {
				GAME.player.drinkCoffee();
				CONSUMED[this.uid] = true;
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
	 *
	 *	@param position	Should the acorns be just positioned?
	 *
	 *	@return	The acorn object data.
	 */
	function generateTree(x, acorns, season, position) {
		season = season || GAME.season;
	
		if (!position) {
			Crafty.e("2D, DOM, tree, tree_" + season || GAME.season)
				.attr({
					x: x,
					y: GAME.floor - 130, 
					w: 82,
					h: 133
				});		
		}
			
		var count = 0,
		
			index = 0,
			
			acorn_x,
			
			acorn_y,
			
			y = GAME.floor - 130,
			
			acorn_data = [],
			
			acorn;
			
		if (acorns) {
			switch (season) {
			
			case "spring":
				count = Crafty.randRange(1, 5);
				break;
				
			case "summer":
				count = Crafty.randRange(1, 4);
				break;
				
			case "autumn":
				count = Crafty.randRange(0, 2);
				break;
				
			case "winter":
				count = Crafty.randRange(0, 1);
				break;
			
			}
			
			for (; index < count; index++) {
				acorn_x = x + Crafty.randRange(0, 80);
				acorn_y = y + Crafty.randRange(0, 130);
				
				acorn = {
					uid: UID++,
					x: acorn_x,
					y: acorn_y,
					gravity: acorn_y > y + 100 || (acorn_y < y + 37 && (acorn_x < x + 20 || acorn_x > x + 55))
				};
				
				acorn_data.push(acorn);
				
				if (!position) {
					generateAcorn(acorn.x, acorn.y, acorn.gravity, acorn.uid);
				}
			}
		}
		
		return acorn_data;
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
			.image(__CONFIG.images.home_tree, "no-repeat");
			
		generateScreenBarrier("left", function () {
			GAME.player.x = this.x + 10;
			
			if (GAME.player.cheeks > 0) {
				GAME.player.incrementScore(GAME.player.cheeks);
            	$("#score").text(GAME.player._score);
            	clearCheeks();
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
			.image(__CONFIG.images.ground, "repeat-x");
		
		barrier.north.addComponent("floor");
	}
	
	/**
	 *	Generate a burrow.
	 *
	 *	@param x	The x position.
	 */
	function generateBurrow(x) {
		return Crafty.e("2D, DOM, image, burrow")
			.attr({
				x: x,
				y: GAME.height - 45, 
				w: 89,
				h: 42,
				z: LAYERS.foreground
			})
			.image(__CONFIG.images.burrow, "no-repeat");
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
	 *	@param ordinal	Should the scene ordinal be inc/decremented. Default is false.
	 *
	 *	@param y		Vertical offset. Defaults to 0.
	 *
	 *	@param h		The height. Defaults to screen height.
	 */
	function generateSceneProgression(x, scene, side, ordinal, y, h) {
		if (x === 0) {
			x = 10;
		}
	
		Crafty.e("2D, hit, collision")//@debug: DOM,color
			.attr({
				x: x - 10,
				y: y || -400,
				w: 10,
				h: h || GAME.height + 400
			})
			//.color("#F00")//@debug
			.collision()
			.onhit("player", function () {
				if (ordinal) {
					if (side === "right") {
						CURRENT_SCENE -= 1;
					} else {
						CURRENT_SCENE += 1;
					}
				}
				
				GAME.current_scene = scene;
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
	
		return Crafty.e("2D, hit, collision")//, DOM, color")//@debug: DOM,color
			.attr({
				x: side === "left" ? 0 : GAME.width - 10,
				y: -75,
				w: 10,
				h: GAME.height + 75
			})
			//.color("#0F0")//@debug
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
		Crafty.background("url(" + __CONFIG.images.background + "?_=" + (new Date()).valueOf().toString() + ") no-repeat 0 -15px");
		
		snowStorm.targetElement = "viewport-wrapper";
		snowStorm.zIndex = 800;
		snowStorm.flakesMaxActive = 96; 
		snowStorm.useTwinkleEffect = true;
		
		generateFloor();
		generatePlayer();
		updatePlayerMovement();
		GAME.player.animate("rest_forward", 80);
	}
	
	//------------------------------
	//  Seasons
	//------------------------------
	
	/**
	 *	Set the current season.
	 *
	 *	@param season	The current season.
	 */
	function setSeason(season) {
		GAME.season = season;
		
		var title = $("#season-title-" + season);
		
		title.fadeIn(750, function () {
			title.fadeOut(2500);
		});
		
		if (season === "winter") {
			setTimeout(function (){snowStorm.toggleSnow();}, 0);
		} else {
			setTimeout(function () {
				switch (season) {
				
				case "spring":
					setSeason("summer");
					break;
					
				case "summer":
					setSeason("autumn");
					break;
					
				case "autumn":
					setSeason("winter");
					break;
		
				}
			}, 9e4);
		}
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
	 *	Restart the game.
	 */
	function restartGame() {
		if (snowStorm.active) {
			snowStorm.toggleSnow();
		}
		
		resetPlayer();
		
		Crafty.scene("title");
		
		$("#end-screen").hide();
	}
	
	/**
	 *	Expire the time.
	 */
	function timeUp() {
		GAME.pause = true;
		GAME.over = true;
		GAME.timer = undefined;
		
		$("#total-score").text(GAME.player._score);
		$("#end-screen").show();
	}
	
	/**
	 *	Generate the next screen.
	 */
	function generateNextScreen () {
		generateScreenBarrier("right");
	}
	
	/**
	 *	Initialize the game screen.
	 *
	 *	@param timer	The total time for this session, in seconds.
	 */
	function initializeGame(time) {
		$("#score, #acorn-meter").show();
		$("#golden-acorn-meter, #coffee-meter").show().css("opacity", 0.25);
		
		if (snowStorm.active) {
			snowStorm.toggleSnow();
		}
		
		SCENE_DEFINITION = {};
		CURRENT_SCENE = 0;
		
		CONSUMED = {};
		UID = 0;
		
		GAME.timer = "#timer";
		
		$(GAME.timer).clock({
			mode: $.clock.modes.countdown, 
			offset: {
				seconds: time
			}, 
			format: "p:s", 
			tare: true
		}).bind("timer", timeUp).show();
		
		GAME.home_tree_scene = "home";
		SCENE_DEFINITION[CURRENT_SCENE] = generateScene();
		
		if (SCENE_DEFINITION[CURRENT_SCENE].burrow !== undefined) {
			SCENE_DEFINITION[CURRENT_SCENE].burrow = undefined;
		}
		
		destroyTitleAssets();
		resetPlayer();
		
		renderScene(SCENE_DEFINITION[CURRENT_SCENE]);
		
		generateHome();
		generateSceneProgression(GAME.width, "generic", "left", true);
	}
	
	/**
	 *	Position a lose acorn.
	 *
	 *	@param min	Max screen height.
	 *
	 *	@param max	Max screen width.
	 *
	 *	@param y	The vertical position
	 */
	function positionLoseAcorn(min, max, y) {
		return {
				uid: UID++,
				x: Crafty.randRange(min, max),
				y: y,
				gravity: true
			}
	}
	
	/**
	 *	Generate a new scene object.
	 *
	 *	@return	A scene object.
	 */
	function generateScene() {
		var scene = {
				trees: [],
				
				acorns: [],
				
				platforms: [],
				
				piles: [],
				
				coffee: [],
				
				golden: [],
				
				burrow: undefined
			};
			
		var tree_index = 0,
		
			tree_location,
		
			acorn_index = 0,
			
			platform_index = 0,
			
			platform_location,
			
			platform_bonus;
			
		for (; tree_index <= Crafty.randRange(1, 6); tree_index++) {
			tree_location = Crafty.randRange(100, GAME.width - 100);
			scene.trees.push(tree_location);
			
			scene.acorns = scene.acorns.concat(generateTree(tree_location, true, GAME.season, true));
		}
		
		for (; acorn_index < Crafty.randRange(2, 15); acorn_index++) {
			scene.acorns.push(positionLoseAcorn(60, GAME.width - 60, 40));
		}
		
		for (; platform_index < Crafty.randRange(2, 4); platform_index++) {
			platform_location = {
				w: Crafty.randRange(75, 250),
				x: undefined,
				y: Crafty.randRange(30, 300)
			};
			
			platform_location.x = Crafty.randRange(20, GAME.width - platform_location.w);
			
			platform_bonus = Crafty.randRange(0, 100);
			
			if (platform_bonus < 15) {
				scene.piles.push({
					x: Crafty.randRange(platform_location.x, platform_location.x + platform_location.w - 27),
					y: platform_location.y,
					uid: UID++
				});
			} else if (platform_bonus < 30) {
				scene.coffee.push({
					x: Crafty.randRange(platform_location.x, platform_location.x + platform_location.w - 24),
					y: platform_location.y,
					uid: UID++
				});
			} else if (platform_bonus < 45) {
				scene.golden.push({
					x: Crafty.randRange(platform_location.x, platform_location.x + platform_location.w - 10),
					y: platform_location.y,
					uid: UID++
				});
			} else if (platform_bonus < 60) {
				scene.acorns.push(positionLoseAcorn(platform_location.x, platform_location.x + platform_location.w, platform_location.y - 20));
				scene.acorns.push(positionLoseAcorn(platform_location.x, platform_location.x + platform_location.w, platform_location.y - 20));	
			}
			
			scene.platforms.push(platform_location);
		}
		
		//	25% chance to generate a burrow
		if (Crafty.randRange(0, 100) < 25) {
			scene.burrow = {
				x: Crafty.randRange(80, GAME.width - 80)
			};
		}
	
		return scene;
	}
	
	/**
	 *	Process the recovery of consumables.
	 *
	 *	@param consumables	A collection of consumables to process.
	 *
	 *	@param method		The generator for this consumable.
	 *
	 *	@return	The unconsumed consumables rendered.
	 */
	function recoverConsumable(consumables, method) {
		var data = [];
		
		$.each(consumables, function (index, consumable) {
			if (CONSUMED[consumable.uid]) {
				return;
			}
			
			data.push(consumable);
			method.call(method, consumable.x, consumable.y, consumable.uid);
		});
		
		return data;
	}
	
	/**
	 *	Render the given scene.
	 *
	 *	@param scene	The scene object to render.
	 */
	function renderScene(scene) {
		var acorn_data = [];
	
		$.each(scene.trees, function (index, tree) {
			generateTree(tree);
		});
		
		$.each(scene.platforms, function (index, platform) {
			generatePlatform(platform.w, platform.x, platform.y);
		});
			
		$.each(scene.acorns, function (index, acorn) {
			if (CONSUMED[acorn.uid]) {
				return;
			}
			
			acorn_data.push(acorn);
			generateAcorn(acorn.x, acorn.y, acorn.gravity, acorn.uid);
		});
		
		scene.piles = recoverConsumable(scene.piles, generateAcornPile);
		scene.coffee = recoverConsumable(scene.coffee, generateCoffee);
		scene.golden = recoverConsumable(scene.golden, generateGoldenAcorn);
		
		if (scene.burrow !== undefined) {
			if (CONSUMED[scene.burrow.uid]) {
				scene.burrow = undefined;
			} else {
				generateBurrow(scene.burrow.x);
			}
		}
		
		scene.acorns = acorn_data;
	}
	
	//------------------------------
	//  Scene creation
	//------------------------------

	/**
	 *	The title screen.
	 */
	Crafty.scene("title", function() {
		GAME.initialized = false;
		introduction.enabled = false;
		GAME.home_tree_scene = undefined;
		GAME.burrow_destination = undefined;
		destroyIntroductionAssets();
		GAME.over = false;
		GAME.pause = false;
		GAME.player._score = 0;
		
		//	Reset game
		$("#acorn-meter, #golden-acorn-meter, #coffee-meter, #timer").hide();
		GAME.player.cheeks = 0;
		$("#score").hide().text(0);
		player_state.coffee_run_buff = 0;
		player_state.acorn_cheeks_debuff = 0;
		player_state.golden_acorn_jump_buff = 1;
		$("#golden-acorn-progress-bar, #coffee-progress-bar").stop().css("width", "0%");
		updatePlayerMovement()
		
		if (GAME.timer !== undefined) {
			$.clock(GAME.timer).destroy();
			GAME.timer = undefined;
		}
		
		generateScreenBarrier();
	
		generatePlatform(GAME.width - 200, 200, 50);
		generatePlatform(GAME.width - 300, 300, 125);
		generatePlatform(GAME.width - 400, 400, 200);
		generatePlatform(GAME.width - 500, 500, 275);
	
		generateSceneProgression(GAME.width, "introduction-tree", "tree", false, GAME.floor - 50, 50);
		generateSceneProgression(GAME.width, "spring", "tree", false, GAME.floor - 125, 50);
		generateSceneProgression(GAME.width, "summer", "tree", false, GAME.floor - 200, 50);
		generateSceneProgression(GAME.width, "autumn", "tree", false, GAME.floor - 275, 50);
		generateSceneProgression(GAME.width, "winter", "tree", false, GAME.floor - 400, 100);
		
		$("#title-screen").show();
	});
	
	Crafty.scene("home", function () {
		generateHome();
		generateSceneProgression(GAME.width, "generic", "left", true);
		CURRENT_SCENE = 0;
		
		if (SCENE_DEFINITION[CURRENT_SCENE].burrow === undefined &&
				GAME.burrow_destination !== undefined) {
			SCENE_DEFINITION[CURRENT_SCENE].burrow = {x: GAME.width / 2};
		}
		
		renderScene(SCENE_DEFINITION[CURRENT_SCENE]);
	}); 
	
	Crafty.scene("generic", function () {
	
		if (SCENE_DEFINITION[CURRENT_SCENE] === undefined) {
			SCENE_DEFINITION[CURRENT_SCENE] = generateScene();
		}
		
		renderScene(SCENE_DEFINITION[CURRENT_SCENE]);
	
		if (CURRENT_SCENE === 1) {
			generateSceneProgression(0, "home", "right");
		} else {
			generateSceneProgression(0, "generic", "right", true);
		}
		generateSceneProgression(GAME.width, "generic", "left", true);
	});
	
	Crafty.scene("introduction-tree", function () {
		destroyTitleAssets();
		destroyIntroductionAssets();
		
		if (!introduction.enabled) {
			$.each(introduction, function (key) {
				introduction[key] = false;
			});
			GAME.initialized = true;
			introduction.enabled = true;
			GAME.home_tree_scene = "introduction-tree";
		}
		
		generateHome();
		
		if (introduction.burrow_used) {
			$("#introduction-burrow-return, #introduction-next").show();
			generateSceneProgression(GAME.width, "introduction-acorn");
			generateBurrow(GAME.width / 2);
		} else {
			$("#introduction-tree, #introduction-next").show();
			generateSceneProgression(GAME.width, "introduction-acorn");
		}
	});
	
	Crafty.scene("introduction-acorn", function () {
		destroyIntroductionAssets();
		
		generateSceneProgression(0, "introduction-tree", "right");
		generateSceneProgression(GAME.width, "introduction-buffs", "left");

		if (!introduction.acorn_bound) {
			introduction.acorn_bound = true;
			GAME.player.bind("om-nom-nom", introEatAcorn);		
		}
		
		generatePlatform(75, 300, 35);
		
		if (introduction.acorn_eaten) {
			$("#introduction-acorn-meter, #introduction-next, #introduction-prev").show();
		} else {
			$("#introduction-acorn, #score, #introduction-next, #introduction-prev").show();
			generateAcorn(325, GAME.floor - 70, true).attr({z: 150});
		}
	});
	
	Crafty.scene("introduction-buffs", function () {
		destroyIntroductionAssets();
		
		generateSceneProgression(0, "introduction-acorn", "right");
		generateSceneProgression(GAME.width, "introduction-season", "left");
		
		$("#introduction-next, #introduction-prev").show();
		
		generatePlatform(75, 100, 45);
		generatePlatform(75, 300, 45);
		generatePlatform(75, 500, 45);

		if (!introduction.powerups_generated) {
			introduction.powerups_generated = true;
			
			$("#introduction-buffs").show();
			
			GAME.player.bind("coffee-coffee-coffee", introDrinkCoffee);
			GAME.player.bind("om-nom-nom-pile", introEatPile);
			GAME.player.bind("bling-nom-nom", introGoldenAcorn);
		}
		
		if (!introduction.drink_coffee) {
			generateCoffee(315, GAME.floor - 45);
		}
		
		if (!introduction.eaten_pile) {
			generateAcornPile(115, GAME.floor - 45);
		}
		
		if (!introduction.golden_acorn) {
			generateGoldenAcorn(525, 60);
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
	
	Crafty.scene("introduction-burrow", function () {
		destroyIntroductionAssets();
		
		$("#introduction-start, #introduction-prev").show();
		
		if (!introduction.burrow_bound) {
			introduction.burrow_bound = true;
			GAME.player.bind("dig-dug", function () {
				if (!introduction.burrow_used) {
					introduction.burrow_used = true;
				}
				
				GAME.player.unbind("dig-dug", this);
			});		
		}
		
		generateBurrow(GAME.width / 2);
		
		generateSceneProgression(0, "introduction-season", "right");
		generateSceneProgression(GAME.width, "title", "left");
		
		if (introduction.burrow_used) {
			$("#introduction-done").show();
		} else {
			$("#introduction-burrow").show();
		}
	});
	
	Crafty.scene("spring", function () {
		setSeason("spring");
		initializeGame(360);
	});
	
	Crafty.scene("summer", function () {
		setSeason("summer");
		initializeGame(270);
	});
	
	Crafty.scene("autumn", function () {
		setSeason("autumn");
		initializeGame(180);
	});
	
	Crafty.scene("winter", function () {
		setSeason("winter");
		initializeGame(90);
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
		
		Crafty.scene("title");
	});
	
}(jQuery));