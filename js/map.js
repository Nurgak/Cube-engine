/*
 * File:    map.js
 *
 * Map class: generates a continous heightmap based on a seed, one chunk at the time.
 *
 * Author:  Karl Kangur <karl.kangur@gmail.com>
 * Licence: WTFPL 2.0 (http://en.wikipedia.org/wiki/WTFPL)
*/

function Map(seed)
{
	this.seed = seed;
	this.cache = {};
}

// ############################################################ PERLIN NOISE
// http://freespace.virgin.net/hugo.elias/models/m_perlin.htm

Map.prototype.getAbsoluteHeight = function(x, z)
{
	return (10*this.getHeight(x, z)+5)|0;
}

// returns height value between 0 and 1
Map.prototype.getHeight = function(x, z)
{
	var cx = Math.floor(x/16);
	var cz = Math.floor(z/16);
	
	var lx = ((x%16)+16)%16;
	var lz = ((z%16)+16)%16;
	
	if(this.cache[cx+'_'+cz])
	{
		return this.cache[cx+'_'+cz][lx][lz];
	}
	
	this.cache[cx+'_'+cz] = [];
	
	var corners = this.getCorners(cx, cz);
	
	var a, b;
	for(var x = 0; x < 16; x++)
	{
		this.cache[cx+'_'+cz][x] = [];
	
		a = this.interpolate(corners[0], corners[1], x/16);
		b = this.interpolate(corners[2], corners[3], x/16);
		
		for(var z = 0; z < 16; z++)
		{
			this.cache[cx+'_'+cz][x][z] = this.interpolate(a, b, z/16);
		}
	}
	
	return this.cache[cx+'_'+cz][lx][lz];
}

// returns corner heigt values for giver chunk
Map.prototype.getCorners = function(cx, cz)
{
	// 2-a-3
	// z   |
	// 0-b-1
	
	return [
		this.noise(cx*16, cz*16),
		this.noise(cx*16+16, cz*16),
		this.noise(cx*16, cz*16+16),
		this.noise(cx*16+16, cz*16+16)
	];
}

// returns a value between 0 and 1
Map.prototype.noise = function(x, y)
{
	var k = x+y*this.seed;
	n = (k<<13)^k;
	return ((n*(n*n*60493+19990303)+1376312589)&0x7fffffff)/2147483648;
}

Map.prototype.interpolate = function(a, b, x)
{
	var f = (1.0-Math.cos(x*3.1415927))*0.5;
	return a*(1.0-f)+b*f;
}
