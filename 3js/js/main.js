///<reference path="../typings/globals/three/index.d.ts" />

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); //fov, aspect ratio, near clipping plane, far clipping plane

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); //actually makes the rendered visible

window.addEventListener('resize', function()
{
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
});

//skybox
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

var axesHelper = new THREE.AxesHelper();
scene.add(axesHelper);

var gridHelper = new THREE.GridHelper(1000,1000);
scene.add(gridHelper);

//cube
var grahamTexture = new THREE.TextureLoader().load('img/graham.jpeg');
var cubeGeometry = new THREE.BoxGeometry(1, 1, 1); //the points and fill (faces) of the cube
var gCubeMaterials = 
[
    new THREE.MeshPhongMaterial( { map: grahamTexture, side: THREE.DoubleSide }), //RIGHT
    new THREE.MeshPhongMaterial( { map: grahamTexture, side: THREE.DoubleSide }), //LEFT
    new THREE.MeshPhongMaterial( { map: grahamTexture, side: THREE.DoubleSide }), //TOP
    new THREE.MeshPhongMaterial( { map: grahamTexture, side: THREE.DoubleSide }), //BOTTOM
    new THREE.MeshPhongMaterial( { map: grahamTexture, side: THREE.DoubleSide }), //FRONT
    new THREE.MeshPhongMaterial( { map: grahamTexture, side: THREE.DoubleSide }) //BACK
];
var cube = new THREE.Mesh(cubeGeometry, gCubeMaterials); //map texture to geometry
cube.position.set(5,0,0);
scene.add(cube); //add to scene at 0,0,0

//floor
var floorGeometry = new THREE.CubeGeometry(100, 1, 100);
var floorMaterial = new THREE.MeshLambertMaterial({map: createBackgroundTexture()});
var floorCube = new THREE.Mesh(floorGeometry, floorMaterial);
floorCube.position.y = -5;
scene.add(floorCube);

//mars
var sphereGeo = new THREE.SphereGeometry(1, 32, 32);
var sphereMat = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load('img/mars.jpg')});
var sphere = new THREE.Mesh(sphereGeo, sphereMat);
sphere.position.set(0,1,0);
scene.add(sphere);

var soccerGeo = new THREE.SphereGeometry(0.5, 32, 32);
var soccerMat = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load('img/soccer_stock.jpg')});
var soccer = new THREE.Mesh(soccerGeo, soccerMat);
scene.add(soccer);
soccer.position.set(-3, 0.5, 0);

//TROLLEY
var wrapper = {model:""};
modelLoader('trolley', wrapper);
// var trolley = wrapper.model.clone();
// scene.add(trolley);
// trolley.position.set(0,5,0);

//lights
var ambientLight = new THREE.AmbientLight(0xff0000, 0.5);
scene.add(ambientLight);

var pointLight = new THREE.PointLight(0xffffff, 4, 50);
// scene.add(pointLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

//camera and control init
camera.position.y = 1.5;
camera.position.z = 5; //move camera back a bit to see cube
camera.lookAt(new THREE.Vector3(0, 0, 0));

var controls = new THREE.FirstPersonControls(camera, renderer.domElement);
controls.lookSpeed = 0.5;

var clock = new THREE.Clock();

var sphereUp = false;
var sphereDown = false;
var playerUp = false;

function onKeyDown(event)
{
    switch(event.keyCode)
    {
        case 16: controls.movementSpeed = 3.0; break;
        case 32: playerUp = true; break;
        case 69: sphereDown = true; break;
        case 81: sphereUp = true; break;
    }
}

function onKeyUp(event)
{
    switch(event.keyCode)
    {
        case 16: controls.movementSpeed = 1.0; break;
        case 32: playerUp = false; break;
        case 69: sphereDown = false; break;
        case 81: sphereUp = false; break;
    }
}

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

function update() //game logic
{
    var delta = clock.getDelta();
    controls.update(delta);
    if (playerUp) camera.position.y += (controls.movementSpeed * delta);
    
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    // trolley.position.x += 0.01;

    // sphere.rotation.x += 0.001;
    if (sphereUp) sphere.position.y += 0.1;
    if (sphereDown) sphere.position.y -= 0.1;
    sphere.rotation.y += 0.05;

    var time = Date.now() * 0.0005;

    pointLight.position.x = Math.sin(time * 0.7) * 30;
}

function animate()
{
    requestAnimationFrame(animate); //register animate as animation callback function

    update();

    renderer.render(scene,camera); //draw it to screen
}

function modelLoader(path, obj)
{
    // var obj;
    
    new THREE.MTLLoader()
        .setPath( 'models/' )
        .load( path + '.mtl', function ( materials ) {

        materials.preload();

        new THREE.OBJLoader()
            .setMaterials( materials )
            .setPath( 'models/' )
            .load( path + '.obj', function ( object ) {

                // object.position.y = 0;
                obj.model = object.clone();
                scene.add( object );

            }, function(xhr){}, function(error){} );

    } );

    // return obj;
}

function createBackgroundTexture()
{
    //pick a colour for each corner
    // const topLeft = new THREE.Color(0x692f41);
    // const topRight = new THREE.Color(0x743441);
    // const bottomRight = new THREE.Color(0x44243e);
    // const bottomLeft = new THREE.Color(0x54243b);

    const topLeft = new THREE.Color(0x3bff6f);
    const topRight = new THREE.Color(0xf536df);
    const bottomRight = new THREE.Color(0xf2ef33);
    const bottomLeft = new THREE.Color(0x0ff7f0);

    //convert rgb values from float to (3) ints (24bit color)
    const data = new Uint8Array([
        Math.round(bottomLeft.r * 255), Math.round(bottomLeft.g * 255), Math.round(bottomLeft.b * 255),
        Math.round(bottomRight.r * 255), Math.round(bottomRight.g * 255), Math.round(bottomRight.b * 255),
        Math.round(topLeft.r * 255), Math.round(topLeft.g * 255), Math.round(topLeft.b * 255),
        Math.round(topRight.r * 255), Math.round(topRight.g * 255), Math.round(topRight.b * 255)
    ])

    //create a 2x2 texture with one pixel for each colour
    const backgroundTexture = new THREE.DataTexture(data, 2, 2, THREE.RGBFormat);
    //apply a linear filter to blur between them
    backgroundTexture.magFilter = THREE.LinearFilter;
    // backgroundTexture.needsUpdate = true;

    return backgroundTexture;
}    

animate();