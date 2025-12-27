import { db } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
    // 验证用户已登录
    const currentUser = await requireAuth(event)
    
    const body = await readBody(event)
    const { name, oldPassword, newPassword } = body

    try {
        const user = await db.user.findUnique({
            where: { id: currentUser.id }
        })

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User not found'
            })
        }

        const updateData: any = {}
        if (name) updateData.name = name

        if (newPassword) {
            if (!oldPassword) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Old password is required to set a new password'
                })
            }

            const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
            if (!isPasswordValid) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Incorrect old password'
                })
            }

            updateData.password = await bcrypt.hash(newPassword, 10)
        }

        const updatedUser = await db.user.update({
            where: { id: currentUser.id },
            data: updateData
        })

        return {
            id: updatedUser.id,
            account: updatedUser.account,
            name: updatedUser.name,
            role: updatedUser.role
        }
    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || error.message
        })
    }
})
