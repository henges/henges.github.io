///<reference path="../typings/globals/three/index.d.ts" />

'use strict';
	
Physijs.scripts.worker = '/physicstrolley/js/physijs_worker.js';
Physijs.scripts.ammo = '/physicstrolley/js/ammo.js';

var initScene, scene, camera, goal, chair, car={};

var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

function initScene() 
{
	scene = new Physijs.Scene;
	
	initPlatform();
	car = initTrolley(car);
	initCamera();
	initLights();
	initSkybox();
	spawnChair();
	
	
		
	requestAnimationFrame( render );
	// scene.simuslate();
};

window.onload = initScene();

//the position we want our camera in on each frame
var curTarget = new THREE.Vector3(0,0,0);	//initialise in global scope to avoid unnecessary reallocations
// var lerpLevel = 0.8; //for more rotation: 0.1
// var camY = 4;		 //for more rotation: 5
var lerpLevel = 0.1;
var camY = 5;

render();

function render() 
{
	scene.simulate(); // get state of physics simulation

	curTarget.setFromMatrixPosition(goal.matrixWorld);	//goal.position is relative to the trolley - .matrixWorld tells us its 'global transform', which is to say, its offset from (0,0,0). 
	camera.position.lerp(curTarget, lerpLevel);			//won't do anything if (vector3) camera.position == curTarget
	camera.lookAt(car.frame.position);					//angle the camera back at the trolley if new curTarget
	camera.position.y += camY; 						//manually move the camera up to get a wider view

	renderer.render(scene, camera); // render the scene
	requestAnimationFrame( render );
};

function initPlatform()
{
	var pf = 10;  //platform friction
	var pr = 0;  //platform restitution

	var platform;
	var platformDiameter = 170;
	var platformRadiusTop = platformDiameter * 0.5;  
	var platformRadiusBottom = platformDiameter * 0.5 + 0.2;
	var platformHeight = 1;
	var platformSegments = 85;

	var platformGeometry = new THREE.CylinderGeometry( 
		platformRadiusTop, 
		platformRadiusBottom, 
		platformHeight, 
		platformSegments 
		);

	var physiPlatformMaterial = Physijs.createMaterial(
								new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('img/graham.jpg')}), 
								pf, pr);
	var physiPlatform = new Physijs.CylinderMesh(platformGeometry, physiPlatformMaterial, 0 );
	physiPlatform.name = "physicalPlatform";
	physiPlatform.position.set(0, -0.5, 0);
	physiPlatform.visible = true;
	scene.add( physiPlatform );
}

function initLights()
{
	var directionalLight = new THREE.DirectionalLight( 0xffffff, 5 );
	scene.add( directionalLight );

	var light = new THREE.PointLight( 0xffffff, 10, 10 );
	light.position.set( -5, 5, 5 );
	scene.add( light );

	var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambientLight);
}

function initCamera()
{
	camera = new THREE.PerspectiveCamera(
		35,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	// car.frame.add(camera);
	camera.position.set( 0, 0, 0 );
	// camera.position.set(2.2711018791473263, -5.443933926576433, -0.018602354820028255); //debug position
	camera.lookAt( scene.position );
	scene.add(camera);
	// var controls = new THREE.OrbitControls(camera, renderer.domElement);
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

function spawnChair ()
{
	var box, legfl, legfr, legbr, legbl, back;
	var box_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
	.8, // high friction
	.1 // low restitution
	);
	box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 4, 1, 4 ),
	box_material,
	10
	);
	box.position.set (5, 10, 5);

	legfl = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 4, 1 ),
	box_material,
	10
	);
	legfl.position.set (1.5, -2.5, 1.5);
	box.add (legfl);
	var bfpx = -10;
    var bfpy = 0.5;
	var bfpz = 0;

	legfr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 4, 1 ),
	box_material,
	10
	);
	legfr.position.set (-1.5, -2.5, 1.5);
	box.add (legfr);

	legbr = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 4, 1 ),
	box_material,
	10
	);
	legbr.position.set (1.5, -2.5, -1.5);
	box.add (legbr);

	legbl = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 4, 1 ),
	box_material,
	10
	);
	legbl.position.set (-1.5, -2.5, -1.5);
	box.add (legbl);

	back = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 4, 3.5, 1.5 ),
	box_material,
	10
	);
	back.position.set (0, 2, 1.25);
	box.add (back);


	scene.add (box);	
	}
	
