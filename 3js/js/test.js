///<reference path="../typings/globals/three/index.d.ts" />

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); //fov, aspect ratio, near clipping plane, far clipping plane

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); //actually makes the rendered visible

var whatever = new THREE.TextureLoader().load('img/graham.jpeg');

window.addEventListener('resize', function()
{
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
});

controls = new THREE.OrbitControls(camera, renderer.domElement);

//create the cube
var geometry = new THREE.BoxGeometry(1, 1, 1); //the points and fill (faces) of the cube
var cubeMaterials = 
[
    new THREE.MeshPhongMaterial( { map: whatever, side: THREE.DoubleSide }), //RIGHT
    new THREE.MeshPhongMaterial( { map: new THREE.TextureLoader().load('img/graham.jpeg'), side: THREE.DoubleSide }), //LEFT
    new THREE.MeshPhongMaterial( { map: new THREE.TextureLoader().load('img/graham.jpeg'), side: THREE.DoubleSide }), //TOP
    new THREE.MeshPhongMaterial( { map: new THREE.TextureLoader().load('img/graham.jpeg'), side: THREE.DoubleSide }), //BOTTOM
    new THREE.MeshPhongMaterial( { map: new THREE.TextureLoader().load('img/graham.jpeg'), side: THREE.DoubleSide }), //FRONT
    new THREE.MeshPhongMaterial( { map: new THREE.TextureLoader().load('img/graham.jpeg'), side: THREE.DoubleSide }) //BACK
];

//phong is glossy, lambert is matte

var material = new THREE.MeshFaceMaterial(cubeMaterials);
// var material = new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe: true} ); //material = texture
var cube = new THREE.Mesh(geometry, material); //map texture to geometry
cube.position.set(5,0,0);
scene.add(cube); //add to scene at 0,0,0

camera.position.y = 1.5;
camera.position.z = 5; //move camera back a bit to see cube

var floorGeometry = new THREE.CubeGeometry(100, 1, 100);
var floorMaterial = new THREE.MeshLambertMaterial({color: 0xffee00});
var floorCube = new THREE.Mesh(floorGeometry, floorMaterial);
floorCube.position.y = -5;
scene.add(floorCube);

var sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
var sphereMat = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load('img/mars.jpg')});
var sphere = new THREE.Mesh(sphereGeo, sphereMat);
sphere.position.set(0,0,0);
scene.add(sphere);

var ambientLight = new THREE.AmbientLight(0xff0000, 0.5);
scene.add(ambientLight);

var pointLight = new THREE.PointLight(0xffffff, 4, 50);
// scene.add(pointLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// var spotLight = new THREE.Spotlight(0xffffff, 0.5);
// spotLight.position.set(0, 3, 0);
// scene.add(spotLight);

// var mtlLoader = new THREE.MTLLoader();
// mtlLoader.setBaseUrl('models/');
// mtlLoader.setPath('models/');
// var url = "trolley.mtl";

// mtlLoader.load(url, function(materials)
// {
//     materials.preload();

    var objLoader = new THREE.OBJLoader();
    // objLoader.setMaterials(materials);
    // objLoader.setPath('models/');
    var trolley;

    objLoader.load('models/trolley.obj', function(object) //onLoad function
    {
        object.position.set(-5,-3.5,-1.5);
        // object.traverse(function (child)
        // {
        //     if (child.isMesh) child.material = new THREE.MeshPhongMaterial({color: 0xff0000});
        // })

        scene.add(object);
        trolley = object;
    },

    function(xhr) //during load
    {

    },
    function(error) //on error
    {

    }
    );
// });

new THREE.MTLLoader()
    .setPath( 'models/' )
    .load( 'trolley.mtl', function ( materials ) {

        materials.preload();

        new THREE.OBJLoader()
            .setMaterials( materials )
            .setPath( 'models/' )
            .load( 'trolley.obj', function ( object ) {

                object.position.y = 0;
                scene.add( object );

            }, function(xhr){}, function(error){} );

    } );


camera.lookAt(new THREE.Vector3(0, 0, 0));

function update() //game logic
{
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    // trolley.position.x += 0.01;

    // sphere.rotation.x += 0.001;
    sphere.rotation.y += 0.1;

    var time = Date.now() * 0.0005;

    pointLight.position.x = Math.sin(time * 0.7) * 30;
}

function animate()
{
    requestAnimationFrame(animate); //register animate as animation callback function

    update();

    renderer.render(scene,camera); //draw it to screen
}
animate();