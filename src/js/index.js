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
let jumpAnimation
let lendingAnimation
let gltfAnimations
let keysPressed = []
let speed = 0.035
let isJumping = 0
let jumpSpeed = 0.18
let gravity = -0.0004
let delta = 1
let i = 0

const spotLights = []
const allActions = []
const offSet = -5.5

createScene()
createFloor()
createAmbientLigth()
createSpotLight(0, 30, 0)
loadCharacter()
animate()
checkInputs()

async function changeAnimation() {
  if (isJumping === 1){
    if (allActions[selectedAnimation]) allActions[selectedAnimation].reset().fadeOut(0.2)
    if (allActions[jumpAnimation]) allActions[jumpAnimation].reset()
      .setEffectiveTimeScale(.3)
      .setEffectiveWeight(1)
      .fadeIn(0.5)
      .play()
    isJumping = 2
  } else if (isJumping === 2) return

  if (previouslyAnimation === selectedAnimation) return


  if (allActions[previouslyAnimation]) allActions[previouslyAnimation].reset().fadeOut(0.5)
  if (allActions[selectedAnimation]) allActions[selectedAnimation].reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(0.5)
    .play()
}

function startAnimation() {
  mixer = new THREE.AnimationMixer(fallGuy)
  gltfAnimations.forEach(a => {
    allActions.push(mixer.clipAction(a))
  })

  
  jumpAnimation = findAnimation('FG_Jump_Start_A')
  lendingAnimation = findAnimation('FG_Landing_A')
  allActions[jumpAnimation].loop = THREE.LoopOnce
  allActions[lendingAnimation].loop = THREE.LoopOnce

  mixer.addEventListener('finished', (event) => {
    if (event.action._clip.name === 'FG_Jump_Start_A') {
      allActions[lendingAnimation].reset().setEffectiveTimeScale(0.7).play()
      fallGuy.position.y = offSet
      isJumping = 0
      gravity = -0.0004
      jumpSpeed = 0.18
      delta = 1
      i = 0
    }

    if (event.action._clip.name === 'FG_Landing_A') {
      allActions[selectedAnimation].reset()
        .setEffectiveTimeScale(0.7)
        .play()
    }

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

function checkInputs() {
  setInterval(() => {
    if (isJumping !== 0) {
      jumpSpeed = jumpSpeed + gravity * i
      fallGuy.position.y += jumpSpeed * delta
      if (jumpSpeed <= 0) {
        jumpSpeed = 0
        delta *= -1
        gravity *= -1
      }
      i++
    }

    for (const key of keysPressed) {
      switch (key.toLowerCase()) {
        case 'w':
          if (!isJumping) {
            previouslyAnimation = selectedAnimation
            if (keysPressed.includes('shift')) {
              selectedAnimation = findAnimation('FG_Run_A')
              speed = 0.1
            } else {
              selectedAnimation = findAnimation('FG_Walk_A')
            }
          }
          fallGuy.position.x += speed * Math.sin(fallGuy.rotation.y)
          fallGuy.position.z += speed * Math.cos(fallGuy.rotation.y)
          changeAnimation()
          break
        case 's':
          if (!isJumping) {
            previouslyAnimation = selectedAnimation
            selectedAnimation = findAnimation('FG_Walk_Backwards_A')
          }
          fallGuy.position.x -= speed * Math.sin(fallGuy.rotation.y)
          fallGuy.position.z -= speed * Math.cos(fallGuy.rotation.y)
          changeAnimation()
          break
        case 'a':
          fallGuy.rotation.y += 0.05
          break
        case 'd':
          fallGuy.rotation.y -= 0.05
          break
        case 'shift':
          if (keysPressed.includes('w') && !isJumping) {
            previouslyAnimation = selectedAnimation
            selectedAnimation = findAnimation('FG_Run_A')
            changeAnimation()
            speed = 0.1
          }
          break
        case ' ':
          if (!isJumping) {
            if (fallGuy.position.y > offSet) break
            isJumping = 1
            changeAnimation()
          }
          break
      }
    }
  }, 1)
}

window.addEventListener('keydown', (event) => {
  if (!keysPressed.includes(event.key.toLowerCase())) {
    keysPressed.push(event.key.toLowerCase())
  }
})

window.addEventListener('keyup', (event) => {
  keysPressed = keysPressed.filter(key => key != event.key.toLowerCase())
  switch (event.key.toLowerCase()) {
    case 'w':
      speed = 0.05
      previouslyAnimation = selectedAnimation
      selectedAnimation = findAnimation('FG_Idle_A')
      changeAnimation()
      break
    case 'shift':
      previouslyAnimation = selectedAnimation
      if (keysPressed.includes('w')) selectedAnimation = findAnimation('FG_Walk_A')
      else selectedAnimation = findAnimation('FG_Idle_A')
      speed = 0.05
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
      fallGuy.position.set(0, offSet, 0)
    }
  }
}
