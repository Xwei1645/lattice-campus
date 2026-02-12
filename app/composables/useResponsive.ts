import { ref, onMounted, onUnmounted } from 'vue'

export const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export function useResponsive() {
    const windowWidth = ref<number>(0)
    const deviceType = ref<DeviceType>('desktop')
    const isMobile = ref<boolean>(false)
    const isTablet = ref<boolean>(false)
    const isDesktop = ref<boolean>(true)

    const updateDeviceInfo = () => {
        if (typeof window === 'undefined') return

        windowWidth.value = window.innerWidth

        if (window.innerWidth < BREAKPOINTS.mobile) {
            deviceType.value = 'mobile'
            isMobile.value = true
            isTablet.value = false
            isDesktop.value = false
        } else if (window.innerWidth < BREAKPOINTS.tablet) {
            deviceType.value = 'tablet'
            isMobile.value = false
            isTablet.value = true
            isDesktop.value = false
        } else {
            deviceType.value = 'desktop'
            isMobile.value = false
            isTablet.value = false
            isDesktop.value = true
        }
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const debouncedUpdate = () => {
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(updateDeviceInfo, 100)
    }

    onMounted(() => {
        updateDeviceInfo()
        window.addEventListener('resize', debouncedUpdate)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', debouncedUpdate)
    })

    return {
        windowWidth,
        deviceType,
        isMobile,
        isTablet,
        isDesktop,
        BREAKPOINTS
    }
}
