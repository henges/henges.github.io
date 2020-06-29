///<reference path="../typings/globals/three/index.d.ts" />
'use strict';

var rotationForce, accelerationForce, targetVelocity, stopVelocity, stopForce;

var initTrolley = function ()
{
    //CAR INIT

    var car_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0xff6666 }),
        .8, // high friction
        5 // low restitution
    );
    car.frame = new Physijs.BoxMesh(
            new THREE.CubeGeometry( 1.5, 0.1, 1.5 ),
            car_material,
            100
    );
    car.frame.position.set( 0 , 0.2, 0);
    car.frame.castShadow = true;
    // car.frame.material.visible = true;
    
    var carInteriorGeometry = new THREE.BoxGeometry( 3, 3, 1.5);
    var carInteriorMaterial = Physijs.createMaterial( new THREE.MeshStandardMaterial({ color: 0x777777 }), 0.8, 0.1 );
    car.interior = new Physijs.BoxMesh(carInteriorGeometry, carInteriorMaterial, 50 );
    car.interior.material.visible = false;                  //(if visible, edges stick out from rounded frame)
    car.interior.position.set( -0.10, 2, 0 );
    car.frame.add(car.interior);

    //trolley
    var loader = new THREE.GLTFLoader();
        
    loader.load('/physicstrolley/models/trolleythree.glb', function(gltf)
    {
        car.body = gltf.scene;
        car.body.castShadow = true;
        
        car.frame.add(car.body);
        
        gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
        });

        car.interior.addEventListener('collision', handleCollision);
        car.frame.addEventListener('collision', handleCollision);
    },
        function(xhr){}, function(error){}
    );
    scene.add( car.frame );

    car.frame.material.visible = false;
    car.frame.castShadow = true;
    car.frame.receiveShadow = false;
    var wheel_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0x000000 }),
        .7, // friction
        0.1 //  restitution
        );
    var wheel_geometry = new THREE.CylinderGeometry( 0.25, 0.25, 0.2, 16 );

    var valx = 1;	//maybe change these to const?
    var valy = 0.3;
    var valz = 1;

    var wheel_fl = wheelConstructor('fl');
    var wheel_fl_constraint = constraintConstructor(wheel_fl, car.frame, 'fl');
    var wheel_fr = wheelConstructor('fr');
    var wheel_fr_constraint = constraintConstructor(wheel_fr, car.frame, 'fr');
    var wheel_bl = wheelConstructor('bl');
    var wheel_bl_constraint = constraintConstructor(wheel_bl, car.frame, 'bl');
    var wheel_br = wheelConstructor('br');
    var wheel_br_constraint = constraintConstructor(wheel_br, car.frame, 'br');

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
        wheelsArr.push(wheel);
        
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
        return (side === 'fl') ? 2 : 
               (side === 'fr') ? 3 : 
               (side === 'bl') ? 4 : 
               (side === 'br') ? 5 : 
               0;
    }

    rotationForce = 100;
    accelerationForce = 200;
    stopForce = 5;
    targetVelocity = 35;
    stopVelocity = 0;

    document.addEventListener('keydown', function( ev ) 
    {
        switch( ev.keyCode ) 
        {
            case 37: case 65:
                // Left or A
                //which motor, low angle limit, high angle limit, target velocity, maximum force
                wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, targetVelocity, rotationForce );
                wheel_fl_constraint.enableAngularMotor( 1 );
                wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, targetVelocity, rotationForce );
                wheel_fr_constraint.enableAngularMotor( 1 );
                break;
            
            case 39: case 68:
                // Right or D
                wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -targetVelocity, rotationForce );
                wheel_fl_constraint.enableAngularMotor( 1 );
                wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -targetVelocity, rotationForce );
                wheel_fr_constraint.enableAngularMotor( 1 );
                break;
            
            case 38: case 87:
                // Up or W
                wheel_bl_constraint.configureAngularMotor( 2, 1, 0, targetVelocity, accelerationForce );
                wheel_bl_constraint.enableAngularMotor( 2 );
                wheel_br_constraint.configureAngularMotor( 2, 1, 0, targetVelocity, accelerationForce );
                wheel_br_constraint.enableAngularMotor( 2 );
                break;
            
            case 40: case 83:
                // Down or S
                wheel_bl_constraint.configureAngularMotor( 2, 1, 0, -targetVelocity, accelerationForce );
                wheel_br_constraint.enableAngularMotor( 2 );
                wheel_br_constraint.configureAngularMotor( 2, 1, 0, -targetVelocity, accelerationForce );
                wheel_bl_constraint.enableAngularMotor( 2 );
                break;
        }
    });


    // https://github.com/chandlerprall/Physijs/wiki/Constraints
    document.addEventListener('keyup', function( ev ) 
    {
        switch( ev.keyCode ) 
        {
            case 37: case 65:
                // Left or A
                wheel_fl_constraint.configureAngularMotor( 1, 0, 0, stopVelocity, rotationForce ); //motor 0 1 2 (x y z), low_limit, high_limit, target vel, max force
                wheel_fl_constraint.disableAngularMotor( 1 );
                wheel_fr_constraint.configureAngularMotor( 1, 0, 0, stopVelocity, rotationForce );
                wheel_fr_constraint.disableAngularMotor( 1 );
                break;
            
            case 39: case 68:
                // Right or D
                wheel_fl_constraint.configureAngularMotor( 1, 0, 0, -stopVelocity, rotationForce );
                wheel_fl_constraint.disableAngularMotor( 1 );
                wheel_fr_constraint.configureAngularMotor( 1, 0, 0, -stopVelocity, rotationForce );
                wheel_fr_constraint.disableAngularMotor( 1 );
                break;
            
            case 38: case 87:
                // Up or W
                wheel_bl_constraint.configureAngularMotor( 2, 0, 0, stopVelocity, stopForce );
                wheel_bl_constraint.disableAngularMotor( 2 );
                wheel_br_constraint.configureAngularMotor( 2, 0, 0, stopVelocity, stopForce );
                wheel_br_constraint.disableAngularMotor( 2 );
                break;
            
            case 40: case 83:
                // Down or S
                wheel_bl_constraint.configureAngularMotor( 2, 0, 0, stopVelocity, stopForce );
                wheel_bl_constraint.disableAngularMotor( 2 );
                wheel_br_constraint.configureAngularMotor( 2, 0, 0, stopVelocity, stopForce );
                wheel_br_constraint.disableAngularMotor( 2 );
                break;
        }
    });
}