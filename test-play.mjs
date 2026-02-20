import puppeteer from 'puppeteer'
import { setTimeout as sleep } from 'timers/promises'

const URL = 'http://localhost:5173/blitz-rts/'
const DIR = '/Users/cozac/Code/blitz-rts/screenshots'
const prefix = process.argv[2] || 'r'

async function shot(page, name) {
  await page.screenshot({ path: `${DIR}/${prefix}-${name}.png`, fullPage: true })
  console.log(`📸 ${prefix}-${name}`)
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  })

  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.evaluate(() => localStorage.setItem('blitz-rts-tutorial-done', '1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await sleep(1500)

  // Main menu
  await shot(page, 'menu')

  // → Assembly
  await page.click('.mode-card--free')
  await sleep(300)
  await page.click('.enemy-card-horizontal')
  await sleep(1200)
  await shot(page, 'assembly')

  // Select skills & launch
  await page.evaluate(() => {
    const t = document.querySelectorAll('.skill-toggle')
    for (let i = 0; i < Math.min(3, t.length); i++) t[i].click()
  })
  await sleep(300)
  await page.click('[data-tutorial="launch-button"]')
  await sleep(3500)
  await shot(page, 'battle-start')

  // Battle progression
  await sleep(4000)
  await shot(page, 'battle-4s')

  await sleep(5000)
  await shot(page, 'battle-9s')

  // 2x speed
  await page.evaluate(() => {
    const b = document.querySelectorAll('.speed-controls .btn')
    if (b[1]) b[1].click()
  })
  await sleep(8000)
  await shot(page, 'battle-2x')

  // 4x speed
  await page.evaluate(() => {
    const b = document.querySelectorAll('.speed-controls .btn')
    if (b[2]) b[2].click()
  })
  await sleep(15000)
  await shot(page, 'battle-late')

  await sleep(15000)
  await shot(page, 'result')

  if (errors.length > 0) {
    console.log('ERRORS:', errors.join('\n'))
  }

  await browser.close()
}

run().catch(err => { console.error(err); process.exit(1) })
