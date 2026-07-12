import './style.css'

const app = document.querySelector('#app')

const TOTAL_FRAMES = 14
const LANDSCAPE_FRAMES = new Set([5])

const MAPS_URL =
  'https://maps.app.goo.gl/tLGUkPLRWXy5AUfw7'

const RSVP_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeArn4u1RT8R6CqsoE412LRTDwCetuoo4NCfj0W9Ew3gFSMXQ/viewform?usp=sharing&ouid=105239047434182274287'

const MUSIC_URL =
  '/audio/a-thousand-years.mp3'

const DOOR_SOUND_URL =
  '/audio/puerta-abriendo.mp3'

const MUSIC_START_TIME = 62
const MUSIC_VOLUME = 0.45
const DOOR_SOUND_VOLUME = 0.75

let currentFrame = 1
let isAnimating = false
let activeLayer = 0

let musicStarted = false
let musicPlaying = false
let volumeAnimationId = 0

app.innerHTML = `
  <main class="invitation">
    <div
      id="frameWrapper"
      class="frame-wrapper"
      role="application"
      aria-label="Invitación de boda de Aliz y Miguel"
    >
      <img
        id="frameLayerA"
        class="frame-layer frame-active"
        src="/images/frame-1.png"
        alt="Invitación de Aliz y Miguel"
      >

      <img
        id="frameLayerB"
        class="frame-layer"
        src="/images/frame-1.png"
        alt=""
        aria-hidden="true"
      >

      <button
        id="sealButton"
        class="seal-button"
        type="button"
        aria-label="Abrir la invitación"
      >
        <img
          class="seal-image"
          src="/images/sello.png"
          alt=""
          aria-hidden="true"
        >
      </button>

      <button
        id="musicButton"
        class="music-button hidden"
        type="button"
        aria-label="Pausar música"
      >
        <span id="musicIcon" aria-hidden="true">♫</span>
      </button>

      <div
        id="actionFeedback"
        class="action-feedback"
        aria-hidden="true"
      ></div>

      <audio
        id="weddingMusic"
        src="${MUSIC_URL}"
        preload="auto"
        loop
      ></audio>

      <audio
        id="doorSound"
        src="${DOOR_SOUND_URL}"
        preload="auto"
      ></audio>
    </div>
  </main>
`

const frameWrapper =
  document.querySelector('#frameWrapper')

const sealButton =
  document.querySelector('#sealButton')

const musicButton =
  document.querySelector('#musicButton')

const musicIcon =
  document.querySelector('#musicIcon')

const actionFeedback =
  document.querySelector('#actionFeedback')

const weddingMusic =
  document.querySelector('#weddingMusic')

const doorSound =
  document.querySelector('#doorSound')

const layers = [
  document.querySelector('#frameLayerA'),
  document.querySelector('#frameLayerB'),
]

doorSound.volume = DOOR_SOUND_VOLUME

function wait(milliseconds) {
  return new Promise(resolve => {
    window.setTimeout(resolve, milliseconds)
  })
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = resolve
    image.onerror = reject
    image.src = src
  })
}

function getActiveLayer() {
  return layers[activeLayer]
}

function getNextLayer() {
  return layers[activeLayer === 0 ? 1 : 0]
}

function applyFrameEffects(layer, frameNumber) {
  layers.forEach(item => {
    item.classList.remove('landscape-alive')
  })

  if (LANDSCAPE_FRAMES.has(frameNumber)) {
    layer.classList.add('landscape-alive')
  }
}

function updateMusicButton() {
  musicButton.classList.toggle(
    'is-playing',
    musicPlaying,
  )

  musicButton.setAttribute(
    'aria-label',
    musicPlaying
      ? 'Pausar música'
      : 'Reproducir música',
  )

  musicIcon.textContent =
    musicPlaying ? '♫' : '♪'
}

async function fadeVolume({
  from,
  to,
  duration,
}) {
  const animationId = ++volumeAnimationId
  const steps = 40
  const interval = duration / steps
  const difference = to - from

  weddingMusic.volume = Math.max(
    0,
    Math.min(1, from),
  )

  for (
    let step = 1;
    step <= steps;
    step += 1
  ) {
    if (animationId !== volumeAnimationId) {
      return
    }

    const progress = step / steps
    const nextVolume =
      from + difference * progress

    weddingMusic.volume = Math.max(
      0,
      Math.min(1, nextVolume),
    )

    await wait(interval)
  }

  if (animationId === volumeAnimationId) {
    weddingMusic.volume = Math.max(
      0,
      Math.min(1, to),
    )
  }
}

async function startMusic() {
  if (musicStarted) return

  weddingMusic.volume = 0
  weddingMusic.currentTime = MUSIC_START_TIME

  try {
    await weddingMusic.play()
  } catch (error) {
    console.error(
      'No se pudo reproducir la música:',
      error,
    )
    return
  }

  musicStarted = true
  musicPlaying = true

  musicButton.classList.remove('hidden')
  updateMusicButton()

  await fadeVolume({
    from: 0,
    to: MUSIC_VOLUME,
    duration: 3000,
  })
}

async function pauseMusic() {
  if (!musicPlaying) return

  musicPlaying = false
  updateMusicButton()

  await fadeVolume({
    from: weddingMusic.volume,
    to: 0,
    duration: 500,
  })

  weddingMusic.pause()
  weddingMusic.volume = MUSIC_VOLUME
}

async function resumeMusic() {
  weddingMusic.volume = 0

  try {
    await weddingMusic.play()
  } catch (error) {
    console.error(
      'No se pudo reanudar la música:',
      error,
    )
    return
  }

  musicPlaying = true
  updateMusicButton()

  await fadeVolume({
    from: 0,
    to: MUSIC_VOLUME,
    duration: 900,
  })
}

async function toggleMusic(event) {
  event.stopPropagation()

  if (!musicStarted) {
    await startMusic()
    return
  }

  if (musicPlaying) {
    await pauseMusic()
    return
  }

  await resumeMusic()
}

async function playDoorSound() {
  try {
    doorSound.pause()
    doorSound.currentTime = 0
    doorSound.volume = DOOR_SOUND_VOLUME

    await doorSound.play()
  } catch (error) {
    console.error(
      'No se pudo reproducir el sonido de la puerta:',
      error,
    )
  }
}

async function transitionToFrame(
  frameNumber,
  {
    type = 'normal',
    duration = 400,
    pauseAfter = 0,
  } = {},
) {
  if (
    frameNumber < 1 ||
    frameNumber > TOTAL_FRAMES
  ) {
    return
  }

  const nextSrc =
    `/images/frame-${frameNumber}.png`

  try {
    await preloadImage(nextSrc)
  } catch (error) {
    console.error(
      `No se pudo cargar ${nextSrc}`,
      error,
    )
    return
  }

  const currentLayer = getActiveLayer()
  const nextLayer = getNextLayer()

  nextLayer.src = nextSrc

  currentLayer.className =
    'frame-layer frame-active'

  nextLayer.className =
    'frame-layer'

  frameWrapper.dataset.transition = type

  frameWrapper.style.setProperty(
    '--transition-duration',
    `${duration}ms`,
  )

  void nextLayer.offsetWidth

  currentLayer.classList.add(
    'frame-leaving',
  )

  nextLayer.classList.add(
    'frame-entering',
  )

  await wait(duration)

  currentLayer.className =
    'frame-layer'

  nextLayer.className =
    'frame-layer frame-active'

  activeLayer =
    activeLayer === 0 ? 1 : 0

  currentFrame = frameNumber

  applyFrameEffects(
    nextLayer,
    currentFrame,
  )

  if (pauseAfter > 0) {
    await wait(pauseAfter)
  }
}

async function removeSeal() {
  if (
    currentFrame !== 1 ||
    isAnimating
  ) {
    return
  }

  isAnimating = true

  if (!musicStarted) {
    startMusic()
  }

  sealButton.classList.add(
    'seal-is-opening',
  )

  await wait(300)

  await transitionToFrame(2, {
    type: 'cinematic',
    duration: 5000,
  })

  sealButton.classList.add('hidden')

  isAnimating = false
}

async function openEnvelope() {
  if (
    currentFrame !== 2 ||
    isAnimating
  ) {
    return
  }

  isAnimating = true

  await transitionToFrame(3, {
    type: 'cinematic',
    duration: 5000,
    pauseAfter: 900,
  })

  await transitionToFrame(4, {
    type: 'cinematic',
    duration: 5000,
  })

  isAnimating = false
}

async function openDoors() {
  if (
    currentFrame !== 7 ||
    isAnimating
  ) {
    return
  }

  isAnimating = true

  /*
   * El sonido comienza al mismo tiempo
   * que la transición 7 → 8.
   */
  playDoorSound()

  await transitionToFrame(8, {
    type: 'door',
    duration: 5000,
    pauseAfter: 1100,
  })

  await transitionToFrame(9, {
    type: 'door',
    duration: 1500,
  })

  isAnimating = false
}

async function navigateTo(frameNumber) {
  if (
    isAnimating ||
    frameNumber < 4 ||
    frameNumber > TOTAL_FRAMES
  ) {
    return
  }

  isAnimating = true

  await transitionToFrame(frameNumber, {
    type: 'normal',
    duration: 380,
  })

  isAnimating = false
}

async function openActionLink(url) {
  const activeFrameLayer = getActiveLayer()

  activeFrameLayer.classList.add(
    'button-press-effect',
  )

  actionFeedback.classList.add(
    'is-visible',
  )

  await wait(120)

  activeFrameLayer.classList.remove(
    'button-press-effect',
  )

  await wait(80)

  actionFeedback.classList.remove(
    'is-visible',
  )

  window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  )
}

sealButton.addEventListener(
  'click',
  event => {
    event.stopPropagation()
    removeSeal()
  },
)

musicButton.addEventListener(
  'click',
  toggleMusic,
)

frameWrapper.addEventListener(
  'click',
  event => {
    if (isAnimating) return

    if (currentFrame === 2) {
      openEnvelope()
      return
    }

    if (currentFrame < 4) return

    const rect =
      frameWrapper.getBoundingClientRect()

    const relativeX =
      (event.clientX - rect.left) /
      rect.width

    const relativeY =
      (event.clientY - rect.top) /
      rect.height

    if (
      currentFrame === 7 &&
      relativeX > 0.22
    ) {
      openDoors()
      return
    }

    if (
      currentFrame === 9 &&
      relativeX >= 0.25 &&
      relativeX <= 0.75 &&
      relativeY >= 0.76 &&
      relativeY <= 0.91
    ) {
      openActionLink(MAPS_URL)
      return
    }

    if (
      currentFrame === 13 &&
      relativeX >= 0.14 &&
      relativeX <= 0.86 &&
      relativeY >= 0.57 &&
      relativeY <= 0.73
    ) {
      openActionLink(RSVP_URL)
      return
    }

    if (relativeX <= 0.22) {
      navigateTo(currentFrame - 1)
      return
    }

    if (relativeX >= 0.78) {
      navigateTo(currentFrame + 1)
    }
  },
)

document.addEventListener(
  'keydown',
  event => {
    if (isAnimating) return

    if (
      currentFrame === 1 &&
      event.key === 'Enter'
    ) {
      removeSeal()
      return
    }

    if (
      currentFrame === 2 &&
      event.key === 'Enter'
    ) {
      openEnvelope()
      return
    }

    if (currentFrame < 4) return

    if (
      currentFrame === 7 &&
      event.key === 'ArrowRight'
    ) {
      openDoors()
      return
    }

    if (event.key === 'ArrowLeft') {
      navigateTo(currentFrame - 1)
    }

    if (event.key === 'ArrowRight') {
      navigateTo(currentFrame + 1)
    }
  },
)

let touchStartX = 0
let touchStartY = 0

frameWrapper.addEventListener(
  'touchstart',
  event => {
    touchStartX =
      event.changedTouches[0].clientX

    touchStartY =
      event.changedTouches[0].clientY
  },
  { passive: true },
)

frameWrapper.addEventListener(
  'touchend',
  event => {
    if (
      isAnimating ||
      currentFrame < 4
    ) {
      return
    }

    const touchEndX =
      event.changedTouches[0].clientX

    const touchEndY =
      event.changedTouches[0].clientY

    const deltaX =
      touchStartX - touchEndX

    const deltaY =
      touchStartY - touchEndY

    if (
      Math.abs(deltaX) < 55 ||
      Math.abs(deltaX) <
        Math.abs(deltaY)
    ) {
      return
    }

    if (
      currentFrame === 7 &&
      deltaX > 0
    ) {
      openDoors()
      return
    }

    if (deltaX > 0) {
      navigateTo(currentFrame + 1)
    } else {
      navigateTo(currentFrame - 1)
    }
  },
  { passive: true },
)

applyFrameEffects(
  getActiveLayer(),
  currentFrame,
)