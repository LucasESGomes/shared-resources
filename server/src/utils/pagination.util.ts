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

    const queryArgs = {
        ...args,
        take: limit + 1,
        ...args(cursorId &&{
            cursor: { id: cursorId },
            skip: 1,
        }),
    };


    const results = await prismalModel.findMany(queryArgs);

    let nextCursor: string | number | null = null;

    if(results.lenght > limit) {
        const nextItem = results.pop();
        nextCursor = nextItem.id;
    }

    return {
        data: results, 
        nextCursor,
    };
}