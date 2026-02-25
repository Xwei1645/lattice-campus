import dayjs from 'dayjs'

export const formatBookingTime = (startTime: string | Date, endTime: string | Date) => {
    const start = dayjs(startTime)
    const end = dayjs(endTime)

    const isSameDay = start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD')

    if (isSameDay) {
        const durationMin = end.diff(start, 'minute')
        let durationStr = ''
        if (durationMin >= 60) {
            const hours = Math.floor(durationMin / 60)
            const mins = durationMin % 60
            durationStr = mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
        } else {
            durationStr = `${durationMin}分钟`
        }

        return `${start.format('YYYY-MM-DD HH:mm')} - ${end.format('HH:mm')} (${durationStr})`
    }

    return `${start.format('YYYY-MM-DD HH:mm')} - ${end.format('YYYY-MM-DD HH:mm')}`
}

export const formatDateTime = (dateStr: string | Date) => {
    if (!dateStr) return '-'
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss')
}

export const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return '-'
    return dayjs(dateStr).format('YYYY-MM-DD')
}
