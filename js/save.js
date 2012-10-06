/*
 * File:    save.js
 *
 * Saves game state with player information to file or locally.
 *
 * Author:  Karl Kangur <karl.kangur@gmail.com>
 * Licence: WTFPL 2.0 (http://en.wikipedia.org/wiki/WTFPL)
*/

function Save(world, player)
{
	this.world = world;
	this.player = player;
	
	this.getSavedWorlds();
}

Save.prototype.removeLocalSave = function()
{
	window.localStorage.removeItem(document.getElementById("load").value);
	this.getSavedWorlds();
}

// populate saved games select input
Save.prototype.getSavedWorlds = function()
{
	var options = [];
	for(var key in window.localStorage)
	{
		if(key.indexOf("world") === 0)
		{
			options.push('<option value="'+key+'">'+key+' ('+((window.localStorage[key].length/1024)|0)+'KB)</option>');
		}
	}
	options.sort();
	document.getElementById("load").innerHTML = options.join("");
}

// ############################################################ SAVE METHODS

Save.prototype.saveLocally = function()
{
	try
	{
		window.localStorage.setItem(document.getElementById("saveas").value, this.getSaveData());
	}
	catch(e)
	{
		switch(e.code)
		{
			// data wasn't successfully saved due to quota exceed
			case 22: alert("Could not save world: not enough space."); break;
			default: alert("Could not save world. Error code "+e.code);
		}
	}
	
	this.getSavedWorlds();
}

Save.prototype.saveToFile = function()
{
	document.location = "data:text/octet-stream,"+this.getSaveData();
}

Save.prototype.getSaveData = function()
{
	var chunk_x = Math.floor(this.player.position.x/16);
	var chunk_z = Math.floor(this.player.position.z/16);
	
	var saveNodes = [];
	for(var i in this.world.chunks)
	{
		if(Math.abs(this.world.chunks[i].x-chunk_x) <= 1 && Math.abs(this.world.chunks[i].z-chunk_z) <= 1)
		{
			for(var j in this.world.chunks[i].nodes)
			{
				saveNodes.push({
					x: this.world.chunks[i].nodes[j].x,
					y: this.world.chunks[i].nodes[j].y,
					z: this.world.chunks[i].nodes[j].z,
					t: this.world.chunks[i].nodes[j].type.id
				});
			}
		}
	}
	
	// add all player, spawnpoint and node data
	var saveData = {
		player: {
			x: this.player.position.x.toFixed(2),
			y: this.player.position.y.toFixed(2),
			z: this.player.position.z.toFixed(2),
			rx: this.player.rotation.x.toFixed(2),
			ry: this.player.rotation.y.toFixed(2),
			rz: this.player.rotation.z.toFixed(2)
		},
		spawn: {
			x: this.world.spawn.x,
			y: this.world.spawn.y,
			z: this.world.spawn.z
		},
		seed: this.world.map.seed,
		nodes: saveNodes
	};
	
	return JSON.stringify(saveData); 
}

// ############################################################ LOAD METHODS

Save.prototype.loadLocalSave = function()
{
	if(worldName = document.getElementById("load").value)
	{
		this.loadWorld(window.localStorage.getItem(worldName));
	}
}

Save.prototype.loadFromFile = function(file)
{
	var reader = new FileReader();
	
	reader.onload = function(e)
	{
		this.loadWorld(e.target.result);
	}
	
	reader.onerror = function(e)
	{
		switch(reader.error.code)
		{
			// file was uploaded with file:// protocol
			case 2: alert("You cannot load files when running locally due to security reasons."); break;
			default: alert("Could not load file. Error code: "+reader.error.code);
		}
	}
	
	reader.readAsText(file);
}

Save.prototype.loadWorld = function(worldData)
{
	worldData = JSON.parse(worldData);
	this.world.chunks = {};
	this.world.seed = parseInt(worldData.seed);
	for(var i in worldData.nodes)
	{
		var node = worldData.nodes[i];
		this.world.addNode(parseInt(node.x), parseInt(node.y), parseInt(node.z), nodeType.getTypeName(parseInt(node.t)));
	}
	
	// restore player position
	this.player.position = {
		x: parseFloat(worldData.player.x),
		y: parseFloat(worldData.player.y),
		z: parseFloat(worldData.player.z),
	};
	
	// restore player rotation
	this.player.rotation = {
		x: parseFloat(worldData.player.rx),
		y: parseFloat(worldData.player.ry),
		z: parseFloat(worldData.player.rz),
	};
}