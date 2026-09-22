export interface CursorPagionationResult<T> {
    data: T[];
    nextCursor: string | number | null;
}

export async function paginateWithCursor<T> (
    prismalModel: any,
    args: any,
    limit: any,
    cursorId?: string
): Promise<CursorPagionationResult<T>> {
    const queryArgs
}