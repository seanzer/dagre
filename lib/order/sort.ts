const _ = require('lodash')
const util = require('../util')

export function sort(
  entries: Pick<any, 'barycenter' | 'weight' | 'vs' | 'i'>[],
  biasRight: boolean
) {
  const parts = util.partition(entries, function (entry: any) {
    return _.has(entry, 'barycenter')
  })
  const sortable = parts.lhs
  const unsortable = _.sortBy(parts.rhs, function (entry: { i: number }) {
    return -entry.i
  })
  const vs: any[] = []
  let sum = 0
  let weight = 0
  let vsIndex = 0

  sortable.sort(compareWithBias(!!biasRight))

  vsIndex = consumeUnsortable(vs, unsortable, vsIndex)

  _.forEach(
    sortable,
    function (entry: {
      vs: string | any[]
      barycenter: number
      weight: number
    }) {
      vsIndex += entry.vs.length
      vs.push(entry.vs)
      sum += entry.barycenter * entry.weight
      weight += entry.weight
      vsIndex = consumeUnsortable(vs, unsortable, vsIndex)
    }
  )

  const result: any = { vs: _.flatten(vs, true) }
  if (weight) {
    result.barycenter = sum / weight
    result.weight = weight
  }
  return result
}

function consumeUnsortable(vs: any[], unsortable: void[], index: number) {
  let last
  while (unsortable.length && (last = _.last(unsortable)).i <= index) {
    unsortable.pop()
    vs.push(last.vs)
    index++
  }
  return index
}

function compareWithBias(bias: boolean) {
  return function (
    entryV: { barycenter: number; i: number },
    entryW: { barycenter: number; i: number }
  ) {
    if (entryV.barycenter < entryW.barycenter) {
      return -1
    } else if (entryV.barycenter > entryW.barycenter) {
      return 1
    }

    return !bias ? entryV.i - entryW.i : entryW.i - entryV.i
  }
}
