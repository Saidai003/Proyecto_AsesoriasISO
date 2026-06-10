const driveService = require('../../src/services/driveService')

describe('driveService basic exports', () => {
  test('exports expected functions', () => {
    expect(typeof driveService.generateAuthUrl).toBe('function')
    expect(typeof driveService.getTokenFromCode).toBe('function')
    expect(typeof driveService.uploadBuffer).toBe('function')
    expect(typeof driveService.hasSavedToken).toBe('function')
  })
})
