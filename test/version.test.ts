import { version } from '../'
import { version as packageVersion } from '../package.json'

describe('version', function () {
  it('should match the version from package.json', function () {
    expect(version).toEqual(packageVersion)
  })
})
