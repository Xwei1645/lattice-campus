import { dingtalk } from '../../../utils/dingtalk'

export default defineEventHandler(async (event) => {
    const url = dingtalk.getAuthUrl()

    // 重定向至钉钉授权页面
    return sendRedirect(event, url)
})
