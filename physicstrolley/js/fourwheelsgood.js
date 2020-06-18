///<reference path="../typings/globals/three/index.d.ts" />

'use strict';
	
Physijs.scripts.worker = '/physicstrolley/js/physijs_worker.js';
Physijs.scripts.ammo = '/physicstrolley/js/ammo.js';

var initScene, scene, camera, goal, car={};

var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

initScene = function() 
{
	scene = new Physijs.Scene;
	
	//PLATFORM INIT
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


	//CAMERA INIT
	camera = new THREE.PerspectiveCamera(
		35,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.position.set( 10, 10, 10 );
	// camera.position.set(2.2711018791473263, -5.443933926576433, -0.018602354820028255); //debug position
	camera.lookAt( scene.position );
	scene.add(camera);
	// var controls = new THREE.OrbitControls(camera, renderer.domElement);
	
	//CAR INIT
	var bfpx = 0;
	var bfpy = 0.5;
	var bfpz = 0;

	var car_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.8, // high friction
		.1 // low restitution
	);
	car.frame = new Physijs.BoxMesh(
			new THREE.CubeGeometry( 1.5, 0.1, 1.5 ),
		car_material,
		1000
		);
	  //car.frame.name = "frame";
	  //car.frame.componentOf = "car";
	car.frame.position.set( bfpx , 0.2, bfpz);
	car.frame.castShadow = true;
	 
	var carInteriorGeometry = new THREE.BoxGeometry( 1.5, 0.1, 1.5);
	var carInteriorMaterial = Physijs.createMaterial( new THREE.MeshStandardMaterial({ color: 0x777777 }), 50, 50 );
	car.interior = new Physijs.BoxMesh(carInteriorGeometry, carInteriorMaterial, 50 );
	//car.interior.name = "interior";
	car.interior.material.visible = false;  //(if visible, edges stick out from rounded frame)
	 //car.interior.componentOf = "car"; 
	car.interior.position.set( 0, 2, 0 );
	car.frame.add(car.interior);

	goal = new THREE.Object3D();
	car.frame.add( goal );        
	// goal.position.set(15, 5, 0); 	//target position for the camera
	goal.position.set(20, -40, 0)	//for more rotation: (20, -40, 0)
	
	//trolley
	var loader = new THREE.GLTFLoader();
		
	loader.load('/physicstrolley/models/trolleythree.glb', function(gltf)
	{
		car.body = gltf.scene;
		//car.body.name = "body";
		//car.body.componentOf = "car";
		car.body.castShadow = true;
		//car.body.position.y = -0.2;
		
		car.frame.add(car.body);
	},
		function(xhr){}, function(error){}
	);
	scene.add( car.frame );

	car.frame.material.visible = false;

	var wheel_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xffffff }),
		.7, // friction
		0.1 //  restitution
		);
	var wheel_geometry = new THREE.CylinderGeometry( 0.25, 0.25, 0.2, 16 );
	// var wheel_geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16); //small wheels

	//original valx-s
	var valx = 1;	//maybe change these to const?
	var valy = 0.3;
	var valz = 1;

	//experimental values for small wheel position
	// var valx = 1.0;	
	// var valy = 0.8;
	// var valz = 0.9;
	
	//left % 2 == 0, right % 2 == 1

	car.wheel_fl = wheelConstructor('fl');
	car.wheel_fl_constraint = constraintConstructor(car.wheel_fl, car.frame, 'fl');
	car.wheel_fr = wheelConstructor('fr');
	car.wheel_fr_constraint = constraintConstructor(car.wheel_fr, car.frame, 'fr');
	car.wheel_bl = wheelConstructor('bl');
	car.wheel_bl_constraint = constraintConstructor(car.wheel_bl, car.frame, 'bl');
	car.wheel_br = wheelConstructor('br');
	car.wheel_br_constraint = constraintConstructor(car.wheel_br, car.frame, 'br');

	function wheelConstructor(side)
	{
		var pos = getPos(side);
		var wheel = new Physijs.CylinderMesh(
					wheel_geometry,
					wheel_material,
					500);
		wheel.rotation.x = Math.PI / 2;
		wheel.position.set( 
					(pos < 4) ? -valx : valx, 
					valy, 
					(pos % 2 === 1) ? -valz : valz);
		if (pos === 2) wheel.position.z -= 0.3;
		if (pos === 3) wheel.position.z += 0.3;
		if (pos === 4) wheel.position.z -= 0.05;
		wheel.receiveShadow = wheel.castShadow = true;
		scene.add( wheel );
		
		return wheel;
	}

	function constraintConstructor(wheel, car, side)
	{
		var pos = getPos(side);
		var constrVector = new THREE.Vector3( 
					(pos < 4) ? -valx : valx, 
					valy, 
					(pos % 2 === 1) ? -valz : valz);
		if (pos === 2) constrVector.setZ(valz - 0.3);
		if (pos === 3) constrVector.setZ(-valz + 0.3);
		if (pos === 4) constrVector.setZ(valz - 0.05);

		var constraint = new Physijs.DOFConstraint(
						 wheel, 
						 car, 
						 constrVector);
		scene.addConstraint( constraint );
		constraint.setAngularLowerLimit({ x: 0, y: 0, z: (pos < 4) ? 0.5 : 0 });
		constraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
		
		return constraint;
	}

	function getPos(side)
	{
		return (side === 'fl') ? 2 : (side === 'fr') ? 3 : (side === 'bl') ? 4 : (side === 'br') ? 5 : 0;
	}
	
	document.addEventListener('keydown', function( ev ) 
	{
		switch( ev.keyCode ) 
		{
			case 37:
				// Left
				car.wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, 20, 200 );
				car.wheel_fl_constraint.enableAngularMotor( 1 );
				car.wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, 20, 200 );
				car.wheel_fr_constraint.enableAngularMotor( 1 );
				break;
			
			case 39:
				// Right
				car.wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -20, 200 );
				car.wheel_fl_constraint.enableAngularMotor( 1 );
				car.wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -20, 200 );
				car.wheel_fr_constraint.enableAngularMotor( 1 );
				break;
			
			case 38:
				// Up
				car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, 20, 2000 );
				car.wheel_bl_constraint.enableAngularMotor( 2 );
				car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, 20, 2000 );
				car.wheel_br_constraint.enableAngularMotor( 2 );
				break;
			
			case 40:
				// Down
				car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, -20, 2000 );
				car.wheel_br_constraint.enableAngularMotor( 2 );
				car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, -20, 2000 );
				car.wheel_bl_constraint.enableAngularMotor( 2 );
				break;
		}
	});


	// https://github.com/chandlerprall/Physijs/wiki/Constraints
	document.addEventListener('keyup', function( ev ) 
	{
		switch( ev.keyCode ) 
		{
			case 37:
				// Left
				car.wheel_fl_constraint.configureAngularMotor( 1, 0, 0, 20, 200 ); //motor 0 1 2 (x y z), low_limit, high_limit, target vel, max force
				// car.wheel_fl_constraint.disableAngularMotor( 1 );
				car.wheel_fr_constraint.configureAngularMotor( 1, 0, 0, 20, 200 );
				// car.wheel_fr_constraint.disableAngularMotor( 1 );
				break;
			
			case 39:
				// Right
				car.wheel_fl_constraint.configureAngularMotor( 1, 0, 0, 20, 200 );
				// car.wheel_fl_constraint.disableAngularMotor( 1 );
				car.wheel_fr_constraint.configureAngularMotor( 1, 0, 0, 20, 200 );
				// car.wheel_fr_constraint.disableAngularMotor( 1 );
				break;
			
			case 38:
				// Up
				car.wheel_bl_constraint.disableAngularMotor( 2 );
				car.wheel_br_constraint.disableAngularMotor( 2 );
				break;
			
			case 40:
				// Down
				car.wheel_bl_constraint.disableAngularMotor( 2 );
				car.wheel_br_constraint.disableAngularMotor( 2 );
				break;
		}
	});
		
	var directionalLight = new THREE.DirectionalLight( 0xffffff, 5 );
	scene.add( directionalLight );

	var light = new THREE.PointLight( 0xffffff, 10, 10 );
	light.position.set( -5, 5, 5 );
	scene.add( light );

	var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambientLight);

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
		
	requestAnimationFrame( render );
	scene.simulate();
};

window.onload = initScene();

//the position we want our camera in on each frame
var curTarget = new THREE.Vector3(0,0,0);	//initialise in global scope to avoid unnecessary reallocations
// var lerpLevel = 0.8; //for more rotation: 0.1
// var camY = 4;		 //for more rotation: 5
var lerpLevel = 0.1;
var camY = 5;

// scene.addEventListener('update', function()
// {
// 	curTarget.setFromMatrixPosition(goal.matrixWorld);	
// 	// camera.position.lerp(curTarget, lerpLevel);			
// 	// camera.lookAt(car.frame.position);					
// 	// camera.position.y += camY; 	
// });

function render() {

	scene.simulate(); // get state of physics simulation

	curTarget.setFromMatrixPosition(goal.matrixWorld);	//goal.position is relative to the trolley - .matrixWorld tells us its 'global transform', which is to say, its offset from (0,0,0). 
	camera.position.lerp(curTarget, lerpLevel);			//won't do anything if (vector3) camera.position == curTarget
	camera.lookAt(car.frame.position);					//angle the camera back at the trolley if new curTarget
	camera.position.y += camY; 							//manually move the camera up to get a wider view

	renderer.render(scene, camera); // render the scene
	requestAnimationFrame( render );
};
// gameStep();
render();