///<reference path="../typings/globals/three/index.d.ts" />

    // 'use strict';

    var DEGTORAD = 0.01745327;

    window.addEventListener('resize', function()
    {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
    });

    Physijs.scripts.worker = '/js/physijs_worker.js';
    Physijs.scripts.ammo = '/js/ammo.js';

    var initScene, render, renderer, scene, camera, anchor, vehicle, input, trolley;

    initScene = function() {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( renderer.domElement );
        
        //INIT_ENV
        scene = new Physijs.Scene;
        scene.setGravity(new THREE.Vector3( 0, -30, 0 ));

        //INIT_GROUND_MATERIAL
        var ground_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load( '../images/rocks.jpg' ) }),
			.8, // high friction
			.4 // low restitution
		);
		ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
        ground_material.map.repeat.set( 3, 3 );
        
        // var NoiseGen = new SimplexNoise;

		var ground_geometry = new THREE.PlaneGeometry( 300, 300, 100, 100 );
		for ( var i = 0; i < ground_geometry.vertices.length; i++ ) {
			var vertex = ground_geometry.vertices[i];
			//vertex.y = NoiseGen.noise( vertex.x / 30, vertex.z / 30 ) * 1;
		}
		ground_geometry.computeFaceNormals();
		ground_geometry.computeVertexNormals();

		// If your plane is not square as far as face count then the HeightfieldMesh
		// takes two more arguments at the end: # of x faces and # of z faces that were passed to THREE.PlaneMaterial
		var ground = new Physijs.HeightfieldMesh(
				ground_geometry,
				ground_material,
				0 // mass
		);
		ground.rotation.x = -Math.PI / 2;
		ground.receiveShadow = true;
		scene.add( ground );


        //INIT_PLATFORM
        // var pf = 4.2;  //platform friction
        // var pr = 0;  //platform restitution
        // var platform;
        // var platformDiameter = 170;
        // var platformRadiusTop = platformDiameter * 0.5;  
        // var platformRadiusBottom = platformDiameter * 0.5 + 0.2;
        // var platformHeight = 1;
        // var platformSegments = 85;

        // var platformGeometry = new THREE.CylinderGeometry( 
        //         platformRadiusTop, 
        //         platformRadiusBottom, 
        //         platformHeight, 
        //         platformSegments 
        //     );

        // var physiPlatformMaterial = Physijs.createMaterial(new THREE.MeshLambertMaterial({color: 0xff0000}), pf, pr);
        // var physiPlatform = new Physijs.CylinderMesh(platformGeometry, physiPlatformMaterial, 0 );
        // physiPlatform.name = "physicalPlatform";
        // physiPlatform.position.set(0, -5, 0);
        // // physiPlatform.visible = true;
        // scene.add( physiPlatform );


        //INIT_CAMERA
        camera = new THREE.PerspectiveCamera(
            35,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set( 10, 10, 10 );
        camera.lookAt( scene.position );
        scene.add( camera );
        
        //INIT_ANCHOR
        anchor = new Physijs.BoxMesh(
            new THREE.CubeGeometry( 1, 0.1, 1.5 ),
            new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true })
            
        );
        anchor.rotation.y = Math.PI/2;
        scene.add( anchor );


        //INIT_TROLLEY
        var loader = new THREE.GLTFLoader();
        
        loader.load('/models/trolleythree.glb', function(gltf)
        {
            trolley = gltf.scene;
            trolley.rotation.y= Math.PI/2;
            trolley.name = "trolleyMeshes";
            anchor.add (trolley);
            anchor.position.y = 5;

            // anchor.isObject3D = true;
            scene.add(anchor);
            //function(xhr){}, function(error){});

            vehicle = new Physijs.Vehicle(anchor, new Physijs.VehicleTuning
            (
                5.88,      //suspension stiffness
                0.50,       //suspension compression - below 1.50, falls through
                0.28,       //suspension damping
                1000,        //max suspension travel 
                15.5,       //friction slip
                1000        //max suspension force

            ));
            // console.log(vehicle);
            // vehicle.isObject3D = true;
            scene.add( vehicle );
            vehicle.world.position.y = 5;


            var wheel_material =  Physijs.createMaterial
            (
                new THREE.MeshLambertMaterial({ color: 0x444444 }),
                .8, // high friction
                .5 // medium restitution
            );
            // var wheel_material = new THREE.MeshBasicMaterial({color: 0xffffff});
            var wheel_geometry = new THREE.CylinderGeometry( 1, 1, 0.5, 16 );
            // wheel_geometry.rotateZ(90*DEGTORAD);
            // var wheel_geometry = new THREE.BoxGeometry(1,1,1);
            for ( var i = 0; i < 4; i++ ) 
            {
                vehicle.addWheel(
                    wheel_geometry,
                    wheel_material,
                    new THREE.Vector3(              //connection pointer vector
                        i % 2 === 0 ? -1.6 : 1.6,	//left or right side
                        0,
                        i < 2 ? 3.3 : -3.2			//back or front side
                    ),
                    new THREE.Vector3( 0, -1, 0 ), //wheel direction? if the y is not negative, trolley wont move
                    new THREE.Vector3( 0, 0, 1 ),  //wheel axle?
                    0.1, //suspension rest length
                    0.05, //radius of wheel
                    i < 2 ? true : false //front wheel
                );
            }

            input = {
                power: null,
                direction: null,
                steering: 0
            };
            document.addEventListener('keydown', function( ev ) {
            switch ( ev.keyCode ) {
                    case 37: // left
                    input.direction = 1;
                    break;

                    case 38: // forward
                    input.power = true;
                    break;

                    case 39: // right
                    input.direction = -1;
                    break;

                    case 40: // back
                    input.power = false;
                    break;
            }
            });
            document.addEventListener('keyup', function( ev ) {
                    switch ( ev.keyCode ) {
                    case 37: // left
                    input.direction = null;
                    break;

                    case 38: // forward
                    input.power = null;
                    break;

                    case 39: // right
                    input.direction = null;
                    break;

                    case 40: // back
                    input.power = null;
                    break;
                }
            });
        });

        //INIT_TROLLEY_MV_LOGIC
        scene.addEventListener('update', function () 
        {
            if ( input && vehicle ) {
                if ( input.direction !== null ) {
                    input.steering += input.direction / 50;
                    if ( input.steering < -.6 ) input.steering = -.6;
                    if ( input.steering > .6 ) input.steering = .6;
                }
                vehicle.setSteering( input.steering, 0 );
                vehicle.setSteering( input.steering, 1 );

                if ( input.power === true ) {
                    vehicle.applyEngineForce( 1 );
                } else if ( input.power === false ) {
                    vehicle.setBrake( 20, 2 );
                    vehicle.setBrake( 20, 3 );
                } else {
                    vehicle.applyEngineForce( 0 );
                }
            }
        }
        );

        
            
        //INIT_LIGHTS
        var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
        scene.add( directionalLight );

        var light = new THREE.PointLight( 0xffffff, 10, 1 );
        light.position.set( -5, 5, 5 );
        scene.add( light );

        var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);

        requestAnimationFrame( render );
    };

    render = function() {
        scene.simulate(); // run physics
        // if (isTrolleyLoaded) vehicle.applyEngineForce( 300 );
        renderer.render( scene, camera); // render the scene
        requestAnimationFrame( render );
        'update';
    };

    window.onload = initScene();