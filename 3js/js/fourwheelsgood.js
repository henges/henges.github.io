///<reference path="../typings/globals/three/index.d.ts" />

	'use strict';
	
	Physijs.scripts.worker = '/js/physijs_worker.js';
	Physijs.scripts.ammo = '/js/ammo.js';
	
	var initScene, scene, camera, car={};
	
	var renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( renderer.domElement );

	initScene = function() 
	{
		scene = new Physijs.Scene;
		
		//PLATFORM INIT
		var pf = 4.2;  //platform friction
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
    	new THREE.MeshLambertMaterial(), pf, pr  
 		 );
  		var physiPlatform = new Physijs.CylinderMesh(platformGeometry, physiPlatformMaterial, 0 );
  		physiPlatform.name = "physicalPlatform";
  		physiPlatform.position.set(0, -0.5, 0);
  		physiPlatform.visible = false;
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
		scene.add( camera );
		var controls = new THREE.OrbitControls(camera, renderer.domElement);
		
		//CAR INIT
		var bfpx = 0;
		var bfpy = 1.5;
		var bfpz = 0;

		var car_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ color: 0xff6666 }),
			.8, // high friction
			.1 // low restitution
		);
  		car.frame = new Physijs.BoxMesh(
			  	new THREE.CubeGeometry( 4, 1, 2 ),
				car_material,
				1000
				);
  		//car.frame.name = "frame";
  		//car.frame.componentOf = "car";
  		car.frame.position.set( bfpx ,bfpy,bfpz);
		car.frame.castShadow = true;
		 
		var carInteriorGeometry = new THREE.BoxGeometry( 2, 1, 2);
  		var carInteriorMaterial = Physijs.createMaterial( new THREE.MeshStandardMaterial({ color: 0x777777 }), 50, 50 );
 		car.interior = new Physijs.BoxMesh(carInteriorGeometry, carInteriorMaterial, 50 );
  		//car.interior.name = "interior";
  		car.interior.visible = false;  //(if visible, edges stick out from rounded frame)
 		//car.interior.componentOf = "car"; 
  		car.interior.position.set( bfpx, bfpy, bfpz );
  		car.frame.add(car.interior);

		
		//trolley
		var loader = new THREE.GLTFLoader();
			
		loader.load('/models/trolleythree.glb', function(gltf)
		{
			car.body = gltf.scene;
			//car.body.name = "body";
			//car.body.componentOf = "car";
			car.body.castShadow = true;
			// car.body.position.y -= 1.1;
			
			car.frame.add(car.body);
		},
			function(xhr){}, function(error){}
		);
		scene.add( car.frame );

		car.frame.material.visible = false;

		var wheel_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ color: 0x444444 }),
			.5, // friction
			0.9 //  restitution
			);
		var wheel_geometry = new THREE.CylinderGeometry( 0.5, 0.5, 0.25, 16 );
		// var wheel_geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);

		//original valx-s
        var valx = 1.3;	//maybe change these to const?
		var valy = 0.8;
		var valz = 1.6;

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
                        (pos == 2 || pos == 3) ? -valx : valx, 
                        valy, 
                        (pos % 2 === 1) ? -valz : valz);
			wheel.receiveShadow = wheel.castShadow = true;
            scene.add( wheel );
            
            return wheel;
		}

		function constraintConstructor(wheel, car, side)
		{
            var pos = getPos(side);
            var constrVector = new THREE.Vector3( 
                        (pos == 2 || pos == 3) ? -valx : valx, 
                        valy, 
                        (pos % 2 === 1) ? -valz : valz);

            var constraint = new Physijs.DOFConstraint(
                             wheel, 
                             car, 
                             constrVector);
			scene.addConstraint( constraint );
			constraint.setAngularLowerLimit({ x: 0, y: 0, z: (pos == 2 || pos == 3) ? 0.5 : 0 });
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
					car.wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, 1, 200 );
					car.wheel_fl_constraint.enableAngularMotor( 1 );
					car.wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, 1, 200 );
					car.wheel_fr_constraint.enableAngularMotor( 1 );
					break;
				
				case 39:
					// Right
					car.wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -1, 200 );
					car.wheel_fl_constraint.enableAngularMotor( 1 );
					car.wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -1, 200 );
					car.wheel_fr_constraint.enableAngularMotor( 1 );
					break;
				
				case 38:
					// Up
					car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, 5, 2000 );
					car.wheel_bl_constraint.enableAngularMotor( 2 );
					car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, 5, 2000 );
					car.wheel_br_constraint.enableAngularMotor( 2 );
					break;
				
				case 40:
					// Down
					car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, -5, 2000 );
					car.wheel_br_constraint.enableAngularMotor( 2 );
					car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, -5, 2000 );
					car.wheel_bl_constraint.enableAngularMotor( 2 );
					break;
			}
		});

		document.addEventListener('keyup', function( ev ) 
		{
			switch( ev.keyCode ) 
			{
				case 37:
					// Left
					car.wheel_fl_constraint.configureAngularMotor( 1, 0, 0, 1, 200 );
					car.wheel_fl_constraint.disableAngularMotor( 1 );
					car.wheel_fr_constraint.configureAngularMotor( 1, 0, 0, 1, 200 );
					car.wheel_fr_constraint.disableAngularMotor( 1 );
					break;
				
				case 39:
					// Right
					car.wheel_fl_constraint.configureAngularMotor( 1, 0, 0, 1, 200 );
					car.wheel_fl_constraint.disableAngularMotor( 1 );
					car.wheel_fr_constraint.configureAngularMotor( 1, 0, 0, 1, 200 );
					car.wheel_fr_constraint.disableAngularMotor( 1 );
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

		var ambientLight = new THREE.AmbientLight(0xffffff, 1);
		scene.add(ambientLight);
			
		requestAnimationFrame( render );
		scene.simulate();
	};

	window.onload = initScene();
	function render() {
		scene.simulate(); // run physics
		renderer.render( scene, camera); // render the scene
		requestAnimationFrame( render );
	};
	render();