import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { AnimationsMap } from './animations.js'
import { Colors } from './colors.js'
import * as CANNON from 'cannon-es'

let plane
let scene
let world
let camera
let controls
let renderer
let sphereShape
let sphereBody
let planeBody
let sky
let background
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
let offSet =  -5.0
let clock = new THREE.Clock()
let oldElapsedTime = 0
let colors = [...Colors]
let tiles = []
let tilesBody = []
let selectedTilesColor = []

const spotLights = []
const allActions = []

createScene()
createFloor()
createAmbientLigth()
createSpotLight(0, 10, 0)
loadCharacter()
animate()
checkInputs()
game()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function paintTiles(colors, firstPaint = false) {
  for (let i = 0; i < tiles.length; i++){
    let tileColor = colors[Math.floor(Math.random()*colors.length)]
    tiles[i].material.color.setHex(tileColor)
    if (firstPaint) selectedTilesColor.push(tileColor)
  }
}

function removeWrongTiles(color) {
  let tilesToRemove = []
  tiles.forEach((_, index) => {
    if (selectedTilesColor[index] !== color) tilesToRemove.push(index)
  })

  
  for (let index of tilesToRemove) {
    let removedTile = tiles[index]
    let removedTileBody = tilesBody[index]
    scene.remove(removedTile)
    world.removeBody(removedTileBody)
  }
  console.log(tiles.length)
  console.log(tilesBody.length)
}

function verifyGameOver() {
  if (fallGuy.position.y < -10) {
    window.alert("Game Over!")

    return true
  }

  return false
}

async function game() {
  await sleep(2000)
  paintTiles(colors, true)
  await sleep(5000)
  paintTiles([0xcccccc])
  await sleep(1000)
  let selectedColor = colors[Math.floor(Math.random()*colors.length)]
  paintTiles([selectedColor])
  await sleep(5000)
  removeWrongTiles(selectedColor)
  selectedTilesColor = []
  await sleep(1000)
  if (verifyGameOver()) location.reload()
  else game()
}

function changeAnimation() {
  if (isJumping === 1){
    if (allActions[selectedAnimation]) allActions[selectedAnimation].reset().fadeOut(0.2)
    if (allActions[jumpAnimation]) allActions[jumpAnimation].reset()
      .setEffectiveTimeScale(.6)
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
      isJumping = 0
      speed = 0.1
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

  world = new CANNON.World()
  world.gravity.set(0, -9.82, 0)

  const canvas = document.querySelector('.webgl')
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true
  renderer.gammaOutput = true
  document.body.appendChild(renderer.domElement)

  background = new THREE.TextureLoader().load('../../assets/background/113.jpg')
  
  let skyGeometry = new THREE.SphereGeometry(1000)
  let skyMaterial = new THREE.MeshStandardMaterial({ map: background, side: THREE.DoubleSide })
  sky = new THREE.Mesh(skyGeometry, skyMaterial)
  sky.rotation.x = Math.PI / 2
  scene.add(sky)

  // const axesHelper = new THREE.AxesHelper(5)
  // scene.add(axesHelper)

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 2000)
  controls = new OrbitControls(camera, renderer.domElement)
  camera.position.set(358, 7, 352)
  aproximateCamera(18, 7, 12)
  controls.minPolarAngle = Math.PI / 3
  controls.maxPolarAngle = 0
  controls.enablePan = false
  controls.update()
}

async function aproximateCamera(toX, toY, toZ) {
  let actualX = camera.position.x
  let actualZ = camera.position.z

  while (actualX > toX) {
    actualX -= 4
    actualZ -= 4
    camera.position.set(actualX, toY, actualZ)
    await sleep(1)
  }
}
  
function createFloor() {
  let tilePosition = { x: (5*4.5 + 4*0.5 + 0.25), z: (5*4.5 + 4*0.5 + 0.25) }
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const planeGeometry = new THREE.BoxGeometry(4.5, 4.5, 1)
      const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide })
      
      const plane = new THREE.Mesh(planeGeometry, planeMaterial)
      plane.rotation.x = -Math.PI / 2
      plane.receiveShadow = true
      plane.position.x = tilePosition.x
      plane.position.z = tilePosition.z
      scene.add(plane)
      const planeShape = new CANNON.Box(new CANNON.Vec3(3, 3, 0.1))
      const planeBody = new CANNON.Body({
        mass: 0,
      })
      
      planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
      planeBody.position.x = tilePosition.x
      planeBody.position.z = tilePosition.z

      planeBody.addShape(planeShape)
      world.addBody(planeBody)
      tiles.push(plane)
      tilesBody.push(planeBody)

      tilePosition.z -= 5
    }
    tilePosition.z = (5*4.5 + 4*0.5 + 0.25)
    tilePosition.x -= 5
  }
}

function createAmbientLigth() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1)
  scene.add(ambientLight)
}

function createSpotLight (x, y, z, color = 0xffffff) {
  const spotLight = new THREE.SpotLight(color, 1)
  spotLight.position.set(x, y, z)
  spotLight.angle = Math.PI / 6
  spotLight.penumbra = 0.5
  spotLight.decay = 1
  spotLight.distance = 0
  spotLight.castShadow = true
  spotLight.shadow.mapSize.width = 1024
  spotLight.shadow.mapSize.height = 1024
  spotLight.shadow.camera.near = 1
  spotLight.shadow.camera.far = 600
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

    scene.add(fallGuy)
    
    startAnimation()

    sphereShape = new CANNON.Sphere(0)
    sphereBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 5, 0),
      shape: sphereShape,
    })

    world.addBody(sphereBody)


    spotLights[0].target = fallGuy
  })
}

function checkInputs() {
  setInterval(() => {
    for (const key of keysPressed) {
      switch (key.toLowerCase()) {
        case 'w':
          if (!isJumping) {
            previouslyAnimation = selectedAnimation
            speed = 0.035
            if (keysPressed.includes('shift')) {
              selectedAnimation = findAnimation('FG_Run_A')
              speed = 0.1
            } else {
              selectedAnimation = findAnimation('FG_Walk_A')
            }
          }
          sphereBody.position.x += speed * Math.sin(fallGuy.rotation.y)
          sphereBody.position.z += speed * Math.cos(fallGuy.rotation.y)
          changeAnimation()
          break
        case 's':
          if (!isJumping) {
            previouslyAnimation = selectedAnimation
            selectedAnimation = findAnimation('FG_Walk_Backwards_A')
          }
          sphereBody.position.x -= speed * Math.sin(fallGuy.rotation.y)
          sphereBody.position.z -= speed * Math.cos(fallGuy.rotation.y)
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
            sphereBody.velocity.set(0, 8, 0)
            isJumping = 1
            speed = 0.2
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

window.addEventListener('change', (event) => {
  console.log(event)
})

function animate() {
  requestAnimationFrame(animate)
  if (mixer) mixer.update(0.02)
  controls.update()

  let ElapsedTime = clock.getElapsedTime()
  let deltaTime = ElapsedTime - oldElapsedTime
  oldElapsedTime = deltaTime

  if (world) world.step(1 / 60, deltaTime, 3)
  
  if (fallGuy) {
    if (sphereBody) fallGuy.position.copy({ x: sphereBody.position.x, y: sphereBody.position.y + offSet, z: sphereBody.position.z })
    if (planeBody) plane.position.copy(planeBody.position)
  }
  
  renderer.render(scene, camera)
}
