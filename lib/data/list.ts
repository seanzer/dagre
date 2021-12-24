/*
 * Simple doubly linked list implementation derived from Cormen, et al.,
 * "Introduction to Algorithms".
 */
export interface Entry<T> {
  readonly value: T | null
}

class UpdatableEntry<T> implements Entry<T> {
  _next: UpdatableEntry<T> = this
  _prev: UpdatableEntry<T> = this
  constructor(readonly value: T | null) {}
}

function createSentinel<T>() {
  return new UpdatableEntry<T>(null)
}

export class List<T> {
  private readonly _sentinel: UpdatableEntry<T> = createSentinel<T>()

  dequeue(): Entry<T> | undefined {
    const sentinel = this._sentinel
    const entry = sentinel._prev
    if (entry !== sentinel) {
      unlink(entry)
      return entry
    }
  }

  enqueue(entryOrItem: Entry<T> | T): Entry<T> {
    const sentinel = this._sentinel
    let entry: UpdatableEntry<T>
    if (
      entryOrItem instanceof UpdatableEntry &&
      entryOrItem._prev &&
      entryOrItem._next
    ) {
      unlink(entryOrItem)
      entry = entryOrItem
    } else {
      entry = new UpdatableEntry(entryOrItem as T)
    }

    entry._next = sentinel._next
    sentinel._next._prev = entry
    sentinel._next = entry
    entry._prev = sentinel
    return entry
  }

  toString() {
    const values: Array<T | null> = []
    const sentinel = this._sentinel
    let curr = sentinel._prev
    while (curr !== sentinel) {
      values.push(curr.value)
      curr = curr._prev
    }
    return JSON.stringify(values)
  }
}

function unlink(entry: UpdatableEntry<unknown>) {
  if (entry._prev) entry._prev._next = entry._next
  if (entry._next) entry._next._prev = entry._prev
  entry._next = entry._prev = entry
}
