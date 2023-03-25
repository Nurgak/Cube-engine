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
        {x: 0,        y: 0,        z: 0},//
        {x: 0,        y: 0,        z: 1},//
        {x: 0,        y: 1,        z: 0},
        {x: 0,        y: 1,        z: 1},
        {x: 1,        y: 0,        z: 0},//
        {x: 1,        y: 0,        z: 1},//
        {x: 1,        y: 1,        z: 0},
        {x: 1,        y: 1,        z: 1}
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
        color: '#006400',
        texture: function(face)
        {
                if(face == FACE.TOP)
                {
                        return [14, 0];
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




nodeType.water = {
        id: 14,
        color: '#5E65E1',
        texture: function(face)
        {
                return [14, 12];
        },
        transparent: true,
        solid: false
}


nodeType.lava = {
        id: 15,
        color: '#FF1408',
        texture: function(face)
        {
                return [14, 15];
        },
        transparent: false,
        solid: false
}




nodeType.ice = {
        id: 16,
        color: '#7CC8FF',
        texture: function(face)
        {
                return [3, 4];
        },
        transparent: true,
        solid: true
}


nodeType.snow = {
        id: 17,
        color: '#F5F9FB',
        texture: function(face)
        {
                return [2, 4];
        },
        transparent: false,
        solid: true
}


nodeType.stoneblock = {
        id: 18,
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
        id: 19,
        color: '#FFFFFF',
        texture: function(face)
        {
                return [11, 0];
        },
        transparent: true,
        solid: true
}


nodeType.bedrock = {
        id: 20,
        color: '#222222',
        texture: function(face)
        {
                return [1, 1];
        },
        transparent: false,
        solid: true
}

nodeType.glowstone = {
        id: 21,
        color: '#222222',
        texture: function(face)
        {
                return [9, 6];
        },
        transparent: false,
        solid: true

}

nodeType.diamondore = {
        id: 22,
        color: '#222222',
        texture: function(face)
        {
                return [2, 3];
        },
        transparent: false,
        solid: true
}

nodeType.netherrack = {
        id: 23,
        color: '#222222',
        texture: function(face)
        {
                return [7, 6];
        },
        transparent: false,
        solid: true
}

nodeType.tnt = {
        id: 24,
        color: '#006400',
        texture: function(face)
        {
                if(face == FACE.TOP)
                {
                        return [9, 0];
                }
                else if(face != FACE.BOTTOM)
                {
                        return [8, 0];
                }
                else
                {
                        return [10, 0];
                }
        },
        transparent: false,
        solid: true

}

nodeType.craft = {
        id: 25,
        color: '#222222',
        texture: function(face)
        {
                if(face == FACE.TOP)
                {
                        return [11, 2];
                }
                else if(face != FACE.BOTTOM)
                {
                        return [11, 3];
                }
                else
                {
                        return [12, 3];
                }
        },
        transparent: false,
        solid: true

}