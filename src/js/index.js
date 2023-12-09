import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { AnimationsMap } from './animations.js'

let scene
let camera
let renderer
let fallGuy
let mixer
let previouslyAnimation = null
let selectedAnimation = 0
let gltfAnimations

const spotLights = []
const allActions = []
const offSet = -5.5

createScene()
createFloor()
createAmbientLigth()
createSpotLight(0, 30, 0)
loadCharacter()
animate()

async function changeAnimation() {

  if (previouslyAnimation) 
    if (previouslyAnimation === selectedAnimation) return
  
  allActions[previouslyAnimation].fadeOut(0.5)
  allActions[selectedAnimation].reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(0.5)
    .play()
}

function startAnimation() {
  mixer = new THREE.AnimationMixer( fallGuy )
  
  gltfAnimations.forEach(a => {
    allActions.push(mixer.clipAction(a))
  })

  allActions[0].play()
}

function createScene() {
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 2000)
  camera.position.set(18, 7, 12)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize( window.innerWidth, window.innerHeight )
  renderer.shadowMap.enabled = true
  renderer.gammaOutput = true
  document.body.appendChild( renderer.domElement )
  const axesHelper = new THREE.AxesHelper(5)
  scene.add( axesHelper );
  new OrbitControls( camera, renderer.domElement )
}
  
function createFloor() {
  const planeGeometry = new THREE.PlaneGeometry( 100, 100 )
  const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xbcbcbc })

  const plane = new THREE.Mesh( planeGeometry, planeMaterial )
  plane.rotation.x = -Math.PI / 2
  plane.receiveShadow = true
  scene.add( plane )
}

function createAmbientLigth() {
  const ambientLight = new THREE.AmbientLight( 0xffffff, 1.0)
  scene.add( ambientLight )
}

function createSpotLight (x, y, z) {
  const spotLight = new THREE.SpotLight( 0xffffff, 1)
  spotLight.position.set(x, y, z)
  spotLight.angle = Math.PI / 6
  spotLight.penumbra = 0.5
  spotLight.decay = 1
  spotLight.distance = 0
  spotLight.castShadow = true
  spotLight.shadow.mapSize.width = 1024
  spotLight.shadow.mapSize.height = 1024
  spotLight.shadow.camera.near = 1
  spotLight.shadow.camera.far = 60
  scene.add(spotLight)
  spotLights.push(spotLight)
}

function findAnimation (name) {
  return AnimationsMap[name]
}

function loadCharacter () {
  const loader = new GLTFLoader()
  loader.load('../../assets/fall_guys_1/scene.gltf', (gltf) => {
    gltfAnimations = gltf.animations
    fallGuy = gltf.scene
    fallGuy.traverse((child) => {
      child.frustumCulled = false
      if (child.isMesh) {
        child.castShadow = true
      }
    })
    fallGuy.position.y = offSet
    fallGuy.rotation.y = Math.PI/2
    startAnimation()
    scene.add(fallGuy)
    spotLights[0].target = fallGuy
  })
}

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'w':
      fallGuy.position.x += 0.05 * Math.sin(fallGuy.rotation.y)
      fallGuy.position.z += 0.05 * Math.cos(fallGuy.rotation.y)
      previouslyAnimation = selectedAnimation
      selectedAnimation = findAnimation('FG_Walk_A')
      changeAnimation()
      break
    case 'a':
      fallGuy.rotation.y += 0.05
      break
    case 'd':
      fallGuy.rotation.y -= 0.05
      break
    case 'v':
      previouslyAnimation = selectedAnimation
      selectedAnimation = findAnimation('FG_Emote_RobotDance_A')
      changeAnimation()
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'w':
      previouslyAnimation = selectedAnimation
      selectedAnimation = findAnimation('FG_Idle_A')
      changeAnimation()
      break
  }

})

function animate() {
  requestAnimationFrame( animate )
  renderer.render( scene, camera )

  if (mixer) mixer.update(0.02)

  if (fallGuy) {
    if (Math.abs(fallGuy.position.x) > 30 || Math.abs(fallGuy.position.z) > 30) {
      fallGuy.position.set(0, 0, 0)
    }
  }
}
