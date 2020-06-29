///<reference path="../typings/globals/three/index.d.ts" />

'use strict';

Physijs.scripts.worker = '/physicstrolley/js/physijs_worker.js';
Physijs.scripts.ammo = '/physicstrolley/js/ammo.js';

//Global constants for debugging.
var planeSize = 500;
var boundarySize = (planeSize/2) * 0.9;
var showPhysicsBoxes = false;

//Scene constants, including player char.
var initScene, scene, camera, goal, car={}, cap, pill ={}, cig, light={}, chair={};
var wheelsArr = [];

//Static objects (physics-only interactions).
var objectsArray = [];

//text stuff
var textDisplaying = false;
var textId = "message";
var allowSameModelTalk = true;
var allowNewModelTalk = true;
var last_collided = "nothing";

//for duping OrbitControls into letting us rotate around the trolley
var controls, fakeCamera, orbitControlsEnabled;

var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function initScene() 
{
	scene = new Physijs.Scene;
	scene.setGravity (new THREE.Vector3(0, -30, 0));

	initPlatform();
	initTrolley();
	initCamera();
	initLights();
	initSkybox();
	initTextListeners();
	spawnChair();
	spawnVend();
	spawnCup();
	spawnCan();
	spawnStraw();
	spawnPill();
	spawnBottlecap();
	spawnCig();

	spawnAcid();

	initOrbitControls()

	// drawText("no peace can be had<br>if nothing as such remains<br>with which to peacemake");

	requestAnimationFrame( render );
};

window.onload = initScene();

//scene.fog = new THREE.FogExp2( 0xff4666, 0.02 );
render();

function render() 
{
	scene.simulate(); // get state of physics simulation
	camera.lookAt(car.frame.position);					//angle the camera back at the trolley if new curTarget
	
	// if (car !== undefined && car !== null) moveWithCamera();
	checkBoundary();
	//var target = new THREE.Vector3();
	//car.frame.getWorldPosition(target);
	light.lightD1.position.x = car.frame.position.x-50;
	light.lightD1.position.z = car.frame.position.z-50;

	//fakeCamera is rotating around point 0,0,0. As such its values are already normalised,
	//so we can copy its position/rotation/quaternion, which will automatically apply it to
	//the real camera relative to the trolley.
	if (orbitControlsEnabled) camera.copy(fakeCamera);

	renderer.render(scene, camera); // render the scene
	requestAnimationFrame( render );
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
	controls.minAzimuthAngle = 0; // radians
	controls.maxAzimuthAngle = Math.PI; // radians
	controls.enablePan = false;

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
	wheelsArr[0].position.addVectors(car.frame.position, new THREE.Vector3(-1, 0.3, 0.7));
	wheelsArr[0].__dirtyPosition = true;
	wheelsArr[1].position.addVectors(car.frame.position, new THREE.Vector3(-1, 0.3 -0.7));
	wheelsArr[1].__dirtyPosition = true;
	wheelsArr[2].position.addVectors(car.frame.position, new THREE.Vector3(1, 0.3, 0.95));
	wheelsArr[2].__dirtyPosition = true;
	wheelsArr[3].position.addVectors(car.frame.position, new THREE.Vector3(1, 0.3, -1));
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
	light.lightD1.shadow.mapSize.height = light.lightD1.shadow.mapSize.width = 100;
	light.lightD1.target=car.frame;
	scene.add( light.lightD1 );
	scene.add( new THREE.CameraHelper( light.lightD1.shadow.camera ));
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
	camera.position.set( 0, 0, 0 );
	//camera.lookAt( scene.position );
	scene.add(camera);

	//attach to the trolley
	car.frame.add(camera);
    camera.position.set(50, 50, 25);
}

function initSkybox()
{
	var skyboxMaterials = [
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load('img/skybox/torture_rt.jpg'), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load('img/skybox/torture_lf.jpg'), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load('img/skybox/torture_up.jpg'), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load('img/skybox/torture_dn.jpg'), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load('img/skybox/torture_bk.jpg'), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load('img/skybox/torture_ft.jpg'), side: THREE.DoubleSide}),
	];
	var skyboxGeometry = new THREE.CubeGeometry(1000, 1000, 1000);
	var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
	scene.add(skybox);
}

function spawnChair()
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
	box.position.set (-10, 15, -10);

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
		box.monobloc.position.set (0.2, -9.9, -4);
		box.monobloc.rotation.y = Math.PI / 2;
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
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
	scene.add (chair);	
}

function spawnVend()
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
	vBox.position.set (50, 25, 50);

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/vend3.glb', function (gltf)
	{
		vBox.vend = gltf.scene;
		vBox.vend.position.set (0.4, -15, 0);
		vBox.vend.rotation.y = Math.PI / 2;
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
        });
		vBox.add (vBox.vend);
		scene.add (vBox);
		objectsArray.push(vBox);
	}
	);
	vBox.material.visible = showPhysicsBoxes;
}
function spawnCup ()
{
	var Cup;

	//initialise master physics box
	var Cup_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Cup = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 11, 9, 26, 8, 4 ),
		Cup_material,
		10
	);
	
	Cup.model = 'cup';

	Cup.position.set (25, 25, -25);

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/coffeecup.glb', function (gltf)
	{
		Cup.coffee = gltf.scene;
		Cup.coffee.position.set (0, -11.8, 0);
		Cup.coffee.rotation.y = Math.PI / 2;
		Cup.coffee.scale.set (8, 8, 8);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
        });
		Cup.add (Cup.coffee);
		scene.add (Cup);
		objectsArray.push(Cup);
	}
	);
	Cup.material.visible=showPhysicsBoxes;
}
function spawnCan ()
{
	var Can;

	//initialise master physics box
	var Can_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Can = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 5, 5, 14.5, 8 ),
		Can_material,
		10
	);

	Can.model = 'can';
	
	Can.position.set (-20, 25, 20);

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/can2.glb', function (gltf)
	{
		Can.coke = gltf.scene;
		Can.coke.position.set (0, -7, 0);
		Can.coke.rotation.y = Math.PI / 2;
		Can.coke.scale.set (1, 1, 1);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
        });
		Can.add (Can.coke);
		scene.add (Can);
		objectsArray.push(Can);
	}
	);
	Can.material.visible=showPhysicsBoxes;
}
function spawnStraw ()
{
	var Straw, Bit, Lip;

	//initialise master physics box
	var Straw_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.5  // low restitution
	);
	Straw = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 0.5, 0.5, 46, 8 ),
		Straw_material,
		10
	);
	Straw.model = 'straw';
	Bit = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 0.5, 0.5, 5, 8 ),
		Straw_material,
		10
	);
	Bit.model = 'straw';
	Lip = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry( 0.5, 0.5,15, 8 ),
		Straw_material,
		10
	);
	Lip.model = 'straw';
	Straw.position.set (75, 27, 0);
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
		Straw.bend.position.set (0, -23, 0);
		Straw.bend.rotation.y = Math.PI / 2;
		Straw.bend.scale.set (0.5, 0.5, 0.5);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
        });
		Straw.add (Straw.bend);
		scene.add (Straw);
		objectsArray.push(Straw);
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
				Physijs.createMaterial(new THREE.MeshLambertMaterial({ color: 0xff6666 }), .7, 1.25), 1);


			//position, rotation, and scale setup
			localPill.position.y = Math.random() * 50 + 25;
			localPill.position.x = (Math.random() - 0.5 )* planeSize ;
			localPill.position.z = (Math.random() - 0.5 )* planeSize ;

			localPill.rotation.set(
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2);
			localPill.scale.set (1.7, 1.7, 1.7);

			//misc setup
			localPill.model = 'pill';
			localPill.material.visible = showPhysicsBoxes;
			
			//add a unique copy of the model to the physi mesh
			localPill.add(gltf.scene.clone());

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
		1.25  // low restitution
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
		cig.lid.position.set (0, -5, 0);
		cig.lid.rotation.y = Math.PI / 2;
		cig.lid.scale.set (1.5, 1.5, 1.5);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
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
		1.25  // low restitution
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
		cap.top.position.set (0, -0.75, 0);
		cap.top.rotation.y = Math.PI / 2;
		cap.top.scale.set (0.5, 0.5, 0.5);
		gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
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
	for (var i = 0; i < 10; i++){
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
			case 32: if (textDisplaying) clearText(); break;
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
	text.style.backgroundColor = "black";
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
	if (typeof collided_with.model != 'undefined')
	{
		// console.log("" + collided_with.id);
		if (!allowSameModelTalk && collided_with.model === last_collided) return;
		if (!allowNewModelTalk) return;

		switch (collided_with.model)
		{
			case 'chair': iterativeScript(); break;
			case 'pill': drawText("i am the pill"); break;
			case 'cap': drawText("i am the cap"); break;
			case 'vending': drawText("i am the vending machine"); break;
			case 'cig': randomFragments(); break;
			case 'cup': drawText("i suppose at the bottom of it all,<br>i am a cup, but cannot i be more?"); break;
			case 'straw': drawText("i'm not strawmanning it's just how i am :P"); break;
			case 'can': drawText("man, why is it that most of these items are<br>three letter words starting with c?<br> ain't that strange, chief?"); break;
		}
		allowSameModelTalk = false;
		allowNewModelTalk = false;

		last_collided = collided_with.model;
		setTimeout(function(){allowSameModelTalk = true;}, 5000);
		setTimeout(function(){allowNewModelTalk = true;}, 2000);
	}
}

//isn't this wacky lookin syntax? it's called a 'self-invoking function'
//it's run when the program launches, and it outputs another function, which iterativeScript() becomes
var iterativeScript = (function() 
{
	var scriptIterator = 0;
	var script = ["in this approach", "text displays in a linear", 
				  "and furthermore looping", "fashion", "and also",
				  "you can fill in the script array like this and it still works, which is nice"];

	//the bit iterativeScript() actually runs is in this second function
	return function() 
	{
		drawText(script[scriptIterator]);
		scriptIterator = (scriptIterator+1)%script.length;
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