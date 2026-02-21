// ─── Achievement Toast Notification ──────────────────────────────────────────

export function showAchievementToast(achievement: {
  name: string
  icon: string
  description: string
}): void {
  const toast = document.createElement('div')
  toast.className = 'achievement-toast'

  const icon = document.createElement('div')
  icon.className = 'achievement-toast-icon'
  icon.textContent = achievement.icon

  const text = document.createElement('div')
  text.className = 'achievement-toast-text'

  const name = document.createElement('div')
  name.className = 'achievement-toast-name'
  name.textContent = achievement.name

  const desc = document.createElement('div')
  desc.className = 'achievement-toast-desc'
  desc.textContent = achievement.description

  text.appendChild(name)
  text.appendChild(desc)
  toast.appendChild(icon)
  toast.appendChild(text)

  document.body.appendChild(toast)

  window.setTimeout(() => {
    toast.remove()
  }, 3500)
}
