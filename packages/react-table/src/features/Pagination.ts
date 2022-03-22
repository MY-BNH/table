import {
  Column,
  OnChangeFn,
  ReactTable,
  Row,
  RowModel,
  TableState,
  Updater,
} from '../types'
import { functionalUpdate, makeStateUpdater, memo } from '../utils'

export type PaginationState = {
  pageIndex: number
  pageSize: number
  pageCount: number
}

export type PaginationTableState = {
  pagination: PaginationState
}

export type PaginationOptions<
  TData,
  TValue,
  TFilterFns,
  TSortingFns,
  TAggregationFns
> = {
  onPaginationChange?: OnChangeFn<PaginationState>
  autoResetPageIndex?: boolean
  paginateRowsFn?: (
    instance: ReactTable<
      TData,
      TValue,
      TFilterFns,
      TSortingFns,
      TAggregationFns
    >,
    rowModel: RowModel<TData, TValue, TFilterFns, TSortingFns, TAggregationFns>
  ) => RowModel<TData, TValue, TFilterFns, TSortingFns, TAggregationFns>
}

export type PaginationDefaultOptions = {
  onPaginationChange: OnChangeFn<PaginationState>
  autoResetPageIndex: boolean
}

export type PaginationInstance<
  TData,
  TValue,
  TFilterFns,
  TSortingFns,
  TAggregationFns
> = {
  _notifyPageIndexReset: () => void
  setPagination: (updater: Updater<PaginationState>) => void
  resetPagination: () => void
  setPageIndex: (updater: Updater<number>) => void
  resetPageIndex: () => void
  setPageSize: (updater: Updater<number>) => void
  resetPageSize: () => void
  setPageCount: (updater: Updater<number>) => void
  getPageOptions: () => number[]
  getCanPreviousPage: () => boolean
  getCanNextPage: () => boolean
  gotoPreviousPage: () => void
  gotoNextPage: () => void
  getPaginationRowModel: () => RowModel<
    TData,
    TValue,
    TFilterFns,
    TSortingFns,
    TAggregationFns
  >
  getPrePaginationRows: () => Row<
    TData,
    TValue,
    TFilterFns,
    TSortingFns,
    TAggregationFns
  >[]
  getPrePaginationFlatRows: () => Row<
    TData,
    TValue,
    TFilterFns,
    TSortingFns,
    TAggregationFns
  >[]
  getPrePaginationRowsById: () => Record<
    string,
    Row<TData, TValue, TFilterFns, TSortingFns, TAggregationFns>
  >
  getPaginationRows: () => Row<
    TData,
    TValue,
    TFilterFns,
    TSortingFns,
    TAggregationFns
  >[]
  getPaginationFlatRows: () => Row<
    TData,
    TValue,
    TFilterFns,
    TSortingFns,
    TAggregationFns
  >[]
  getPaginationRowsById: () => Record<
    string,
    Row<TData, TValue, TFilterFns, TSortingFns, TAggregationFns>
  >
}

//

export function getInitialState(): PaginationTableState {
  return {
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      pageCount: -1,
    },
  }
}

export function getDefaultOptions<
  TData,
  TValue,
  TFilterFns,
  TSortingFns,
  TAggregationFns
>(
  instance: ReactTable<TData, TValue, TFilterFns, TSortingFns, TAggregationFns>
): PaginationDefaultOptions {
  return {
    onPaginationChange: makeStateUpdater('pagination', instance),
    autoResetPageIndex: true,
  }
}

export function getInstance<
  TData,
  TValue,
  TFilterFns,
  TSortingFns,
  TAggregationFns
>(
  instance: ReactTable<TData, TValue, TFilterFns, TSortingFns, TAggregationFns>
): PaginationInstance<TData, TValue, TFilterFns, TSortingFns, TAggregationFns> {
  let registered = false
  return {
    _notifyPageIndexReset: () => {
      if (!registered) {
        registered = true
        return
      }

      if (instance.options.autoResetAll === false) {
        return
      }

      if (
        instance.options.autoResetAll === true ||
        instance.options.autoResetPageIndex
      ) {
        instance.resetPageSize()
      }
    },
    setPagination: updater => {
      const safeUpdater: Updater<PaginationState> = old => {
        const newState = functionalUpdate(old, updater)

        if (!instance.options.paginateRowsFn) {
          return {
            ...old,
            pageCount: instance.getPreExpandedRows()?.length
              ? Math.ceil(
                  instance.getPreExpandedRows().length /
                    instance.getState().pagination.pageSize
                )
              : 0,
          }
        }

        return old
      }

      return instance.options.onPaginationChange?.(
        safeUpdater,
        functionalUpdate(safeUpdater, instance.getState().pagination)
      )
    },
    resetPagination: () => {
      instance.setPagination(
        instance.initialState.pagination ?? {
          pageIndex: 0,
          pageSize: 10,
          pageCount: -1,
        }
      )
    },
    setPageIndex: updater => {
      instance.setPagination(old => {
        const newPageIndex = functionalUpdate(updater, old.pageIndex)
        const maxPageIndex =
          old.pageCount > 0 ? old.pageCount - 1 : Number.MAX_SAFE_INTEGER

        return {
          ...old,
          pageIndex: Math.min(Math.max(0, newPageIndex), maxPageIndex),
        }
      })
    },
    resetPageIndex: () => {
      instance.setPageIndex(0)
    },
    resetPageSize: () => {
      instance.setPageSize(
        instance.options.initialState?.pagination?.pageSize ?? 10
      )
    },
    setPageSize: updater => {
      instance.setPagination(old => {
        const pageSize = Math.max(1, functionalUpdate(updater, old.pageSize))
        const topRowIndex = old.pageSize * old.pageIndex!
        const pageIndex = Math.floor(topRowIndex / pageSize)

        return {
          ...old,
          pageIndex,
          pageSize,
        }
      })
    },
    setPageCount: updater =>
      instance.setPagination(old => ({
        ...old,
        pageCount: Math.max(-1, functionalUpdate(updater, old.pageCount)),
      })),

    getPageOptions: memo(
      () => [
        instance.getState().pagination.pageSize,
        instance.getState().pagination.pageCount,
      ],
      (pageSize, pageCount) => {
        let pageOptions: number[] = []
        if (pageCount > 0) {
          pageOptions = [...new Array(pageCount)].fill(null).map((_, i) => i)
        }
        return pageOptions
      },
      {
        key: 'getPageOptions',
        debug: instance.options.debug,
      }
    ),

    getCanPreviousPage: () => instance.getState().pagination.pageIndex > 0,

    getCanNextPage: () => {
      const { pageIndex, pageCount, pageSize } = instance.getState().pagination

      if (pageCount === -1) {
        return true
      }

      if (pageCount === 0) {
        return false
      }

      return (
        pageIndex <
        Math.ceil(instance.getPrePaginationRows().length / pageSize) - 1
      )
    },

    gotoPreviousPage: () => {
      return instance.setPageIndex?.(old => old! - 1)
    },

    gotoNextPage: () => {
      return instance.setPageIndex?.(old => old! + 1)
    },

    getPaginationRowModel: memo(
      () => [
        instance.getState().pagination,
        instance.getExpandedRowModel(),
        instance.options.paginateRowsFn,
      ],
      (_pagination, rowModel, paginateRowsFn) => {
        if (!paginateRowsFn || !rowModel.rows.length) {
          return rowModel
        }

        if (process.env.NODE_ENV !== 'production' && instance.options.debug)
          console.info('Paginating...')

        return paginateRowsFn(instance, rowModel)
      },
      {
        key: 'getPaginationRowModel',
        debug: instance.options.debug,
      }
    ),

    getPrePaginationRows: () => instance.getExpandedRowModel().rows,
    getPrePaginationFlatRows: () => instance.getExpandedRowModel().flatRows,
    getPrePaginationRowsById: () => instance.getExpandedRowModel().rowsById,
    getPaginationRows: () => instance.getPaginationRowModel().rows,
    getPaginationFlatRows: () => instance.getPaginationRowModel().flatRows,
    getPaginationRowsById: () => instance.getPaginationRowModel().rowsById,
  }
}