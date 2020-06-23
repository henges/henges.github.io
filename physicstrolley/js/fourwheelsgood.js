///<reference path="../typings/globals/three/index.d.ts" />

'use strict';

//import { Loader } from "three";

	
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

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.render(scene, camera); // render the scene
	requestAnimationFrame( render );
};

function initPlatform()
{
	var pf = 10;  //platform friction
	var pr = 0;  //platform restitution

	//var platform;
	var platformDiameter = 170;
	var platformRadiusTop = platformDiameter * 0.5;  
	var platformRadiusBottom = platformDiameter * 0.5 + 0.2;
	var platformHeight = 1;
	var platformSegments = 85;

	var platform = new THREE.CylinderGeometry( 
		platformRadiusTop, 
		platformRadiusBottom, 
		platformHeight, 
		platformSegments 
		);

	var physiPlatformMaterial = Physijs.createMaterial(
								new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load('img/graham.jpg')}), 
								pf, pr);
	var physiPlatform = new Physijs.CylinderMesh(platform, physiPlatformMaterial, 0 );
	physiPlatform.name = "physicalPlatform";
	physiPlatform.position.set(0, -0.5, 0);
	physiPlatform.visible = false;
	scene.add(physiPlatform);

	var visiblePlatform = new THREE.Mesh( platform, new THREE.MeshStandardMaterial({ color: 0xff6666 }) );
  	visiblePlatform.name = "visiblePlatform"
  	visiblePlatform.position.set(0, -.5, 0);
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
//lightD1.shadow.mapSize.height = 1000; // default
//	lightD1.shadow.camera.near = 0.5;    // default
	//lightD1.shadow.camera.far = 500;     // default
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
	var box, legfl, legfr, legbr, legbl, arml, armll, armr, armrr, back;
	var box_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
	.8, // high friction
	.1 // low restitution
	);
	box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 12.5, 1, 12.5 ),
	box_material,
	10
	);
	box.position.set (-10, 15, -10);

	legfl = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 10, 1 ),
	box_material,
	10
	);
	legfl.position.set (6, -5, -4);
	box.add (legfl);
	var bfpx = -10;
    var bfpy = 0.5;
	var bfpz = 0;

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

	back = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 10, 10, 0.5 ),
	box_material,
	10
	);
	back.position.set (0, 5, 7.5);
	back.rotation.x = Math.PI/14;
	box.add (back);

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

	var loader = new THREE.GLTFLoader();
	loader.load ('/physicstrolley/models/monobloc.glb', function (gltf)
	{
		box.monobloc = gltf.scene;
		box.monobloc.position.set (0.2, -10, -4);
		box.monobloc.rotation.y = Math.PI / 2;
		gltf.scene.traverse( function ( child ) {

            if ( child.isMesh ) {

                child.castShadow = true;
                child.receiveShadow = false;

            }

        });
		box.add (box.monobloc)
	}
	);

	box.material.visible = false;
	scene.add (box);	
	}
	
