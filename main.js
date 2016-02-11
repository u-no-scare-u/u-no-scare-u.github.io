/**
 * Notes:
 * - Coordinates are specified as (X, Y, Z) where X and Z are horizontal and Y
 *   is vertical
 */
var sound = new Audio('/Paranormal Activity.mp3');
sound.preload = 'auto';
sound.volume = 1;
sound.loop = true;
sound.play();
var shriek = new Audio('/shriek.wav');
shriek.volume = 50;
var map = [                      //
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
		[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2],
		[1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 0, 2],
		[1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 2, 0, 0, 0, 2],
		[1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 2, 0, 0, 0, 2],
		[1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
		[0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
		[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
		[0, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0], //
		[0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
		[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
		[0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
		[0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
		[0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0],
	],
	mapW = map.length,
	mapH = map[0].length;

// Semi-constants
var WIDTH = window.innerWidth;
	HEIGHT = window.innerHeight,
	ASPECT = WIDTH / HEIGHT,
	UNITSIZE = 250,
	WALLHEIGHT = UNITSIZE / 1.5,
	MOVESPEED = 100,
	LOOKSPEED = 0.075,
	NUMAI = 5,
	PROJECTILEDAMAGE = 20,
	STARTTIME = Date.now();
// Global vars
var t = window.THREE,
	scene, cam, renderer, controls, clock, projector, model, skin;
var runAnim = true,
	mouse = {
		x: 0,
		y: 0
	},
	kills = 0,
	health = 100;

// Initialize and run on document ready
$(document).ready(function() {
	$('body').append('<div id="intro"><h1>Click to start</h1><span style="font-size:25px;">press space to use flashlight<br>P.S. if you hear rattling chains, run.  You won\'t get far.</span></div>');
	$('#intro').css({
		width: WIDTH,
		height: HEIGHT
	}).one('click', function(e) {
		e.preventDefault();
		$(this).fadeOut();
		init();
		animate();
	});
	/*
	new t.ColladaLoader().load('models/Yoshi/Yoshi.dae', function(collada) {
		model = collada.scene;
		skin = collada.skins[0];
		model.scale.set(0.2, 0.2, 0.2);
		model.position.set(0, 5, 0);
		scene.add(model);
	});
	*/
});

// Setup
function init() {
	clock = new t.Clock(); // Used in render() for controls.update()
	projector = new t.Projector(); // Used in bullet projection
	scene = new t.Scene(); // Holds all objects in the canvas
	scene.fog = new t.FogExp2(0x000000, 0.0045); // color, density

	// Set up camera
	cam = new t.PerspectiveCamera(60, ASPECT, 1, 10000); // FOV, aspect, near, far
	cam.position.y = UNITSIZE * 0.4;
	cam.translateZ(-100);
	cam.translateX(250);
	scene.add(cam);

	// Camera moves with mouse, flies around with WASD/arrow keys
	controls = new t.FirstPersonControls(cam);
	controls.movementSpeed = MOVESPEED;
	controls.lookSpeed = LOOKSPEED;
	controls.lookVertical = false; // Temporary solution; play on flat surfaces only
	controls.noFly = true;

	// World objects
	setupScene();

	// Artificial Intelligence
	setupAI();

	// Handle drawing as WebGL (faster than Canvas but less supported)
	renderer = new t.WebGLRenderer({
		antialias: true
	});
	renderer.setSize(WIDTH, HEIGHT);

	// Add the canvas to the document
	renderer.domElement.style.backgroundColor = '#000000'; // easier to see
	document.body.appendChild(renderer.domElement);

	// Track mouse position so we know where to shoot
	document.addEventListener('mousemove', onDocumentMouseMove, false);

	// Set up "hurt" flash
	$('body').append('<div id="hurt"></div>');
	$('#hurt').css({
		width: WIDTH,
		height: HEIGHT,
	});
}

// Helper function for browser frames
function animate() {
	if (runAnim) {
		window.requestAnimationFrame(animate);
	}
	render();
}

// Update and display
function render() {
	var delta = clock.getDelta();
	var aispeed = delta * MOVESPEED;
	controls.update(delta); // Move camera

	// Update AI.
	for (var i = ai.length - 1; i >= 0; i--) {
		var a = ai[i];
		if (a.health <= 0) {
			ai.splice(i, 1);
			scene.remove(a);
			kills++;
			$('#score').html(kills * 100);
			addAI();
		}
		// Move AI
		var r = Math.random();
		if (r > 0.995) {
			a.lastRandomX = Math.random() * 2 - 1;
			a.lastRandomZ = Math.random() * 2 - 1;
		}
		if (distance(a.position.x, a.position.z, cam.position.x, cam.position.z) > 500) {
			a.translateX(aispeed * a.lastRandomX);
			a.translateZ(aispeed * a.lastRandomZ);
		}
		else if(distance(a.position.x, a.position.z, cam.position.x, cam.position.z) > 5000 && scene.flashlight.intensity > 0) {
			if (a.position.x < cam.position.x) a.translateX(aispeed * 1.5);
			if (a.position.x > cam.position.x) a.translateX(aispeed * -1.5);
			if (a.position.z > cam.position.z) a.translateZ(aispeed * -1.5);
			if (a.position.z < cam.position.z) a.translateZ(aispeed * 1.5);
		}
		else {
			if (a.position.x < cam.position.x) a.translateX(aispeed * 1.5);
			if (a.position.x > cam.position.x) a.translateX(aispeed * -1.5);
			if (a.position.z > cam.position.z) a.translateZ(aispeed * -1.5);
			if (a.position.z < cam.position.z) a.translateZ(aispeed * 1.5);
		}
		var c = getMapSector(a.position);
		if (c.x < 0 || c.x >= mapW || c.y < 0 || c.y >= mapH || checkWallCollision(a.position)) {
			a.translateX(-2 * aispeed * a.lastRandomX);
			a.translateZ(-2 * aispeed * a.lastRandomZ);
			a.lastRandomX = Math.random() * 2 - 1;
			a.lastRandomZ = Math.random() * 2 - 1;
		}
		if (c.x < -1 || c.x > mapW || c.z < -1 || c.z > mapH) {
			ai.splice(i, 1);
			scene.remove(a);
			addAI();
		}
		if (distance(a.position.x, a.position.z, cam.position.x, cam.position.z) < 20) {
			(health > 0) ? $('#hurt').fadeIn(75): null;
			health -= 100;
			if (health < 0) health = 0;
			$('#hurt').fadeOut(350);
		}
		/*
		var c = getMapSector(a.position);
		if (a.pathPos == a.path.length-1) {
			console.log('finding new path for '+c.x+','+c.z);
			a.pathPos = 1;
			a.path = getAIpath(a);
		}
		var dest = a.path[a.pathPos], proportion = (c.z-dest[1])/(c.x-dest[0]);
		a.translateX(aispeed * proportion);
		a.translateZ(aispeed * 1-proportion);
		console.log(c.x, c.z, dest[0], dest[1]);
		if (c.x == dest[0] && c.z == dest[1]) {
			console.log(c.x+','+c.z+' reached destination');
			a.PathPos++;
		}
		*/
	}

	renderer.render(scene, cam); // Repaint

	// Death
	if (health <= 0) {
		shriek.play();
		runAnim = false;
		$(renderer.domElement).fadeOut();
		$('#hud, #credits').fadeOut();
		$('#intro').fadeIn();
		$('body').css('background-image', 'url(images/slendr.jpg)');
		$('body').css('background-repeat', 'none');
		$('#intro').css('font-family', 'Nosifer');
		$('#intro').css('color', 'darkred');
		$('#intro').html('could i b u?  no, u no scare u<br><small>you survived ' + -Math.floor((STARTTIME-Date.now())/1000)+ ' seconds</small>');
		$('#intro').one('click', function() {
			location = location;
			/*
			$(renderer.domElement).fadeIn();
			$('#hud, #credits').fadeIn();
			$(this).fadeOut();
			runAnim = true;
			animate();
			health = 100;
			$('#health').html(health);
			kills--;
			if (kills <= 0) kills = 0;
			$('#score').html(kills * 100);
			cam.translateX(-cam.position.x);
			cam.translateZ(-cam.position.z);
			*/
		});
	}
}

// Set up the objects in the world
function setupScene() {
	var UNITSIZE = 250,
		units = mapW;

	// Geometry: floor
	var floor = new t.Mesh(
		new t.CubeGeometry(units * UNITSIZE, 10, units * UNITSIZE),
		new t.MeshLambertMaterial({
			color: 0xFFFFFF
		})
	);
	scene.add(floor);

	// Geometry: walls
	var cube = new t.CubeGeometry(UNITSIZE, WALLHEIGHT, UNITSIZE);
	var materials = [
		new t.MeshLambertMaterial({
			map: t.ImageUtils.loadTexture('/images/white.png')
		}),
		new t.MeshLambertMaterial({ 
			map: t.ImageUtils.loadTexture('/images/brick.jpg')
		}),
		new t.MeshLambertMaterial({
			map: t.ImageUtils.loadTexture('/images/door.jpg')
		}),
	];
	for (var i = 0; i < mapW; i++) {
		for (var j = 0, m = map[i].length; j < m; j++) {
			if (map[i][j]) {
				var wall = new t.Mesh(cube, materials[map[i][j] - 1]);
				wall.position.x = (i - units / 2) * UNITSIZE;
				wall.position.y = WALLHEIGHT / 2;
				wall.position.z = (j - units / 2) * UNITSIZE;
				scene.add(wall);
			}
		}
	}

	// Lighting
	var light1 = new t.DirectionalLight(0xffffff, 0);
	light1.position.set(0.5, 1, 0.5);
	scene.add(light1);
	var light2 = new t.AmbientLight(0x111111);
	light2.position.set(0.5, 1, 0.5);
	scene.add(light2);
	var flashlight = new t.SpotLight(0xffffff, 0);
	cam.add(flashlight);
	flashlight.position.set(0, 0, 1);
	flashlight.target = cam;
	document.onkeydown = function(e) {
		if (e.keyCode == 32) {
			flashlight.intensity = 20;
			light1.intensity = 0.75;
		}
	};
	document.onkeyup = function(e) {
		if (e.keyCode == 32) {
			flashlight.intensity = 0;
			light1.intensity = 0;
		}
	};
}

var ai = [];
var aiGeo = new t.CubeGeometry(40, 250, 40);

function setupAI() {
	for (var i = 0; i < NUMAI; i++) {
		addAI();
	}
}

function addAI() {
	var c = getMapSector(cam.position);
	var aiMaterial = new t.MeshLambertMaterial({
		map: t.ImageUtils.loadTexture('images/slendr.jpg')
	});
	var o = new t.Mesh(aiGeo, aiMaterial);
	do {
		var x = getRandBetween(0, mapW - 1);
		var z = getRandBetween(0, mapH - 1);
	} while (map[x][z] > 0 || (x == c.x && z == c.z));
	x = Math.floor(x - mapW / 2) * UNITSIZE;
	z = Math.floor(z - mapW / 2) * UNITSIZE;
	o.position.set(x, UNITSIZE * 0.15, z);
	o.health = 100;
	// o.path = getAIpath(o);
	o.pathPos = 1;
	o.lastRandomX = Math.random();
	o.lastRandomZ = Math.random();
	o.lastShot = Date.now(); // Higher-fidelity timers aren't a big deal here.
	ai.push(o);
	scene.add(o);
}

/**
 * Find a path from one grid cell to another.
 *
 * @param sX
 *   Starting grid x-coordinate.
 * @param sZ
 *   Starting grid z-coordinate.
 * @param eX
 *   Ending grid x-coordinate.
 * @param eZ
 *   Ending grid z-coordinate.
 * @returns
 *   An array of coordinates including the start and end positions representing
 *   the path from the starting cell to the ending cell.
 */
function findAIpath(sX, sZ, eX, eZ) {
	var backupGrid = grid.clone();
	var path = finder.findPath(sX, sZ, eX, eZ, grid);
	grid = backupGrid;
	return path;
}

function distance(x1, y1, x2, y2) {
	return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function getMapSector(v) {
	var x = Math.floor((v.x + UNITSIZE / 2) / UNITSIZE + mapW / 2);
	var z = Math.floor((v.z + UNITSIZE / 2) / UNITSIZE + mapW / 2);
	return {
		x: x,
		z: z
	};
}

/**
 * Check whether a Vector3 overlaps with a wall.
 *
 * @param v
 *   A THREE.Vector3 object representing a point in space.
 *   Passing cam.position is especially useful.
 * @returns {Boolean}
 *   true if the vector is inside a wall; false otherwise.
 */
function checkWallCollision(v) {
	var c = getMapSector(v);
	return map[c.x][c.z] > 0;
}

/*
function loadImage(path) {
	var image = document.createElement('img');
	var texture = new t.Texture(image, t.UVMapping);
	image.onload = function() { texture.needsUpdate = true; };
	image.src = path;
	return texture;
}
*/

function onDocumentMouseMove(e) {
	e.preventDefault();
	mouse.x = (e.clientX / WIDTH) * 2 - 1;
	mouse.y = -(e.clientY / HEIGHT) * 2 + 1;
}

// Handle window resizing
$(window).resize(function() {
	WIDTH = window.innerWidth;
	HEIGHT = window.innerHeight;
	ASPECT = WIDTH / HEIGHT;
	if (cam) {
		cam.aspect = ASPECT;
		cam.updateProjectionMatrix();
	}
	if (renderer) {
		renderer.setSize(WIDTH, HEIGHT);
	}
	$('#intro, #hurt').css({
		width: WIDTH,
		height: HEIGHT,
	});
});

// Stop moving around when the window is unfocused (keeps my sanity!)
$(window).focus(function() {
	if (controls) controls.freeze = false;
});
$(window).blur(function() {
	if (controls) controls.freeze = true;
});

//Get a random integer between lo and hi, inclusive.
//Assumes lo and hi are integers and lo is lower than hi.
function getRandBetween(lo, hi) {
	return parseInt(Math.floor(Math.random() * (hi - lo + 1)) + lo, 10);
}