/*
 * File:    render.js
 *
 * Rendering class renders world to canvas according to player's viewport.
 *
 * Author:  Karl Kangur <karl.kangur@gmail.com>
 * Licence: WTFPL 2.0 (http://en.wikipedia.org/wiki/WTFPL)
*/

// render chunks inside the world
function Renderer(canvas, world, player)
{
	// local references
	this.canvas = canvas;
	this.world = world;
	this.player = player;
	this.camera = false;
	
	this.context = this.canvas.getContext("2d");
	this.vertex = {};
	
	// define canvas size according to window size
	this.canvas.width  = window.innerWidth-200;
	this.canvas.height = window.innerHeight;
	
	// half canvas size for math later on
	this.w2 = (this.canvas.width/2)|0;
	this.h2 = (this.canvas.height/2)|0;
	
	this.focalLength = 500;
	
	// render distance, the higher the slower
	this.nodeRenderDist = 100;
	this.chunkRenderDist = 420;
	this.workingFace = false;
	this.workingNode = false;
	this.renderNodes = [];
	this.chunkCount = 0;
	this.nodeCount = 0;
	this.faceCount = 0;
	this.vertexCount = 0;
	// default starting render mode (0: plain color, 1: textured)
	this.renderMode = 1;
	this.graph = false;
	this.map = false;
	this.hud = true;
	this.mouselock = false;
	this.fps = 0;
	this.frames = 0;
	this.time = new Date().getTime();
	this.frustrum = [];
	this.lowResChunks = [];
	
	// normal look at vector in 3 and 2 dimention
	this.n3d = {}
	this.n2d = {}
	
	// define texture (takes a couple of milliseconds to load)
	this.texture = new Image();
	this.texture.src = "media/texture.png";
	this.textureSize;
    	this.texture.onload = function(){
        	renderer.textureSize = this.width/16;
    	}
	
	this.crosshair = new Image();
	this.crosshair.src = "media/crosshair.png";
	
	// mouse click interface
	this.mouseClick = false;
	this.clickedNode = false;
	this.clickedFace = false;
	
	// make parent reference
	var renderer = this;
	this.canvas.onmousedown = function(event)
	{
		if(renderer.mouselock)
		{
			// when mouse is locked the click is always at the origin
			renderer.mouseClick = {
				x: 0,
				y: 0,
				button: event.button
			};
		}
		else
		{
			renderer.mouseClick = {
				x: event.pageX-renderer.w2,
				y: event.pageY-renderer.h2,
				button: event.button
			};
		}
	}
	
	// update canvas size
	window.onresize = function()
	{
		renderer.canvas.width  = window.innerWidth-200;
		renderer.canvas.height = window.innerHeight;
		renderer.w2 = (renderer.canvas.width/2)|0;
		renderer.h2 = (renderer.canvas.height/2)|0;
	}
	
	// disable right click menu
	this.canvas.oncontextmenu = function(event)
	{
		return false;
	}
	
	// canvas always in focus
	this.canvas.onblur = function()
	{
		this.focus();
	}
	this.canvas.focus();
	
	// needed for mouse lock
	document.renderer = this;
	
	this.render();
}

window.requestFrame = (function()
{
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback, element)
		{
			window.setTimeout(callback, 10);
		}
})();

Renderer.prototype.lockPointer = function()
{
	// detect feature
	if(
		!('pointerLockElement' in document) &&
		!('mozPointerLockElement' in document) &&
		!('webkitPointerLockElement' in document)
	)
	{
		alert("Pointer lock unavailable in this browser.");
		return;
	}
	
	// firefox can only lock pointer when in full screen mode, this "program" should never run in full screen
	if('mozPointerLockElement' in document)
	{
		alert("Firefox needs full screen to lock mouse. Use Chrome for the time being.");
		return;
	}
	
	// when mouse us locked/unlocked callback
	document.addEventListener('pointerlockchange', this.mouseLockChangeCallback, false);
	document.addEventListener('mozpointerlockchange', this.mouseLockChangeCallback, false);
	document.addEventListener('mozpointerchange', this.mouseLockChangeCallback, false);
	document.addEventListener('webkitpointerlockchange', this.mouseLockChangeCallback, false);
	
	this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock;
	// actually lock the mouse
	this.canvas.requestPointerLock();
}

// called when mouse lock state changes
Renderer.prototype.mouseLockChangeCallback = function()
{
	// called from document
	if(
		document.pointerLockElement === this.renderer.canvas ||
		document.mozPointerLockElement === this.renderer.canvas ||
		document.webkitPointerLockElement === this.renderer.canvas
	)
	{
		document.addEventListener('mousemove', this.renderer.mouseMoveCallback, false);
		this.renderer.mouselock = true;
	}
	else
	{
		document.removeEventListener('mousemove', this.renderer.mouseMoveCallback, false);
		this.renderer.mouselock = false;
	}
}

// mouse move event callback
Renderer.prototype.mouseMoveCallback = function(event)
{
	var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
	var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
	// this is document here
	this.renderer.player.rotation.x -= movementY/100;
	this.renderer.player.rotation.y -= movementX/100;
}

Renderer.prototype.changeRenderDist = function(value)
{
	this.nodeRenderDist = parseInt(value);
	this.chunkRenderDist = parseInt(value)+320;
}

// prerender canvas element (http://kaioa.com/node/103)
Renderer.prototype.prerender = function(width, height, renderFunction)
{
	var buffer = document.createElement("canvas");
	buffer.width = width;
	buffer.height = height;
	renderFunction(buffer.getContext('2d'));
	return buffer;
}

// ############################################################ FRUSTRUM

Renderer.prototype.getFrustrumPlanes = function()
{
	// http://en.wikipedia.org/wiki/Rotation_matrix
	
	// vectors   corners   system    planes
	// vy|/n3d   0-----1     y       +--0--+
	// --+-> vx  |     |   --+->x    3     1
	//   |       3-----2     |       +--2--+
	
	// get the player x axis rotation unit vector
	var vx = {
		x: this.n2d.z,
		//y: 0,
		z: -this.n2d.x
	};
	
	// get the player y axis rotation unit vector (cross product with vx.y == 0)
	var vy = {
		x: this.n3d.y*vx.z,
		y: this.n3d.z*vx.x-this.n3d.x*vx.z,
		z: -this.n3d.y*vx.x
	};
	
	var vectors = [
		{
			x: this.n3d.x*this.focalLength-vx.x*this.w2+vy.x*this.h2,
			y: this.n3d.y*this.focalLength+vy.y*this.h2,
			z: this.n3d.z*this.focalLength-vx.z*this.w2+vy.z*this.h2
		},
		{
			x: this.n3d.x*this.focalLength+vx.x*this.w2+vy.x*this.h2,
			y: this.n3d.y*this.focalLength+vy.y*this.h2,
			z: this.n3d.z*this.focalLength+vx.z*this.w2+vy.z*this.h2
		},
		{
			x: this.n3d.x*this.focalLength+vx.x*this.w2-vy.x*this.h2,
			y: this.n3d.y*this.focalLength-vy.y*this.h2,
			z: this.n3d.z*this.focalLength+vx.z*this.w2-vy.z*this.h2
		},
		{
			x: this.n3d.x*this.focalLength-vx.x*this.w2-vy.x*this.h2,
			y: this.n3d.y*this.focalLength-vy.y*this.h2,
			z: this.n3d.z*this.focalLength-vx.z*this.w2-vy.z*this.h2
		}
	];
	
	var v1, v2, length;
	for(var i=0; i<4; i++)
	{
		// get planes with a cross product
		v1 = vectors[i];
		v2 = vectors[(i+1)%4];
		
		this.frustrum[i] = {
			x: v1.y*v2.z-v1.z*v2.y,
			y: v1.z*v2.x-v1.x*v2.z,
			z: v1.x*v2.y-v1.y*v2.x
		}
		
		// normalize vector (same length for all)
		if(!length)
		{
			length = 1/Math.sqrt(this.frustrum[i].x*this.frustrum[i].x+this.frustrum[i].y*this.frustrum[i].y+this.frustrum[i].z*this.frustrum[i].z);
		}
		
		this.frustrum[i].x *= length;
		this.frustrum[i].y *= length;
		this.frustrum[i].z *= length;
	}
}

// ############################################################ WORLD RENDERING

Renderer.prototype.render = function()
{
	this.player.update();
	
	// 3d look-at vector
	this.n3d = {
		x: -this.player.rotTrig.cosx*this.player.rotTrig.siny,
		y: this.player.rotTrig.sinx,
		z: this.player.rotTrig.cosy*this.player.rotTrig.cosx
	};
	
	// 2d look-at vector (XZ plane)
	this.n2d = {
		x: -this.player.rotTrig.siny,
		z: this.player.rotTrig.cosy
	};
	
	this.camera = {
		x: this.player.position.x,
		y: this.player.position.y+this.player.height,
		z: this.player.position.z
	}
	
	this.chunkCount = 0;
	this.nodeCount = 0;
	this.faceCount = 0;
	this.vertexCount = 0;
	
	// reset vertices
	this.vertex = {};
	
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	
	this.getFrustrumPlanes();
	
	// empty renderable node array from last render and low resolution chunks
	this.renderNodes = [];
	//this.lowResChunks = [];
	
	// relative chunk position
	var rcp, distance;
	for(var i in this.world.chunks)
	{
		rcp = {
			x: this.world.chunks[i].x*16+8-this.camera.x,
			z: this.world.chunks[i].z*16+8-this.camera.z
		};
		
		// chunk is behind player (bounding cylinder radius: sqrt(8^2) = 11.31+margin = 13)
		if(this.n2d.x*rcp.x+this.n2d.z*rcp.z < -13)
		{
			continue;
		}
		
		// chunk too far
		/*distance = rcp.x*rcp.x+rcp.z*rcp.z;
		if(distance > this.chunkRenderDist)
		{
			this.lowResChunks.push({
				chunk: this.world.chunks[i],
				distance: distance
			});
			continue;
		}*/
		
		// get renderable nodes from each chunk inside this.renderNodes
		this.getChunkNodes(this.world.chunks[i]);
	}
	
	// first fog layer from furthest nodes
	var fogDistance = 50;
	
	// render low resolution chunks according to their distance to player
	/*this.lowResChunks.sort(function(a, b)
	{
		return b.distance-a.distance;
	});
	
	for(var i in this.lowResChunks)
	{
		this.renderLowResChunk(this.lowResChunks[i].chunk);
		fogDistance = this.fogLayer(fogDistance, this.lowResChunks[i].distance);
	}*/
	
	// render nodes according to their distance to player
	this.renderNodes.sort(function(a, b)
	{
		return b.distance-a.distance;
	});
	
	for(var i in this.renderNodes)
	{
		this.renderNode(this.renderNodes[i].node);
		fogDistance = this.fogLayer(fogDistance, this.renderNodes[i].distance);
	}
	
	// mouse interface
	if(this.mouseClick)
	{
		// left click = add new node
		if(this.clickedNode && this.mouseClick.button == 0)
		{
			var selectedType = document.getElementById("type").value;
			
			var newNode = {x: this.clickedNode.x, y: this.clickedNode.y, z: this.clickedNode.z};
				
			switch(this.clickedFace)
			{
				case FACE.FRONT:  newNode.z++; break;
				case FACE.BACK:   newNode.z--; break;
				case FACE.RIGHT:  newNode.x++; break;
				case FACE.LEFT:   newNode.x--; break;
				case FACE.TOP:    newNode.y++; break;
				case FACE.BOTTOM: newNode.y--; break;
			}
			
			if(!this.player.nodeCollision(newNode))
			{
				// get node type from DOM
				this.world.addNode(newNode.x, newNode.y, newNode.z, selectedType);
			}
		}
		// right click = remove node
		else if(this.clickedNode && this.mouseClick.button == 2)
		{
			this.world.removeNode(this.clickedNode);
		}
		this.clickedNode = false;
		this.clickedFace = false;
		this.mouseClick = false;
	}
	
	if(this.mouselock)
	{
		// render crosshair
		this.context.drawImage(this.crosshair, this.w2-8, this.h2-8);
	}
	
	if(this.hud)
	{		
		this.displayHud();
	}
	
	if(this.graph)
	{
		this.displayPerformanceGraph();
	}
	
	if(this.map)
	{
		this.displayHeightMap();
	}
	
	// frames per second counter
	if(new Date().getTime()-this.time >= 1000)
	{
		this.fps = this.frames;
		this.frames = 0;
		this.time = new Date().getTime();
	}
	this.frames++;
	
	window.requestFrame(this.render.bind(this));
}

// pseudo fog filter renders a semi-transparent gray square over everything
Renderer.prototype.fogLayer = function(fogDistance, currentDistance)
{
	if(fogDistance < 80 && currentDistance < this.nodeRenderDist-fogDistance)
	{
		this.context.globalAlpha = 0.5;
		this.context.fillStyle = "#eeeeee";
		this.context.beginPath();
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.closePath();
		this.context.fill();
		this.context.globalAlpha = 1;
		
		// next fog layer at
		return fogDistance+20;
	}
	
	return fogDistance;
}

Renderer.prototype.renderLowResChunk = function(chunk)
{
	// you read it, now complete it!
	return;
}

Renderer.prototype.getChunkNodes = function(chunk)
{
	// relative node position
	var rnp, distance;
	
	addSortNode:
	for(var i in chunk.renderNodes)
	{
		rnp = {
			x: chunk.renderNodes[i].x+0.5-this.camera.x,
			y: chunk.renderNodes[i].y+0.5-this.camera.y,
			z: chunk.renderNodes[i].z+0.5-this.camera.z
		};
		
		distance = rnp.x*rnp.x+rnp.y*rnp.y+rnp.z*rnp.z;
		
		// node is too far or behind player (bounding sphere radius: sqrt(3*(0.5)^2) = 0.866)
		if(distance > this.nodeRenderDist || this.n3d.x*rnp.x+this.n3d.y*rnp.y+this.n3d.z*rnp.z < -0.866)
		{
			continue;
		}
		
		// check node bounding sphere against all 4 frustrum planes
		for(var j = 0; j < 4; j++)
		{
			if(this.frustrum[j].x*rnp.x+this.frustrum[j].y*rnp.y+this.frustrum[j].z*rnp.z > 0.866)
			{
				continue addSortNode;
			}
		}
		
		this.nodeCount++;
		
		this.renderNodes.push({
			node: chunk.renderNodes[i],
			distance: distance
		});
	}
}

Renderer.prototype.renderNode = function(node)
{
	this.workingNode = node;
	
	// translate
	this.rx = node.x-this.camera.x;
	this.ry = node.y-this.camera.y;
	this.rz = node.z-this.camera.z;
	
	// projected points array
	this.rp = [];
	
	// node
	//    3-----7
	//   /|    /|
	//  2-+---6 |
	//  | 1---|-5
	//  |/    |/
	//  0-----4
	
	// draw visible faces
	if(node.sides & FACE.FRONT && node.z+1 < this.camera.z)
	{
		this.workingFace = FACE.FRONT;
		this.drawRect(VERTEX.FRONT);
	}
	
	if(node.sides & FACE.BACK && node.z > this.camera.z)
	{
		this.workingFace = FACE.BACK;
		this.drawRect(VERTEX.BACK);
	}
	
	if(node.sides & FACE.RIGHT && node.x+1 < this.camera.x)
	{
		this.workingFace = FACE.RIGHT;
		this.drawRect(VERTEX.RIGHT);
	}
	
	if(node.sides & FACE.LEFT && node.x > this.camera.x)
	{
		this.workingFace = FACE.LEFT;
		this.drawRect(VERTEX.LEFT);
	}
	
	if(node.sides & FACE.TOP && node.y+1 < this.camera.y)
	{
		this.workingFace = FACE.TOP;
		this.drawRect(VERTEX.TOP);
	}
	
	if(node.sides & FACE.BOTTOM && node.y > this.camera.y)
	{
		this.workingFace = FACE.BOTTOM;
		this.drawRect(VERTEX.BOTTOM);
	}
}

Renderer.prototype.drawRect = function(p)
{
	// process each vertex
	var index, x, y, z, xx, yy, zz;
	
	var offset = OFFSET;
	
	for(var i = 0; i < 4; i++)
	{
		index = (this.workingNode.x+offset[p[i]].x)+'_'+(this.workingNode.y+offset[p[i]].y)+'_'+(this.workingNode.z+offset[p[i]].z);
		
		// vertex already processed for this frame
		if((this.rp[p[i]] = this.vertex[index]) !== undefined)
		{
			continue;
		}
		
		// translate vertices
		x = this.rx+offset[p[i]].x;
		y = this.ry+offset[p[i]].y;
		z = this.rz+offset[p[i]].z;
		
		// clip point if behind player
		if(x*this.n3d.x+y*this.n3d.y+z*this.n3d.z < 0)
		{
			this.rp[p[i]] = false;
			this.vertex[index] = false;
			continue;
		}
		
		// rotatate vertices (http://en.wikipedia.org/wiki/Rotation_matrix)
		xx = this.player.rotTrig.cosy*x+this.player.rotTrig.siny*z;
		yy = this.player.rotTrig.sinx*this.player.rotTrig.siny*x+this.player.rotTrig.cosx*y-this.player.rotTrig.sinx*this.player.rotTrig.cosy*z;
		zz = -this.player.rotTrig.siny*this.player.rotTrig.cosx*x+this.player.rotTrig.sinx*y+this.player.rotTrig.cosx*this.player.rotTrig.cosy*z;
		
		// project 3d point to 2d screen (http://en.wikipedia.org/wiki/3D_projection)
		zz = this.focalLength/zz;
		
		// save relative point
		this.rp[p[i]] = {x: xx*zz, y: -yy*zz};
		
		// save processed vertex
		this.vertex[index] = this.rp[p[i]];
		this.vertexCount++;
	}
	
	// corner clipping to viewport
	/*if(
		(!this.rp[p[0]] || (this.rp[p[0]].x < -this.w2 || this.rp[p[0]].x > this.w2) || (this.rp[p[0]].y < -this.h2 || this.rp[p[0]].y > this.h2)) &&
		(!this.rp[p[1]] || (this.rp[p[1]].x < -this.w2 || this.rp[p[1]].x > this.w2) || (this.rp[p[1]].y < -this.h2 || this.rp[p[1]].y > this.h2)) &&
		(!this.rp[p[2]] || (this.rp[p[2]].x < -this.w2 || this.rp[p[2]].x > this.w2) || (this.rp[p[2]].y < -this.h2 || this.rp[p[2]].y > this.h2)) &&
		(!this.rp[p[3]] || (this.rp[p[3]].x < -this.w2 || this.rp[p[3]].x > this.w2) || (this.rp[p[3]].y < -this.h2 || this.rp[p[3]].y > this.h2))
	)
	{
		return;
	}*/
	
	// check for click (http://paulbourke.net/geometry/insidepoly/)
	if(this.mouseClick)
	{
		if(
			(this.mouseClick.y-this.rp[p[0]].y)*(this.rp[p[1]].x-this.rp[p[0]].x)-(this.mouseClick.x-this.rp[p[0]].x)*(this.rp[p[1]].y-this.rp[p[0]].y) < 0 &&
			(this.mouseClick.y-this.rp[p[2]].y)*(this.rp[p[3]].x-this.rp[p[2]].x)-(this.mouseClick.x-this.rp[p[2]].x)*(this.rp[p[3]].y-this.rp[p[2]].y) < 0 &&
			(this.mouseClick.y-this.rp[p[1]].y)*(this.rp[p[2]].x-this.rp[p[1]].x)-(this.mouseClick.x-this.rp[p[1]].x)*(this.rp[p[2]].y-this.rp[p[1]].y) < 0 &&
			(this.mouseClick.y-this.rp[p[3]].y)*(this.rp[p[0]].x-this.rp[p[3]].x)-(this.mouseClick.x-this.rp[p[3]].x)*(this.rp[p[0]].y-this.rp[p[3]].y) < 0
		)
		{
			this.clickedNode = this.workingNode;
			this.clickedFace = this.workingFace;
		}
	}
	
	if(this.renderMode == 0)
	{
		this.drawMonochrome(p);
	}
	else if(this.renderMode == 1)
	{
		this.drawTextured(p);
	}
	
	this.faceCount++;
}

Renderer.prototype.drawMonochrome = function(p)
{	
	var points = [];
	
	if(this.rp[p[0]])
	{
		points.push(this.rp[p[0]]);
	}
	if(this.rp[p[1]])
	{
		points.push(this.rp[p[1]]);
	}
	if(this.rp[p[2]])
	{
		points.push(this.rp[p[2]]);
	}
	if(this.rp[p[3]])
	{
		points.push(this.rp[p[3]]);
	}
	
	if(points.length > 1)
	{
		// reset drawing settings
		this.context.strokeStyle = "#000000";
		this.context.lineWidth = 1;
		this.context.fillStyle = this.workingNode.type.color;
		
		// set transparency
		if(this.workingNode.type.transparent)
		{
			this.context.globalAlpha = 0.5;
		}
		
		// start drawing polygon
		this.context.beginPath();
		
		// move to first point
		this.context.moveTo(points[0].x+this.w2, points[0].y+this.h2);
		for(var i = 1; i < points.length; i++)
		{
			this.context.lineTo(points[i].x+this.w2, points[i].y+this.h2);
		}
		// line back to first point (not needed)
		//this.context.lineTo(points[0].x+this.w2, points[0].y+this.h2);
		
		this.context.closePath();
		
		// fill doesn't work properly in Chrome 20.0.1132.57
		this.context.fill();
		this.context.stroke();
		this.context.globalAlpha = 1;
	}
}

Renderer.prototype.drawTextured = function(p)
{
	// affine texture mapping code by Andrea Griffini (http://stackoverflow.com/a/4774298/176269)
	var texture = this.workingNode.type.texture(this.workingFace);
	
	// 0---3 texture map corner order
	// |   |
	// 1---2
	
	var size = this.textureSize;
	var pts = [
		{x: this.rp[p[0]].x, y: this.rp[p[0]].y, u: size*texture[0], v: size*texture[1]},
		{x: this.rp[p[1]].x, y: this.rp[p[1]].y, u: size*texture[0], v: size*texture[1]+size},
		{x: this.rp[p[2]].x, y: this.rp[p[2]].y, u: size*texture[0]+size, v: size*texture[1]+size},
		{x: this.rp[p[3]].x, y: this.rp[p[3]].y, u: size*texture[0]+size, v: size*texture[1]}
	];
	
	// triangle subdivision
	var tris = [];
	
	if(this.rp[p[0]] && this.rp[p[1]] && this.rp[p[2]])
	{
		tris.push([0, 1, 2]);
	}
	else if(this.rp[p[1]] && this.rp[p[2]] && this.rp[p[3]])
	{
		tris.push([1, 2, 3]);
	}
	
	if(this.rp[p[2]] && this.rp[p[3]] && this.rp[p[0]])
	{
		tris.push([2, 3, 0]);
	}
	else if(this.rp[p[0]] && this.rp[p[1]] && this.rp[p[3]])
	{
		tris.push([0, 1, 3]);
	}
	
	for(var t=0; t<tris.length; t++)
	{
		var pp = tris[t];
		var x0 = pts[pp[0]].x+this.w2, x1 = pts[pp[1]].x+this.w2, x2 = pts[pp[2]].x+this.w2;
		var y0 = pts[pp[0]].y+this.h2, y1 = pts[pp[1]].y+this.h2, y2 = pts[pp[2]].y+this.h2;
		var u0 = pts[pp[0]].u, u1 = pts[pp[1]].u, u2 = pts[pp[2]].u;
		var v0 = pts[pp[0]].v, v1 = pts[pp[1]].v, v2 = pts[pp[2]].v;

		// set clipping area so that only pixels inside the triangle will be affected by the image drawing operation
		this.context.save();
		this.context.beginPath();
		this.context.moveTo(x0, y0);
		this.context.lineTo(x1, y1);
		this.context.lineTo(x2, y2);
		this.context.closePath();
		this.context.clip();

		// compute matrix transform
		var delta = u0*v1+v0*u2+u1*v2-v1*u2-v0*u1-u0*v2;
		var delta_a = x0*v1+v0*x2+x1*v2-v1*x2-v0*x1-x0*v2;
		var delta_b = u0*x1+x0*u2+u1*x2-x1*u2-x0*u1-u0*x2;
		var delta_c = u0*v1*x2+v0*x1*u2+x0*u1*v2-x0*v1*u2-v0*u1*x2-u0*x1*v2;
		var delta_d = y0*v1+v0*y2+y1*v2-v1*y2-v0*y1-y0*v2;
		var delta_e = u0*y1+y0*u2+u1*y2-y1*u2-y0*u1-u0*y2;
		var delta_f = u0*v1*y2+v0*y1*u2+y0*u1*v2-y0*v1*u2-v0*u1*y2-u0*y1*v2;

		// draw the transformed image
		this.context.transform(delta_a/delta, delta_d/delta, delta_b/delta, delta_e/delta, delta_c/delta, delta_f/delta);
		this.context.drawImage(this.texture, 0, 0);
		this.context.restore();
	}
}

// ############################################################ ADDITIONAL INFORMATION

Renderer.prototype.displayHud = function()
{
	this.context.save();
	this.context.textBaseline = "top";
	this.context.textAlign = "left";
	this.context.fillStyle = "#000000";
	this.context.font = "12px sans-serif";
	this.context.fillText("FPS: "+this.fps, 0, 0);
	this.context.fillText("Chunks: "+this.chunkCount, 0, 12);
	this.context.fillText("Nodes: "+this.nodeCount, 0, 24);
	this.context.fillText("Faces: "+this.faceCount, 0, 36);
	this.context.fillText("Vertices: "+this.vertexCount, 0, 48);
	this.context.fillText("X: "+this.player.position.x.toFixed(2), 0, 60);
	this.context.fillText("Y: "+this.player.position.y.toFixed(2), 0, 72);
	this.context.fillText("Z: "+this.player.position.z.toFixed(2), 0, 84);
	this.context.restore();
}

Renderer.prototype.displayPerformanceGraph = function()
{
	if(typeof this.graph != 'object')
	{
		this.graph = {
			fps: [],
			width: 300,
			height: 100,
			dataPoints: 20
		};
		
		this.graph.interval = this.graph.width/this.graph.dataPoints;
		
		// prerender graph base
		var graph = this.graph;
		this.graph.base = this.prerender(this.graph.width, this.graph.height, function(ctx)
		{
			ctx.fillStyle = "#EEEEEE";
			ctx.beginPath();
			ctx.rect(0, 0, graph.width, graph.height);
			ctx.fill();
			ctx.closePath();
			
			ctx.strokeStyle = '#CCCCCC';
			ctx.lineWidth = 1;
			ctx.beginPath();
			for(var i=0; i<graph.dataPoints; i++)
			{
				ctx.moveTo(i*graph.interval, 0);
				ctx.lineTo(i*graph.interval, graph.height);
			}
			ctx.stroke();
			ctx.closePath();
		});
	}
	
	// update graph every second
	if(!this.graph.time || new Date().getTime()-this.graph.time >= 1000)
	{
		this.graph.time = new Date().getTime();
		
		// data stack
		if(this.graph.fps.length > this.graph.dataPoints)
		{
			this.graph.fps.shift();
		}
		this.graph.fps.push(this.fps);
		
		// prerender graph
		var graph = this.graph;
		this.graph.image = this.prerender(this.graph.width, this.graph.height+20, function(ctx)
		{
			ctx.drawImage(graph.base, 0, 0);
			
			// draw fps line and text
			ctx.strokeStyle = "#000000";
			ctx.lineWidth = 2;
			ctx.fillStyle = "#000000";
			ctx.textBaseline = "bottom";
			ctx.textAlign = "right";
			ctx.font = "10px sans-serif";
			
			ctx.beginPath();
			ctx.moveTo(0, graph.height-graph.fps[0]*graph.height/60);
			for(var i=1; i<graph.fps.length; i++)
			{
				var y = graph.height-graph.fps[i]*graph.height/60;
				ctx.fillText(graph.fps[i], i*graph.interval, y);
				ctx.lineTo(i*graph.interval, y);
			}
			ctx.stroke();
			ctx.closePath();
			
			// average frames per second
			var avgFps = 0;
			for(var i in graph.fps)
			{
				avgFps += graph.fps[i];
			}
			avgFps /= graph.fps.length;
			
			ctx.textBaseline = "top";
			ctx.textAlign = "left";
			ctx.font = "12px sans-serif";
			ctx.fillText("Avg. FPS: "+(avgFps|0), 0, graph.height);
		});
	}
	
	this.context.drawImage(this.graph.image, this.canvas.width-this.graph.width, 0);
}

Renderer.prototype.displayHeightMap = function()
{
	var mapsize = 64;
	
	// current chunk coordinates
	var x = Math.floor(this.camera.x/16);
	var z = Math.floor(this.camera.z/16);
	
	// no map, player changed chunks or map seed changed
	if(typeof this.map != 'object' || this.map.x != x || this.map.z != z || this.world.map.seed != this.map.seed)
	{
		this.map = {
			x: x,
			z: z,
			offset: mapsize*2,
			step: mapsize/16,
			size: mapsize*4,
			seed: this.world.map.seed
		}
		
		this.map.position = new Image();
		this.map.position.src = "media/pos.png";
		
		// prerender 16 chunks worth of heightmap
		var renderer = this;
		var map = this.map;
		this.map.heightmap = this.prerender(64, 64, function(ctx)
		{
			var hmap = renderer.context.createImageData(64, 64);
			var index, color, cx, cz;
			
			for(var mz=0; mz<4; mz++)
			{
				for(var mx=0; mx<4; mx++)
				{
					cx = map.x+mx-2;
					cz = map.z+mz-2;
					
					// draw one chunck of 16 by 16 nodes (reverse z coordinate)
					for(var z=0; z<16; z++)
					{
						for(var x=0; x<16; x++)
						{
							index = 4*(16*mx+x)+256*(16*(3-mz)+16-z);
							color = 16*(renderer.world.map.getHeight(16*cx+x, 16*cz+z)*16|0);
							
							// red, green, blue, alpha
							hmap.data[index] = color;
							hmap.data[index+1] = color;
							hmap.data[index+2] = color;
							hmap.data[index+3] = 255;
						}
					}
				}
			}
			ctx.putImageData(hmap, 0, 0);
		});
	}
	
	this.context.save();
	this.context.translate(this.canvas.width-mapsize, this.canvas.height-mapsize);
	this.context.rotate(this.player.rotation.y);
	
	// clipping mask
	this.context.beginPath();
	// 6.28 = 2*pi
	this.context.arc(0, 0, mapsize, 0, 6.28, false);
	this.context.closePath();
	this.context.clip();
	
	// context.drawImage(canvas element, sx, sy, sw, sh, dx, dy, dw, dh)
	this.context.drawImage(this.map.heightmap, 0, 0, 64, 64, -this.map.step*(((this.camera.x%16)+16)%16)-this.map.offset, this.map.step*(((this.camera.z%16)+16)%16)-this.map.offset, this.map.size, this.map.size);
	
	this.context.restore();
	
	this.context.drawImage(this.map.position, this.canvas.width-mapsize-8, this.canvas.height-mapsize-8);
}
