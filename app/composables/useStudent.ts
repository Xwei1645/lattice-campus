/**
 * 学生管理 Composable
 * 提供学生相关的数据获取和操作方法
 */

// 学生数据接口
export interface Student {
    id: number
    name: string
    studentId: string
    account: string | null
    status: 'active' | 'disabled'
    seewoOpenId: string | null
    createTime: string
}

// 学生列表响应接口
export interface StudentListResponse {
    list: Student[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// 查询参数接口
export interface StudentQueryParams {
    page?: number
    pageSize?: number
    keyword?: string
    status?: 'active' | 'disabled'
}

/**
 * 获取学生列表
 * @param params 查询参数
 * @returns 学生列表数据
 */
export async function fetchStudents(
    params: StudentQueryParams = {}
): Promise<StudentListResponse> {
    const query = new URLSearchParams()

    if (params.page) query.append('page', params.page.toString())
    if (params.pageSize) {
        query.append('pageSize', params.pageSize.toString())
    }
    if (params.keyword) query.append('keyword', params.keyword)
    if (params.status) query.append('status', params.status)

    const response = await $fetch<StudentListResponse>(
        `/api/students?${query.toString()}`
    )

    return response as StudentListResponse
}

/**
 * 创建学生
 * @param data 学生数据
 * @returns 创建的学生信息
 */
export async function createStudent(data: {
    name: string
    studentId: string
    account?: string
    password?: string
}): Promise<Student> {
    const response = await $fetch('/api/students', {
        method: 'POST',
        body: data
    })
    return response as Student
}

/**
 * 更新学生信息
 * @param id 学生ID
 * @param data 更新数据
 * @returns 更新后的学生信息
 */
export async function updateStudent(
    id: number,
    data: {
        name?: string
        studentId?: string
        account?: string
        status?: 'active' | 'disabled'
    }
): Promise<Student> {
    const response = await $fetch(`/api/students/${id}`, {
        method: 'PUT',
        body: data
    })
    return response as Student
}

/**
 * 删除学生
 * @param id 学生ID
 */
export async function deleteStudent(id: number): Promise<void> {
    await $fetch(`/api/students/${id}`, {
        method: 'DELETE'
    })
}

/**
 * 重置学生密码
 * @param id 学生ID
 * @param password 新密码
 */
export async function resetStudentPassword(
    id: number,
    password: string
): Promise<void> {
    await $fetch(`/api/students/${id}/reset-password`, {
        method: 'POST',
        body: { password }
    })
}

/**
 * 绑定希沃账号
 * @param id 学生ID
 */
export async function bindSeewo(id: number): Promise<void> {
    await $fetch(`/api/students/${id}/bind-seewo`, {
        method: 'POST'
    })
}

/**
 * 解绑希沃账号
 * @param id 学生ID
 */
export async function unbindSeewo(id: number): Promise<void> {
    await $fetch(`/api/students/${id}/unbind-seewo`, {
        method: 'POST'
    })
}
