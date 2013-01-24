/*
 * File:    player.js
 *
 * Defines player viewpoint for rendering and does collision detection.
 *
 * Author:  Karl Kangur <karl.kangur@gmail.com>
 * Licence: WTFPL 2.0 (http://en.wikipedia.org/wiki/WTFPL)
*/

function Player(world)
{
	this.world = world;
	
	// player position is limited by Number.MAX_VALUE (1.798e308) and Number.MIN_VALUE (5e-324)
	this.position = this.world.spawn;
	this.rotation = {x: 0, y: 0, z: 0};
	this.chunk = {x: 0, z: 0};
	
	// player bounding box used for collision detection
	//    +------+
	//   /|     /|
	//  +-+----+ |
	//  | |    | | height
	//  | |    | |
	//  | +----| |
	//  |/     |/ 2*size
	//  +------+
	//    2*size
	
	this.delta = {x: 0, y: 0, z: 0};
	this.height = 1.7;
	this.size = 0.3;
	this.speed = 5;
	this.rSpeed = 2.5;
	this.velocity = 0;
	this.fallSpeed = 8;
	this.jumpSpeed = 8;
	this.acceleration = 21;
	this.gravity = true;
	this.collision = true;
	this.firstUpdate = true;
	this.lastUpdate = new Date().getTime();
	this.rotationMatrix = [];
	this.keys = {};
	this.collisionNodes = [];
	
	var player = this;
	document.onkeydown = function(event)
	{
		player.onKeyEvent(event.keyCode, true);
	}
	
	document.onkeyup = function(event)
	{
		player.onKeyEvent(event.keyCode, false);
	}
	this.joystick = new SQUARIFIC.framework.TouchControl(document.getElementById("joystick"), {pretendArrowKeys: true, mindistance: 25, middletop: 25, middleleft: 25});
	this.joystick.on("pretendKeydown", 
		function (event) {
			player.onKeyEvent(event.keyCode, true);
		}
	);
	this.joystick.on("pretendKeyup",
		function (event) {
			player.onKeyEvent(event.keyCode, false);
		}
	);
	
	this.spawn();
}

// taken from Overv's WebCraft: https://github.com/Overv/WebCraft
Player.prototype.onKeyEvent = function(keyCode, state)
{
	var key = String.fromCharCode(keyCode).toLowerCase();
	this.keys[key] = state;
	this.keys[keyCode] = state;
}

Player.prototype.spawn = function()
{
	this.position = this.world.spawn;
	this.rotation = {x: 0, y: 0, z: 0};
	this.chunk = {
		x: Math.floor(this.world.spawn.x/16),
		z: Math.floor(this.world.spawn.z/16)
	};
	this.world.mapGrid9(this.chunk.x, this.chunk.z);
}

// ############################################################ PLAYER MOVEMENT

Player.prototype.update = function()
{
	this.elapsed = (new Date().getTime()-this.lastUpdate)/1000;
	this.lastUpdate = new Date().getTime();
	
	// player rotation
	
	// [left arrow]
	if(this.keys[37])
	{
		this.rotation.y += this.rSpeed*this.elapsed;
	}
	// [right arrow]
	if(this.keys[39])
	{
		this.rotation.y -= this.rSpeed*this.elapsed;
	}
	// [up arrow] or [down arrow]
	if(this.keys[38] || this.keys[40])
	{
		// limit pitch
		dy = (this.keys[38]?1:-1)*this.elapsed*this.rSpeed;
		
		if(this.rotation.x+dy <= 1.5708 && this.rotation.x+dy >= -1.5708)
		{
			this.rotation.x += dy;
		}
		else if(this.rotation.x+dy > 1.5708 || this.rotation.x+dy < -1.5708)
		{
			this.rotation.x = (dy>0?1:-1)*1.5708;
		}
	}
	
	// update rotation trigonometry
	this.rotTrig = {
		cosx: Math.cos(this.rotation.x),
		sinx: Math.sin(this.rotation.x),
		cosy: Math.cos(this.rotation.y),
		siny: Math.sin(this.rotation.y)
	};
	
	// player movement based on player rotation
	var dx = this.speed*this.elapsed*this.rotTrig.siny;
	var dy = this.speed*this.elapsed;
	var dz = this.speed*this.elapsed*this.rotTrig.cosy;
	
	// reset movement delta
	this.delta.x = 0
	this.delta.z = 0;
	
	// without gravity stop falling
	if(!this.gravity)
	{
		this.delta.y = 0;
		this.velocity = 0;
	}
	
	// get player movement deltas with key input
	if(this.keys['w'])
	{
		this.delta.x -= dx;
		this.delta.z += dz;
	}
	if(this.keys['s'])
	{
		this.delta.x += dx;
		this.delta.z -= dz;
	}
	if(this.keys['d'])
	{
		this.delta.x += dz;
		this.delta.z += dx;
	}
	if(this.keys['a'])
	{
		this.delta.x -= dz;
		this.delta.z -= dx;
	}
	// [space]
	if(this.keys[32] && this.gravity && !this.delta.y)
	{
		this.velocity = this.jumpSpeed;
	}
	// [pg up]
	if(this.keys[33] && !this.gravity)
	{
		this.delta.y += dy;
	}
	// [pg down]
	if(this.keys[34] && !this.gravity)
	{
		this.delta.y -= dy;
	}
	
	// gravity and terminal velocity
	if(this.gravity && this.velocity > -this.fallSpeed)
	{
		this.velocity -= this.acceleration * this.elapsed;
	}
	if(this.gravity && this.velocity < -this.fallSpeed)
	{
		this.velocity = -this.acceleration;
	}

	this.delta.y = this.velocity * this.elapsed;

	if (this.firstUpdate) {
		// collision detection doesn't seem to work on the first update
		this.delta.y = 0;
		this.firstUpdate = false;
	}
	if(this.collision)
	{
		this.collisionDetection();
	}

	// apply movement
	this.position.x += this.delta.x;
	this.position.y += this.delta.y;
	this.position.z += this.delta.z;
	
	// check for chunk change
	var cx = Math.floor(this.position.x/16);
	var cz = Math.floor(this.position.z/16);
	
	// update map if player has changed chunks
	if(cx != this.chunk.x || cz != this.chunk.z)
	{
		this.chunk.x = cx;
		this.chunk.z = cz;
		this.world.mapGrid9(this.chunk.x, this.chunk.z);
	}
}

// ############################################################ COLLISION DETECTION

Player.prototype.collisionDetection = function()
{
	var rPos = {
		x: Math.floor(this.position.x),
		y: Math.floor(this.position.y),
		z: Math.floor(this.position.z)
	};
	
	// gather potential collision nodes
	for(var x = rPos.x-1; x <= rPos.x+1; x++)
	{
		for(var y = rPos.y-2; y <= rPos.y+1; y++)
		{
			for(var z = rPos.z-1; z <= rPos.z+1; z++)
			{
				if((node = this.world.getNode(x, y, z)) && node.type.solid)
				{
					this.collisionNodes.push(node);
				}
			}
		}
	}
	
	for(var i in this.collisionNodes)
	{
		var node = this.collisionNodes[i];
		
		// collision on x axis
		if(
			this.delta.x &&
			this.position.z+this.size > node.z &&
			this.position.z-this.size-1 < node.z &&
			this.position.y+this.height+0.2 > node.y &&
			this.position.y-1 < node.y
		)
		{
			if(this.position.x+this.size+this.delta.x >= node.x && this.position.x < node.x+0.5)
			{
				this.delta.x = 0;
				this.position.x = node.x-this.size;
			}
			else if(this.position.x-this.size+this.delta.x <= node.x+1 && this.position.x > node.x+0.5)
			{
				this.delta.x = 0;
				this.position.x = node.x+1+this.size;
			}
		}
		
		// collision on z axis
		if(
			this.delta.z &&
			this.position.x+this.size > node.x &&
			this.position.x-this.size-1 < node.x &&
			this.position.y+this.height+0.2 > node.y &&
			this.position.y-1 < node.y
		)
		{
			// player behind the node
			if(this.position.z+this.size+this.delta.z >= node.z && this.position.z < node.z+0.5)
			{
				this.delta.z = 0;
				this.position.z = node.z-this.size;
			}
			// player in front of the node
			else if(this.position.z-this.size+this.delta.z <= node.z+1 && this.position.z > node.z+0.5)
			{
				this.delta.z = 0;
				this.position.z = node.z+1+this.size;
			}
		}
		
		// collision on y axis
		if(
			this.position.x+this.size > node.x &&
			this.position.x-this.size-1 < node.x &&
			this.position.z+this.size > node.z &&
			this.position.z-this.size-1 < node.z
		)
		{
			// hit the ceiling
			if(this.position.y+this.height+0.2+this.delta.y >= node.y && this.position.y < node.y)
			{
				this.delta.y = -0.01;
				this.velocity = 0;
				this.position.y = node.y-this.height-0.2;
			}
			
			// down on the floor
			if(this.position.y+this.delta.y <= node.y+1)
			{
				this.delta.y = 0;
				this.velocity = 0;
				this.position.y = node.y+1;
			}
		}
	}
	
	this.collisionNodes.length = 0;
}

Player.prototype.nodeCollision = function(node)
{
	if(
		this.position.x+this.size > node.x &&
		this.position.x-this.size < node.x+1 &&
		this.position.z+this.size > node.z &&
		this.position.z-this.size < node.z+1 &&
		this.position.y+0.2 > node.y &&
		this.position.y < node.y+1
	)
	{
		return true;
	}
	return false;
}
