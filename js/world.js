/*
 * File:    world.js
 *
 * Holds world and chunk classes, does map generation (but gets height from map.js).
 * Also loading and saving from/to files or in browser.
 *
 * Author:  Karl Kangur <karl.kangur@gmail.com>
 * Licence: WTFPL 2.0 (http://en.wikipedia.org/wiki/WTFPL)
*/

function World(seed)
{
	this.chunks = {};
	this.newMap(seed);
}

World.prototype.newMap = function(seed)
{
	this.chunks = {};
	this.map = new Map(seed);
	this.spawn = {x: 0, y: this.map.getAbsoluteHeight(0, 0)+3, z: 0};
}

// ############################################################ MAP METHODS

// generate 9 chunks, the center chunk being at x, z
World.prototype.mapGrid9 = function(x, z)
{
	for(var cx = x-1; cx <= x+1; cx++)
	{
		for(var cz = z-1; cz <= z+1; cz++)
		{
			// chunk already exists
			if(this.chunks[cx+'_'+cz])
			{
				continue;
			}
			
			this.addChunk(cx, cz);
		}
	}
}

// ############################################################ CHUNK METHODS

function Chunk(x, z)
{
	this.x = x;
	this.z = z;
	this.nodes = {};
	this.renderNodes = {};
	
	var map = new Map();
	
	this.corners = [
		map.getAbsoluteHeight(this.x, this.z),
		map.getAbsoluteHeight(this.x+16, this.z),
		map.getAbsoluteHeight(this.x+16, this.z+16),
		map.getAbsoluteHeight(this.x, this.z+16)
	];
}

// generates a chunk with all its nodes
World.prototype.addChunk = function(x, z)
{
	// generate the map using world heightmap
	for(var nx = 0; nx < 16; nx++)
	{
		for(var nz = 0; nz < 16; nz++)
		{
			var y = this.map.getAbsoluteHeight(16*x+nx, 16*z+nz);
		
			for(var ny = 0; ny < y; ny++)
			{
				var type;
				if(ny == 0)
				{
					type = 'bedrock';
				}
				else if(ny*2 < y)
				{
					type = 'stone';
				}
				else if((ny == 4 && ny == y-1) || (ny == 5 && ny == y-1) || (ny == 6 && ny == y-1))
				{
					// water level
					if(ny == 4 && ny == y-1)
					{
						this.addNode(16*x+nx, 5, 16*z+nz, 'water');
						this.addNode(16*x+nx, 6, 16*z+nz, 'water');
					}
					if(ny == 5 && ny == y-1)
					{
						this.addNode(16*x+nx, 6, 16*z+nz, 'water');
					}
					type = 'sand';
				}
				else if(ny < y-1)
				{
					type = 'dirt';
				}
				else
				{
					type = 'grass';
				}
				
				this.addNode(16*x+nx, ny, 16*z+nz, type);
			}
		}
	}
}

// ############################################################ NODE METHODS

// returns the node at x, y , z, false if there is no chunk or undefined if there is no node
World.prototype.getNode = function(x, y, z)
{
	var cx = Math.floor(x/16);
	var cz = Math.floor(z/16);
	
	if(this.chunks[cx+'_'+cz])
	{
		return this.chunks[cx+'_'+cz].nodes[x+'_'+y+'_'+z];
	}
	
	return false;
}

World.prototype.addNode = function(x, y, z, type)
{
	var cx = Math.floor(x/16);
	var cz = Math.floor(z/16);
	var node;
	
	// space already occupied
	if(this.getNode(x, y, z))
	{
		return false;
	}
	
	if(!this.chunks[cx+'_'+cz])
	{
		this.chunks[cx+'_'+cz] = new Chunk(cx, cz);
	}
	
	node = new Node(x, y, z, type);
	this.chunks[cx+'_'+cz].nodes[x+'_'+y+'_'+z] = node;
	this.occludedFaceCulling(node);
}

World.prototype.removeNode = function(node)
{
	node.removed = true;
	
	this.occludedFaceCulling(node);
	
	var cx = Math.floor(node.x/16);
	var cz = Math.floor(node.z/16);
	
	delete this.chunks[cx+'_'+cz].renderNodes[node.x+'_'+node.y+'_'+node.z];
	delete this.chunks[cx+'_'+cz].nodes[node.x+'_'+node.y+'_'+node.z];
}

World.prototype.occludedFaceCulling = function(node)
{	
	var faces = [FACE.FRONT, FACE.BACK, FACE.RIGHT, FACE.LEFT, FACE.TOP, FACE.BOTTOM];
	var pos = [[0,0,1], [0,0,-1], [1,0,0], [-1,0,0], [0,1,0], [0,-1,0]];
	var adjn;
	
	for(var i=0; i<3; i++)
	{
		// opposite faces
		var face1 = i*2;
		var face2 = i*2+1;
		
		// face1: front, right, top faces
		adjn = this.getNode(node.x+pos[face1][0], node.y+pos[face1][1], node.z+pos[face1][2]);
		
		// adjacent node doesn't exist or is a half node
		if(!adjn)
		{
			// add face
			node.sides |= faces[face1];
		}
		else
		{
			// one of the nodes is removed
			if(node.removed || adjn.removed)
			{
				node.sides |= faces[face1];
				adjn.sides |= faces[face2];
			}
			// add top face
			else if(FACE.TOP & (1<<face1) && node.type.half)
			{
				node.sides |= faces[face1];
				adjn.sides |= faces[face2];
			}
			// one is transparent, remove transparent face but not the opaque
			else if(node.type.transparent && !adjn.type.transparent)
			{
				node.sides &= ~faces[face1];
				adjn.sides |= faces[face2];
			}
			else if(!node.type.transparent && adjn.type.transparent)
			{
				node.sides |= faces[face1];
				adjn.sides &= ~faces[face2];
			}
			// both transparent, remove faces only if of the same type
			else if(node.type.transparent && adjn.type.transparent && node.type == adjn.type)
			{
				node.sides &= ~faces[face1];
				adjn.sides &= ~faces[face2];
			}
			// both transparent, different types
			else if(node.type.transparent && adjn.type.transparent && node.type != adjn.type)
			{
				node.sides |= faces[face1];
				adjn.sides |= faces[face2];
			}
			// one is half node, remove half face but not the full face
			else if(0xf&(1<<face1) && node.type.half && !adjn.type.half)
			{
				node.sides &= ~faces[face1];
				adjn.sides |= faces[face2];
			}
			else if(0xf&(1<<face1) && !node.type.half && adjn.type.half)
			{
				node.sides |= faces[face1];
				adjn.sides &= ~faces[face2];
			}
			// remove faces since between 2 opaque nodes
			else
			{
				node.sides &= ~faces[face1];
				adjn.sides &= ~faces[face2];
			}
			
			this.renderNode(adjn);
		}
		
		// face2: back, left, bottom
		adjn = this.getNode(node.x+pos[face2][0], node.y+pos[face2][1], node.z+pos[face2][2]);
		
		// adjacent node doesn't exist or is a half node
		if(!adjn)
		{
			// add face
			node.sides |= faces[face2];
		}
		else
		{
			// one of the nodes is removed
			if(node.removed || adjn.removed)
			{
				node.sides |= faces[face2];
				adjn.sides |= faces[face1];
			}
			// add bottom face
			else if(FACE.BOTTOM & (1<<face2) && adjn.type.half)
			{
				node.sides |= faces[face2];
				adjn.sides |= faces[face1];
			}
			// one is transparent, remove transparent face but not the opaque
			else if(node.type.transparent && !adjn.type.transparent)
			{
				node.sides &= ~faces[face2];
				adjn.sides |= faces[face1];
			}
			else if(!node.type.transparent && adjn.type.transparent)
			{
				node.sides |= faces[face2];
				adjn.sides &= ~faces[face1];
			}
			// both transparent, remove faces only if of the same type
			else if(node.type.transparent && adjn.type.transparent && node.type == adjn.type)
			{
				node.sides &= ~faces[face2];
				adjn.sides &= ~faces[face1];
			}
			// both transparent, different types
			else if(node.type.transparent && adjn.type.transparent && node.type != adjn.type)
			{
				node.sides |= faces[face2];
				adjn.sides |= faces[face1];
			}
			// one is half node, remove half face but not the full face
			else if(0xf&(1<<face2) && node.type.half && !adjn.type.half)
			{
				node.sides &= ~faces[face2];
				adjn.sides |= faces[face1];
			}
			else if(0xf&(1<<face2) && !node.type.half && adjn.type.half)
			{
				node.sides |= faces[face2];
				adjn.sides &= ~faces[face1];
			}
			// remove faces since between 2 opaque nodes
			else
			{
				node.sides &= ~faces[face2];
				adjn.sides &= ~faces[face1];
			}
		
			this.renderNode(adjn);
		}
	}
	
	this.renderNode(node);
}

World.prototype.renderNode = function(node)
{
	var rendered = false;
	
	var cx = Math.floor(node.x/16);
	var cz = Math.floor(node.z/16);
	
	if(node.sides & 0x3f)
	{
		this.chunks[cx+'_'+cz].renderNodes[node.x+'_'+node.y+'_'+node.z] = node;
	}
	else
	{
		delete this.chunks[cx+'_'+cz].renderNodes[node.x+'_'+node.y+'_'+node.z];
	}
}