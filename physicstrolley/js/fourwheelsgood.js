///<reference path="../typings/globals/three/index.d.ts" />

'use strict';

Physijs.scripts.worker = '/physicstrolley/js/physijs_worker.js';
Physijs.scripts.ammo = '/physicstrolley/js/ammo.js';

//Global constants for debugging.
var planeSize = 50;
var boundarySize = (planeSize/2) * 0.9;
var showPhysicsBoxes = false;
var boundary;

//Scene constants, including player char.
var initScene, scene, camera, goal, car={};
var wheelsArr = [];
//Static objects (physics-only interactions).
var chair = {};
var randomiserArray = [];
//floor array is in global scope since it's accessed in multiple functions
var floor = [];
var tileHeight=100;
var tileWidth=100;

var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function initScene() 
{
	scene = new Physijs.Scene;
	//scene.setGravity (new THREE.Vector3(0, 0, 0));
	var axesHelper = new THREE.AxisHelper(5);
	scene.add(axesHelper);

	initPlatform();
	car = initTrolley(car);
	initCamera();
	initLights();
	initSkybox();
	spawnChair();
	// TerrainMatrix();


	requestAnimationFrame( render );
};

window.onload = initScene();

//the position we want our camera in on each frame
//var curTarget = new THREE.Vector3(0,0,0);	//initialise in global scope to avoid unnecessary reallocations
//var lerpLevel = 0.1;						//the rate of lerping, i.e. 0.1 will move 10% closer to the goal each time 
var camY = 40;								//manually move camera upwards
var camZ = 40;
var camX = 20;
//scene.fog = new THREE.FogExp2( 0xffffff, 0.03 );
render();
gameStep();

function gameStep()
{
	// randomiseObjects();
	// setTimeout(gameStep, 1000)
}

function render() 
{
	scene.simulate(); // get state of physics simulation

	goal.add (camera);
	//curTarget.setFromMatrixPosition(goal.matrixWorld);	//goal.position is relative to the trolley - .matrixWorld tells us its 'global transform', which is to say, its offset from (0,0,0). 
	//camera.position.setToMatrixPosition(goal.matrixWorld);
	//camera.position.lerp(curTarget, lerpLevel);			//won't do anything if (vector3) camera.position == curTarget
	camera.lookAt(car.frame.position);					//angle the camera back at the trolley if new curTarget
	camera.position.y = camY; 							//manually move the camera up to get a wider view
	camera.position.z = camZ;
	camera.position.x = camX;
	
	// if (car !== undefined && car !== null) moveWithCamera();
	checkBoundary();

	renderer.render(scene, camera); // render the scene
	requestAnimationFrame( render );
};

function checkBoundary()
{
	//in each instance we place them a little further away from the boundary
	//so that we don't get stuck in an infinite loop

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
}

function updateWheels()
{
	// for (var i = 0; i < wheelsArr.length; i++)
	// {
	// 	wheelsArr[i].position = car.frame.position;
	// 	var offset = new THREE.Vector3();

	// 	switch (i)
	// 	{
	// 		case 0: offset.set(-1, 0.3, 0.7); break;
	// 		case 1: offset.set(-1, 0.3, -0.7); break;
	// 		case 2: offset.set(1, 0.3, 0.95); break;
	// 		case 3: offset.set(1, 0.3, -1); break;
	// 	}

	// 	wheelsArr[i].position.add(offset);
	// 	wheelsArr[i].__dirtyPosition = true;
	// }

	//using this code above would have been nice, but in truth, getting this done is a massive PITA
	//due to how wheels are implemented in physijs. 

	wheelsArr[0].position.addVectors(car.frame.position, new THREE.Vector3(-1, 0.3, 0.7));
	wheelsArr[0].__dirtyPosition = true;
	wheelsArr[1].position.addVectors(car.frame.position, new THREE.Vector3(-1, 0.3 -0.7));
	wheelsArr[1].__dirtyPosition = true;
	wheelsArr[2].position.addVectors(car.frame.position, new THREE.Vector3(1, 0.3, 0.95));
	wheelsArr[2].__dirtyPosition = true;
	wheelsArr[3].position.addVectors(car.frame.position, new THREE.Vector3(1, 0.3, -1));
	wheelsArr[3].__dirtyPosition = true;
}

/*function TerrainMatrix()
{   
	var tileRowNumber = 3;
		   
	var xPos=0;
	//we want a 3 by 3 matrix
	for (var row = 0; row<3; row++)
	{
		//position tiles behind, underneath, and in front of camera
		switch (row)
		{
			case 0: xPos = -tileWidth; break;
			case 1: xPos = tileWidth; break;
			case 2: xPos = 0; break;
		}

		for (var z = tileHeight; z > (tileHeight * -tileRowNumber); z-=tileHeight ) 
		{	var pff =10;
			var prr=0;
			var physPlatGeo = new THREE.BoxGeometry(tileHeight, 2, tileWidth);
			var physPlatformMaterial = Physijs.createMaterial(
				new THREE.MeshStandardMaterial({ color: 0xffffff, shading:THREE.FlatShading}), 
				pff, prr);
			var physPlatform = new Physijs.BoxMesh(physPlatGeo, physPlatformMaterial, 0 );
			physPlatform.position.x = xPos;
			physPlatform.position.z = z;
			physPlatform.position.y -= 1;
			scene.add(physPlatform);
			floor.push (physPlatform);
/*
			var panelGeometry = new THREE.BoxGeometry(tileHeight, 2, tileWidth);
			var panel = new THREE.Mesh( panelGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, shading:THREE.FlatShading}) );
			//rotate 90 degrees around the xaxis so we can see the terrain
			//panel.rotation.x = -Math.PI/-2;
			// Then set the z position to where it is in the loop (distance of camera)
			panel.position.x = xPos;
			panel.position.z = z;
			panel.position.y -= 0.9;
			
			//add the ground to the scene
			scene.add(panel);
			//finally push it to the floor array
			floor.push(panel);
			
		}
	}
}

function moveWithCamera()
{
	// loop through each of the 3 floors
	for(var i=0; i<floor.length; i++) 
	{
		//if the camera has moved past the entire square, move the square
		if((floor[i].position.z - 100) > car.frame.position.z)
		{		
			floor[i].position.z-=200;
		}
		else if((floor[i].position.z + tileHeight) < car.frame.position.z)
		{	
			floor[i].position.z+=(tileHeight*2);
		}
	}
}
*/
function initPlatform()
{
	var pf = 10;  //platform friction
	var pr = 3;  //platform restitution

	//var platform;
	var platformDiameter = planeSize;
	var platformRadiusTop = platformDiameter * 0.5;  
	var platformRadiusBottom = platformDiameter * 0.5 + 0.2;
	var platformHeight = 1;
	var platformSegments = 85;

	//cylindrical platform
	// var platform = new THREE.CylinderGeometry( 
	// 	platformRadiusTop, 
	// 	platformRadiusBottom, 
	// 	platformHeight, 
	// 	platformSegments 
	// 	);

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
	var lightD1 = new THREE.DirectionalLight( 0xFFFFFF, 3 );
  	lightD1.position.set( 100, 50, 50 );
  	lightD1.castShadow = true;
	// lightD1.shadow.mapSize.width = 1000;  // default
	// lightD1.shadow.mapSize.height = 1000; // default
	// lightD1.shadow.camera.near = 0.5;    // default
	// lightD1.shadow.camera.far = 500;     // default
  	lightD1.shadow.camera.left = -100;
	lightD1.shadow.camera.top = -100;
  	lightD1.shadow.camera.right = 100;
  	lightD1.shadow.camera.bottom = 100;
  	lightD1.shadow.camera.near = 0.1;
  	lightD1.shadow.camera.far = 1000;
  	lightD1.shadow.mapSize.height = lightD1.shadow.mapSize.width = 1000;
  	scene.add( lightD1 );
  
	//var directionalLight = new THREE.DirectionalLight( 0xffffff, 5 );
	//scene.add( directionalLight );

	//var light = new THREE.PointLight( 0xffffff, 5, 5 );
	//light.position.set( -5, 5, 5 );
	//scene.add( light );

	//var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	//scene.add(ambientLight);
}

function initCamera()
{
	camera = new THREE.PerspectiveCamera(
		35,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.position.set( 0, 0, 0 );
	// camera.position.set(2.2711018791473263, -5.443933926576433, -0.018602354820028255); //debug position
	camera.lookAt( scene.position );
	scene.add(camera);
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
		.1  // low restitution
	);
	box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 12.5, 1, 12.5 ),
		box_material,
		10
	);
	box.position.set (-10, 15, -10);

	//legs (front & back, left & right)
	legfl = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legfl.position.set (6, -5, -4);
	box.add (legfl);

	legfr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legfr.position.set (-6, -5, -4);
	box.add (legfr);

	legbr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legbr.position.set (4, -5, 6);
	legbr.rotation.x = - Math.PI / 12;
	box.add (legbr);

	legbl = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
		box_material,
		10
	);
	legbl.position.set (-4, -5, 6);
	legbl.rotation.x = - Math.PI / 12;
	box.add (legbl);

	//chair back
	back = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 10, 10, 0.5 ),
		box_material,
		10
	);
	back.position.set(0, 5, 7.5);
	back.rotation.x = Math.PI/14;
	box.add (back);

	//arms (left and right)
	arml = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 8, 1 ),
		box_material,
		10
	);
	arml.position.set (6, 2, -3);
	//arml.rotation.x = - Math.PI / 12;
	box.add (arml);

	
	armr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 8, 1 ),
		box_material,
		10
	);
	armr.position.set (-6, 2, -3);
	//arml.rotation.x = - Math.PI / 12;
	box.add (armr);


	//otherarmbits
	armll = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 12, 1 ),
		box_material,
		10
	);
	armll.position.set (6, 7, 2.5);
	armll.rotation.x = Math.PI / 2.3;
	box.add (armll);

	armrr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 12, 1 ),
		box_material,
		10
	);
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
	randomiserArray.push(chair);
	scene.add (chair);	
}
	
function randomiseObjects()
{
	//called when the user travels past the edge of our infinite plane,
	//or on some other as yet unknown condition

	var object;

	for (object of randomiserArray)
	{
		//randomise each object's x&z coordinates
		// object.position.x = (Math.random() * planeSize) % planeSize;
		// object.position.z = (Math.random() * planeSize) % planeSize;

		object.position.x = Math.random() * 100;
		object.position.z = Math.random() * 100;

		//fling!
		object.position.y = 15;
		object.__dirtyPosition = true;
	}
}