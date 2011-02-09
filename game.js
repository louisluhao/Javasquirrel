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
			player: undefined
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
			base_run_speed: 2,
			
			/**
			 *	The current player run speed.
			 */
			current_run_speed: 2,
			
			/**
			 *	The unbuffed player jump height.
			 */
			base_jump_height: 4,
			
			/**
			 *	The player run speed.
			 */
			current_jump_height: 4
		};
	
	//------------------------------
	//
	//	Internal methods
	//
	//------------------------------
	
	//------------------------------
	//  System setup
	//------------------------------
	
	/**
	 *	Define reusable components.
	 */
	function defineComponents() {
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
	}
	
	//------------------------------
	//  Player management
	//------------------------------
	
	/**
	 *	Update the player movement using the new values.
	 */
	function updatePlayerMovement() {
		GAME.player.twoway(player_state.current_run_speed, player_state.current_jump_height);
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
				jumping: false,
				falling: false,
				w: 32,
				h: 26
			})
			.gravity("floor")
			.twoway(player_state.current_run_speed, player_state.current_jump_height)
			
			/**
			 *	Player keybindings.
			 */
			.bind("keydown", function (event) {
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
			.animate.apply(GAME.player, animation.rest_right);
			
		/**
		 *	Render an animation every so often, to make the squirrel move.
		 */
		setInterval(function () {
			var player = GAME.player;
			
			if (!player.__move.up &&
					!player.__move.falling &&
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
			.barrier(x, y - 25, w, 25)
			.image("image/tile-ground.png", "repeat-x");
			
		barrier.south
			.collision()
			.onhit("player", function () {
				GAME.player.y = this.y;
			});
		
		barrier.north.addComponent("floor");
	}
	
	/**
	 *	Generate the world.
	 */
	function genesis() {
		Crafty.background("url(image/background.png)");
		
		generateFloor();
		generatePlayer();
		updatePlayerMovement();
		GAME.player.animate("rest_forward", 80);
	}
	
	//------------------------------
	//  Scene creation
	//------------------------------

	/**
	 *	The title screen.
	 */
	Crafty.scene("title", function() {
		generatePlatform(GAME.width - 200, 200, GAME.floor - 50);
		generatePlatform(GAME.width - 300, 300, GAME.floor - 125);
		generatePlatform(GAME.width - 400, 400, GAME.floor - 200);
		generatePlatform(GAME.width - 500, 500, GAME.floor - 275);
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