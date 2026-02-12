/**
 * 教师管理 Composable
 * 提供教师相关的数据获取和操作方法
 */

// 教师数据接口
export interface Teacher {
    id: number
    name: string
    account: string | null
    status: 'pending' | 'active' | 'disabled'
    dingTalkOpenId: string | null
    createTime: string
    organizations: Array<{
        id: number
        name: string
    }>
}

// 教师列表响应接口
export interface TeacherListResponse {
    list: Teacher[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// 查询参数接口
export interface TeacherQueryParams {
    page?: number
    pageSize?: number
    keyword?: string
    status?: 'pending' | 'active' | 'disabled'
}

/**
 * 获取教师列表
 * @param params 查询参数
 * @returns 教师列表数据
 */
export async function fetchTeachers(
    params: TeacherQueryParams = {}
): Promise<TeacherListResponse> {
    const query = new URLSearchParams()

    if (params.page) query.append('page', params.page.toString())
    if (params.pageSize) {
        query.append('pageSize', params.pageSize.toString())
    }
    if (params.keyword) query.append('keyword', params.keyword)
    if (params.status) query.append('status', params.status)

    const response = await $fetch<TeacherListResponse>(
        `/api/teachers?${query.toString()}`
    )

    return response as TeacherListResponse
}

/**
 * 创建教师
 * @param data 教师数据
 * @returns 创建的教师信息
 */
export async function createTeacher(data: {
    name: string
    account?: string
    password?: string
    organizationIds: number[]
}): Promise<Teacher> {
    const response = await $fetch('/api/teachers', {
        method: 'POST',
        body: data
    })
    return response as Teacher
}

/**
 * 更新教师信息
 * @param id 教师ID
 * @param data 更新数据
 * @returns 更新后的教师信息
 */
export async function updateTeacher(
    id: number,
    data: {
        name?: string
        account?: string
        status?: 'pending' | 'active' | 'disabled'
        organizationIds?: number[]
    }
): Promise<Teacher> {
    const response = await $fetch(`/api/teachers/${id}`, {
        method: 'PUT',
        body: data
    })
    return response as Teacher
}

/**
 * 删除教师
 * @param id 教师ID
 */
export async function deleteTeacher(id: number): Promise<void> {
    await $fetch(`/api/teachers/${id}`, {
        method: 'DELETE'
    })
}

/**
 * 重置教师密码
 * @param id 教师ID
 * @param password 新密码
 */
export async function resetTeacherPassword(
    id: number,
    password: string
): Promise<void> {
    await $fetch(`/api/teachers/${id}/reset-password`, {
        method: 'POST',
        body: { password }
    })
}

/**
 * 审核通过教师
 * @param id 教师ID
 * @returns 更新后的教师信息
 */
export async function approveTeacher(id: number): Promise<Teacher> {
    const response = await $fetch(`/api/teachers/${id}/approve`, {
        method: 'POST'
    })
    return response as Teacher
}

/**
 * 审核拒绝教师
 * @param id 教师ID
 */
export async function rejectTeacher(id: number): Promise<void> {
    await $fetch(`/api/teachers/${id}/reject`, {
        method: 'POST'
    })
}

/**
 * 绑定钉钉账号
 * @param id 教师ID
 */
export async function bindDingtalk(id: number): Promise<void> {
    await $fetch(`/api/teachers/${id}/bind-dingtalk`, {
        method: 'POST'
    })
}

/**
 * 解绑钉钉账号
 * @param id 教师ID
 */
export async function unbindDingtalk(id: number): Promise<void> {
    await $fetch(`/api/teachers/${id}/unbind-dingtalk`, {
        method: 'POST'
    })
}
