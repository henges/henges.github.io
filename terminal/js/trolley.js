///<reference path="../typings/globals/three/index.d.ts" />
'use strict';

var rotationForce, accelerationForce, rotationVelocity, accelerationVelocity, stopVelocity, stopForce;

var initTrolley = function ()
{
    //CAR INIT

    var car_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0xff6666 }),
        .8, // high friction
        .2 // low restitution
    );
    car.frame = new Physijs.BoxMesh(
            new THREE.CubeGeometry( 1, 0.1, 1 ),
            car_material,
            1000
    );
    car.frame.position.set( 0 , 0.2, 0);
    car.frame.material.visible = false;
    car.frame.castShadow = true;
    car.frame.receiveShadow = false;
    
    var carInteriorGeometry = new THREE.BoxGeometry( 3, 3, 1.5);
    // var carInteriorGeometry = new THREE.BoxGeometry( 3, 3, 1.5);
    var carInteriorMaterial = Physijs.createMaterial( new THREE.MeshStandardMaterial({ color: 0x777777 }), 0.8, 0.1 );
    car.interior = new Physijs.BoxMesh(carInteriorGeometry, carInteriorMaterial, 50 );
    car.interior.material.visible = false;                  //(if visible, edges stick out from rounded frame)
    car.frame.add(car.interior);
    car.interior.position.set( 0, 2, 0 );
    // car.interior.mass = 0;
    // car.interior.position.set( -0.10, 2, 0 );

    //trolley
    var loader = new THREE.GLTFLoader();
        
    loader.load('/terminal/models/trolleythree.glb', function(gltf)
    {
        car.body = gltf.scene;
        car.body.castShadow = true;
        
        car.frame.add(car.body);
        car.body.visible = true;
        
        gltf.scene.traverse( function ( child ) 
		{
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = false;
            }
        });

        // car.interior.addEventListener('collision', handleCollision);
        car.frame.addEventListener('collision', handleCollision);
    },
        function(xhr){}, function(error){}
    );
    scene.add( car.frame );

    var wheel_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0x000000 }),
        .7, // friction
        0.1 //  restitution
        );
    var wheel_geometry = new THREE.CylinderGeometry( 0.25, 0.25, 0.2, 16 );

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
        (pos % 2 == 1) ? wheel.rotation.x = Math.PI / 2 : wheel.rotation.x = -Math.PI / 2;

        var wheelPosition;

        switch (pos)
        {
            case 1: wheelPosition = wheel_fl_vector; break; //front left
            case 2: wheelPosition = wheel_fr_vector; break; //front right
            case 3: wheelPosition = wheel_bl_vector; break; //back left
            case 4: wheelPosition = wheel_br_vector; break;   //back
        }

        wheel.position.copy(wheelPosition);
        wheel.receiveShadow = wheel.castShadow = true;
        scene.add( wheel );
        wheelsArr.push(wheel);

        //https://github.com/chandlerprall/Physijs/issues/32#issuecomment-6576714
        wheel.setDamping(0.5, 0.8);
        
        return wheel;
    }

    function constraintConstructor(wheel, car, side)
    {
        var pos = getPos(side);

        var constrVector;

        switch (pos)
        {
            case 1: constrVector = wheel_fl_vector; break; //front left
            case 2: constrVector = wheel_fr_vector; break; //front right
            case 3: constrVector = wheel_bl_vector; break; //back left
            case 4: constrVector = wheel_br_vector; break;   //back
        }

        var constraint = new Physijs.DOFConstraint(
                        wheel, 
                        car, 
                        constrVector);
        scene.addConstraint( constraint );
        constraint.setAngularLowerLimit({ x: 0, y: 0, z: (pos < 3) ? 1 : 0});
        constraint.setAngularUpperLimit({ x: 0, y: 0, z: (pos < 3) ? 0 : 0 });
        
        return constraint;
    }

    function getPos(side)
    {
        return (side === 'fl') ? 1 : 
               (side === 'fr') ? 2 : 
               (side === 'bl') ? 3 : 
               (side === 'br') ? 4 : 
               0;
    }

    rotationVelocity = 35;
    rotationForce = 100;
    accelerationVelocity = 35;
    accelerationForce = 1000;
    stopVelocity = 0;
    stopForce = 2000;

    document.addEventListener('keydown', function( ev ) 
    {
        switch( ev.keyCode ) 
        {
            case 37: case 65:
                // Left or A
                //which motor, low angle limit, high angle limit, target velocity, maximum force
                car.wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, rotationVelocity, rotationForce );
                car.wheel_fl_constraint.enableAngularMotor( 1 );
                car.wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, rotationVelocity, rotationForce );
                car.wheel_fr_constraint.enableAngularMotor( 1 );
                break;
            
            case 39: case 68:
                // Right or D
                car.wheel_fl_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -rotationVelocity, rotationForce );
                car.wheel_fl_constraint.enableAngularMotor( 1 );
                car.wheel_fr_constraint.configureAngularMotor( 1, -Math.PI / 4, Math.PI / 4, -rotationVelocity, rotationForce );
                car.wheel_fr_constraint.enableAngularMotor( 1 );
                break;
            
            case 38: case 87:
                // Up or W
                car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, accelerationVelocity, accelerationForce );
                car.wheel_bl_constraint.enableAngularMotor( 2 );
                car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, accelerationVelocity, accelerationForce );
                car.wheel_br_constraint.enableAngularMotor( 2 );
                break;
            
            case 40: case 83:
                // Down or S
                car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, -accelerationVelocity, accelerationForce );
                car.wheel_bl_constraint.enableAngularMotor( 2 );
                car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, -accelerationVelocity, accelerationForce );
                car.wheel_br_constraint.enableAngularMotor( 2 );
                break;
        }
    });


    // https://github.com/chandlerprall/Physijs/wiki/Constraints
    document.addEventListener('keyup', function( ev ) 
    {
        switch( ev.keyCode ) 
        {
            case 39: case 68: case 37: case 65: 
                // Left or A, and Right or D
                car.wheel_fl_constraint.configureAngularMotor( 1, 0, 0, 10, accelerationForce ); //motor 0 1 2 (x y z), low_limit, high_limit, target vel, max force
                car.wheel_fl_constraint.enableAngularMotor( 1 );
                car.wheel_fr_constraint.configureAngularMotor( 1, 0, 0, 10, accelerationForce );
                car.wheel_fr_constraint.enableAngularMotor( 1 );
                // wheel_fl_constraint.disableAngularMotor( 1 );
                // wheel_fr_constraint.disableAngularMotor( 1 );
                break;
            
            case 38: case 87: case 40: case 83:
                // Up or W, and Down or S
                car.wheel_bl_constraint.configureAngularMotor( 2, 0, 0, stopVelocity, stopForce );
                car.wheel_bl_constraint.enableAngularMotor( 2 );
                car.wheel_br_constraint.configureAngularMotor( 2, 0, 0, stopVelocity, stopForce );
                car.wheel_br_constraint.enableAngularMotor( 2 );
                // wheel_bl_constraint.disableAngularMotor( 2 );
                // wheel_br_constraint.disableAngularMotor( 2 );
                break;
        }
    });
}