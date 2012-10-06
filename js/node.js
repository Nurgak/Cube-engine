/*
 * File:    node.js
 *
 * Contains node class and defines node types.
 *
 * Author:  Karl Kangur <karl.kangur@gmail.com>
 * Licence: WTFPL 2.0 (http://en.wikipedia.org/wiki/WTFPL)
*/

//  coordinates     indexes     system       faces
//                                             front
//   011---111    3-----7                 +-----+
//   /|    /|    /|    /|                /|top /|
// 010+--110|   2-+---6 |   y           +-+---+ | right
//  |001--|101  | 1---|-5   | z    left | +---|-/
//  |/    |/    |/    |/    |/          |/back|/
// 000---100    0-----4     +----x      +-----+
//                                        bottom
//
// face order: front, back, right, left, top, bottom

// node face constants
const FACE = {
	FRONT:  1,
	BACK:   2,
	RIGHT:  4,
	LEFT:   8,
	TOP:    16,
	BOTTOM: 32
}

// rendering vertex order
const VERTEX = {
	FRONT:  [7, 5, 1, 3],
	BACK:   [2, 0, 4, 6],
	RIGHT:  [6, 4, 5, 7],
	LEFT:   [3, 1, 0, 2],
	TOP:    [2, 6, 7, 3],
	BOTTOM: [0, 1, 5, 4]
}

// vertex offset from node origin
const OFFSET = [
	{x: 0,	y: 0,	z: 0},
	{x: 0,	y: 0,	z: 1},
	{x: 0,	y: 1,	z: 0},
	{x: 0,	y: 1,	z: 1},
	{x: 1,	y: 0,	z: 0},
	{x: 1,	y: 0,	z: 1},
	{x: 1,	y: 1,	z: 0},
	{x: 1,	y: 1,	z: 1}
];

// node definition, private: do not call directly
// only the world can add a new node with addNode(x, y, z, type)
function Node(x, y, z, type)
{
	this.x = x;
	this.y = y;
	this.z = z;
	this.type = nodeType[type];
	
	// at first all faces are visible
	this.sides = 0x3f; // = 0b111111
	// bit | face
	// ----+--------
	// 0   | front
	// 1   | back
	// 2   | right
	// 3   | left
	// 4   | top
	// 5   | bottom
}

// node definitions
const nodeType = {};

// restore type to loaded node using type id
nodeType.getTypeName = function(id)
{
	for(var key in nodeType)
	{
		if(typeof nodeType[key] == "object" && nodeType[key].id == id)
		{
			return key;
		}
	}
}

// ids are used to save data locally or to file
nodeType.stone = {
	id: 1,
	color: '#828282',
	texture: function(face)
	{
		return [1, 0];
	},
	transparent: false,
	solid: true
}

nodeType.grass = {
	id: 2,
	color: '#749317',
	texture: function(face)
	{
		if(face == FACE.TOP)
		{
			return [0, 0];
		}
		else if(face != FACE.BOTTOM)
		{
			return [3, 0];
		}
		else
		{
			return [2, 0];
		}
	},
	transparent: false,
	solid: true
}

nodeType.dirt = {
	id: 3,
	color: '#703A00',
	texture: function(face)
	{
		return [2, 0];
	},
	transparent: false,
	solid: true
}

nodeType.cobblestone = {
	id: 4,
	color: '#787878',
	texture: function(face)
	{
		return [0, 1];
	},
	transparent: false,
	solid: true
}

nodeType.planks = {
	id: 5,
	color: '#E08907',
	texture: function(face)
	{
		return [4, 0];
	},
	transparent: false,
	solid: true
}

nodeType.wood = {
	id: 6,
	color: '#642E00',
	texture: function(face)
	{
		if(face < FACE.TOP)
		{
			return [4, 1];
		}
		else
		{
			return [5, 1];
		}
	},
	transparent: false,
	solid: true
}

nodeType.bricks = {
	id: 7,
	color: '#D14B1B',
	texture: function(face)
	{
		return [7, 0];
	},
	transparent: false,
	solid: true
}

nodeType.gravel = {
	id: 8,
	color: '#5E6469',
	texture: function(face)
	{
		return [3, 1];
	},
	transparent: false,
	solid: true
}


nodeType.sand = {
	id: 9,
	color: '#FCE781',
	texture: function(face)
	{
		return [2, 1];
	},
	transparent: false,
	solid: true
}

nodeType.sandstone = {
	id: 10,
	color: '#FFEE88',
	texture: function(face)
	{
		if(face == FACE.TOP)
		{
			return [0, 11];
		}
		else if(face != FACE.BOTTOM)
		{
			return [0, 12];
		}
		else
		{
			return [0, 13];
		}
	},
	transparent: false,
	solid: true
}

nodeType.obsidian = {
	id: 11,
	color: '#2C202F',
	texture: function(face)
	{
		return [5, 2];
	},
	transparent: false,
	solid: true
}

nodeType.glass = {
	id: 12,
	color: '#A3D8FF',
	texture: function(face)
	{
		return [1, 3];
	},
	transparent: true,
	solid: true
}

nodeType.leaves = {
	id: 13,
	color: '#029700',
	texture: function(face)
	{
		return [4, 3];
	},
	transparent: true,
	solid: true
}

nodeType.black = {
	id: 14,
	color: '#262626',
	texture: function(face)
	{
		return [1, 7];
	},
	transparent: false,
	solid: true
}

nodeType.red = {
	id: 15,
	color: '#BE3600',
	texture: function(face)
	{
		return [1, 8];
	},
	transparent: false,
	solid: true
}

nodeType.rose = {
	id: 16,
	color: '#FC79AE',
	texture: function(face)
	{
		return [2, 8];
	},
	transparent: false,
	solid: true
}

nodeType.orange = {
	id: 17,
	color: '#C67B00',
	texture: function(face)
	{
		return [2, 13];
	},
	transparent: false,
	solid: true
}

nodeType.yellow = {
	id: 18,
	color: '#C1C600',
	texture: function(face)
	{
		return [2, 10];
	},
	transparent: false,
	solid: true
}

nodeType.white = {
	id: 19,
	color: '#E2E2E2',
	texture: function(face)
	{
		return [0, 4];
	},
	transparent: false,
	solid: true
}

nodeType.green = {
	id: 20,
	color: '#0E7000',
	texture: function(face)
	{
		return [1, 9];
	},
	transparent: false,
	solid: true
}

nodeType.cyan = {
	id: 21,
	color: '#00D0CC',
	texture: function(face)
	{
		return [1, 13];
	},
	transparent: false,
	solid: true
}

nodeType.blue = {
	id: 22,
	color: '#085CD0',
	texture: function(face)
	{
		return [1, 11];
	},
	transparent: false,
	solid: true
}

nodeType.purple = {
	id: 23,
	color: '#6E0FD3',
	texture: function(face)
	{
		return [1, 12];
	},
	transparent: false,
	solid: true
}

nodeType.water = {
	id: 24,
	color: '#5E65E1',
	texture: function(face)
	{
		return [14, 12];
	},
	transparent: true,
	solid: false
}

nodeType.lava = {
	id: 25,
	color: '#FF1408',
	texture: function(face)
	{
		return [14, 15];
	},
	transparent: false,
	solid: true
}

nodeType.darkgray = {
	id: 26,
	color: '#4B4B4B',
	texture: function(face)
	{
		return [2, 7];
	},
	transparent: false,
	solid: true
}

nodeType.gray = {
	id: 27,
	color: '#949494',
	texture: function(face)
	{
		return [1, 14];
	},
	transparent: false,
	solid: true
}

nodeType.lime = {
	id: 28,
	color: '#68D000',
	texture: function(face)
	{
		return [2, 9];
	},
	transparent: false,
	solid: true
}

nodeType.brown = {
	id: 29,
	color: '#6C360A',
	texture: function(face)
	{
		return [1, 10];
	},
	transparent: false,
	solid: true
}

nodeType.lightblue = {
	id: 30,
	color: '#4E9EFF',
	texture: function(face)
	{
		return [2, 11];
	},
	transparent: false,
	solid: true
}

nodeType.magneta = {
	id: 31,
	color: '#B956FF',
	texture: function(face)
	{
		return [2, 12];
	},
	transparent: false,
	solid: true
}

nodeType.ice = {
	id: 32,
	color: '#7CC8FF',
	texture: function(face)
	{
		return [3, 4];
	},
	transparent: true,
	solid: true
}

nodeType.snow = {
	id: 33,
	color: '#F5F9FB',
	texture: function(face)
	{
		return [2, 4];
	},
	transparent: false,
	solid: true
}

nodeType.stoneblock = {
	id: 34,
	color: '#9E9E9E',
	texture: function(face)
	{
		if(face < FACE.TOP)
		{
			return [5, 0];
		}
		else
		{
			return [6, 0];
		}
	},
	transparent: false,
	solid: true
}

nodeType.cobweb = {
	id: 35,
	color: '#FFFFFF',
	texture: function(face)
	{
		return [11, 0];
	},
	transparent: true,
	solid: true
}

nodeType.bedrock = {
	id: 36,
	color: '#222222',
	texture: function(face)
	{
		return [1, 1];
	},
	transparent: false,
	solid: true
}