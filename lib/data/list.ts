/*
 * Simple doubly linked list implementation derived from Cormen, et al.,
 * "Introduction to Algorithms".
 */
export type Entry<T> = {
  _next?: Entry<T>
  _prev?: Entry<T>
  value: T | null
}

export class List<T> {
  private _sentinel: Entry<T>
  constructor() {
    const sentinel: Entry<T> = { value: null }
    sentinel._next = sentinel._prev = sentinel
    this._sentinel = sentinel
  }

  dequeue(): Entry<T> | undefined {
    const sentinel = this._sentinel
    const entry = sentinel._prev
    if (entry && entry !== sentinel) {
      unlink(entry)
      return entry
    }
  }

  enqueue(entry: Entry<T>): void {
    const sentinel = this._sentinel
    if (entry._prev && entry._next) {
      unlink(entry)
    }
    entry._next = sentinel._next
    sentinel._next!._prev = entry
    sentinel._next = entry
    entry._prev = sentinel
  }

  toString() {
    const strs: string[] = []
    const sentinel = this._sentinel
    let curr = sentinel._prev
    while (curr !== sentinel) {
      strs.push(JSON.stringify(curr, filterOutLinks))
      curr = curr!._prev
    }
    return '[' + strs.join(', ') + ']'
  }
}

function unlink(entry: Entry<unknown>) {
  if (entry._prev) entry._prev._next = entry._next
  if (entry._next) entry._next!._prev = entry._prev
  delete entry._next
  delete entry._prev
}

function filterOutLinks(k: string, v: unknown) {
  if (k !== '_next' && k !== '_prev') {
    return v
  }
}
