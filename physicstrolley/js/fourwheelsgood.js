///<reference path="../typings/globals/three/index.d.ts" />

'use strict';

Physijs.scripts.worker = '/physicstrolley/js/physijs_worker.js';
Physijs.scripts.ammo = '/physicstrolley/js/ammo.js';

//Global constants for debugging.
var planeSize = 1000;
var boundarySize = (planeSize/2) * 0.8;
var showPhysicsBoxes = false;

//Scene constants, including player char.
var initScene, scene, camera, goal, car={}, cap, pill ={}, cig, light={}, chair={};
var wheelsArr = [];
var loadingAnimation = document.getElementById('loading_animation_page');
var playButton = loadingAnimation.getElementsByClassName('btn')[0];
var isLandingScreenOpen = true;

//Static objects (physics-only interactions).
var objectsArray = [];
var largeObjectsArray = [];

//text stuff
var textDisplaying = false;
var textId = "message";
var allowSameModelTalk = true;
var allowNewModelTalk = true;
var last_collided = "nothing";

//audio
var audioListener, hitSound;
var audio;
var hasAudioStarted = false;

//raycaster for setting object transparency
var raycaster;

//for camera collision stuff
var cameraFollower;

//for duping OrbitControls into letting us rotate around the trolley
var controls, fakeCamera, orbitControlsEnabled;

//static vectors representing wheel positions
var wheel_fl_vector = new THREE.Vector3(-1, 0.3, 0.7);
var wheel_fr_vector = new THREE.Vector3(-1, 0.3, -0.7);
var wheel_bl_vector = new THREE.Vector3(1, 0.3, 1);
var wheel_br_vector = new THREE.Vector3(1, 0.3, -1);


var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function initScene() 
{
	waitForLoad();

	scene = new Physijs.Scene;
	scene.setGravity (new THREE.Vector3(0, -30, 0));

	initPlatform();
	initTrolley();
	initCamera();
	initLights();
	initSkybox();
	initTextListeners();
	initAudio();
	// initRaycaster();
	//little objects
	spawnPill();
	spawnBottlecap();
	spawnCig();

	//bigga objects
	spawnPen ();
	spawnChair();
	spawnVend();
	spawnCup(1);
	spawnCup(0.5);
	spawnCan(1);
	spawnCan(0.5);
	spawnStraw();
	spawnStraw(0.1);
	spawnBottle();
	spawnSpray();

	spawnAcid();

	initOrbitControls();
	audio = document.getElementById("audio");
	// document.addEventListener('keypress', startAudio);

	requestAnimationFrame( render );
};

window.onload = initScene();

var redFog = 0xff2666;
var crimsonFog=0xff3646;
var platformFog= 0xff6666;
var niceTurquoise = 0x6fc9af;
var blackFog = 0x000000;

scene.fog = new THREE.Fog( crimsonFog, 300, 350 );
render();

var arrowHelper;

function startAudio()
{
	if (!hasAudioStarted) audio.play(); hasAudioStarted = true;
	// document.removeEventListener('keypress', startAudio);
}

function waitForLoad()
{
	playButton.style.visibility = "hidden";
	document.onreadystatechange = () =>
	{
		if (document.readyState === "complete")
		{
			playButton.style.visibility = "visible";
		}
	}
}

function render() 
{
	scene.simulate(); // get state of physics simulation
	checkBoundary();
	light.lightD1.position.x = car.frame.position.x-50;
	light.lightD1.position.z = car.frame.position.z-50;

	//fakeCamera is rotating around point 0,0,0. As such its values are already normalised,
	//so we can copy its position/rotation/quaternion, which will automatically apply it to
	//the real camera relative to the trolley.
	if (orbitControlsEnabled) controls.update(); camera.copy(fakeCamera);

	
	// raycast();

	renderer.render(scene, camera); // render the scene
	requestAnimationFrame( render );
};

function closeLandingScreen()
{
	loadingAnimation.style.visibility = "hidden"; 
	playButton.style.visibility = "hidden";
	// document.getElementById("loading_animation_page").style.visibility = "hidden";
	startAudio();
	isLandingScreenOpen = false;
}

function initRaycaster()
{
	// raycaster = new THREE.Raycaster();
	// raycaster.far = 150;
}

var intersects = {};
var lastIntersected = [];

function raycast()
{
	if (typeof lastIntersected != 'undefined')
	{
		for (var i = 0; i < lastIntersected.length; i++)
		{
			lastIntersected[i].material.transparent = false;
			lastIntersected[i].material.opacity = 1.0;
		}
	}

	lastIntersected = [];

	var cameraPos = cameraFollower.getWorldPosition();
	var direction = new THREE.Vector3();
	direction.subVectors(car.interior.getWorldPosition(), cameraPos)

	raycaster.set(cameraPos, direction);

	intersects = raycaster.intersectObjects(scene.children, true).slice();

	// var currentObject;

	for (var i = 0; i < intersects.length; i++)
	{
		if (typeof intersects[i] != 'undefined')
		{
			if (intersects[i].object.model != 'skybox' && typeof intersects[i].object.parentReference != 'undefined')
			{
				// intersects[i].object.material.transparent = true;
				// intersects[i].object.material.opacity = 0.5;
				var parent = intersects[i].object.parentReference;
				parent.traverse(function(child)
				{
					if (child.isMesh)
					{
						if (!child.material.transparent)
						{
							child.material.transparent = true;
							child.material.opacity = 0.5;
							lastIntersected.push(child);
						}
					}
				});
				// if (intersects[i].object.parent != scene)
				// {

				// }
			}
		}
	}
	// lastIntersected = intersects.slice();
};


function initOrbitControls()
{
	//you can totally use OrbitControls to do this!
	//first create a copy of the camera that isn't parented to the trolley
	fakeCamera = camera.clone();
	//attach OrbitControls to it, then get coordinates from OC in render()
	controls = new THREE.OrbitControls(fakeCamera, renderer.domElement);
	controls.enableKeys = false;
	controls.minPolarAngle = 0; // radians
	controls.maxPolarAngle = Math.PI/2; // radians
	// controls.minAzimuthAngle = 0; // radians
	// controls.maxAzimuthAngle = Math.PI; // radians
	controls.enablePan = false;
	controls.enableDamping = true;
	controls.dampingFactor = 0.07;
	controls.minDistance = 10;
	controls.maxDistance = 50;

	orbitControlsEnabled = true;
}

function checkBoundary()
{
	//in each instance we place teleport the player a little further away from the boundary
	//so that they don't immediately trigger this function again

	if (car.frame.position.x < -boundarySize)
	{
		car.frame.position.x = boundarySize - 5;
		car.frame.__dirtyPosition = true;
		updateWheels();
	}
	else if (car.frame.position.x > boundarySize)
	{
		car.frame.position.x = -boundarySize + 5;
		car.frame.__dirtyPosition = true;
		updateWheels();
	}

	if (car.frame.position.z < -boundarySize)
	{
		car.frame.position.z = boundarySize - 5;
		car.frame.__dirtyPosition = true;
		updateWheels();
	}
	else if (car.frame.position.z > boundarySize)
	{
		car.frame.position.z = -boundarySize + 5;
		car.frame.__dirtyPosition = true;
		updateWheels();
	}

	var object;

	for (object of objectsArray)
	{
		if (object.position.x < -boundarySize)
		{
			object.position.x = boundarySize - 5;
			object.__dirtyPosition = true;
		}
		else if (object.position.x > boundarySize)
		{
			object.position.x = -boundarySize + 5;
			object.__dirtyPosition = true;
		}

		if (object.position.z < -boundarySize)
		{
			object.position.z = boundarySize - 5;
			object.__dirtyPosition = true;
		}
		
		else if (object.position.z > boundarySize)
		{
			object.position.z = -boundarySize + 5;
			object.__dirtyPosition = true;
		}
	}
}

function updateWheels()
{
	//manually access the array elements, because it doesn't seem to work in a loop!
	//the values of each vector are derived from their offsets, seen in trolley.js wheelConstructor().	
	wheelsArr[0].position.addVectors(car.frame.position, wheel_fl_vector);
	wheelsArr[0].__dirtyPosition = true;
	wheelsArr[1].position.addVectors(car.frame.position, wheel_fr_vector);
	wheelsArr[1].__dirtyPosition = true;
	wheelsArr[2].position.addVectors(car.frame.position, wheel_bl_vector);
	wheelsArr[2].__dirtyPosition = true;
	wheelsArr[3].position.addVectors(car.frame.position, wheel_br_vector);
	wheelsArr[3].__dirtyPosition = true;
}

function initPlatform()
{
	var pf = 0.7;  //platform friction
	var pr = 0.8;  //platform restitution

	//rectangular platform
	var platform = new THREE.CubeGeometry(planeSize, 1, planeSize);
	var bigger = new THREE.CubeGeometry(planeSize*4, 1, planeSize*4);

	var physiPlatformMaterial = Physijs.createMaterial(
								new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('img/graham.jpg')}), 
								pf, pr);
	var physiPlatform = new Physijs.BoxMesh(platform, physiPlatformMaterial, 0 );
	physiPlatform.name = "physicalPlatform";
	physiPlatform.position.set(0, -0.5, 0);
	physiPlatform.visible = showPhysicsBoxes;
	physiPlatform.model = 'the fucking ground';
	scene.add(physiPlatform);

	var oldColour = 0xff6666;

	var visiblePlatform = new THREE.Mesh( bigger, new THREE.MeshStandardMaterial({ color: 0xff6666 }) );
  	visiblePlatform.name = "visiblePlatform"
  	visiblePlatform.position.set(0, -0.5, 0);
  	//visiblePlatform.rotation.y = .4;
  	visiblePlatform.receiveShadow = true;
  	scene.add( visiblePlatform );
}

function initLights()
{
	light.lightD1 = new THREE.DirectionalLight( 0xFFFFFF, 2 );   //0xFFFFFF
  	light.lightD1.position.set( 100, 50, 50 );
  	light.lightD1.castShadow = true;
  	light.lightD1.shadow.camera.left = -100;
	light.lightD1.shadow.camera.top = -100;
  	light.lightD1.shadow.camera.right = 100;
  	light.lightD1.shadow.camera.bottom = 100;
  	light.lightD1.shadow.camera.near = 1;
  	light.lightD1.shadow.camera.far = 500;
	light.lightD1.shadow.mapSize.height = light.lightD1.shadow.mapSize.width = 1000;
	light.lightD1.target=car.frame;
	scene.add( light.lightD1 );
	// scene.add( new THREE.CameraHelper( light.lightD1.shadow.camera ));
	var hemlight = new THREE.HemisphereLight( 0xEB92A7, 0x080820, 1 );
	scene.add( hemlight );
	var glow = new THREE.AmbientLight( 0x404040 );
	scene.add (glow);
}

function initCamera()
{
	camera = new THREE.PerspectiveCamera(
		70,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);

	scene.add(camera);

	car.frame.add(camera);
	camera.position.set(25, 2, 0);
	camera.lookAt(car.frame);

	cameraFollower = new THREE.Object3D();
	camera.add(cameraFollower);
	cameraFollower.position.set(0,0,-5);
}

function initSkybox()
{
	var skyboxMaterials = [
		new THREE.MeshBasicMaterial({ color: 0xff3646 , side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({ color: 0xff3646 , side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({ color: 0xff3646 , side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({ color: 0xff3646 , side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({ color: 0xff3646 , side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({ color: 0xff3646 , side: THREE.DoubleSide}),
	];
	var skyboxGeometry = new THREE.CubeGeometry(1000, 1000, 1000);
	var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
	skybox.model = 'skybox';
	scene.add(skybox);
}

function spawnChair(posx, posy, posz)
{
	var box, legfl, legfr, legbr, legbl, arml, armll, armr, armrr, back;

	//initialise master physics box
	var box_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 12.5, 1, 12.5 ),
		box_material,
		10
	);
	box.model = 'chair';
	if (typeof posx != 'undefined') box.position.set(posx, posy, posz);
	else box.position.set(randomWithinBoundary(), 15, randomWithinBoundary());

	//legs (front & back, left & right)
	legfl = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legfl.model = 'chair';
	legfl.position.set (6, -5, -4);
	box.add (legfl);

	legfr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legfr.model = 'chair';
	legfr.position.set (-6, -5, -4);
	box.add (legfr);

	legbr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legbr.model = 'chair';
	legbr.position.set (4, -5, 6);
	legbr.rotation.x = - Math.PI / 12;
	box.add (legbr);

	legbl = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legbl.model = 'chair';
	legbl.position.set (-4, -5, 6);
	legbl.rotation.x = - Math.PI / 12;
	box.add (legbl);

	//chair back
	back = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 10, 10, 0.5 ),
		box_material,
		10
	);
	back.model = 'chair';
	back.position.set(0, 5, 7.5);
	back.rotation.x = Math.PI/14;
	box.add (back);

	//arms (left and right)
	arml = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 8, 1 ),
		box_material,
		10
	);
	arml.model = 'chair';
	arml.position.set (6, 2, -3);
	//arml.rotation.x = - Math.PI / 12;
	box.add (arml);

	
	armr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 8, 1 ),
		box_material,
		10
	);
	armr.model = 'chair';
	armr.position.set (-6, 2, -3);
	//arml.rotation.x = - Math.PI / 12;
	box.add (armr);


	//otherarmbits
	armll = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 12, 1 ),
		box_material,
		10
	);
	armll.model = 'chair';
	armll.position.set (6, 7, 2.5);
	armll.rotation.x = Math.PI / 2.3;
	box.add (armll);

	armrr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 12, 1 ),
		box_material,
		10
	);
	armrr.model = 'chair';
	armrr.position.set (-6, 7, 2.5);
	armrr.rotation.x = Math.PI / 2.3;
	box.add (armrr);

	//load model and attach it to the physics boxes
	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/monobloc.glb', function (gltf)
	{
		box.monobloc = gltf.scene;
		box.monobloc.parentReference = box;
		box.monobloc.position.set (0.2, -9.9, -4);
		box.monobloc.rotation.y = Math.PI / 2;
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = box;
        });
		box.add (box.monobloc)
	}
	);

	//control visibility
	legfl.material.visible = showPhysicsBoxes;
	legfr.material.visible = showPhysicsBoxes;
	legbr.material.visible = showPhysicsBoxes;
	legbl.material.visible = showPhysicsBoxes;
	arml.material.visible = showPhysicsBoxes;
	armll.material.visible = showPhysicsBoxes;
	armr.material.visible = showPhysicsBoxes;
	armrr.material.visible = showPhysicsBoxes;
	back.material.visible = showPhysicsBoxes;
	box.material.visible = showPhysicsBoxes;

	chair = box;
	objectsArray.push(chair);
	largeObjectsArray.push(chair);
	scene.add (chair);	
}

function spawnVend(posx, posy, posz)
{
	var vBox;

	//initialise master physics box
	var vBox_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	vBox = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 14.8, 23.4, 14.8 ),
		vBox_material,
		10
	);
	vBox.model = 'vending';
	if (typeof posx != 'undefined') vBox.position.set(posx, posy, posz);
	else vBox.position.set(randomWithinBoundary(), 15, randomWithinBoundary());

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/vend3.glb', function (gltf)
	{
		vBox.vend = gltf.scene;
		vBox.vend.parentReference = vBox;
		vBox.vend.position.set (0.4, -15, 0);
		vBox.vend.rotation.y = Math.PI / 2;
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = vBox;
        });
		vBox.add (vBox.vend);
		scene.add (vBox);
		objectsArray.push(vBox);
		largeObjectsArray.push(vBox);
	}
	);
	vBox.material.visible = showPhysicsBoxes;
}
function spawnCup (scaleVar, posx, posy, posz)
{
	var Cup;

	if (typeof scaleVar == 'undefined') scaleVar = 1;

	//initialise master physics box
	var Cup_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Cup = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 11 * scaleVar, 9 * scaleVar, 26 * scaleVar, 8, 4 ),
		Cup_material,
		10
	);
	
	Cup.model = 'cup';

	if (typeof posx != 'undefined') Cup.position.set(posx, posy, posz);
	else Cup.position.set(randomWithinBoundary(), 15, randomWithinBoundary());

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/coffeecup.glb', function (gltf)
	{
		Cup.coffee = gltf.scene;
		Cup.coffee.parentReference = Cup;
		Cup.coffee.position.set (0 * scaleVar, -11.8 * scaleVar, 0 * scaleVar);
		Cup.coffee.rotation.y = Math.PI / 2;
		Cup.coffee.scale.set (8 * scaleVar, 8 * scaleVar, 8 * scaleVar);
		Cup.coffee.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = Cup;
        });
		Cup.add (Cup.coffee);
		scene.add (Cup);
		objectsArray.push(Cup);
		largeObjectsArray.push(Cup);
	}
	);
	Cup.material.visible=showPhysicsBoxes;
}

function spawnCan (scaleVar, posx, posy, posz)
{
	var Can;

	if (typeof scaleVar == 'undefined') scaleVar = 1;

	//initialise master physics box
	var Can_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Can = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 5 * scaleVar, 5 * scaleVar, 14.5 * scaleVar, 8 ),
		Can_material,
		10
	);

	Can.model = 'can';
	
	if (typeof posx != 'undefined') Can.position.set(posx, posy, posz);
	else Can.position.set(randomWithinBoundary(), 15, randomWithinBoundary());

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/can2.glb', function (gltf)
	{
		Can.coke = gltf.scene;
		Can.coke.parentReference = Can;
		Can.coke.position.set (0 * scaleVar, -7 * scaleVar, 0 * scaleVar);
		Can.coke.rotation.y = Math.PI / 2;
		Can.coke.scale.set (1 * scaleVar, 1 * scaleVar, 1 * scaleVar);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = Can;
        });
		Can.add (Can.coke);
		scene.add (Can);
		objectsArray.push(Can);
		largeObjectsArray.push(Can);
	}
	);
	Can.material.visible=showPhysicsBoxes;
}
function spawnBottle (posx, posy, posz)
{
	var Bottle;

	//initialise master physics box
	var Bottle_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Bottle = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 4.8, 5, 22, 8 ),
		Bottle_material,
		10
	);
	Bottle.cline = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 2.5, 4.9, 5, 8 ),
		Bottle_material,
		10
	);
	Bottle.cline.position.set (0,13,0);
	Bottle.add (Bottle.cline);

	Bottle.spout = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 1.4, 1.4, 11.2, 8 ),
		Bottle_material,
		10
	);
	Bottle.spout.position.set (0,20,0);
	Bottle.add (Bottle.spout);
	Bottle.model = 'bottle';
	
	if (typeof posx != 'undefined') Bottle.position.set(posx, posy, posz);
	else Bottle.position.set(randomWithinBoundary(), 15, randomWithinBoundary());

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/bottlething.glb', function (gltf)
	{
		Bottle.coke = gltf.scene;
		Bottle.coke.parentReference = Bottle;
		Bottle.coke.position.set (0, -11, 0);
		Bottle.coke.rotation.y = Math.PI / 2;
		Bottle.coke.scale.set (4.9, 4.9, 4.9);
		Bottle.coke.transparent = true;
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
				child.material.opacity = 0.4;
				child.material.transparent = true;
				
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = Bottle;
        });
		Bottle.add (Bottle.coke);
		scene.add (Bottle);
		objectsArray.push(Bottle);
		largeObjectsArray.push(Bottle);
	}
	);
	Bottle.material.visible=showPhysicsBoxes;
}
function spawnPen (posx, posy, posz)
{
	var Pen;

	//initialise master physics box
	var Pen_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.2  // low restitution
	);
	Pen = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 1, 1, 48, 8 ),
		Pen_material,
		100
	);
	
	Pen.model = 'pen';
	
	if (typeof posx != 'undefined') Pen.position.set(posx, posy, posz);
	else Pen.position.set(randomWithinBoundary(), 15, randomWithinBoundary());
	Pen.rotation.z= Math.PI/2;

	var firstLoader = new THREE.GLTFLoader();
	firstLoader.load ('/physicstrolley/models/transparentpen.glb', function (firstMesh)
	{
		var secondLoader = new THREE.GLTFLoader();
		{
			secondLoader.load ('/physicstrolley/models/opaquepen.glb', function (secondMesh)
			{
				Pen.case = firstMesh.scene;
				Pen.ink = secondMesh.scene;
				Pen.case.position.set (0, -21, 0);
				Pen.ink.position.set (0, -21, 0);
				
				Pen.case.scale.set (1, 1, 1);
				Pen.ink.scale.set (1,1, 1);
				Pen.case.transparent = true;
				Pen.ink.transparent=false;
				firstMesh.scene.traverse( function ( child ) 
				{
					if ( child.isMesh ) 
					{
						child.material.opacity = 0.4;
						child.material.transparent = true;
						
						child.castShadow = true;
						child.receiveShadow = false;
					}
				});
				Pen.add (Pen.case);
				Pen.add (Pen.ink);
				scene.add (Pen);
				objectsArray.push(Pen);
				largeObjectsArray.push(Pen);
			});
		}	
	});
	Pen.material.visible=showPhysicsBoxes;
}
function spawnSpray(posx, posy, posz)
{
	var Spray;

	//initialise master physics box
	var Spray_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Spray = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 20, 46, 10 ),
		Spray_material,
		10
	);
	Spray.othersides = new Physijs.BoxMesh(
		new THREE.CubeGeometry(13, 46, 13 ),
		Spray_material,
		10
	);
	Spray.add (Spray.othersides);
	Spray.side1 = new Physijs.CylinderMesh (
		new THREE.CylinderGeometry(4, 4, 46, 8, 1),
		Spray_material,
		2
	)
	Spray.side1.position.set (11,0,0);
	Spray.add (Spray.side1);

	Spray.side2 = new Physijs.CylinderMesh (
		new THREE.CylinderGeometry(4, 4, 55, 8, 1),
		Spray_material,
		2
	)
	Spray.side2.position.set (-8,4.5,0);
	Spray.side2.rotation.z = -Math.PI/32
	Spray.add (Spray.side2);

	Spray.cone = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 6, 7, 12, 8 ),
		Spray_material,
		1
	);
	Spray.cone.position.set (2,25,0);
	Spray.cone.rotation.z = Math.PI/4;
	Spray.add (Spray.cone);

	Spray.disp = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 25, 6, 6),
		Spray_material,
		1
	);
	Spray.disp.position.set (4,63.5,0);
	
	Spray.add (Spray.disp);
	Spray.disp2 = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 3, 1, 6, 8),
		Spray_material,
		1
	);
	Spray.disp2.position.set (-10,63.5,0);
	Spray.disp2.rotation.z = Math.PI/10;
	
	Spray.add (Spray.disp2);

	Spray.disp3 = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 10, 20, 8),
		Spray_material,
		1
	);
	Spray.disp3.position.set (-3, 52,0);
	Spray.disp3.rotation.z= -Math.PI/12;
	
	Spray.add (Spray.disp3);

	Spray.disp4 = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 13.2, 12, 9),
		Spray_material,
		1
	);
	Spray.disp4.position.set (-1.7, 42 ,0);
	Spray.disp4.rotation.z= Math.PI/7;
	
	Spray.add (Spray.disp4);

	Spray.disp5 = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 13.2, 12, 9),
		Spray_material,
		1
	);
	Spray.disp5.position.set (0, 36 ,0);
	Spray.disp5.rotation.z= -Math.PI/6;
	
	Spray.add (Spray.disp5);

	Spray.disp6 = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 13.2, 12, 9),
		Spray_material,
		1
	);
	Spray.disp6.position.set (-4, 26 ,0);
	//Spray.disp6.rotation.z= -Math.PI/15;
	
	Spray.add (Spray.disp6);

	Spray.trigger = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1.3, 14, 4),
		Spray_material,
		1
	);
	Spray.trigger.position.set (8, 54.3 ,0);
	Spray.trigger.rotation.z= Math.PI/28;
	
	Spray.add (Spray.trigger);

	Spray.model = 'spray';
	
	if (typeof posx != 'undefined') Spray.position.set(posx, posy, posz);
	else Spray.position.set(randomWithinBoundary(), 15, randomWithinBoundary());

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/spraybottle.glb', function (gltf)
	{
		Spray.image = gltf.scene;
		Spray.image.parentReference = Spray;
		Spray.image.position.set (-2, -24, 0);
		Spray.image.rotation.y = Math.PI / 2;
		Spray.image.scale.set (4.9, 4.9, 4.9);
		//Spray.image.transparent = true;
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
				//child.material.opacity = 0.4;
				//child.material.transparent = true;
				
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = Spray;
        });
		Spray.add (Spray.image);
		scene.add (Spray);
		objectsArray.push(Spray);
		largeObjectsArray.push(Spray);
	}
	);
	Spray.material.visible=showPhysicsBoxes;
}
function spawnStraw(scaleVar, posx, posy, posz)
{
	var Straw, Bit, Lip;

	if (typeof scaleVar == 'undefined') scaleVar = 1;

	//initialise master physics box
	var Straw_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Straw = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 0.5 * scaleVar, 0.5 * scaleVar, 46 * scaleVar, 8 ),
		Straw_material,
		10
	);
	Straw.model = 'straw';
	Bit = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 0.5 * scaleVar, 0.5 * scaleVar, 5 * scaleVar, 8 ),
		Straw_material,
		10
	);
	Bit.model = 'straw';
	Lip = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 0.5 * scaleVar, 0.5 * scaleVar, 15 * scaleVar, 8 ),
		Straw_material,
		10
	);
	Lip.model = 'straw';
	if (typeof posx != 'undefined') Straw.position.set(posx, posy, posz);
	else Straw.position.set(randomWithinBoundary(), 15, randomWithinBoundary());
	Straw.rotation.x=-Math.PI/2;
	Bit.position.set (0, 26, -0.8);
	Bit.rotation.x=-Math.PI/9;
	Straw.add (Bit);
	Lip.position.set (0, 33, -6.6);
	Lip.rotation.x=-Math.PI/4;
	Straw.add (Lip);
	var loader = new THREE.GLTFLoader();

	loader.load ('/physicstrolley/models/straw1.glb', function (gltf)
	{
		Straw.bend = gltf.scene;
		Straw.bend.parentReference = Straw;
		Straw.bend.position.set (0 * scaleVar, -23 * scaleVar, 0 * scaleVar);
		Straw.bend.rotation.y = Math.PI / 2;
		Straw.bend.scale.set (0.5 * scaleVar, 0.5 * scaleVar, 0.5 * scaleVar);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = Straw;
        });
		Straw.add (Straw.bend);
		scene.add (Straw);
		objectsArray.push(Straw);
		largeObjectsArray.push(Straw);
	}
	);
	Straw.material.visible=showPhysicsBoxes;
	
}
function spawnPill()
{
	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/pillpill.glb', function (gltf)
	{
		//first setup shadow properties of the model, since this will be copied
		//for every pill later on
		gltf.scene.traverse( function ( child ) 
		{
			if ( child.isMesh ) {
				child.castShadow = true;
				child.receiveShadow = false;
			}
		});

		for (var i = 0; i < 10; i++)
		{
			//we need a new copy of both the material and the geometry for each pill's mesh
			//so we create these in the loop
			var localPill = new Physijs.CylinderMesh(
				new THREE.CylinderGeometry(0.9, 0.9, 4.25, 8), 
				Physijs.createMaterial(new THREE.MeshLambertMaterial({ color: 0xff6666 }), .7, 1.3), 1);


			//position, rotation, and scale setup
			localPill.position.y = Math.random() * 50 + 25;
			localPill.position.x = randomWithinBoundary();
			localPill.position.z = randomWithinBoundary();

			localPill.rotation.set(
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2);
			localPill.scale.set (1.7, 1.7, 1.7);

			//misc setup
			localPill.model = 'pill';
			localPill.material.visible = showPhysicsBoxes;

			var localGltf = gltf.scene.clone();
			localGltf.traverse(function(child)
			{
				child.parentReference = localPill;
			});

			localPill.modelObject = localGltf;
			localPill.modelObject.parentReference = localPill;
			
			//add a unique copy of the model to the physi mesh
			localPill.add(localGltf);

			//add to scene and global array
			scene.add(localPill);
			objectsArray.push(localPill);
		}
	}
	);
}
function spawnCig ()
{
	var cig_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.5, // high friction
		1.3  // low restitution
	);
	var cig = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry (1.5, 1.5, 10, 8),
		cig_material,
		1
	);

	cig.model = 'cig';
	
	cig.position.y = Math.random() * 25 + 25;
	cig.position.x = (Math.random() - 0.5 )* planeSize;
	cig.position.z = (Math.random() - 0.5 )* planeSize;
	
	cig.rotation.set(
		Math.random() * Math.PI * 2,
		Math.random() * Math.PI * 2,
		Math.random() * Math.PI * 2);
		
	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/cig.glb', function (gltf)
	{
		cig.lid = gltf.scene;
		cig.lid.parentReference = cig;
		cig.lid.position.set (0, -5, 0);
		cig.lid.rotation.y = Math.PI / 2;
		cig.lid.scale.set (1.5, 1.5, 1.5);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = cig;
		});
		
		cig.add (cig.lid);
		cig.material.visible=showPhysicsBoxes;

		scene.add (cig);
		objectsArray.push(cig);
	}
	);
}
function spawnBottlecap ()
{
	var cap;

	//initialise master physics box
	var cap_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.5, // high friction
		1.3  // low restitution
	);
	cap = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry (3.5, 3, 1.5, 8),
		cap_material,
		1
	);

	cap.model = 'cap';
	
	cap.position.y= Math.random() * 25 + 25;
	cap.position.x = (Math.random() - 0.5 )* planeSize;
	cap.position.z = (Math.random() - 0.5 )* planeSize;
	
	cap.rotation.set(
		Math.random() * Math.PI * 2,
		Math.random() * Math.PI * 2,
		Math.random() * Math.PI * 2);

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/bottlecap.glb', function (gltf)
	{
		cap.top = gltf.scene;
		cap.top.parentReference = cap;
		cap.top.position.set (0, -0.75, 0);
		cap.top.rotation.y = Math.PI / 2;
		cap.top.scale.set (0.5, 0.5, 0.5);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
			}
			child.parentReference = cap;
		});
		cap.add (cap.top);
		cap.material.visible=showPhysicsBoxes;
		scene.add (cap);
		objectsArray.push(cap);
	}
	);
}

function spawnAcid ()
{
	for (var i = 0; i < 10; i++)
	{
		// spawnPill ();
		spawnBottlecap ();
		spawnCig();
	}
}

function randomiseObjects()
{
	//called when the user travels past the edge of our infinite plane,
	//or on some other as yet unknown condition

	var object;

	for (object of objectsArray)
	{
		//randomise each object's x&z coordinates
		//subtracting half the planeSize normalises the coordinates to the negative and positive axes

		object.position.x = (Math.random() * planeSize) - planeSize/2;
		object.position.z = (Math.random() * planeSize) - planeSize/2;

		//fling!
		object.position.y = 15;
		//this internal flag instructs physijs to update this object's position from within THREE,
		//rather than from physijs' simulation.
		object.__dirtyPosition = true;
	}
}

function initTextListeners()
{
	document.addEventListener('keydown', function( ev )
	{
		switch (ev.keyCode)
		{
			case 32: case 67: if (textDisplaying) clearText(); break;
			case 77: if (hasAudioStarted && audio.muted === false) 
					{
						audio.muted = true; 
						break;
					}
					else if (audio.muted === true) 
					{
						audio.muted = false; 
						break;
					}
		}
	})	
}

function drawText(message)
{
	if (textDisplaying) clearText();
	
	var text = document.createElement('div');

	text.style.position = 'absolute';
	text.style.textAlign = "center";
	text.innerHTML = "<p>" + message + "</p>";
	text.style.backgroundColor = "#ff3646";
	text.style.fontFamily = "courier";
	text.style.color = "white";
	text.style.padding = "5px";
	text.style.borderRadius = "5px";
  	text.style.left = "50%";
  	text.style.bottom = "20px";
	text.style.transform = "translateX(-50%)";
	text.id = textId;

	document.body.appendChild(text);
	textDisplaying = true;
}

function clearText()
{
	document.getElementById(textId).remove(); 
	textDisplaying = false;
}

function handleCollision(collided_with)
{
	if (isLandingScreenOpen) return;
	
	if (typeof collided_with.model != 'undefined')
	{
		// console.log("" + collided_with.id);
		if (!allowSameModelTalk && collided_with.model === last_collided.model) return;
		if (!allowNewModelTalk) return;

		// hitSound.play();

		switch (collided_with.model)
		{
			// case 'spray': iterativeScript('graham'); break;
			// case 'bottle': drawText("i am glaas bottalle"); break;
			// case 'chair': drawText("chair"); break;
			// case 'pill': iterativeScript('graham'); break;
			// case 'cap': drawText("i am the cap"); break;
			// case 'vending': drawText("i am the vending machine"); break;
			// case 'cig': randomFragments(); break;
			// case 'cup': drawText("i suppose at the bottom of it all,<br>i am a cup, but cannot i be more?"); break;
			// case 'straw': drawText("i'm not strawmanning it's just how i am :P"); break;
			// case 'can': drawText("man, why is it that most of these items are<br>three letter words starting with c?<br> ain't that strange, chief?"); break;
			default: iterativeScript('graham'); break;
		}
		allowSameModelTalk = false;
		allowNewModelTalk = false;

		var trolleyTouches = car.frame._physijs.touches.slice();
		last_collided = collided_with;

		setTimeout(forceRecheckCollision, 5000, trolleyTouches);
		setTimeout(function(){allowNewModelTalk = true;}, 2000);
	}
}

function forceRecheckCollision(trolleyTouches)
{
	allowSameModelTalk = true;

	//compare the last known touches array with its current touches array
	//if they have the same physijs id numbers, treat it like a new collision

	var currentTouches = car.frame._physijs.touches.slice();

	if (currentTouches.length < 1) return;
	if (currentTouches.length != trolleyTouches.length) return;

	for (var i = 0; i < trolleyTouches.length; i++)
	{
		if (currentTouches[i] != trolleyTouches[i]) return;
	}

	handleCollision(last_collided);
}

//isn't this wacky lookin syntax? it's called a 'self-invoking function'
//it's run when the program launches, and it outputs another function, which iterativeScript() becomes
var iterativeScript = (function() 
{	
	var ajPillIterator = 0;
	var ajPill = ['patron of the concealment that hides vacuity', 
	'materials in states whose forms betray nothing',
	'in the garb of ash or as something ash-like', 
	'limbless infiltrator of the limbic',
	'and so slowly does the corpus habituate',
	'then all at once it is as if it were of its brood,',
	'and no more is this meagre compensation',
	'turf wars in the upper ganglia', 
	'under heat and light nerves shatter', 
	'a bloom of laryngeal carmine',
	'and puncture-struck and supine monitored', 
	'chemister\'s ballast to prevent a capsize']

	var grahamTextIterator = 0;
	var grahamText = ['And on that day, the day after the execution, he was led to the city gates and summarily exiled.',
	'Exiled as some defective limb that requires amputation…',
	'Though in the scope of the city perhaps the exile was more like a mole that made the mistake of growing too near a tumour.',
	'And the exile; swept out like so much dust in a spring clean for the rains to wash away.',
	'He wore no plastic zip ties on his wrists, and sneakers on his feet they led him to the wall.',
	'Beyond those high walls was the desert, and it was into the desert that he would go.',
	'Into the desert that he would be exiled.',
	'Guilty of what? Too little conviction to form either condemnation or support?',
	'He would be free. Free to perish in the empty concrete plain, surrounded by his delirium of memories and dreams.',
	'But really, he was twice exiled: from the city, and from the confidence of his friends.',
	'Why was their trust not placed in him? For the same reason trust was not given him now?',
	'Was he too traitorous or not traitorous enough to be part of a conspiracy?',
	'They watched, for even an exile, while not an execution, is still something to see.',
	'Perhaps this was his fault, he speculated, the fruits of his tendency towards the downward glance, to avoid the potential for other eyes to see the truth of his own.',
	'The desert was a faint concrete incline, such that the rain – when it did fall – slowly drifted down it and into the horizon where supposedly – somewhere – there was an ocean.',
	'The system was designed with the kind of precision that induced terror.',
	'Whatever it had been built for in the past, now it was an absolutely elegant guillotine blade.',
	'He remembered: two lines slowly parting in a surface to reveal a third infinitely more devastating line.',
	'There is no escape from this line.',
	'This was the horizon of his life now. The horizon of his life and his death.',
	'From its infinitely distant and slightly curved aspect there would be less chance of escape than from his prison cell.',
	'This was the fate that was supposedly kinder than execution.',
	'Let the knife of the horizon slit his throat instead; being a coward, he had accepted.',
	'Perhaps even in this plain he could find a rock to hide under.',
	'He was in front of the wall now, and looking up he saw the plane of the concrete landscape turn vertically and rise up into the sky.',
	'Even the monstrous wall, so large when before it, disappeared into the distance.',
	'It was as if his life up to this point were a dream, and now, in the midst of his visions, he was really awake.',
	'He wished, strangely, for death on the basis of a desire for communality. To share something with those he admired and loved.',
	'Yet, he thought, what else do soldiers do but formulate hysteria to the point of sacrifice? All noble warriors fall to the delusion of nobility.',
	'He set his cowardice against the line of the horizon, and let his eyes dip to the ground around his feet. He would not meet the gaze of his chosen executioner.',
	'The doors reaching out to meet one another in their exclusive embrace. There was an embrace he would not feel again, some semblance of a community, hidden by the wall before the concrete desert.',
	'Truth be told, he still had hope; like every coward he slinks in the shadows hoping for a better day.',
	'The concrete pressed itself against his feet, flat and hard and unforgiving.',
	'It worked its way into his eyeballs, grey appearing white in the bright sunlight.',
	'He was thirsty, his mouth was dry like the ashes of a fire, hot coals crackled on his lips and he stoked them with his tongue to relieve the pain.',
	'A sudden change, a sudden flicker. He stood up straight, jolted with surprise and looked towards the source of the sudden intrusion, the appearance.',
	'It flew towards him, and he raised his arms to fend off the blow, only to find himself momentarily passing through the shadow of a bird. A bird!',
	'He raised his eyes to the skies and looked for a sign of birds. The creature flew above him, heading towards some point on the horizon. He took it as an augur and set off in pursuit.',
	'Great streams of white clouds rose up over the curve of the earth like ribbons in celebration of some divine festival, but like all divine things he was not privy to it, nor to its grace.',
	'On the second day, upon the horizon, he saw a series of stones, and in some mirage or illusion he felt them suddenly take on the form of his dead brother.',
	'He could not feel his feet. Did he walk yet, or was he dead? Was this the hour of his execution? He felt nothing. He felt alone.',
	'He cried out, made no sound. It made no difference. He felt he could at last answer a riddle, about speech and hearing. It made no difference.',
	'In the face of the truth of things, in the face of the desert, it made no difference.',
	'On the fourth day he craved water like nothing he had ever wished for before. On the fourth day his visions began in earnest.',
	'He saw himself in a field of tall wheat, but as he approached himself, the wheat grew until he was a tiny ant wandering among pillars of gold that reached to the roof of a blue temple.',
	'How had he ever been unhappy, he wondered. If only he had a little water, that would be all he would need, and he would be happier than any other day of his life.',
	'It is the superabundance of things that leads to pain, he thought.',
	'It is the abundance of goods that makes you sick, the excesses of health and fortune that bring desire, the abundance of life that kills, and the abundance of concrete that would kill him.',
	'There were shadows forming in the middle of his vision in the middle of the day. He could feel himself dying.',
	'He rose himself up to find himself in the shadow of his recently executed brother. \'Hello brother\', the shadow said. \'Hello\', the exile croaked in reply.',
	'\'You look well for a dead man\', he told his brother, \'and I look like a terrible excuse for a living one\', said the exile.',
	'\'Why?\' he asked. \'Did you not trust me? If you had ever said anything, ever wanted anything other than to see your feet on firm ground, then maybe. It is you who made the choice, really.\'',
	'\'You dream only of solid things, you think only in terms of deeds and their repercussions.\'',
	'\'You do not see beyond the veil of immediate life. And what for, anyway? Why is it that, as you lay here dying, you think of ghosts?\'',
	'\'I am dead, and you are alive. So it is now that you develop a spiritual longing?\'',
	'\'You only found that there was something you were missing, and you want it, as you wanted everything: without the consequences that come with trying to achieve it.\'',
	'\'Do you think you could spill your blood to change the foundations of your precious ground?\'',
	'\'Are there any ideas in your head worth killing for? Ideas worth fighting for, ideas worth dying for, or even ideas worth considering?\'',
	'\'The desert on the moon, brother, is made of sand and dust as sharp as shards of glass. Be glad you have a soft smooth grave in which to lay your head comfortably.\'',
	'\'You would tell me that you denied me because I did not want something that I didn\'t even know the existence of?\'',
	'\'Perhaps we would have told you, perhaps you could have found out, but would you have been happy knowing and prepared for the worst?\'',
	'\'Dear brother, where did I go wrong, what should I have done?\'',
	'The shadow of his brother grew until it filled the sky, and the exile fell to his knees before him, now vaster than the horizon that would swallow him whole.',
	'But the worst has come and been, really. To be a coward and an exile is to be willing to crawl through hell for small gain.',
	'To endure a lifetime of anguish in order to avoid a needle prick; such is the nature of his character.',
	'Endurance is not alien to those who run away. Running is an endurance sport.',
	'\'You hold the knife in your hands, brother,\' said the sky. \'You have always held it there. You always have the power of a decision, the possibility to take reality in your hands and change it.\'',
	'The images of his brother disappeared, and the horizon, empty, endless stretched out before him in every direction, and against it he was the only upright thing.',
	'The bird disappeared over the edge of the world. He followed it, haltingly, slowly, towards some point on a line.',
	'If this was god\'s grace, it turned away when he saw he was unworthy. Only fools ascribe meaning to the flights of birds.',
	'There, on the horizon, he saw it. A glimpse, a sudden glint. At the base of the flight of the bird he found a tiny, muddy pool of water in a broken crack in the concrete.',
	'Around this precious pool of water, there was, coiled up in its own scales, a serpent the colour of cement.',
	'The serpent watched him with its silvered eyes. He slowly reached out and picked up a nearby fragment of the broken concrete ground.',
	'The snake slithered out of its coil, and rising up towards him, opened its mouth and began to speak.',
	'\'Who are you?\' asked the snake. \'What brings you to my water hole?\'',
	'\'I am an exile\', he said to the snake. \'How fascinating\', said the serpent. \'I have met some exiles in my time – of what sort are you, fight or fright, hunger or fear?\'',
	'He told the snake his story. \'I see\', said the serpent, drawing nearer. \'So you are indeed a coward\', and the exile backed away from the serpent as it approached.',
	'\'Then let me put you out of your misery; let me plant a kiss on your ashamed head, bowed to the ground, and relieve you of your burden.\'',
	'The coward looked at the snake. \'I will not give you an easy meal\'. \'You,\' replied the snake, \'are an ingrate unwilling to accept gifts. My venom is wasted on you.\'',
	'\'Yes, I suspect even venom would only serve to fill somewhat an empty cup.\' The exile fell over his own feet, and the snake rose up above him, as if to strike.',
	'The snake said: \'I have ended and saved the lives of many, but you are unworthy even of my kiss. Go!I will give you poison. Drink that water, and live another few days of pain in the desert.\'',
	'The snake turned itself, but the exile picked up the rock he had prepared to defend himself with, and raising the shard up high, brought it down upon the sliding creature\'s head.',
	'\'Coward!\' said the snake, \'you would not fight even a snake face to face\'.',
	'It struck, its bright white fangs lashing out and grazing his leg, and he fell backward. Filled with some desperate wish he smashed the rock down again, and the snake twitched its way to death.',
	'When he looked back at the ground he saw that the serpent he had seen had been an illusion, and there was nothing but the ripples of concrete dust, blown by the wind, surrounding the puddle of water in this carpark desert.',
	'He drank from the muddy puddle, and he felt, in his soul, by which he meant his stomach, the pure joy of water.',
	'Water in the desert. Was this a gift, or a curse to go on suffering in this place? His mind knew not, but he felt in his heart the happiness of the coward who lives another day.',
	'On the sixth day he saw a shadow on the horizon. He watched it, and felt for a moment the panicked sensation of someone cornered, cornered in an infinite plane.',
	'He began to run, began to stumble and fall as he tried to escape from the approaching shadow.',
	'No matter which direction he went, every time he looked around he saw that the spot was heading towards him.',
	'He felt the shadow rising up on his back, bigger now, and in the delirious ripples of the heat he thought he could make out the shape of a man.',
	'The shadow loomed, closer and closer, wove its way across the empty plain of the desert, never varying its course from where he was, or perhaps he was simply gone mad and running in circles.',
	'Trapped, skewered in the midday sun, he finally found a boulder and hid. He closed his eyes and tried to slow his thumping heart, telling it to be quiet.',
	'\'Hello stranger\', said the shadow, addressing itself to the boulder the exile hid behind. \'Will you come out and enjoy a drop of water with me?\'',
	'The exile crept out from behind his boulder. He saw now it was not a shadow but a scab of a man. His flesh was so burnt and reconstituted he resembled more a closed wound than anything else.',
	'Each article of this living wound\'s clothing was caked in some kind of old dried blood. Through his blistered, ulcerous flesh, he could discern the outline of a skull and two cataracted eyes.',
	'\'What do you want of me?\', the exile asked. \'Nothing\', said the wound. \'I want for nothing\', he spoke with a voice that matched his scar of appearance.',
	'\'I\'ve come to cheer you on, you know. Encouragement, such as only I can provide\', said the wound, and from within his crinkled fleshy clothing that seemed an extension of his twisted body he produced a waterskin.',
	'The exile, desperate, reached out his own blistered hands to the man and grasped, trembling, the bottle with his two hands. Close to the wound, the exile could smell his putrid aroma, a scent of burning flesh and hair.',
	'The wound spoke: \'Perhaps I was to fight a duel for some purpose, perhaps I stole a loaf of bread to survive, or perhaps I insulted some person who had done me wrong and they sought retribution.\'',
	'\'Or perhaps I unwisely challenged someone of great strength, or perhaps I rejected military service, or perhaps I did not have the heart to kill someone, or perhaps I wanted no part of anything of it.\'',
	'\'And then I ran away into the desert. I walked, an exile, and eventually I died, and the afterlife exiled me too for my unwillingness to give it its dues in blood, and so I kept on walking.\'',
	'\'Let me offer you what hope I can, exile: I am happy that in life I did not kill anyone, and the desert is its own kind of grace.\'',
	'The wound continued on its way, dragging its dry blistered flesh away from the exile towards another point on the endless circumference of the horizon.',
	'In the distance, its arms raised up towards the heavens, he saw a grey tree.',
	'A piece of wood in this endless miasma. What water could have fed this monstrous vein? Perhaps it was actually a stone. Perhaps it was just another vision.',
	'He approached the tree. For it was, most definitely, a tree. A singular grey and gnarled tree, no leaves on its branches, more like a piece of the concrete than an organism.',
	'The tree had grown, somehow, in between the cracked face of the vast concrete incline. It had wedged itself in the ancient landscape and rendered the ground to make a place to live, and too to die.',
	'That night, beneath the tree, he was finally able to raise a flame from the dry wood. He sat watching the trickling flame, and slowly the fire ate the tree, disappearing branch by branch into smoke.',
	'Then, as he nodded off to sleep, his friend appeared before him, raised himself from the fire, his eyes ablaze like an ifrit, and grabbed the exile\'s collar. He spoke with a voice like charcoal on steel.',
	'\'Coward. Avenge me. Avenge us. I should be glad you are not dead? I wish you were, or perhaps I wish you had died in my place that I might keep on, instead of watching you stumble around this piece of paper.\'',
	'\'This is not a story, this is an echo of what could have been great deeds. You are a hollow tree trunk, the bark around the living thing that grew and raised itself out from the dirt.\'',
	'\'You are living the echo of other people\'s lives, always in the shadows. Why can\'t you raise yourself up even a little?\'',
	'\'I used to feel pity for you, I used to think – naively – that you would be a great man if you lived without the chains of this world. But you are the forger of your own chains, aren\'t you? A coward.\'',
	'\'Why are your eyes like coals?\' \'Because we failed to overturn the foundations of the world, and so we are cursed, we are not free in death from our own judgement. We are never free of regret.\'',
	'\'I will not ask you to overturn the world. If you ever considered yourself a friend of mine, I hope that you kill yourself. Only that would restore your honour.\'',
	'On the fifth day the assassin came from the city. He introduced himself politely to the exile, who stood at a distance, a rock in his hand.',
	'He threw the rock at the assassin and ran. The assassin fired no gun into his receding back, but began to walk towards him.',
	'After the assassin had disappeared over the curve of the world, the exile slowed and changed his direction. Within the hour, the assassin appeared again, walking steadily towards him.',
	'The exile watched the assassin over his shoulder, approaching constantly no matter the direction the exile turned, nor the speed he ran at, and he could feel death coming towards him.',
	'The assassin did not run, did not travel by horse. But every time the exile would run further and then stop, the assassin would reappear, incrementally closing the distance between the exile and himself.',
	'This game was some form of hunt, slowly closing the loop of a linear noose around the exile\'s neck. This assassin was an agent of death as constant as the horizon.',
	'Was this fun for the assassin? Was it fun to stalk prey, to stalk a coward over the surface of the earth? The exile cried out, wasted precious water in tears, and stumbled onward over the concrete plane.',
	'When he awoke on the twelfth day he felt the sudden gust of cool air and the smell of salt. Standing he saw, far in the distance, the tiny bright white glimmer of light reflected off water.',
	'As he moved on, closer and closer, he gradually found a line. Another line; a line that like a scrolling credit scene pushed itself closer to him with each crashing wave.',
	'Upon the shoreline was a jumbled chaos of tetrapods forming a sea wall, a structure nearly as insane as the concrete desert, as if some god had played a game of jacks upon the earth.',
	'No person he knew of had ever reached this far. Or nobody had returned to tell of it. He fell to his knees before the enormous tetrapods, and washed his face in the salty spray of the ocean.',
	'Upon the tetrapods that lined the concrete beach was some kind of algae, some variety, he hoped, of seaweed. He ate it. Its mushy absence of texture was more beautiful than any food he had ever eaten.',
	'In the distance he thought he spied a different part of the beach. Some enormous shape seen from a distance.',
	'As he approached the shape, he saw it was an enormous wreck, a vast vessel, and all along the shore and out to sea were a hundred more, vast hulking ruins in the shallows of the concrete sea.',
	'As he neared, he thought it so enormous it defied his sense of perspective.',
	'It was a smooth dark blue, but rippled and ridged like cloth. At its rear it descended, rusting and hulking into the ocean. Its front was raised above the tetrahedrons, an enormous steel tower to the sky.',
	'All along its length were panels, as if it were constructed out of sheets. It seemed inconceivable that this was also a work of humanity, but it must be: the work of the people who built this empty concrete wasteland.',
	'In the shadow of the hulk he met a traveller who spoke a foreign language. He had upon his back a set of steel panels that seemed to the exile exactly like those of the vessels.',
	'In the dawn he watched the traveller ascend the great steel vessels and emerge, hours later, carrying some small panel or other.',
	'The traveller was collecting some seemingly innocuous pieces of these vast anonymous constructions. It was something incomprehensible to him.',
	'The exile parted from the traveller. He had no desire to see people any more. The concrete beach had become his home.',
	'He was the exile, and he had come to fill his role. He would wander among the vast ruins of this old world and his memories.'
	];

	//the bit iterativeScript() actually runs is in this second function
	return function(selector) 
	{
		var thisIterator;
		var script;

		switch (selector)
		{
			case 'graham': thisIterator = grahamTextIterator; script = grahamText; break;
			case 'aj': thisIterator = ajPillIterator; script = ajPill; break;
		}

		drawText(script[thisIterator]);
		thisIterator = (thisIterator+1)%script.length;

		switch (selector)
		{
			case 'graham': grahamTextIterator = thisIterator; break;
			case 'aj': ajPillIterator = thisIterator; break;
		}
	}
})();

//similar deal here
var randomFragments = (function()
{
	var fragments = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'phi', 'omega'];

	return function()
	{
		//pick a random one to display
		drawText(fragments[Math.floor(Math.random() * fragments.length)]);
	}
})();

function initAudio()
{
	// audioListener = new THREE.AudioListener();
	// camera.add(audioListener);
	
	// hitSound = new THREE.Audio(audioListener);
	// var audioLoader = new THREE.AudioLoader();
	// audioLoader.load('./sound/hit.ogg', function(audioBuffer)
	// {
	// 	hitSound.setBuffer(audioBuffer);
	// 	hitSound.setVolume(0.5);
	// });
}

function randomWithinBoundary()
{
	return (Math.random() - 0.5) * planeSize * 0.8;
}