import { ref, computed, watch } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function getSystemPreference(): Theme {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
    const el = typeof document !== 'undefined' ? document.documentElement : null
    if (!el) return
    if (theme === 'dark') {
        el.classList.add('dark')
        el.setAttribute('data-theme', 'dark')
        return
    }

    el.classList.remove('dark')
    el.setAttribute('data-theme', 'light')
}

export function useTheme() {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const _theme = ref<Theme>((stored as Theme) || getSystemPreference())

    // initialize
    applyTheme(_theme.value)

    // react to changes and persist
    watch(_theme, (val) => {
        try {
            localStorage.setItem(STORAGE_KEY, val)
        } catch { }
        applyTheme(val)
    })

    const isDark = computed(() => _theme.value === 'dark')

    function toggleTheme() {
        _theme.value = _theme.value === 'dark' ? 'light' : 'dark'
    }

    function setTheme(theme: Theme) {
        _theme.value = theme
    }

    // optional: follow system changes if user didn't explicitly set
    if (typeof window !== 'undefined' && window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const listener = (e: MediaQueryListEvent) => {
            const storedNow = localStorage.getItem(STORAGE_KEY)
            if (!storedNow) _theme.value = e.matches ? 'dark' : 'light'
        }
        try {
            mq.addEventListener ? mq.addEventListener('change', listener) : mq.addListener(listener)
        } catch { }
    }

    return { theme: _theme, isDark, toggleTheme, setTheme }
}

export default useTheme
