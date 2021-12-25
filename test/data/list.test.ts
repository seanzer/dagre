import { List } from '../../lib/data/list'

describe('data.List', function () {
  let list: List<unknown>

  beforeEach(function () {
    list = new List()
  })

  describe('dequeue', function () {
    it('returns undefined with an empty list', function () {
      expect(list.dequeue()).toBeUndefined()
    })

    it('unlinks and returns the first entry', function () {
      const obj = {}
      list.enqueue(obj)

      expect(list.dequeue()).toEqual(jasmine.objectContaining({ value: obj }))
    })

    it('unlinks and returns multiple entries in FIFO order', function () {
      const obj1 = {}
      const obj2 = {}
      list.enqueue(obj1)
      list.enqueue(obj2)

      expect(list.dequeue()).toEqual(jasmine.objectContaining({ value: obj1 }))
      expect(list.dequeue()).toEqual(jasmine.objectContaining({ value: obj2 }))
    })

    it('unlinks and re-links an entry if it is re-enqueued', function () {
      const obj1 = {}
      const obj2 = {}
      list.enqueue(obj1)
      list.enqueue(obj2)
      list.enqueue(obj1)

      expect(list.dequeue()).toEqual(jasmine.objectContaining({ value: obj2 }))
      expect(list.dequeue()).toEqual(jasmine.objectContaining({ value: obj1 }))
    })

    it('unlinks and re-links an entry if it is enqueued on another list', function () {
      const obj = {}
      const list2 = new List()
      const entry = list.enqueue(obj)
      list2.enqueue(entry)

      expect(list.dequeue()).toBeUndefined()
      expect(list2.dequeue()).toEqual(jasmine.objectContaining({ value: obj }))
    })

    it('can return a string representation', function () {
      list.enqueue({ entry: 1 })
      list.enqueue({ entry: 2 })

      expect(list.toString()).toEqual('[{"entry":1},{"entry":2}]')
    })
  })
})
